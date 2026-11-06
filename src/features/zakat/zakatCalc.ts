import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { productService } from '@/services/productService'
import { saleService } from '@/services/saleService'
import { expenseService } from '@/services/expenseService'
import { capitalService } from '@/services/capitalService'
import { goodsReceiptService, purchaseService, supplierPaymentService } from '@/services/purchaseService'
import { inventoryLogService } from '@/services/inventoryLogService'
import { computeCashFlow, saleDay, type CashFlowSummary } from '@/lib/profit'
import type { CapitalEntry, Expense, GoodsReceipt, InventoryLog, Product, Purchase, Sale, SupplierPayment } from '@/types/database'
import { loadAccounts, type Account } from '@/features/accounts/accountLedger'

// Zakat on a business (zakat al-tijarah), as the four schools set it out:
//   A money (cash and bank) + B trade goods at their market value + C debts owed to the business that will be collected
//   + D other zakatable wealth (gold, silver, shares) − E debts the business owes that are due now
//   = net zakatable wealth. If it reaches the nisab (85 g gold / 595 g silver) and a lunar year (hawl) has passed: 2.5%.
// Assets the business uses (premises, equipment, vehicles, furniture) are not zakatable.
export const NISAB_GRAMS = { gold: 85, silver: 595 } as const
// Gold and silver are often priced per sovereign (pawn) of 8 g
export const SOVEREIGN_GRAMS = 8
// 2.5% per lunar year; over a solar (Gregorian) year the rate is adjusted for the 11 extra days
export const ZAKAT_RATES = { lunar: 0.025, solar: 0.02577 } as const
export const LUNAR_YEAR_DAYS = 354

export type NisabBasis = keyof typeof NISAB_GRAMS
export type YearType = keyof typeof ZAKAT_RATES

// Figures taken from the records
export const AUTO_ASSETS = ['money', 'inventory', 'clientCredit', 'supplierCredit', 'sourceCredit', 'savings'] as const
export const AUTO_LIABILITIES = ['supplierOwed', 'loans'] as const
export type AutoAsset = typeof AUTO_ASSETS[number]
export type AutoLiability = typeof AUTO_LIABILITIES[number]

// Figures the user types in
export const MANUAL_ASSETS = ['cash', 'bank', 'otherAssets', 'goldSilver', 'investments'] as const
export const MANUAL_LIABILITIES = ['wages', 'bills', 'taxes', 'otherDebts'] as const
export type ManualAsset = typeof MANUAL_ASSETS[number]
export type ManualLiability = typeof MANUAL_LIABILITIES[number]

// The five parts of the calculation, in order
export type Group = 'money' | 'goods' | 'receivables' | 'other' | 'debts'
export const GROUP_OF: Record<AutoAsset | AutoLiability | ManualAsset | ManualLiability, Group> = {
    money: 'money', cash: 'money', bank: 'money',
    inventory: 'goods', otherAssets: 'goods',
    clientCredit: 'receivables', supplierCredit: 'receivables', sourceCredit: 'receivables',
    goldSilver: 'other', investments: 'other', savings: 'other',
    supplierOwed: 'debts', loans: 'debts', wages: 'debts', bills: 'debts', taxes: 'debts', otherDebts: 'debts'
}

export interface ZakatSettings {
    basis: NisabBasis
    goldPrice: string
    silverPrice: string
    priceUnit: 'gram' | 'sovereign'
    year: YearType
    // The zakat year: From = the day the hawl started (wealth reached the nisab, or the last zakat date),
    // To = the zakat day, when everything is valued (empty: today)
    hawlStart: string
    zakatDate: string
    // Money from the records (every sale, payment and expense), or the cash and bank balances counted on the day
    moneySource: 'records' | 'counted'
    // Trade goods at market (selling) value, as most scholars hold, or at cost
    inventoryValue: 'cost' | 'price'
    include: Record<AutoAsset | AutoLiability, boolean>
    manualAssets: Record<ManualAsset, string>
    manualLiabilities: Record<ManualLiability, string>
}

const empty = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map(key => [key, ''])) as Record<K, string>

export const DEFAULT_SETTINGS: ZakatSettings = {
    basis: 'gold',
    goldPrice: '',
    silverPrice: '',
    priceUnit: 'gram',
    year: 'lunar',
    hawlStart: '',
    zakatDate: '',
    moneySource: 'records',
    inventoryValue: 'price',
    include: {
        money: true, inventory: true, clientCredit: true, supplierCredit: true,
        // Capital promised or owed by its source is the owner's money until paid in; savings may be money held for others
        sourceCredit: false, savings: false,
        supplierOwed: true, loans: true
    },
    manualAssets: empty(MANUAL_ASSETS),
    manualLiabilities: empty(MANUAL_LIABILITIES)
}

