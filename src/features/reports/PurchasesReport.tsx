import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { PackageCheck, ArrowUpCircle, ArrowDownCircle, Clock, Users, Banknote } from 'lucide-react'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { periodDayBounds, type ReportPeriod } from '@/lib/reportPeriod'
import { computePurchaseReport, inDayRange } from '@/lib/purchaseReport'
import type { Purchase, SupplierAccount, SupplierPayment } from '@/types/database'
import { AccountBalance } from '@/features/purchases/Purchases'
import { ReportPeriodFilter } from './ReportPeriodFilter'

interface PurchasesReportProps {
    purchases: Purchase[]
    payments: SupplierPayment[]
    accounts: SupplierAccount[]
}

export function PurchasesReport({ purchases, payments, accounts }: PurchasesReportProps) {
    const { t, locale, dateLocale } = useTranslation()
    const [period, setPeriod] = useState<ReportPeriod>({ range: 'month' })

    const range = useMemo(() => periodDayBounds(period, dateLocale), [period, dateLocale])
    const summary = useMemo(() => computePurchaseReport(purchases, payments, range), [purchases, payments, range])
    const periodPayments = useMemo(() => payments.filter(p => inDayRange(p.payment_date, range)), [payments, range])

    // Pending orders are a snapshot of today, not of the period
    const pending = purchases.filter(o => o.status === 'ordered')
    const pendingValue = pending.reduce((sum, o) => sum + o.total, 0)
    const openAdvances = accounts.reduce((sum, a) => sum + a.open_advances, 0)
    const accountsById = new Map(accounts.map(a => [a.supplier_id, a]))

    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)
    const isEmpty = summary.receivedOrders === 0 && summary.payments === 0

    return (
        <div className="space-y-6">
            {/* Title + period */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('purRep.title')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('purRep.subtitle')}</p>
                </div>
                <ReportPeriodFilter value={period} onChange={setPeriod} />
            </div>

            {/* Headline figures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Figure label={t('purRep.goodsReceived')} value={formatCurrency(summary.goodsReceived)} hint={t('purRep.ordersCount', { count: summary.receivedOrders })} icon={PackageCheck} tone="teal" />
                <Figure label={t('purRep.paid')} value={formatCurrency(summary.paid)} hint={t('purRep.paymentsCount', { count: summary.payments })} icon={ArrowUpCircle} tone="red" />
                <Figure label={t('purRep.refunds')} value={formatCurrency(summary.refunded)} hint={t('purRep.netPaid', { amount: formatCurrency(summary.netPaid) })} icon={ArrowDownCircle} tone="green" />
                <Figure
                    label={t('purRep.pending')}
                    value={String(pending.length)}
                    hint={t('purRep.pendingHint', { value: formatCurrency(pendingValue), advances: formatCurrency(openAdvances) })}
                    icon={Clock}
                    tone="amber"
                />
            </div>

            {isEmpty ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
                    {t('purRep.noData')}
                </div>
            ) : (
                <>
                    {/* By supplier */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 pb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('purRep.bySupplier')}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">{t('purRep.col.supplier')}</th>
                                        <th className="px-6 py-3 text-right">{t('purRep.col.received')}</th>
                                        <th className="px-6 py-3 text-right">{t('purRep.col.paid')}</th>
                                        <th className="px-6 py-3 text-right">{t('purRep.col.refunded')}</th>
                                        <th className="px-6 py-3 text-right">{t('purRep.col.netPaid')}</th>
                                        <th className="px-6 py-3 text-right">{t('purRep.col.balance')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 tabular-nums">
                                    {summary.bySupplier.map(row => {
                                        const account = accountsById.get(row.supplierId)
                                        return (
                                            <tr key={row.supplierId}>
                                                <td className="px-6 py-3">
                                                    <Link to={`/suppliers/${row.supplierId}`} className="font-medium text-gray-900 dark:text-white hover:text-primary hover:underline">{row.name}</Link>
                                                </td>
                                                <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-300">{formatCurrency(row.received)}</td>
                                                <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-300">{formatCurrency(row.paid)}</td>
                                                <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-300">{formatCurrency(row.refunded)}</td>
                                                <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(row.paid - row.refunded)}</td>
                                                <td className="px-6 py-3 text-right whitespace-nowrap">{account ? <AccountBalance account={account} /> : '-'}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot className="border-t-2 border-gray-200 dark:border-gray-700 font-bold tabular-nums">
                                    <tr>
                                        <td className="px-6 py-3 text-gray-900 dark:text-white">{t('print.total')}</td>
                                        <td className="px-6 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(summary.goodsReceived)}</td>
                                        <td className="px-6 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(summary.paid)}</td>
                                        <td className="px-6 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(summary.refunded)}</td>
                                        <td className="px-6 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(summary.netPaid)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <p className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700/50">{t('purRep.balanceNote')}</p>
                    </div>

                    {/* Payments in the period */}
                    {periodPayments.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 pb-4 flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-gray-400" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('purRep.payments')}</h3>
                            </div>
                            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3">{t('pur.col.date')}</th>
                                            <th className="px-6 py-3">{t('pur.col.supplier')}</th>
                                            <th className="px-6 py-3">{t('supPay.col.type')}</th>
                                            <th className="px-6 py-3">{t('supPay.col.order')}</th>
                                            <th className="px-6 py-3">{t('supPay.col.method')}</th>
                                            <th className="px-6 py-3 text-right">{t('supPay.col.amount')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {periodPayments.map(payment => {
                                            const isPayment = payment.type === 'payment'
                                            return (
                                                <tr key={payment.id}>
                                                    <td className="px-6 py-3 whitespace-nowrap text-gray-900 dark:text-white">{formatDay(payment.payment_date)}</td>
                                                    <td className="px-6 py-3 text-gray-900 dark:text-white">{payment.supplier_name}</td>
                                                    <td className="px-6 py-3 whitespace-nowrap">
                                                        <span className={cn("inline-flex items-center gap-1 text-xs font-bold", isPayment ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                                                            {isPayment ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                                                            {t(`supPay.typeShort.${payment.type}`)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap">
                                                        {payment.purchase_id
                                                            ? <Link to={`/purchases/${payment.purchase_id}`} className="text-primary hover:underline">#{payment.purchase_id}</Link>
                                                            : <span className="text-gray-400">-</span>}
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{paymentMethodLabel(payment.payment_method)}</td>
                                                    <td className={cn("px-6 py-3 text-right font-bold whitespace-nowrap tabular-nums", isPayment ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                                                        {isPayment ? '-' : '+'}{formatCurrency(payment.amount)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

const TONES = {
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
}

function Figure({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: React.ElementType; tone: keyof typeof TONES }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-300 dark:border-gray-700 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-2xl font-black mt-1 truncate tabular-nums text-gray-900 dark:text-white" title={value}>{value}</p>
                <p className="text-xs text-gray-400 mt-1 truncate">{hint}</p>
            </div>
            <div className={cn("p-3 rounded-xl shrink-0", TONES[tone])}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    )
}
