import type { Purchase, SupplierPayment } from '@/types/database'

// Inclusive local-day range ('YYYY-MM-DD'); an open end means no limit
export interface DayRange {
    from?: string
    to?: string
}

export interface SupplierPeriodTotals {
    supplierId: number
    name: string
    // Value of goods that arrived in the period
    received: number
    paid: number
    refunded: number
}

export interface PurchaseReportSummary {
    receivedOrders: number
    goodsReceived: number
    payments: number
    paid: number
    refunded: number
    // paid - refunded: money that actually left the business
    netPaid: number
    bySupplier: SupplierPeriodTotals[]
}

export const inDayRange = (day: string | null | undefined, { from, to }: DayRange) =>
    !!day && (!from || day >= from) && (!to || day <= to)

// Goods count on the day they arrived; payments on their payment day
export function computePurchaseReport(purchases: Purchase[], payments: SupplierPayment[], range: DayRange): PurchaseReportSummary {
    const bySupplier = new Map<number, SupplierPeriodTotals>()
    const entry = (supplierId: number, name?: string) => {
        let totals = bySupplier.get(supplierId)
        if (!totals) {
            totals = { supplierId, name: name ?? '', received: 0, paid: 0, refunded: 0 }
            bySupplier.set(supplierId, totals)
        }
        if (!totals.name && name) totals.name = name
        return totals
    }

    let receivedOrders = 0, goodsReceived = 0, paymentCount = 0, paid = 0, refunded = 0
    for (const order of purchases) {
        if (order.status !== 'received' || !inDayRange(order.received_date, range)) continue
        receivedOrders++
        goodsReceived += order.total
        entry(order.supplier_id, order.supplier_name).received += order.total
    }
    for (const payment of payments) {
        if (!inDayRange(payment.payment_date, range)) continue
        paymentCount++
        const totals = entry(payment.supplier_id, payment.supplier_name)
        if (payment.type === 'payment') {
            paid += payment.amount
            totals.paid += payment.amount
        } else {
            refunded += payment.amount
            totals.refunded += payment.amount
        }
    }

    return {
        receivedOrders,
        goodsReceived,
        payments: paymentCount,
        paid,
        refunded,
        netPaid: paid - refunded,
        bySupplier: [...bySupplier.values()].sort((a, b) => (b.paid - b.refunded) - (a.paid - a.refunded) || b.received - a.received)
    }
}
