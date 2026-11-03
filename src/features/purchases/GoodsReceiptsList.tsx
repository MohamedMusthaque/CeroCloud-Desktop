import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, Printer, Ban, PackageCheck } from 'lucide-react'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import type { GoodsReceipt } from '@/types/database'
import type { ViewMode } from '@/components/ui/ViewModeToggle'
import { grnId } from './purchaseUi'

interface GoodsReceiptsListProps {
    receipts: GoodsReceipt[]
    viewMode: ViewMode
    formatDay: (day: string) => string
    onPrint: (receipt: GoodsReceipt) => void
    onCancel: (receipt: GoodsReceipt) => void
}

const iconButton = "p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
const cancelButton = "p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"

// Goods Received Notes on the Purchases page, as a table or as cards
export function GoodsReceiptsList({ receipts, viewMode, formatDay, onPrint, onCancel }: GoodsReceiptsListProps) {
    const { t } = useTranslation()

    const statusBadge = (receipt: GoodsReceipt) => (
        <span className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap",
            receipt.status === 'cancelled'
                ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        )}>
            {receipt.status === 'cancelled' ? <Ban className="w-3.5 h-3.5" /> : <PackageCheck className="w-3.5 h-3.5" />}
            {t(`grn.status.${receipt.status}`)}
        </span>
    )

    const seller = (receipt: GoodsReceipt) => receipt.client_id
        ? <Link to={`/clients/${receipt.client_id}`} className="font-medium text-gray-900 dark:text-white hover:text-primary hover:underline">{receipt.client_name}</Link>
        : <span className="font-medium text-gray-900 dark:text-white" title={t('grn.walkIn')}>{receipt.client_name}</span>

    const actions = (receipt: GoodsReceipt) => (
        <div className="flex justify-end gap-1">
            <button onClick={() => onPrint(receipt)} className={iconButton} title={t('grn.print')}><Printer className="w-4 h-4" /></button>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <Link to={`/purchases/grn/${receipt.id}`} className={iconButton} title={t('view.view')}><Eye className="w-4 h-4" /></Link>
                {receipt.status === 'completed' && (
                    <button onClick={() => onCancel(receipt)} className={cancelButton} title={t('grn.cancel')}><Ban className="w-4 h-4" /></button>
                )}
            </div>
        </div>
    )

    const itemsLabel = (receipt: GoodsReceipt) => {
        const count = receipt.items?.length ?? 0
        return count === 1 ? t('pur.itemsCountOne') : t('pur.itemsCount', { count })
    }

    if (viewMode === 'grid') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {receipts.map(receipt => (
                    <motion.div
                        key={receipt.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                            "group bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-md hover:shadow-xl transition-all p-5 flex flex-col",
                            receipt.status === 'cancelled' && "opacity-70"
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <Link to={`/purchases/grn/${receipt.id}`} className="font-black text-lg text-gray-900 dark:text-white hover:text-primary font-mono">
                                    {t('grn.number', { id: grnId(receipt.id) })}
                                </Link>
                                <p className="truncate">{seller(receipt)}</p>
                            </div>
                            {statusBadge(receipt)}
                        </div>
                        <div className="mt-4 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('grn.col.total')}</p>
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{itemsLabel(receipt)}</span>
                            </div>
                            <p className={cn("text-2xl font-black truncate", receipt.status === 'cancelled' ? "text-gray-400 line-through" : "text-gray-900 dark:text-white")}>
                                {formatCurrency(receipt.total)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {receipt.items?.map(i => i.product_name).join(', ')}
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {formatDay(receipt.receipt_date)} · {paymentMethodLabel(receipt.payment_method)}
                            </span>
                            {actions(receipt)}
                        </div>
                    </motion.div>
                ))}
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3">{t('grn.col.number')}</th>
                        <th className="px-4 py-3">{t('grn.col.date')}</th>
                        <th className="px-4 py-3">{t('grn.col.client')}</th>
                        <th className="px-4 py-3">{t('grn.col.items')}</th>
                        <th className="px-4 py-3">{t('grn.col.payment')}</th>
                        <th className="px-4 py-3">{t('grn.col.status')}</th>
                        <th className="px-4 py-3 text-right">{t('grn.col.total')}</th>
                        <th className="px-4 py-3" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {receipts.map(receipt => (
                        <tr key={receipt.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                                <Link to={`/purchases/grn/${receipt.id}`} className="font-bold font-mono text-gray-900 dark:text-white hover:text-primary hover:underline">
                                    {t('grn.number', { id: grnId(receipt.id) })}
                                </Link>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{formatDay(receipt.receipt_date)}</td>
                            <td className="px-4 py-3">{seller(receipt)}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={receipt.items?.map(i => i.product_name).join(', ')}>
                                {itemsLabel(receipt)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{paymentMethodLabel(receipt.payment_method)}</td>
                            <td className="px-4 py-3">{statusBadge(receipt)}</td>
                            <td className={cn("px-4 py-3 text-right font-bold whitespace-nowrap", receipt.status === 'cancelled' ? "text-gray-400 line-through" : "text-gray-900 dark:text-white")}>
                                {formatCurrency(receipt.total)}
                            </td>
                            <td className="px-4 py-3">{actions(receipt)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
