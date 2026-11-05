import { format } from 'date-fns'
import type { TranslationKey } from '@/i18n'
import { canAccessPage, type AuthUser, type PageId } from '@/lib/permissions'
import { purchaseService, supplierPaymentService, goodsReceiptService } from '@/services/purchaseService'
import { supplierService } from '@/services/supplierService'
import { clientService } from '@/services/clientService'
import { saleService } from '@/services/saleService'
import { capitalService } from '@/services/capitalService'
import { savingsAccountService, savingsTransactionService } from '@/services/savingsService'
import { expenseService, expenseTypeService } from '@/services/expenseService'
import { billNumber, isBillable } from '@/features/capital/capitalUi'
import { grnId } from '@/features/purchases/purchaseUi'
import type {
    CapitalEntry, CapitalSource, Client, Expense, ExpenseType, GoodsReceipt, Purchase, Sale, SavingsAccount,
    SavingsTransaction, Supplier, SupplierPayment
} from '@/types/database'

// Everyone the business deals with, in one place
export const ACCOUNT_TYPES = ['supplier', 'client', 'source', 'savings', 'expense'] as const
export type AccountType = typeof ACCOUNT_TYPES[number]

// The page whose data each kind of account shows (the user needs access to it)
export const ACCOUNT_PAGES: Record<AccountType, PageId> = {
    supplier: 'purchases',
    client: 'clients',
    source: 'capital',
    savings: 'savings',
    expense: 'expenses'
}

// How the balance reads:
//   party  > 0 owes you, < 0 you owe them
//   fund   money held in the account
//   total  running total spent
export type BalanceMode = 'party' | 'fund' | 'total'
export const BALANCE_MODES: Record<AccountType, BalanceMode> = {
    supplier: 'party', client: 'party', source: 'party', savings: 'fund', expense: 'total'
}

// What a line is; each has a label `acct.line.<kind>`
export type LineKind =
    | 'orderPlaced' | 'orderCancelled' | 'goodsReceived' | 'supplierPayment' | 'supplierRefund'
    | 'sale' | 'creditSale' | 'saleCancelled' | 'grn' | 'grnCancelled'
    | 'capitalReceived' | 'incomeReceived' | 'capitalOnCredit' | 'incomeOnCredit' | 'goodsContributed'
    | 'loanReceived' | 'loanRepaid' | 'pledged' | 'pledgePaid' | 'creditCollected'
    | 'deposit' | 'withdrawal' | 'expense'

// Totals shown above the ledger; each has a label `acct.bucket.<bucket>`
export type Bucket =
    | 'goodsReceived' | 'paid' | 'refunded'
    | 'cashSales' | 'creditSales' | 'boughtFrom'
    | 'received' | 'onCredit' | 'borrowed' | 'repaid' | 'collected' | 'goods'
    | 'deposits' | 'withdrawals' | 'spent'

export const BUCKETS: Record<AccountType, Bucket[]> = {
    supplier: ['goodsReceived', 'paid', 'refunded'],
    client: ['cashSales', 'creditSales', 'boughtFrom'],
    source: ['received', 'onCredit', 'borrowed', 'repaid', 'collected', 'goods'],
    savings: ['deposits', 'withdrawals'],
    expense: ['spent']
}

export interface AccountLine {
    key: string
    kind: LineKind
    date: string // Local day 'YYYY-MM-DD'
    amount: number
    // Change to the account balance (0 for lines that don't move it: cash sales, orders placed...)
    effect: number
    // Money that moved in or out of the business with this line
    cash: 'in' | 'out' | null
    bucket?: Bucket
    ref?: { text: string; to?: string; page?: PageId }
    method?: string | null
    by?: string | null
    details?: string
    // Orders list their item count rather than the items
    itemCount?: number
    notes?: string
    cancelled?: boolean
    // Balance after this line
    balance: number
}

export interface Account {
    type: AccountType
    id: number
    name: string
    // Phone, contact or category shown under the name
    info?: string
    // The record's own page
    link: { to: string; page: PageId }
    lines: AccountLine[]
    balance: number
    lastDate: string | null
}

type Line = Omit<AccountLine, 'balance'> & { stamp: string; order: number }

const round = (value: number) => Math.round(value * 100) / 100 + 0
const localDay = (timestamp?: string | null) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return isNaN(date.getTime()) ? timestamp.slice(0, 10) : format(date, 'yyyy-MM-dd')
}
const itemsSummary = (items: { product_name?: string; quantity: number }[] | undefined) =>
    (items ?? []).map(item => `${item.quantity} × ${item.product_name ?? ''}`.trim()).join(', ')

