import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Save, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { cn, formatCurrency } from '@/lib/utils'
import { PAYMENT_METHODS } from '@/lib/paymentMethods'
import { supplierAccountService, supplierPaymentService } from '@/services/purchaseService'
import { companyService } from '@/services/companyService'
import type { Purchase, Supplier, SupplierAccount, SupplierPaymentType } from '@/types/database'
import { purchaseErrorMessage } from './purchaseErrors'
import { statusLabel } from './purchaseUi'

export interface SupplierPaymentPreset {
    supplierId?: number
    purchaseId?: number
    type?: SupplierPaymentType
    amount?: number
}

interface SupplierPaymentFormProps {
    isOpen: boolean
    suppliers: Supplier[]
    // Orders that a payment can be linked to (cancelled ones are skipped)
    orders: Purchase[]
    preset?: SupplierPaymentPreset
    onClose: () => void
    onSaved: () => void
}

export function SupplierPaymentForm({ isOpen, suppliers, orders, preset, onClose, onSaved }: SupplierPaymentFormProps) {
    const { t, locale } = useTranslation()
    const [supplierId, setSupplierId] = useState('')
    const [purchaseId, setPurchaseId] = useState('')
    const [type, setType] = useState<SupplierPaymentType>('payment')
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState('')
    const [method, setMethod] = useState<string>('cash')
    const [notes, setNotes] = useState('')
    const [account, setAccount] = useState<SupplierAccount | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setSupplierId(preset?.supplierId ? String(preset.supplierId) : '')
        setPurchaseId(preset?.purchaseId ? String(preset.purchaseId) : '')
        setType(preset?.type ?? 'payment')
        setAmount(preset?.amount ? String(preset.amount) : '')
        setDate(format(new Date(), 'yyyy-MM-dd'))
        setMethod('cash')
        setNotes('')
    }, [isOpen, preset])

    // Show where the supplier account stands before recording
    useEffect(() => {
        setAccount(null)
        if (!isOpen || !supplierId) return
        let stale = false
        supplierAccountService.get(Number(supplierId)).then(result => { if (!stale) setAccount(result) }).catch(console.error)
        return () => { stale = true }
    }, [isOpen, supplierId])

    const supplierOrders = orders.filter(o => String(o.supplier_id) === supplierId && o.status !== 'cancelled')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            await supplierPaymentService.create({
                supplier_id: Number(supplierId),
                purchase_id: purchaseId ? Number(purchaseId) : null,
                type,
                amount: Number(amount),
                payment_date: date,
                payment_method: method,
                notes
            })
            toast.success(t('supPay.created'))
            onSaved()
            onClose()
        } catch (error) {
            toast.error(purchaseErrorMessage(error, t))
        } finally {
            setSaving(false)
        }
    }

    const { currencySymbol } = companyService.getSettings()
    const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
                    >
                        <ModalHeader title={t('supPay.newTitle')} onClose={onClose} className="sticky top-0 z-10" />

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('supPay.type')}>
                                {([
                                    { id: 'payment', icon: ArrowUpCircle, active: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
                                    { id: 'refund', icon: ArrowDownCircle, active: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' }
                                ] as const).map(option => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={type === option.id}
                                        onClick={() => setType(option.id)}
                                        className={cn(
                                            "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-colors",
                                            type === option.id ? option.active : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                        )}
                                    >
                                        <option.icon className="w-4 h-4" />
                                        {t(`supPay.type.${option.id}`)}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label htmlFor="sup-pay-supplier" className={labelClass}>{t('supPay.supplier')}</label>
                                <select
                                    id="sup-pay-supplier"
                                    required
                                    value={supplierId}
                                    onChange={(e) => { setSupplierId(e.target.value); setPurchaseId('') }}
                                    className={inputClass}
                                >
                                    <option value="" disabled>{t('purForm.selectSupplier')}</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                {account && (
                                    <p className={cn("text-xs mt-1 font-medium",
                                        account.available > 0 ? "text-blue-600 dark:text-blue-400" : account.available < 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-500")}>
                                        {account.available > 0 ? t('pur.acc.credit', { amount: formatCurrency(account.available) })
                                            : account.available < 0 ? t('pur.acc.owed', { amount: formatCurrency(-account.available) })
                                                : t('pur.acc.settled')}
                                        {account.open_advances > 0 && ` · ${t('pur.acc.advances')}: ${formatCurrency(account.open_advances)}`}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="sup-pay-order" className={labelClass}>{t('supPay.order')}</label>
                                <select
                                    id="sup-pay-order"
                                    value={purchaseId}
                                    onChange={(e) => setPurchaseId(e.target.value)}
                                    disabled={!supplierId}
                                    className={inputClass}
                                >
                                    <option value="">{t('supPay.noOrder')}</option>
                                    {supplierOrders.map(o => (
                                        <option key={o.id} value={o.id}>
                                            {t('supPay.orderOption', {
                                                id: o.id ?? '',
                                                date: parseISO(o.order_date).toLocaleDateString(locale),
                                                amount: formatCurrency(o.total),
                                                status: statusLabel(o.status, t)
                                            })}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('supPay.orderHint')}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="sup-pay-amount" className={labelClass}>{t('supPay.amount')}</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                        <input
                                            id="sup-pay-amount"
                                            type="number"
                                            inputMode="decimal"
                                            min="0.01"
                                            step="0.01"
                                            required
                                            autoFocus
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className={`${inputClass} pl-8`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="sup-pay-date" className={labelClass}>{t('supPay.date')}</label>
                                    <input id="sup-pay-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="sup-pay-method" className={labelClass}>{t('supPay.method')}</label>
                                <select id="sup-pay-method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="sup-pay-notes" className={labelClass}>{t('supPay.notes')}</label>
                                <textarea id="sup-pay-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} resize-none`} />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 text-sm font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {t('supPay.save')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
