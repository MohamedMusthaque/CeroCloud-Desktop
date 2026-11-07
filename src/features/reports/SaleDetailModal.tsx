import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Package, Receipt, History, Info, TrendingUp } from 'lucide-react'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { ViewSection, ViewFields, ViewField, ViewTable, ViewLink, ViewSaleStatus, viewCellClass } from '@/components/view/ViewPage'
import { StockMovementsTable } from '@/components/view/StockMovementsTable'
import { inventoryLogService } from '@/services/inventoryLogService'
import type { CompanySettings, InventoryLog, Product, Sale } from '@/types/database'

interface SaleDetailModalProps {
    sale: Sale | null
    products: Product[]
    settings: CompanySettings
    onClose: () => void
    onReprint: (sale: Sale) => void
    onCancelSale: (sale: Sale) => void
}

// Everything about one bill from the Transaction History: customer, payment, items, totals, profit, stock and audit
export function SaleDetailModal({ sale, products, settings, onClose, onReprint, onCancelSale }: SaleDetailModalProps) {
    const { t, locale } = useTranslation()
    const [movements, setMovements] = useState<InventoryLog[] | null>(null)

    // The stock movements this bill caused (out when sold, back in if cancelled)
    useEffect(() => {
        if (!sale?.id) return
        let active = true
        setMovements(null)
        inventoryLogService.getByReference('sale', sale.id)
            .then(logs => { if (active) setMovements(logs) })
            .catch(() => { if (active) setMovements([]) })
        return () => { active = false }
    }, [sale?.id])

    useEffect(() => {
        if (!sale) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [sale, onClose])

    const money = (amount: number) => formatCurrency(amount, settings.currencySymbol)
    const when = (date?: string | null) => date ? new Date(date).toLocaleString(locale) : undefined

    return createPortal(
        <AnimatePresence>
            {sale && (() => {
                const cancelled = sale.status === 'cancelled'
                const wasEdited = !!sale.updated_at && sale.updated_at !== sale.created_at
                const productsById = new Map(products.map(p => [p.id, p]))
                // Same rules as the profit report: cost frozen on the bill, else the product's current cost;
                // the bill's discount is spread over its lines and tax is not income
                const costOf = (productId: number, unitCost?: number | null) => unitCost ?? productsById.get(productId)?.cost ?? null
                const lines = sale.items.map(item => {
                    const cost = costOf(item.product_id, item.unit_cost)
                    return { item, cost, costTotal: cost === null ? null : cost * item.quantity }
                })
                const missingCost = lines.some(line => line.costTotal === null)
                const costOfGoods = lines.reduce((sum, line) => sum + (line.costTotal ?? 0), 0)
                const netSales = sale.subtotal - (sale.discount || 0)
                const profit = netSales - costOfGoods
                const taxRate = netSales > 0 && sale.tax ? Math.round((sale.tax / netSales) * 10000) / 100 : 0

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-label={t('saleDetail.title', { id: sale.id ?? '' })}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <ModalHeader title={t('saleDetail.title', { id: sale.id ?? '' })} onClose={onClose} />

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/60 dark:bg-gray-900/30">
                                {/* Headline */}
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <ViewSaleStatus status={sale.status} />
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{when(sale.created_at) ?? '-'}</span>
                                    </div>
                                    <p className={cn("text-3xl font-black", cancelled ? "text-gray-400 line-through decoration-red-500" : "text-gray-900 dark:text-white")}>
                                        {money(sale.total)}
                                    </p>
                                </div>

                                <ViewSection title={t('view.details')} icon={Info}>
                                    <ViewFields>
                                        <ViewField label={t('view.sale.number')} value={`#${sale.id}`} mono />
                                        <ViewField label={t('view.sale.date')} value={when(sale.created_at)} />
                                        <ViewField
                                            label={t('view.sale.customer')}
                                            value={sale.client_id
                                                ? <ViewLink to={`/clients/${sale.client_id}`} page="clients">{sale.customer_name || `#${sale.client_id}`}</ViewLink>
                                                : sale.customer_name || t('rep.walkIn')}
                                        />
                                        <ViewField label={t('view.sale.payment')} value={paymentMethodLabel(sale.payment_method)} />
                                        {sale.payment_method === 'cheque' && (
                                            <>
                                                <ViewField label={t('pos.chequeNumber')} value={sale.cheque_number} mono />
                                                <ViewField label={t('saleDetail.chequeBank')} value={sale.cheque_bank} />
                                            </>
                                        )}
                                        <ViewField label={t('view.createdBy')} value={sale.created_by || undefined} />
                                        {wasEdited && (
                                            <>
                                                <ViewField label={cancelled ? t('saleDetail.cancelledAt') : t('view.updatedAt')} value={when(sale.updated_at)} />
                                                <ViewField label={cancelled ? t('saleDetail.cancelledBy') : t('view.updatedBy')} value={sale.updated_by || undefined} />
                                            </>
                                        )}
                                        <ViewField label={t('view.notes')} value={sale.notes} wide />
                                    </ViewFields>
                                </ViewSection>

                                <ViewSection
                                    title={t('saleDetail.items')}
                                    icon={Package}
                                    actions={<span className="text-xs text-gray-500">{t('rep.itemsShort', { count: sale.items.length })}</span>}
                                >
                                    <ViewTable
                                        columns={[
                                            { label: t('saleDetail.code') }, { label: t('cliHistory.product') },
                                            { label: t('view.sale.qty'), align: 'right' }, { label: t('view.sale.unitPrice'), align: 'right' },
                                            { label: t('saleDetail.unitCost'), align: 'right' }, { label: t('view.sale.subtotal'), align: 'right' }
                                        ]}
                                        empty={sale.items.length === 0 ? t('saleDetail.noItems') : undefined}
                                    >
                                        {lines.map(({ item, cost }) => (
                                            <tr key={item.id ?? `${item.product_id}-${item.product_code}`}>
                                                <td className={cn(viewCellClass, "font-mono text-xs whitespace-nowrap")}>{item.product_code || '-'}</td>
                                                <td className={viewCellClass}>
                                                    <ViewLink to={`/inventory/${item.product_id}`} page="inventory">{item.product_name}</ViewLink>
                                                </td>
                                                <td className={cn(viewCellClass, "text-right whitespace-nowrap")}>{item.quantity}</td>
                                                <td className={cn(viewCellClass, "text-right whitespace-nowrap")}>{money(item.unit_price)}</td>
                                                <td className={cn(viewCellClass, "text-right whitespace-nowrap text-gray-500")}>{cost === null ? '-' : money(cost)}</td>
                                                <td className={cn(viewCellClass, "text-right whitespace-nowrap font-bold text-gray-900 dark:text-white")}>{money(item.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </ViewTable>
                                </ViewSection>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <ViewSection title={t('saleDetail.totals')} icon={Receipt}>
                                        <dl className="space-y-2 text-sm">
                                            <TotalRow label={t('pos.subtotal')} value={money(sale.subtotal)} />
                                            {sale.discount > 0 && <TotalRow label={t('pos.discount')} value={`- ${money(sale.discount)}`} />}
                                            {sale.tax > 0 && <TotalRow label={t('pos.tax', { rate: taxRate })} value={money(sale.tax)} />}
                                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <TotalRow label={t('view.sale.total')} value={money(sale.total)} strong />
                                            </div>
                                        </dl>
                                    </ViewSection>

                                    {!cancelled && (
                                        <ViewSection title={t('saleDetail.profit')} icon={TrendingUp}>
                                            <dl className="space-y-2 text-sm">
                                                <TotalRow label={t('saleDetail.netSales')} value={money(netSales)} />
                                                <TotalRow label={t('saleDetail.costOfGoods')} value={`- ${money(costOfGoods)}`} />
                                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <TotalRow
                                                        label={t('saleDetail.grossProfit')}
                                                        value={money(profit)}
                                                        strong
                                                        tone={profit < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
                                                    />
                                                </div>
                                            </dl>
                                            {missingCost && <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">{t('saleDetail.missingCost')}</p>}
                                        </ViewSection>
                                    )}
                                </div>

                                <ViewSection title={t('saleDetail.stock')} icon={History}>
                                    {movements === null
                                        ? <p className="text-center text-gray-500 py-6">{t('common.loading')}</p>
                                        : <StockMovementsTable logs={movements} showProduct showReference={false} empty={movements.length === 0 ? t('saleDetail.noStock') : undefined} />}
                                </ViewSection>
                            </div>

                            <div className="shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-wrap justify-end gap-3">
                                {!cancelled && (
                                    <button
                                        onClick={() => onCancelSale(sale)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        {t('rep.cancelSale')}
                                    </button>
                                )}
                                <button
                                    onClick={() => onReprint(sale)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    {t('rep.reprint')}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {t('common.close')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
            })()}
        </AnimatePresence>,
        document.body
    )
}

function TotalRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <dt className={cn("text-gray-500 dark:text-gray-400", strong && "font-bold text-gray-900 dark:text-white")}>{label}</dt>
            <dd className={cn("whitespace-nowrap", strong ? "text-lg font-black" : "font-semibold", tone ?? "text-gray-900 dark:text-white")}>{value}</dd>
        </div>
    )
}