// Oldest first; lines on the same day keep the order they happened in
function finish(lines: Line[]): AccountLine[] {
    lines.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order || a.stamp.localeCompare(b.stamp))
    let balance = 0
    return lines.map(({ stamp: _stamp, order: _order, ...line }) => {
        void _stamp; void _order
        balance = round(balance + line.effect)
        return { ...line, balance }
    })
}

function makeAccount(base: Omit<Account, 'lines' | 'balance' | 'lastDate'>, lines: Line[]): Account {
    const finished = finish(lines)
    const last = finished[finished.length - 1]
    return { ...base, lines: finished, balance: last?.balance ?? 0, lastDate: last?.date ?? null }
}

// Suppliers: orders, goods received (owed), payments and refunds
function supplierAccounts(suppliers: Supplier[], orders: Purchase[], payments: SupplierPayment[], entries: CapitalEntry[]): Account[] {
    // Goods on credit recorded in Capital point at their order
    const capitalByOrder = new Map(entries.filter(e => e.form === 'supplier_credit' && e.purchase_id).map(e => [e.purchase_id!, e]))
    return suppliers.filter(s => s.id).map(supplier => {
        const lines: Line[] = []
        for (const order of orders.filter(o => o.supplier_id === supplier.id)) {
            const ref = { text: `#${order.id}`, to: `/purchases/${order.id}`, page: 'purchases' as PageId }
            const capital = capitalByOrder.get(order.id!)
            // Goods on credit from Capital carry their bill number
            const details = capital && isBillable(capital) ? billNumber(capital) : undefined
            const itemCount = order.items_count || undefined
            if (!capital) {
                lines.push({
                    key: `po-${order.id}`, kind: order.status === 'cancelled' ? 'orderCancelled' : 'orderPlaced',
                    date: order.order_date, stamp: order.created_at ?? '', order: 0,
                    amount: order.total, effect: 0, cash: null, bucket: undefined, ref, by: order.created_by,
                    itemCount, notes: order.notes, cancelled: order.status === 'cancelled'
                })
            }
            if (order.status === 'received') {
                lines.push({
                    key: `gr-${order.id}`, kind: 'goodsReceived', date: order.received_date || order.order_date,
                    stamp: order.updated_at ?? order.created_at ?? '', order: 1,
                    amount: order.total, effect: -order.total, cash: null, bucket: 'goodsReceived', ref,
                    by: order.updated_by || order.created_by, details, itemCount, notes: capital ? capital.description || order.notes : order.notes
                })
            }
        }
        for (const payment of payments.filter(p => p.supplier_id === supplier.id)) {
            const isPayment = payment.type === 'payment'
            lines.push({
                key: `sp-${payment.id}`, kind: isPayment ? 'supplierPayment' : 'supplierRefund',
                date: payment.payment_date, stamp: payment.created_at ?? '', order: 2,
                amount: payment.amount, effect: isPayment ? payment.amount : -payment.amount,
                cash: isPayment ? 'out' : 'in', bucket: isPayment ? 'paid' : 'refunded',
                ref: payment.purchase_id ? { text: `#${payment.purchase_id}`, to: `/purchases/${payment.purchase_id}`, page: 'purchases' } : undefined,
                method: payment.payment_method, by: payment.created_by, notes: payment.notes
            })
        }
        return makeAccount({
            type: 'supplier', id: supplier.id!, name: supplier.name,
            info: [supplier.contact, supplier.phone].filter(Boolean).join(' · ') || undefined,
            link: { to: `/suppliers/${supplier.id}`, page: 'suppliers' }
        }, lines)
    })
}

// Clients: sales (credit sales are owed), and goods bought from them (GRN)
function clientAccounts(clients: Client[], sales: Sale[], receipts: GoodsReceipt[]): Account[] {
    return clients.filter(c => c.id).map(client => {
        const lines: Line[] = []
        // Same rule as the client page: linked by id, or older sales under the client's name
        const own = sales.filter(s => s.client_id ? s.client_id === client.id : s.customer_name === client.name)
        for (const sale of own) {
            const cancelled = sale.status === 'cancelled'
            const onCredit = sale.payment_method === 'credit'
            lines.push({
                key: `sale-${sale.id}`, kind: cancelled ? 'saleCancelled' : onCredit ? 'creditSale' : 'sale',
                date: localDay(sale.created_at), stamp: sale.created_at ?? '', order: 0,
                amount: sale.total, effect: !cancelled && onCredit ? sale.total : 0,
                cash: cancelled || onCredit ? null : 'in', bucket: cancelled ? undefined : onCredit ? 'creditSales' : 'cashSales',
                ref: { text: `#${sale.id}` }, method: sale.payment_method, by: sale.created_by,
                details: itemsSummary(sale.items), notes: sale.notes, cancelled
            })
        }
        for (const receipt of receipts.filter(r => r.client_id === client.id)) {
            const cancelled = receipt.status === 'cancelled'
            lines.push({
                key: `grn-${receipt.id}`, kind: cancelled ? 'grnCancelled' : 'grn',
                date: receipt.receipt_date, stamp: receipt.created_at ?? '', order: 1,
                amount: receipt.total, effect: 0, cash: cancelled ? null : 'out', bucket: cancelled ? undefined : 'boughtFrom',
                ref: { text: `GRN-${grnId(receipt.id)}`, to: `/purchases/grn/${receipt.id}`, page: 'purchases' },
                method: receipt.payment_method, by: receipt.created_by, details: itemsSummary(receipt.items), notes: receipt.notes, cancelled
            })
        }
        return makeAccount({
            type: 'client', id: client.id!, name: client.name,
            info: [client.phone, client.tax_id].filter(Boolean).join(' · ') || undefined,
            link: { to: `/clients/${client.id}`, page: 'clients' }
        }, lines)
    })
}

