import { format } from 'date-fns'
import type { Expense, Product, Sale, SaleItem } from '@/types/database'

// Profit from the bills (sales) and the recorded expenses:
//   net sales      = bill subtotals − discounts (tax excluded: it is owed, not earned)
//   gross profit   = net sales − cost of the goods sold
//   net profit     = gross profit − expenses
// Cancelled bills are left out entirely.

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

export function computeProfit(sales: Sale[], expenses: Expense[], products: Product[], period: ProfitPeriod = {}): ProfitSummary {
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

    const netSales = grossSales - discounts
    const grossProfit = netSales - costOfGoods
    const netProfit = grossProfit - expenseTotal

    return {
        bills,
        grossSales,
        discounts,
        netSales,
        taxCollected,
        costOfGoods,
        grossProfit,
        grossMargin: percent(grossProfit, netSales),
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