const STORAGE_KEY = 'zakatCalculator'

// Kept on this computer, like the company settings
export function loadSettings(): ZakatSettings {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
        if (!stored || typeof stored !== 'object') return DEFAULT_SETTINGS
        return {
            ...DEFAULT_SETTINGS,
            ...stored,
            include: { ...DEFAULT_SETTINGS.include, ...stored.include },
            manualAssets: { ...DEFAULT_SETTINGS.manualAssets, ...stored.manualAssets },
            manualLiabilities: { ...DEFAULT_SETTINGS.manualLiabilities, ...stored.manualLiabilities }
        }
    } catch {
        return DEFAULT_SETTINGS
    }
}

export function saveSettings(settings: ZakatSettings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
        console.warn('Could not save the zakat settings:', error)
    }
}

export interface ZakatFigures {
    // The zakat day every figure is valued on
    asOf: string
    // Money the records say the business holds on that day: everything received less everything paid, since the first record
    money: number
    cashFlow: CashFlowSummary
    // Money in and out during the zakat year itself (when a From date is set)
    periodFlow: CashFlowSummary | null
    inventoryCost: number
    inventoryPrice: number
    inventoryItems: number
    clientCredit: number
    supplierCredit: number
    sourceCredit: number
    savings: number
    supplierOwed: number
    loans: number
    // Counts shown as "taken from" so it's clear the whole business is covered
    coverage: { sales: number; products: number; suppliers: number; clients: number; capital: number; expenses: number }
}

const round = (value: number) => Math.round(value * 100) / 100 + 0

export interface ZakatRecords {
    products: Product[]
    logs: InventoryLog[]
    accounts: Account[]
    sales: Sale[]
    expenses: Expense[]
    purchases: Purchase[]
    payments: SupplierPayment[]
    capital: CapitalEntry[]
    receipts: GoodsReceipt[]
}

// Every record of the business, loaded once; the figures are then worked out for any zakat day
export async function loadRecords(): Promise<ZakatRecords> {
    const [products, logs, accounts, sales, expenses, purchases, payments, capital, receipts] = await Promise.all([
        productService.getAll(), inventoryLogService.getAll(), loadAccounts(null, { allTypes: true }),
        saleService.getAll(), expenseService.getAll(), purchaseService.getAll(), supplierPaymentService.getAll(),
        capitalService.getAll(), goodsReceiptService.getAll()
    ])
    return { products, logs, accounts, sales, expenses, purchases, payments, capital, receipts }
}

const localDay = (timestamp?: string | null) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return isNaN(date.getTime()) ? timestamp.slice(0, 10) : format(date, 'yyyy-MM-dd')
}
const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

// The whole business as it stood at the end of the zakat day `to` (today when empty):
// money, stock, what's owed to it and what it owes
export function computeFigures(records: ZakatRecords, period: { from?: string; to?: string }, today = new Date()): ZakatFigures {
    const asOf = period.to && isDay(period.to) ? period.to : format(today, 'yyyy-MM-dd')
    const from = period.from && isDay(period.from) ? period.from : ''
    const { products, logs, accounts, sales, expenses, purchases, payments, capital, receipts } = records

    // Money held: every record from the start up to the zakat day
    const cashFlow = computeCashFlow(sales, expenses, purchases, payments, capital, receipts, { to: asOf })
    const periodFlow = from ? computeCashFlow(sales, expenses, purchases, payments, capital, receipts, { from, to: asOf }) : null

    // Stock on the zakat day: today's stock less the movements made after it
    const laterMoves = new Map<number, number>()
    for (const log of logs) {
        if (localDay(log.created_at) > asOf) laterMoves.set(log.product_id, (laterMoves.get(log.product_id) ?? 0) + log.quantity)
    }
    const stockOn = products
        .map(p => ({ product: p, stock: Math.max(p.stock - (p.id ? laterMoves.get(p.id) ?? 0 : 0), 0) }))
        .filter(row => row.stock > 0)

    // Account balances on the zakat day: the balance after the last line up to it
    const balanceOn = (account: Account) => {
        let balance = 0
        for (const line of account.lines) {
            if (line.date > asOf) break
            balance = line.balance
        }
        return balance
    }
    const sumOn = (list: Account[], sign: 1 | -1) => round(list.reduce((sum, a) => sum + Math.max(sign * balanceOn(a), 0), 0))
    const of = (type: Account['type']) => accounts.filter(a => a.type === type)

    return {
        asOf,
        money: round(Math.max(cashFlow.netCashFlow, 0)),
        cashFlow,
        periodFlow,
        inventoryCost: round(stockOn.reduce((sum, row) => sum + row.stock * (row.product.cost ?? 0), 0)),
        inventoryPrice: round(stockOn.reduce((sum, row) => sum + row.stock * row.product.price, 0)),
        inventoryItems: stockOn.length,
        clientCredit: sumOn([...of('client'), ...of('walkin')], 1),
        supplierCredit: sumOn(of('supplier'), 1),
        sourceCredit: sumOn(of('source'), 1),
        savings: sumOn(of('savings'), 1),
        supplierOwed: sumOn(of('supplier'), -1),
        loans: sumOn(of('source'), -1),
        coverage: {
            sales: sales.filter(s => s.status !== 'cancelled' && !!s.created_at && saleDay(s) <= asOf).length,
            products: stockOn.length,
            suppliers: of('supplier').length,
            clients: of('client').length + of('walkin').length,
            capital: capital.filter(c => c.entry_date <= asOf).length,
            expenses: expenses.filter(e => e.expense_date <= asOf).length
        }
    }
}

