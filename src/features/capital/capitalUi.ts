import { Landmark, PlusCircle, Coins, ArrowUpFromLine, Banknote, Package, Truck, HandCoins, CalendarClock } from 'lucide-react'
import type { TranslationKey } from '@/i18n'
import type { RepaymentKind } from '@/services/capitalService'
import { CapitalServiceError } from '@/services/capitalService'
import type { CapitalEntry, CapitalEntryType, CapitalForm } from '@/types/database'

// Look of each entry type across the page, cards and form
export const TYPE_STYLES: Record<CapitalEntryType, { icon: React.ElementType; badge: string }> = {
    initial_capital: { icon: Landmark, badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
    capital: { icon: PlusCircle, badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    income: { icon: Coins, badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    withdrawal: { icon: ArrowUpFromLine, badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
}

export const FORM_ICONS: Record<CapitalForm, React.ElementType> = {
    money: Banknote,
    goods: Package,
    supplier_credit: Truck,
    loan: HandCoins,
    pledge: CalendarClock
}

export const typeLabel = (type: CapitalEntryType, t: (key: TranslationKey) => string) => t(`cap.type.${type}`)
export const formLabel = (form: CapitalForm, t: (key: TranslationKey) => string) => t(`cap.form.${form}`)

export const isCapitalType = (type: CapitalEntryType) => type === 'initial_capital' || type === 'capital'
export const isGoodsForm = (form: CapitalForm) => form === 'goods' || form === 'supplier_credit'
// Loans are repaid and promises paid in over time
export const isSettledForm = (form: CapitalForm) => form === 'loan' || form === 'pledge'

// Capital in money and other income can be recorded on credit: owed by the source, received later
export const allowsCredit = (type: CapitalEntryType, form: CapitalForm) => (isCapitalType(type) || type === 'income') && form === 'money'
export const isCreditEntry = (entry: Pick<CapitalEntry, 'payment_method'>) => entry.payment_method === 'credit'

// Entries that get payments against them: loans, promises, anything on credit,
// and goods on credit (paid to the supplier)
export const isSettledEntry = (entry: CapitalEntry) => isSettledForm(entry.form) || entry.form === 'supplier_credit' || isCreditEntry(entry)

// Money going out to settle it: a loan repaid or a supplier paid
export const isPaidOut = (entry: CapitalEntry) => entry.form === 'loan' || entry.form === 'supplier_credit'

export interface SourceDue {
    sourceId: number
    name: string
    // Entries still outstanding, oldest first
    entries: CapitalEntry[]
    outstanding: number
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

// What a repayment of this kind covers: credit owed to the business, loans it owes, or goods on credit
export const isRepaidBy = (entry: CapitalEntry, kind: RepaymentKind) =>
    kind === 'loan' ? entry.form === 'loan'
        : kind === 'supplier' ? entry.form === 'supplier_credit' && !!entry.purchase_id
            : isCreditEntry(entry)

// The kind of source-wide repayment an entry takes part in, if any
export const repaymentKindOf = (entry: CapitalEntry): RepaymentKind | null =>
    entry.form === 'loan' ? 'loan' : entry.form === 'supplier_credit' ? 'supplier' : isCreditEntry(entry) ? 'credit' : null

// Who is paid or pays: the supplier for goods on credit, otherwise the registered source
const counterpartOf = (entry: CapitalEntry, kind: RepaymentKind): { id: number; name: string } | null => {
    const id = kind === 'supplier' ? entry.supplier_id : entry.source_id
    if (!id) return null
    return { id, name: (kind === 'supplier' ? entry.supplier_name : entry.source) ?? '' }
}

// Sources (or suppliers) with something still outstanding of this kind, by name
export function dueBySource(entries: CapitalEntry[], kind: RepaymentKind): SourceDue[] {
    const bySource = new Map<number, SourceDue>()
    for (const entry of entries) {
        const counterpart = counterpartOf(entry, kind)
        if (!isRepaidBy(entry, kind) || !counterpart || outstandingOf(entry) <= 0) continue
        const due = bySource.get(counterpart.id) ?? { sourceId: counterpart.id, name: counterpart.name, entries: [], outstanding: 0 }
        due.entries.push(entry)
        due.outstanding = roundMoney(due.outstanding + outstandingOf(entry))
        bySource.set(counterpart.id, due)
    }
    for (const due of bySource.values()) {
        due.entries.sort((a, b) => a.entry_date.localeCompare(b.entry_date) || (a.id ?? 0) - (b.id ?? 0))
    }
    return [...bySource.values()].sort((a, b) => a.name.localeCompare(b.name))
}

// How a repayment is split over the entries, oldest first (same rule as the main process)
export function allocateRepayment(entries: CapitalEntry[], amount: number): Map<number, number> {
    const parts = new Map<number, number>()
    let remaining = roundMoney(amount)
    for (const entry of entries) {
        if (remaining <= 0) break
        const part = roundMoney(Math.min(remaining, outstandingOf(entry)))
        if (part > 0 && entry.id) parts.set(entry.id, part)
        remaining = roundMoney(remaining - part)
    }
    return parts
}

// Button label for recording a payment against the entry
export const settleActionKey = (entry: CapitalEntry): TranslationKey =>
    entry.form === 'loan' ? 'cap.repay' : entry.form === 'supplier_credit' ? 'cap.paySupplier' : isCreditEntry(entry) ? 'cap.receive' : 'cap.payIn'

// Anything taken or given on credit gets a bill: goods on credit, borrowed money, promised capital,
// and capital or income on credit
export const isBillable = (entry: CapitalEntry) => isSettledEntry(entry)

// The bill number follows the entry: CB-000042
export const billNumber = (entry: Pick<CapitalEntry, 'id'>) => `CB-${String(entry.id ?? '').padStart(6, '0')}`

export type BillKind = 'supplier_credit' | 'loan' | 'pledge' | 'credit_capital' | 'credit_income'

export const billKindOf = (entry: CapitalEntry): BillKind =>
    entry.form === 'supplier_credit' ? 'supplier_credit'
        : entry.form === 'loan' ? 'loan'
            : entry.form === 'pledge' ? 'pledge'
                : entry.type === 'income' ? 'credit_income' : 'credit_capital'

// The business pays this bill (goods on credit, loans) rather than collects it
export const isPayableBill = (kind: BillKind) => kind === 'supplier_credit' || kind === 'loan'

export const outstandingOf = (entry: CapitalEntry) => Math.max(Math.round((entry.amount - (entry.settled ?? 0)) * 100) / 100, 0)

// Money in (+) or out (−) shown next to the amount
export const amountSign = (entry: CapitalEntry) => entry.type === 'withdrawal' ? '−' : '+'

// Who the money came from: the supplier for goods on credit, otherwise the typed source
export const sourceOf = (entry: CapitalEntry) => entry.form === 'supplier_credit' ? entry.supplier_name ?? entry.source : entry.source

const KNOWN_CODES = [
    'TYPE_INVALID', 'FORM_INVALID', 'METHOD_INVALID', 'SOURCE_REQUIRED', 'NOTHING_OUTSTANDING', 'AMOUNT_INVALID', 'DATE_INVALID', 'SUPPLIER_REQUIRED', 'ITEMS_REQUIRED', 'PRODUCT_REQUIRED',
    'QUANTITY_INVALID', 'COST_INVALID', 'NOT_EDITABLE', 'NOT_SETTLEABLE', 'AMOUNT_TOO_HIGH', 'BELOW_SETTLED', 'HAS_SETTLEMENTS',
    'HAS_PAYMENTS', 'STOCK_USED', 'NOT_FOUND', 'FORBIDDEN', 'UNKNOWN'
] as const
type CapitalErrorCode = typeof KNOWN_CODES[number]

// Translates a main-process capital error code
export function capitalErrorMessage(error: unknown, t: (key: TranslationKey) => string): string {
    const code = error instanceof CapitalServiceError ? error.code : 'UNKNOWN'
    const known: CapitalErrorCode = (KNOWN_CODES as readonly string[]).includes(code) ? code as CapitalErrorCode : 'UNKNOWN'
    return t(`capError.${known}`)
}
