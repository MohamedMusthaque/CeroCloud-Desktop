import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { ClipboardList, Info, Package, Banknote, Wallet, HandCoins, Truck, CalendarDays, PackageCheck, Ban, Trash2, StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { purchaseService, supplierAccountService, supplierPaymentService } from '@/services/purchaseService'
import { supplierService } from '@/services/supplierService'
import { productService } from '@/services/productService'
import type { Product, Purchase, Supplier, SupplierAccount, SupplierPayment } from '@/types/database'
import {
    ViewHeader, ViewAvatar, ViewSection, ViewFields, ViewField, ViewAudit, ViewStat,
    ViewTable, ViewLink, ViewLoading, ViewNotFound, viewCellClass
} from '@/components/view/ViewPage'
import { useRecord, parseId } from '@/components/view/useRecord'
import { PurchaseForm } from './PurchaseForm'
import { ReceiveGoodsDialog } from './ReceiveGoodsDialog'
import { SupplierPaymentForm, type SupplierPaymentPreset } from './SupplierPaymentForm'
import { PaymentRow } from './Purchases'
import { purchaseErrorMessage } from './purchaseErrors'
import { STATUS_STYLES, accountState, statusLabel } from './purchaseUi'

interface PurchaseRecord {
    order: Purchase
    payments: SupplierPayment[]
    account: SupplierAccount
    suppliers: Supplier[]
    products: Product[]
    supplierOrders: Purchase[]
}

export function PurchaseView() {
    const { t, locale } = useTranslation()
    const navigate = useNavigate()
    const purchaseId = parseId(useParams().id)
    const [editing, setEditing] = useState(false)
    const [receiving, setReceiving] = useState(false)
    const [paymentPreset, setPaymentPreset] = useState<SupplierPaymentPreset | null>(null)
    const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null)
    const [paymentToDelete, setPaymentToDelete] = useState<SupplierPayment | null>(null)

    const load = useCallback(async (): Promise<PurchaseRecord | null> => {
        if (!purchaseId) return null
        const order = await purchaseService.getById(purchaseId)
        if (!order) return null
        const [payments, account, suppliers, products, orders] = await Promise.all([
            supplierPaymentService.getAll(), supplierAccountService.get(order.supplier_id),
            supplierService.getAll(), productService.getAll(), purchaseService.getAll()
        ])
        return {
            order,
            payments: payments.filter(p => p.purchase_id === purchaseId),
            account,
            suppliers,
            products,
            supplierOrders: orders.filter(o => o.supplier_id === order.supplier_id)
        }
    }, [purchaseId])
    const { data, loading, reload } = useRecord(load)

    const backLabel = t('view.backTo', { page: t('nav.purchases') })
    if (loading) return <ViewLoading />
    if (!data) return <ViewNotFound backTo="/purchases" backLabel={backLabel} />

    const { order, payments, account, suppliers, products, supplierOrders } = data
    const style = STATUS_STYLES[order.status]
    const isOpen = order.status === 'ordered'
    const paid = order.paid ?? 0
    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)
    const leftToPay = Math.max(order.total - paid, 0)
    // Amount on its own line so it fits the card; whether it's owed or in credit goes underneath
    const balance = accountState(account)

    const runAction = async (action: () => Promise<unknown>, success: string, after?: () => void) => {
        try {
            await action()
            toast.success(success)
            if (after) after()
            else reload()
        } catch (error) {
            toast.error(purchaseErrorMessage(error, t))
        }
    }

    const actionClass = "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"

    return (
        <div className="space-y-6 pb-20 p-2">
            <ViewHeader
                backTo="/purchases"
                backLabel={backLabel}
                avatar={<ViewAvatar gradient="from-teal-500 to-cyan-600"><ClipboardList className="w-8 h-8" /></ViewAvatar>}
                title={t('pur.orderTitle', { id: order.id ?? '' })}
                subtitle={`${order.supplier_name} · ${formatDay(order.order_date)}`}
                badges={
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold", style.badge)}>
                        <style.icon className="w-3.5 h-3.5" />
                        {statusLabel(order.status, t)}
                        {order.received_date && ` · ${formatDay(order.received_date)}`}
                    </span>
                }
                onEdit={isOpen ? () => setEditing(true) : undefined}
            />

            {/* Steps available for this order */}
            {(isOpen || order.status === 'cancelled') && (
                <div className="flex flex-wrap gap-2">
                    {isOpen && (
                        <>
                            <button onClick={() => setReceiving(true)} className={cn(actionClass, "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20")}>
                                <PackageCheck className="w-4 h-4" />
                                {t('pur.receive')}
                            </button>
                            <button
                                onClick={() => setPaymentPreset({ supplierId: order.supplier_id, purchaseId: order.id, type: 'payment', amount: leftToPay || undefined })}
                                className={cn(actionClass, "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700")}
                            >
                                <HandCoins className="w-4 h-4" />
                                {t('pur.payAdvance')}
                            </button>
                            <button onClick={() => setConfirm('cancel')} className={cn(actionClass, "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30")}>
                                <Ban className="w-4 h-4" />
                                {t('pur.cancelOrder')}
                            </button>
                        </>
                    )}
                    {payments.length === 0 && (
                        <button onClick={() => setConfirm('delete')} className={cn(actionClass, "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30")}>
                            <Trash2 className="w-4 h-4" />
                            {t('common.delete')}
                        </button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ViewStat label={t('purView.orderValue')} value={formatCurrency(order.total)} icon={ClipboardList} color="bg-teal-500" />
                <ViewStat
                    label={t('purView.paidForOrder')}
                    value={formatCurrency(paid)}
                    hint={isOpen ? (leftToPay > 0 ? t('purView.remaining', { amount: formatCurrency(leftToPay) }) : t('purView.advanceCovers')) : undefined}
                    icon={HandCoins}
                    color="bg-purple-500"
                />
                <ViewStat
                    label={t('pur.acc.title')}
                    value={<span className={balance.tone}>{balance.state === 'settled' ? t('pur.acc.settled') : formatCurrency(balance.amount)}</span>}
                    hint={balance.state === 'settled' ? order.supplier_name : `${t(`pur.acc.state.${balance.state}`)} · ${order.supplier_name ?? ''}`}
                    icon={Wallet}
                    color="bg-blue-500"
                />
                <ViewStat label={t('pur.col.items')} value={order.items?.length ?? 0} icon={Package} color="bg-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ViewSection title={t('view.details')} icon={Info} className="lg:col-span-2">
                    <ViewFields>
                        <ViewField label={t('pur.col.supplier')} value={<ViewLink to={`/suppliers/${order.supplier_id}`} page="suppliers">{order.supplier_name}</ViewLink>} icon={Truck} />
                        <ViewField label={t('pur.col.status')} value={statusLabel(order.status, t)} icon={style.icon} />
                        <ViewField label={t('purForm.date')} value={formatDay(order.order_date)} icon={CalendarDays} />
                        <ViewField label={t('purRecv.date')} value={order.received_date ? formatDay(order.received_date) : undefined} icon={PackageCheck} />
                        <ViewField label={t('view.notes')} value={order.notes} icon={StickyNote} wide />
                    </ViewFields>
                </ViewSection>
                <ViewAudit record={order} />
            </div>

            <ViewSection title={t('purView.items')} icon={Package}>
                <ViewTable
                    columns={[
                        { label: t('purForm.product') }, { label: t('purRecv.ordered'), align: 'right' }, { label: t('purRecv.received'), align: 'right' },
                        { label: t('purForm.unitCost'), align: 'right' }, { label: t('purForm.subtotal'), align: 'right' }
                    ]}
                >
                    {(order.items ?? []).map(item => {
                        const quantity = item.received_quantity ?? item.ordered_quantity
                        const short = item.received_quantity != null && item.received_quantity < item.ordered_quantity
                        return (
                            <tr key={item.id}>
                                <td className={viewCellClass}>
                                    <ViewLink to={`/inventory/${item.product_id}`} page="inventory">{item.product_name}</ViewLink>
                                    <p className="text-xs text-gray-500 font-mono">{item.product_code}</p>
                                </td>
                                <td className={cn(viewCellClass, "text-right")}>{item.ordered_quantity}</td>
                                <td className={cn(viewCellClass, "text-right font-medium", short && "text-amber-600 dark:text-amber-400")}>
                                    {item.received_quantity ?? '-'}
                                </td>
                                <td className={cn(viewCellClass, "text-right")}>{formatCurrency(item.unit_cost)}</td>
                                <td className={cn(viewCellClass, "text-right font-bold text-gray-900 dark:text-white")}>{formatCurrency(quantity * item.unit_cost)}</td>
                            </tr>
                        )
                    })}
                </ViewTable>
            </ViewSection>

            <ViewSection
                title={t('purView.payments')}
                icon={Banknote}
                actions={order.status !== 'cancelled' && (
                    <button
                        onClick={() => setPaymentPreset({ supplierId: order.supplier_id, purchaseId: order.id, type: 'payment' })}
                        className="px-3 py-1.5 rounded-lg text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
                    >
                        {t('pur.recordPayment')}
                    </button>
                )}
            >
                <ViewTable
                    columns={[
                        { label: t('pur.col.date') }, { label: t('supPay.col.type') }, { label: t('supPay.col.order') }, { label: t('supPay.col.method') },
                        { label: t('supPay.col.notes') }, { label: t('supPay.col.recordedBy') }, { label: t('supPay.col.amount'), align: 'right' }, { label: '' }
                    ]}
                    empty={payments.length === 0 ? t('purView.noPayments') : undefined}
                >
                    {payments.map(payment => (
                        <PaymentRow key={payment.id} payment={payment} formatDay={formatDay} onDelete={() => setPaymentToDelete(payment)} />
                    ))}
                </ViewTable>
            </ViewSection>

            <PurchaseForm
                isOpen={editing}
                purchase={order}
                suppliers={suppliers}
                products={products}
                onClose={() => setEditing(false)}
                onSaved={reload}
            />

            <ReceiveGoodsDialog purchaseId={receiving ? order.id! : null} onClose={() => setReceiving(false)} onReceived={reload} />

            <SupplierPaymentForm
                isOpen={!!paymentPreset}
                suppliers={suppliers}
                orders={supplierOrders}
                preset={paymentPreset ?? undefined}
                onClose={() => setPaymentPreset(null)}
                onSaved={reload}
            />

            <ConfirmDialog
                isOpen={confirm === 'cancel'}
                title={t('pur.cancelTitle')}
                description={t('pur.cancelDesc', { id: order.id ?? '' })}
                confirmText={t('pur.cancelConfirm')}
                variant="danger"
                onConfirm={() => { setConfirm(null); runAction(() => purchaseService.cancel(order.id!), t('pur.cancelled')) }}
                onCancel={() => setConfirm(null)}
            />

            <ConfirmDialog
                isOpen={confirm === 'delete'}
                title={t('pur.deleteTitle')}
                description={t('pur.deleteDesc', { id: order.id ?? '' })}
                confirmText={t('pur.deleteConfirm')}
                variant="danger"
                onConfirm={() => { setConfirm(null); runAction(() => purchaseService.delete(order.id!), t('pur.deleted'), () => navigate('/purchases')) }}
                onCancel={() => setConfirm(null)}
            />

            <ConfirmDialog
                isOpen={!!paymentToDelete}
                title={t('supPay.deleteTitle')}
                description={paymentToDelete ? t('supPay.deleteDesc', {
                    type: t(`supPay.typeShort.${paymentToDelete.type}`).toLowerCase(),
                    amount: formatCurrency(paymentToDelete.amount),
                    date: formatDay(paymentToDelete.payment_date),
                    supplier: paymentToDelete.supplier_name ?? ''
                }) : ''}
                confirmText={t('supPay.deleteConfirm')}
                variant="danger"
                onConfirm={() => { const id = paymentToDelete!.id!; setPaymentToDelete(null); runAction(() => supplierPaymentService.delete(id), t('supPay.deleted')) }}
                onCancel={() => setPaymentToDelete(null)}
            />
        </div>
    )
}