// Capital sources and lenders: capital and income, credit owed, loans, promises, and their payments
function sourceAccounts(sources: CapitalSource[], entries: CapitalEntry[]): Account[] {
    return sources.map(source => {
        const lines: Line[] = []
        for (const entry of entries.filter(e => e.source_id === source.id)) {
            const ref = { text: isBillable(entry) ? billNumber(entry) : `#${entry.id}`, to: `/capital/${entry.id}`, page: 'capital' as PageId }
            const onCredit = entry.payment_method === 'credit'
            const isIncome = entry.type === 'income'
            const base = { date: entry.entry_date, stamp: entry.created_at ?? '', order: 0, amount: entry.amount, ref, by: entry.created_by, notes: entry.description }
            if (entry.form === 'loan') {
                lines.push({ ...base, key: `ce-${entry.id}`, kind: 'loanReceived', effect: -entry.amount, cash: 'in', bucket: 'borrowed', method: entry.payment_method })
            } else if (entry.form === 'pledge') {
                lines.push({ ...base, key: `ce-${entry.id}`, kind: 'pledged', effect: entry.amount, cash: null, bucket: 'onCredit' })
            } else if (entry.form === 'goods') {
                lines.push({ ...base, key: `ce-${entry.id}`, kind: 'goodsContributed', effect: 0, cash: null, bucket: 'goods', details: itemsSummary(entry.items) })
            } else if (onCredit) {
                lines.push({ ...base, key: `ce-${entry.id}`, kind: isIncome ? 'incomeOnCredit' : 'capitalOnCredit', effect: entry.amount, cash: null, bucket: 'onCredit' })
            } else {
                lines.push({ ...base, key: `ce-${entry.id}`, kind: isIncome ? 'incomeReceived' : 'capitalReceived', effect: 0, cash: 'in', bucket: 'received', method: entry.payment_method })
            }
            for (const settlement of entry.settlements ?? []) {
                if (settlement.supplier_payment) continue
                const isLoan = entry.form === 'loan'
                lines.push({
                    key: `cs-${settlement.id}`, kind: isLoan ? 'loanRepaid' : entry.form === 'pledge' ? 'pledgePaid' : 'creditCollected',
                    date: settlement.settlement_date, stamp: settlement.created_at ?? '', order: 1,
                    amount: settlement.amount, effect: isLoan ? settlement.amount : -settlement.amount,
                    cash: isLoan ? 'out' : 'in', bucket: isLoan ? 'repaid' : 'collected', ref,
                    method: settlement.payment_method, by: settlement.created_by, notes: settlement.notes
                })
            }
        }
        return makeAccount({ type: 'source', id: source.id, name: source.name, link: { to: '/capital', page: 'capital' } }, lines)
    })
}

// Savings accounts: deposits and withdrawals; the balance is what the account holds
function savingsAccounts(accounts: SavingsAccount[], transactions: SavingsTransaction[]): Account[] {
    return accounts.filter(a => a.id).map(account => makeAccount({
        type: 'savings', id: account.id!, name: account.name, info: account.description || undefined,
        link: { to: `/savings/${account.id}`, page: 'savings' }
    }, transactions.filter(tx => tx.account_id === account.id).map(tx => {
        const isDeposit = tx.type === 'deposit'
        return {
            key: `sv-${tx.id}`, kind: isDeposit ? 'deposit' : 'withdrawal', date: tx.transaction_date, stamp: tx.created_at ?? '', order: 0,
            amount: tx.amount, effect: isDeposit ? tx.amount : -tx.amount, cash: isDeposit ? 'in' : 'out',
            bucket: isDeposit ? 'deposits' : 'withdrawals', method: tx.payment_method, by: tx.created_by, notes: tx.description
        } satisfies Line
    })))
}

