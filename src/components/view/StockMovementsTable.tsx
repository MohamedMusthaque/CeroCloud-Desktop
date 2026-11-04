import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import type { InventoryLog } from '@/types/database'
import { movementLabel, movementReference } from '@/lib/stockMovements'
import { ViewTable, ViewLink, viewCellClass } from './ViewPage'

interface StockMovementsTableProps {
    logs: InventoryLog[]
    // Product column, for lists that span several products
    showProduct?: boolean
    // Reference column (left out when every row comes from the same record)
    showReference?: boolean
    empty?: string
}

// Stock card rows: what moved, why, and the stock before and after
export function StockMovementsTable({ logs, showProduct = false, showReference = true, empty }: StockMovementsTableProps) {
    const { t, locale } = useTranslation()

    const columns = [
        { label: t('stock.col.date') },
        ...(showProduct ? [{ label: t('stock.col.product') }] : []),
        { label: t('stock.col.movement') },
        ...(showReference ? [{ label: t('stock.col.reference') }] : []),
        { label: t('stock.col.quantity'), align: 'right' as const },
        { label: t('stock.col.stock'), align: 'right' as const },
        { label: t('stock.col.user') },
        { label: t('stock.col.details') }
    ]

    return (
        <ViewTable columns={columns} empty={logs.length === 0 ? empty ?? t('stock.empty') : undefined}>
            {logs.map(log => {
                const reference = movementReference(log, t)
                const stockIn = log.quantity > 0
                return (
                    <tr key={log.id}>
                        <td className={cn(viewCellClass, "whitespace-nowrap")}>{log.created_at ? new Date(log.created_at).toLocaleString(locale) : '-'}</td>
                        {showProduct && (
                            <td className={viewCellClass}>
                                <ViewLink to={`/inventory/${log.product_id}`} page="inventory">{log.product_name}</ViewLink>
                                <p className="text-xs text-gray-500 font-mono">{log.product_code}</p>
                            </td>
                        )}
                        <td className={cn(viewCellClass, "whitespace-nowrap")}>
                            <span className="inline-flex items-center gap-1.5">
                                {stockIn
                                    ? <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />
                                    : <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />}
                                {movementLabel(log, t)}
                            </span>
                        </td>
                        {showReference && (
                            <td className={cn(viewCellClass, "whitespace-nowrap font-mono")}>
                                {reference.to && reference.page
                                    ? <ViewLink to={reference.to} page={reference.page}>{reference.label}</ViewLink>
                                    : reference.label}
                            </td>
                        )}
                        <td className={cn(viewCellClass, "text-right font-bold whitespace-nowrap", stockIn ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                            {stockIn ? '+' : ''}{log.quantity}
                        </td>
                        <td className={cn(viewCellClass, "text-right whitespace-nowrap")}>
                            {log.stock_before} → <span className="font-bold text-gray-900 dark:text-white">{log.stock_after}</span>
                        </td>
                        <td className={cn(viewCellClass, "whitespace-nowrap")}>{log.user || '-'}</td>
                        <td className={cn(viewCellClass, "max-w-xs truncate")} title={log.notes}>{log.notes || '-'}</td>
                    </tr>
                )
            })}
        </ViewTable>
    )
}