const amount = (value: string) => {
    const number = Number(value)
    return Number.isFinite(number) && number > 0 ? number : 0
}

export function autoValue(key: AutoAsset | AutoLiability, figures: ZakatFigures, settings: ZakatSettings): number {
    if (key === 'inventory') return settings.inventoryValue === 'cost' ? figures.inventoryCost : figures.inventoryPrice
    return figures[key]
}

// Whether a line takes part: money comes either from the records or from the counted balances
export function isCounted(key: AutoAsset | AutoLiability | ManualAsset | ManualLiability, settings: ZakatSettings): boolean {
    if (key === 'money') return settings.moneySource === 'records' && settings.include.money
    if (key === 'cash' || key === 'bank') return settings.moneySource === 'counted'
    if ((AUTO_ASSETS as readonly string[]).includes(key) || (AUTO_LIABILITIES as readonly string[]).includes(key)) {
        return settings.include[key as AutoAsset | AutoLiability]
    }
    return true
}

export interface ZakatResult {
    groups: Record<Group, number>
    assets: number
    liabilities: number
    net: number
    pricePerGram: number
    nisab: number
    hasPrice: boolean
    meetsNisab: boolean
    rate: number
    due: number
    // The zakat year: from its start to the zakat day, and when a full year completes
    hawl: {
        start: string
        asOf: string
        // Days between the two dates, and whether a full year (354 lunar / 365 solar) has passed
        days: number
        yearDays: number
        complete: boolean
        // The day the full year completes, and days from today until then
        dueOn: string
        daysToDue: number
    } | null
}

export function calculate(settings: ZakatSettings, figures: ZakatFigures | null, today = new Date()): ZakatResult {
    const asOf = figures?.asOf ?? (isDay(settings.zakatDate) ? settings.zakatDate : format(today, 'yyyy-MM-dd'))
    const groups: Record<Group, number> = { money: 0, goods: 0, receivables: 0, other: 0, debts: 0 }
    if (figures) {
        for (const key of [...AUTO_ASSETS, ...AUTO_LIABILITIES]) {
            if (isCounted(key, settings)) groups[GROUP_OF[key]] += autoValue(key, figures, settings)
        }
    }
    for (const key of MANUAL_ASSETS) if (isCounted(key, settings)) groups[GROUP_OF[key]] += amount(settings.manualAssets[key])
    for (const key of MANUAL_LIABILITIES) groups.debts += amount(settings.manualLiabilities[key])
    for (const group of Object.keys(groups) as Group[]) groups[group] = round(groups[group])

    const assets = round(groups.money + groups.goods + groups.receivables + groups.other)
    const liabilities = groups.debts
    const net = round(assets - liabilities)

    const price = amount(settings.basis === 'gold' ? settings.goldPrice : settings.silverPrice)
    const pricePerGram = settings.priceUnit === 'sovereign' ? price / SOVEREIGN_GRAMS : price
    const nisab = round(NISAB_GRAMS[settings.basis] * pricePerGram)
    const hasPrice = pricePerGram > 0
    const meetsNisab = hasPrice && net > 0 && net >= nisab
    const rate = ZAKAT_RATES[settings.year]

    let hawl: ZakatResult['hawl'] = null
    if (isDay(settings.hawlStart)) {
        const yearDays = settings.year === 'lunar' ? LUNAR_YEAR_DAYS : 365
        const start = parseISO(settings.hawlStart)
        const dueOn = addDays(start, yearDays)
        const days = differenceInCalendarDays(parseISO(asOf), start)
        hawl = {
            start: settings.hawlStart, asOf, days, yearDays, complete: days >= yearDays,
            dueOn: format(dueOn, 'yyyy-MM-dd'), daysToDue: differenceInCalendarDays(dueOn, today)
        }
    }

    return { groups, assets, liabilities, net, pricePerGram, nisab, hasPrice, meetsNisab, rate, due: meetsNisab ? round(net * rate) : 0, hawl }
}