// Expense categories: every expense, with the running total spent
function expenseAccounts(types: ExpenseType[], expenses: Expense[]): Account[] {
    return types.filter(type => type.id).map(type => makeAccount({
        type: 'expense', id: type.id!, name: type.name, info: type.description || undefined,
        link: { to: '/expenses', page: 'expenses' }
    }, expenses.filter(e => e.expense_type_id === type.id).map(expense => ({
        key: `ex-${expense.id}`, kind: 'expense', date: expense.expense_date, stamp: expense.created_at ?? '', order: 0,
        amount: expense.amount, effect: expense.amount, cash: 'out', bucket: 'spent',
        ref: { text: `#${expense.id}`, to: `/expenses/${expense.id}`, page: 'expenses' },
        method: expense.payment_method, by: expense.created_by, notes: expense.description
    } satisfies Line))))
}

const none = <T,>(): Promise<T[]> => Promise.resolve([])

// Every account the user may see, built from each module's records
export async function loadAccounts(user: AuthUser | null): Promise<Account[]> {
    const can = (type: AccountType) => canAccessPage(user, 'accounts') && canAccessPage(user, ACCOUNT_PAGES[type])
    const [
        suppliers, orders, payments, clients, sales, receipts, entries, sources, savings, transactions, expenseTypes, expenses
    ] = await Promise.all([
        can('supplier') ? supplierService.getAll() : none<Supplier>(),
        can('supplier') ? purchaseService.getAll() : none<Purchase>(),
        can('supplier') ? supplierPaymentService.getAll() : none<SupplierPayment>(),
        can('client') ? clientService.getAll() : none<Client>(),
        can('client') ? saleService.getAll() : none<Sale>(),
        can('client') ? goodsReceiptService.getAll() : none<GoodsReceipt>(),
        can('supplier') || can('source') ? capitalService.getAll() : none<CapitalEntry>(),
        can('source') ? capitalService.getSources() : none<CapitalSource>(),
        can('savings') ? savingsAccountService.getAll() : none<SavingsAccount>(),
        can('savings') ? savingsTransactionService.getAll() : none<SavingsTransaction>(),
        can('expense') ? expenseTypeService.getAll() : none<ExpenseType>(),
        can('expense') ? expenseService.getAll() : none<Expense>()
    ])
    return [
        ...supplierAccounts(suppliers, orders, payments, entries),
        ...clientAccounts(clients, sales, receipts),
        ...sourceAccounts(sources, entries),
        ...savingsAccounts(savings, transactions),
        ...expenseAccounts(expenseTypes, expenses)
    ]
}

export const accountKey = (account: Pick<Account, 'type' | 'id'>) => `${account.type}-${account.id}`
export const accountPath = (account: Pick<Account, 'type' | 'id'>) => `/accounts/${account.type}/${account.id}`
export const isAccountType = (value: string | undefined): value is AccountType => ACCOUNT_TYPES.includes(value as AccountType)

export const lineLabel = (kind: LineKind): TranslationKey => `acct.line.${kind}`
export const typeLabel = (type: AccountType): TranslationKey => `acct.type.${type}`
export const bucketLabel = (bucket: Bucket): TranslationKey => `acct.bucket.${bucket}`

// Totals by bucket over a set of lines
export function bucketTotals(lines: AccountLine[]): Partial<Record<Bucket, number>> {
    const totals: Partial<Record<Bucket, number>> = {}
    for (const line of lines) {
        if (!line.bucket) continue
        totals[line.bucket] = round((totals[line.bucket] ?? 0) + line.amount)
    }
    return totals
}

// Money in and out over a set of lines
export function cashTotals(lines: AccountLine[]) {
    let moneyIn = 0, moneyOut = 0
    for (const line of lines) {
        if (line.cash === 'in') moneyIn += line.amount
        if (line.cash === 'out') moneyOut += line.amount
    }
    return { moneyIn: round(moneyIn), moneyOut: round(moneyOut) }
}

// Where a balance stands, by how the account's balance reads
export function balanceState(mode: BalanceMode, value: number): { key: TranslationKey; amount: number; tone: string } {
    if (mode === 'total') return { key: 'acct.balance.spent', amount: value, tone: 'text-gray-900 dark:text-white' }
    if (mode === 'fund') return value < 0
        ? { key: 'acct.balance.overdrawn', amount: -value, tone: 'text-red-600 dark:text-red-400' }
        : { key: 'acct.balance.held', amount: value, tone: 'text-emerald-600 dark:text-emerald-400' }
    if (value > 0) return { key: 'acct.balance.owesYou', amount: value, tone: 'text-blue-600 dark:text-blue-400' }
    if (value < 0) return { key: 'acct.balance.youOwe', amount: -value, tone: 'text-red-600 dark:text-red-400' }
    return { key: 'acct.balance.settled', amount: 0, tone: 'text-green-600 dark:text-green-400' }
}
