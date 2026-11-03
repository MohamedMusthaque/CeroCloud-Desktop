import { useCallback, useState } from 'react'
import { parseISO } from 'date-fns'
import { useParams } from 'react-router-dom'
import { PackagePlus, Info, Package, Printer, Ban, User, CalendarDays, CreditCard, StickyNote, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { goodsReceiptService } from '@/services/purchaseService'
import { companyService } from '@/services/companyService'
import { pdfGenerator } from '@/services/pdfGenerator'
import {
    ViewHeader, ViewAvatar, ViewSection, ViewFields, ViewField, ViewAudit,
    ViewTable, ViewLink, ViewLoading, ViewNotFound, viewCellClass
} from '@/components/view/ViewPage'
import { useRecord, parseId } from '@/components/view/useRecord'
import { purchaseErrorMessage } from './purchaseErrors'
import { grnId } from './purchaseUi'

export function GoodsReceiptView() {
    const { t, locale } = useTranslation()
    const receiptId = parseId(useParams().id)
    const [confirmCancel, setConfirmCancel] = useState(false)

    const load = useCallback(async () => receiptId ? goodsReceiptService.getById(receiptId) : null, [receiptId])
    const { data: receipt, loading, reload } = useRecord(load)

    const backLabel = t('view.backTo', { page: t('nav.purchases') })
    if (loading) return <ViewLoading />
    if (!receipt) return <ViewNotFound backTo="/purchases" backLabel={backLabel} />

    const number = t('grn.number', { id: grnId(receipt.id) })
    const cancelled = receipt.status === 'cancelled'
    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)

    const print = () => {
        toast.promise(pdfGenerator.generateGoodsReceipt(receipt, companyService.getSettings()), {
            loading: t('rep.export.generating'), success: t('rep.export.success'), error: t('rep.export.error')
        })
    }

    const cancel = async () => {
        setConfirmCancel(false)
        try {
            await goodsReceiptService.cancel(receipt.id!)
            toast.success(t('grn.cancelled'))
            reload()
        } catch (error) {
            toast.error(purchaseErrorMessage(error, t))
        }
    }

    return (
        <div className="space-y-6 pb-20 p-2">
            <ViewHeader
                backTo="/purchases"
                backLabel={backLabel}
                avatar={<ViewAvatar gradient="from-emerald-500 to-teal-600"><PackagePlus className="w-8 h-8" /></ViewAvatar>}
                title={number}
                subtitle={`${receipt.client_name} · ${formatDay(receipt.receipt_date)}`}
                badges={
                    <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                        cancelled ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    )}>
                        {cancelled ? <Ban className="w-3.5 h-3.5" /> : <PackageCheck className="w-3.5 h-3.5" />}
                        {t(`grn.status.${receipt.status}`)}
                    </span>
                }
            />

            <div className="flex flex-wrap gap-2">
                <button
                    onClick={print}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-colors"
                >
                    <Printer className="w-4 h-4" />
                    {t('grn.print')}
                </button>
                {!cancelled && (
                    <button
                        onClick={() => setConfirmCancel(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                        <Ban className="w-4 h-4" />
                        {t('grn.cancel')}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ViewSection title={t('view.details')} icon={Info} className="lg:col-span-2">
                    <ViewFields>
                        <ViewField
                            label={t('grnView.client')}
                            value={receipt.client_id
                                ? <ViewLink to={`/clients/${receipt.client_id}`} page="clients">{receipt.client_name}</ViewLink>
                                : `${receipt.client_name} (${t('grn.walkIn')})`}
                            icon={User}
                        />
                        <ViewField label={t('grnView.date')} value={formatDay(receipt.receipt_date)} icon={CalendarDays} />
                        <ViewField label={t('grnView.paidBy')} value={paymentMethodLabel(receipt.payment_method)} icon={CreditCard} />
                        <ViewField label={t('grn.col.total')} value={formatCurrency(receipt.total)} icon={PackagePlus} />
                        <ViewField label={t('view.notes')} value={receipt.notes} icon={StickyNote} wide />
                    </ViewFields>
                </ViewSection>
                <ViewAudit record={receipt} />
            </div>

            <ViewSection title={t('grnView.items')} icon={Package}>
                <ViewTable
                    columns={[
                        { label: t('purForm.product') }, { label: t('purForm.quantity'), align: 'right' },
                        { label: t('purForm.unitCost'), align: 'right' }, { label: t('purForm.subtotal'), align: 'right' }
                    ]}
                >
                    {(receipt.items ?? []).map(item => (
                        <tr key={item.id}>
                            <td className={viewCellClass}>
                                <ViewLink to={`/inventory/${item.product_id}`} page="inventory">{item.product_name}</ViewLink>
                                <p className="text-xs text-gray-500 font-mono">{item.product_code}</p>
                            </td>
                            <td className={cn(viewCellClass, "text-right")}>{item.quantity}</td>
                            <td className={cn(viewCellClass, "text-right")}>{formatCurrency(item.unit_cost)}</td>
                            <td className={cn(viewCellClass, "text-right font-bold text-gray-900 dark:text-white")}>{formatCurrency(item.subtotal)}</td>
                        </tr>
                    ))}
                    <tr>
                        <td className={cn(viewCellClass, "font-bold text-gray-900 dark:text-white")} colSpan={3}>{t('print.totalPaid')}</td>
                        <td className={cn(viewCellClass, "text-right font-black text-gray-900 dark:text-white", cancelled && "line-through text-gray-400")}>{formatCurrency(receipt.total)}</td>
                    </tr>
                </ViewTable>
            </ViewSection>

            <ConfirmDialog
                isOpen={confirmCancel}
                title={t('grn.cancelTitle')}
                description={t('grn.cancelDesc', { number })}
                confirmText={t('grn.cancelConfirm')}
                variant="danger"
                onConfirm={cancel}
                onCancel={() => setConfirmCancel(false)}
            />
        </div>
    )
}
