import { useCallback, useState } from 'react'
import { parseISO } from 'date-fns'
import { useParams } from 'react-router-dom'
import { Info, Package, Banknote, CalendarDays, Truck, CheckCircle2, Hourglass, Trash2, ClipboardList, User } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { capitalService } from '@/services/capitalService'
import { productService } from '@/services/productService'
import { supplierService } from '@/services/supplierService'
import type { CapitalEntry, CapitalSettlement, Product, Supplier } from '@/types/database'
import {
    ViewHeader, ViewAvatar, ViewSection, ViewFields, ViewField, ViewAudit, ViewStat,
    ViewTable, ViewLink, ViewLoading, ViewNotFound, viewCellClass
} from '@/components/view/ViewPage'
import { useRecord, parseId } from '@/components/view/useRecord'
import { CapitalEntryForm } from './CapitalEntryForm'
import { CapitalSettlementForm } from './CapitalSettlementForm'
import { FORM_ICONS, TYPE_STYLES, amountSign, capitalErrorMessage, formLabel, isGoodsForm, isSettledForm, outstandingOf, sourceOf, typeLabel } from './capitalUi'

interface CapitalRecord {
    entry: CapitalEntry
    products: Product[]
    suppliers: Supplier[]
}

export function CapitalView() {
    const { t, locale } = useTranslation()
    const entryId = parseId(useParams().id)
    const [editing, setEditing] = useState(false)
    const [settling, setSettling] = useState(false)
    const [toDelete, setToDelete] = useState<CapitalSettlement | null>(null)

    const load = useCallback(async (): Promise<CapitalRecord | null> => {
        if (!entryId) return null
        const [entries, products, suppliers] = await Promise.all([capitalService.getAll(), productService.getAll(), supplierService.getAll()])
        const entry = entries.find(e => e.id === entryId)
        return entry ? { entry, products, suppliers } : null
    }, [entryId])
    const { data, loading, reload } = useRecord(load)

    const backLabel = t('view.backTo', { page: t('nav.capital') })
    if (loading) return <ViewLoading />
    if (!data) return <ViewNotFound backTo="/capital" backLabel={backLabel} />

    const { entry, products, suppliers } = data
    const style = TYPE_STYLES[entry.type] ?? TYPE_STYLES.capital
    const FormIcon = FORM_ICONS[entry.form] ?? FORM_ICONS.money
    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)
    const isSettled = isSettledForm(entry.form)
    const outstanding = outstandingOf(entry)
    const settledLabel = entry.form === 'loan' ? t('capView.repaid') : t('capView.paidIn')

    const deleteSettlement = async () => {
        if (!toDelete?.id) return
        try {
            await capitalService.deleteSettlement(toDelete.id)
            toast.success(t('capSettle.deleted'))
            reload()
        } catch (error) {
            toast.error(capitalErrorMessage(error, t))
        } finally {
            setToDelete(null)
        }
    }

    return (
        <div className="space-y-6 pb-20 p-2">
            <ViewHeader
                backTo="/capital"
                backLabel={backLabel}
                avatar={<ViewAvatar gradient="from-indigo-500 to-blue-600"><style.icon className="w-8 h-8" /></ViewAvatar>}
                title={`${amountSign(entry)}${formatCurrency(entry.amount)}`}
                subtitle={`${t('capView.title', { type: typeLabel(entry.type, t), id: entry.id ?? '' })} · ${formatDay(entry.entry_date)}`}
                badges={<>
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold", style.badge)}>
                        <style.icon className="w-3.5 h-3.5" />
                        {typeLabel(entry.type, t)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        <FormIcon className="w-3.5 h-3.5" />
                        {formLabel(entry.form, t)}
                    </span>
                </>}
                onEdit={() => setEditing(true)}
            />

            {isSettled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ViewStat label={t('cap.col.amount')} value={formatCurrency(entry.amount)} icon={FormIcon} color="bg-indigo-500" />
                    <ViewStat label={settledLabel} value={formatCurrency(entry.settled ?? 0)} icon={CheckCircle2} color="bg-green-500" />
                    <ViewStat label={t('capView.outstanding')} value={formatCurrency(outstanding)} icon={Hourglass} color={outstanding > 0 ? 'bg-amber-500' : 'bg-gray-500'} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ViewSection title={t('view.details')} icon={Info} className="lg:col-span-2">
                    <ViewFields>
                        <ViewField label={t('cap.col.type')} value={typeLabel(entry.type, t)} icon={style.icon} />
                        <ViewField label={t('cap.col.form')} value={formLabel(entry.form, t)} icon={FormIcon} />
                        <ViewField label={t('cap.col.date')} value={formatDay(entry.entry_date)} icon={CalendarDays} />
                        <ViewField label={t('cap.col.amount')} value={formatCurrency(entry.amount)} icon={Banknote} />
                        {entry.form === 'supplier_credit'
                            ? <ViewField label={t('capForm.supplier')} value={entry.supplier_id ? <ViewLink to={`/suppliers/${entry.supplier_id}`} page="suppliers">{entry.supplier_name}</ViewLink> : undefined} icon={Truck} />
                            : <ViewField label={entry.form === 'loan' ? t('capForm.lender') : t('cap.col.source')} value={sourceOf(entry)} icon={User} />}
                        <ViewField label={t('cap.col.payment')} value={entry.payment_method ? paymentMethodLabel(entry.payment_method) : undefined} icon={Banknote} />
                        <ViewField label={t('view.description')} value={entry.description} wide />
                    </ViewFields>
                </ViewSection>
                <ViewAudit record={entry} />
            </div>

            {isGoodsForm(entry.form) && (
                <ViewSection
                    title={t('capView.goods')}
                    icon={Package}
                    actions={entry.purchase_id && (
                        <ViewLink to={`/purchases/${entry.purchase_id}`} page="purchases">
                            <span className="inline-flex items-center gap-1"><ClipboardList className="w-4 h-4" />{t('capView.supplierOrder')} #{entry.purchase_id}</span>
                        </ViewLink>
                    )}
                >
                    <ViewTable
                        columns={[
                            { label: t('purForm.product') }, { label: t('purForm.quantity'), align: 'right' },
                            { label: t('purForm.unitCost'), align: 'right' }, { label: t('purForm.subtotal'), align: 'right' }
                        ]}
                    >
                        {(entry.items ?? []).map(item => (
                            <tr key={item.id}>
                                <td className={viewCellClass}>
                                    <ViewLink to={`/inventory/${item.product_id}`} page="inventory">{item.product_name}</ViewLink>
                                    <p className="text-xs text-gray-500 font-mono">{item.product_code}</p>
                                </td>
                                <td className={cn(viewCellClass, "text-right")}>{item.quantity}</td>
                                <td className={cn(viewCellClass, "text-right")}>{formatCurrency(item.unit_cost)}</td>
                                <td className={cn(viewCellClass, "text-right font-bold text-gray-900 dark:text-white")}>{formatCurrency(item.quantity * item.unit_cost)}</td>
                            </tr>
                        ))}
                    </ViewTable>
                    {entry.form === 'supplier_credit' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-8">{t('capView.supplierOrderHint')}</p>}
                </ViewSection>
            )}

            {isSettled && (
                <ViewSection
                    title={entry.form === 'loan' ? t('capView.repayments') : t('capView.paymentsIn')}
                    icon={CheckCircle2}
                    actions={outstanding > 0 && (
                        <button onClick={() => setSettling(true)} className="px-3 py-1.5 rounded-lg text-sm font-bold text-primary hover:bg-primary/10 transition-colors">
                            {entry.form === 'loan' ? t('cap.repay') : t('cap.payIn')}
                        </button>
                    )}
                >
                    <ViewTable
                        columns={[
                            { label: t('capSettle.date') }, { label: t('capSettle.method') }, { label: t('capSettle.notes') },
                            { label: t('capSettle.amount'), align: 'right' }, { label: '' }
                        ]}
                        empty={entry.settlements?.length ? undefined : t('capView.noSettlements')}
                    >
                        {(entry.settlements ?? []).map(settlement => (
                            <tr key={settlement.id} className="group">
                                <td className={cn(viewCellClass, "whitespace-nowrap")}>{formatDay(settlement.settlement_date)}</td>
                                <td className={viewCellClass}>{paymentMethodLabel(settlement.payment_method)}</td>
                                <td className={cn(viewCellClass, "max-w-xs truncate")} title={settlement.notes}>{settlement.notes || '-'}</td>
                                <td className={cn(viewCellClass, "text-right font-bold text-gray-900 dark:text-white")}>{formatCurrency(settlement.amount)}</td>
                                <td className={viewCellClass}>
                                    <div className="flex justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setToDelete(settlement)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </ViewTable>
                </ViewSection>
            )}

            <CapitalEntryForm
                isOpen={editing}
                entry={entry}
                products={products}
                suppliers={suppliers}
                onClose={() => setEditing(false)}
                onSaved={reload}
            />

            <CapitalSettlementForm entry={settling ? entry : null} onClose={() => setSettling(false)} onSaved={reload} />

            <ConfirmDialog
                isOpen={!!toDelete}
                title={t('capSettle.deleteTitle')}
                description={toDelete ? t('capSettle.deleteDesc', { amount: formatCurrency(toDelete.amount), date: formatDay(toDelete.settlement_date) }) : ''}
                confirmText={t('capSettle.deleteConfirm')}
                variant="danger"
                onConfirm={deleteSettlement}
                onCancel={() => setToDelete(null)}
            />
        </div>
    )
}
