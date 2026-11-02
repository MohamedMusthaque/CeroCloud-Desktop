import { format } from 'date-fns'
import type { CapitalEntry, Expense, Product, Purchase, Sale, SaleItem, SupplierPayment } from '@/types/database'

// Profit from the bills (sales), other income and the recorded expenses:
//   net sales      = bill subtotals − discounts (tax excluded: it is owed, not earned)
//   gross profit   = net sales − cost of the goods sold
//   net profit     = gross profit + other income − expenses
// Cancelled bills are left out entirely. Owner capital is not income, so it never counts here.

// Inclusive local-day range ('YYYY-MM-DD'); an open end means no limit
export interface ProfitPeriod {
    from?: string
    to?: string
}

export interface ProfitSummary {
    bills: number
    grossSales: number
    discounts: number
    netSales: number
    taxCollected: number
    costOfGoods: number
    grossProfit: number
    grossMargin: number
    // Income earned outside sales (capital entries of type 'income')
    otherIncome: number
    expenses: number
    expensesByType: { name: string; amount: number }[]
    netProfit: number
    netMargin: number
    // Lines sold without a known cost: their full price counts as profit
    itemsWithoutCost: number
}

export interface ProductProfit {
    product: Product
    quantity: number
    revenue: number
    cost: number
    profit: number
    margin: number
}

// Local calendar day a bill was issued
export function saleDay(sale: Sale): string {
    return format(new Date(sale.created_at!), 'yyyy-MM-dd')
}

function inPeriod(day: string, { from, to }: ProfitPeriod): boolean {
    return (!from || day >= from) && (!to || day <= to)
}

function isCountedSale(sale: Sale, period: ProfitPeriod): boolean {
    return sale.status !== 'cancelled' && !!sale.created_at && inPeriod(saleDay(sale), period)
}

// Share of each line kept after the bill's discount (the discount is spread over its lines)
function discountFactor(sale: Sale): number {
    return sale.subtotal > 0 ? (sale.subtotal - (sale.discount || 0)) / sale.subtotal : 1
}

// Cost frozen on the bill at sale time; lines without one fall back to the product's current cost
function unitCost(item: SaleItem, productsById: Map<number, Product>): number | null {
    return item.unit_cost ?? productsById.get(item.product_id)?.cost ?? null
}

const byId = (products: Product[]) => new Map(products.filter(p => p.id != null).map(p => [p.id!, p]))
const percent = (part: number, whole: number) => whole > 0 ? (part / whole) * 100 : 0

export function computeProfit(sales: Sale[], expenses: Expense[], products: Product[], period: ProfitPeriod = {}, capitalEntries: CapitalEntry[] = []): ProfitSummary {
    const productsById = byId(products)
    let bills = 0, grossSales = 0, discounts = 0, taxCollected = 0, costOfGoods = 0, itemsWithoutCost = 0

    for (const sale of sales) {
        if (!isCountedSale(sale, period)) continue
        bills++
        grossSales += sale.subtotal
        discounts += sale.discount || 0
        taxCollected += sale.tax || 0
        for (const item of sale.items) {
            const cost = unitCost(item, productsById)
            if (!cost) itemsWithoutCost++
            costOfGoods += (cost ?? 0) * item.quantity
        }
    }

    const byType = new Map<string, number>()
    let expenseTotal = 0
    for (const expense of expenses) {
        if (!inPeriod(expense.expense_date, period)) continue
        expenseTotal += expense.amount
        const name = expense.expense_type_name ?? ''
        byType.set(name, (byType.get(name) ?? 0) + expense.amount)
    }

    const otherIncome = capitalEntries
        .filter(c => c.type === 'income' && inPeriod(c.entry_date, period))
        .reduce((sum, c) => sum + c.amount, 0)

    const netSales = grossSales - discounts
    const grossProfit = netSales - costOfGoods
    const netProfit = grossProfit + otherIncome - expenseTotal

    return {
        bills,
        grossSales,
        discounts,
        netSales,
        taxCollected,
        costOfGoods,
        grossProfit,
        grossMargin: percent(grossProfit, netSales),
        otherIncome,
        expenses: expenseTotal,
        expensesByType: [...byType.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
        netProfit,
        netMargin: percent(netProfit, netSales),
        itemsWithoutCost
    }
}

// Profit per product from its bill lines (after each bill's discount)
export function computeProductProfit(sales: Sale[], products: Product[], period: ProfitPeriod = {}): ProductProfit[] {
    const productsById = byId(products)
    const result = new Map<number, ProductProfit>()

    for (const sale of sales) {
        if (!isCountedSale(sale, period)) continue
        const factor = discountFactor(sale)
        for (const item of sale.items) {
            const product = productsById.get(item.product_id)
            if (!product) continue
            const entry = result.get(item.product_id) ?? { product, quantity: 0, revenue: 0, cost: 0, profit: 0, margin: 0 }
            entry.quantity += item.quantity
            entry.revenue += item.subtotal * factor
            entry.cost += (unitCost(item, productsById) ?? 0) * item.quantity
            entry.profit = entry.revenue - entry.cost
            entry.margin = percent(entry.profit, entry.revenue)
            result.set(item.product_id, entry)
        }
    }
    return [...result.values()]
}

// Cash in and out for the period. Separate from profit on purpose: paying a supplier turns cash into stock,
// and that stock becomes a cost (cost of goods sold) only when it's sold, so it must not lower profit twice.
export interface CashFlowSummary {
    // Bills paid at the till (cash, card, transfer, cheque...), tax included
    salesCollected: number
    // Bills put on a client's credit: earned, but not yet received
    creditSales: number
    otherIncome: number
    // Money put into the business as capital: money and loans on their day, promised capital as it's paid in
    // (capital given as goods brings no cash)
    capitalAdded: number
    loanRepayments: number
    ownerWithdrawals: number
    expensesPaid: number
    paidToSuppliers: number
    refundsFromSuppliers: number
    netCashFlow: number
    // Value of supplier goods that arrived in the period (stock bought)
    goodsReceived: number
}

export function computeCashFlow(sales: Sale[], expenses: Expense[], purchases: Purchase[], payments: SupplierPayment[], capitalEntries: CapitalEntry[], period: ProfitPeriod = {}): CashFlowSummary {
    let salesCollected = 0, creditSales = 0
    for (const sale of sales) {
        if (!isCountedSale(sale, period)) continue
        if (sale.payment_method === 'credit') creditSales += sale.total
        else salesCollected += sale.total
    }
    const expensesPaid = expenses.filter(e => inPeriod(e.expense_date, period)).reduce((sum, e) => sum + e.amount, 0)
    let paidToSuppliers = 0, refundsFromSuppliers = 0
    for (const payment of payments) {
        if (!inPeriod(payment.payment_date, period)) continue
        if (payment.type === 'payment') paidToSuppliers += payment.amount
        else refundsFromSuppliers += payment.amount
    }
    let otherIncome = 0, capitalAdded = 0, loanRepayments = 0, ownerWithdrawals = 0
    for (const entry of capitalEntries) {
        const onDay = inPeriod(entry.entry_date, period)
        if (entry.type === 'income') {
            if (onDay) otherIncome += entry.amount
        } else if (entry.type === 'withdrawal') {
            if (onDay) ownerWithdrawals += entry.amount
        } else if (entry.form === 'money' || entry.form === 'loan') {
            if (onDay) capitalAdded += entry.amount
        }
        for (const settlement of entry.settlements ?? []) {
            if (!inPeriod(settlement.settlement_date, period)) continue
            if (entry.form === 'loan') loanRepayments += settlement.amount
            else if (entry.form === 'pledge') capitalAdded += settlement.amount
        }
    }
    const goodsReceived = purchases
        .filter(o => o.status === 'received' && !!o.received_date && inPeriod(o.received_date, period))
        .reduce((sum, o) => sum + o.total, 0)

    return {
        salesCollected,
        creditSales,
        otherIncome,
        capitalAdded,
        loanRepayments,
        ownerWithdrawals,
        expensesPaid,
        paidToSuppliers,
        refundsFromSuppliers,
        netCashFlow: salesCollected + otherIncome + capitalAdded - loanRepayments - ownerWithdrawals - expensesPaid - paidToSuppliers + refundsFromSuppliers,
        goodsReceived
    }
}
