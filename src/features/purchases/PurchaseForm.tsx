import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { cn } from '@/lib/utils'
import { PAYMENT_METHODS } from '@/lib/paymentMethods'
import { purchaseService } from '@/services/purchaseService'
import { companyService } from '@/services/companyService'
import type { Product, Purchase, Supplier } from '@/types/database'
import { purchaseErrorMessage } from './purchaseErrors'
import { GoodsItemsEditor } from './GoodsItemsEditor'
import { emptyGoodsRow, goodsInput, goodsRow, goodsTotal, type GoodsRow } from './goodsRows'
import { AmountInput } from '@/components/ui/AmountInput'

interface PurchaseFormProps {
    isOpen: boolean
    purchase: Purchase | null
    suppliers: Supplier[]
    products: Product[]
    // Supplier preselected for a new order (e.g. from the supplier page)
    defaultSupplierId?: number
    onClose: () => void
    onSaved: (purchase: Purchase) => void
}

export function PurchaseForm({ isOpen, purchase, suppliers, products, defaultSupplierId, onClose, onSaved }: PurchaseFormProps) {
    const { t } = useTranslation()
    const [supplierId, setSupplierId] = useState('')
    const [orderDate, setOrderDate] = useState('')
    const [notes, setNotes] = useState('')
    const [rows, setRows] = useState<GoodsRow[]>([])
    const [payAdvance, setPayAdvance] = useState(false)
    const [advanceAmount, setAdvanceAmount] = useState('')
    const [advanceMethod, setAdvanceMethod] = useState<string>('cash')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setSupplierId(purchase ? String(purchase.supplier_id) : defaultSupplierId ? String(defaultSupplierId) : '')
        setOrderDate(purchase?.order_date ?? format(new Date(), 'yyyy-MM-dd'))
        setNotes(purchase?.notes ?? '')
        setRows(purchase?.items?.length
            ? purchase.items.map(item => goodsRow(item.product_id, item.ordered_quantity, item.unit_cost))
            : [emptyGoodsRow()])
        setPayAdvance(false)
        setAdvanceAmount('')
        setAdvanceMethod('cash')
    }, [isOpen, purchase, defaultSupplierId])

    const total = goodsTotal(rows)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const input = {
                supplier_id: Number(supplierId),
                order_date: orderDate,
                notes,
                items: goodsInput(rows),
                advance: !purchase && payAdvance ? { amount: Number(advanceAmount), payment_method: advanceMethod, payment_date: orderDate } : null
            }
            const saved = purchase?.id ? await purchaseService.update(purchase.id, input) : await purchaseService.create(input)
            toast.success(purchase?.id ? t('purForm.updated') : t('purForm.created'))
            onSaved(saved)
            onClose()
        } catch (error) {
            toast.error(purchaseErrorMessage(error, t))
        } finally {
            setSaving(false)
        }
    }

    const { currencySymbol } = companyService.getSettings()
    const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
    const inputClass = "w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
                    >
                        <ModalHeader
                            title={purchase?.id ? t('purForm.editTitle', { id: purchase.id }) : t('purForm.newTitle')}
                            onClose={onClose}
                            className="sticky top-0 z-10"
                        />

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="purchase-supplier" className={labelClass}>{t('purForm.supplier')}</label>
                                    <select
                                        id="purchase-supplier"
                                        required
                                        value={supplierId}
                                        onChange={(e) => setSupplierId(e.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="" disabled>{t('purForm.selectSupplier')}</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="purchase-date" className={labelClass}>{t('purForm.date')}</label>
                                    <input
                                        id="purchase-date"
                                        type="date"
                                        required
                                        value={orderDate}
                                        onChange={(e) => setOrderDate(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            {/* Items */}
                            <GoodsItemsEditor rows={rows} onChange={setRows} products={products} supplierId={supplierId} totalLabel={t('purForm.total')} />

                            {/* Advance (new orders; later payments are recorded from the order page) */}
                            {!purchase && (
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                                        <input
                                            type="checkbox"
                                            checked={payAdvance}
                                            onChange={(e) => {
                                                setPayAdvance(e.target.checked)
                                                if (e.target.checked && !advanceAmount && total > 0) setAdvanceAmount(String(total))
                                            }}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('purForm.payAdvance')}</span>
                                    </label>
                                    {payAdvance && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="purchase-advance" className={labelClass}>{t('purForm.advanceAmount')}</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                                    <AmountInput
                                                        id="purchase-advance"
                                                        min="0.01"
                                                        required
                                                        value={advanceAmount}
                                                        onChange={setAdvanceAmount}
                                                        className={cn(inputClass, "pl-7")}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="purchase-advance-method" className={labelClass}>{t('purForm.paymentMethod')}</label>
                                                <select
                                                    id="purchase-advance-method"
                                                    value={advanceMethod}
                                                    onChange={(e) => setAdvanceMethod(e.target.value)}
                                                    className={inputClass}
                                                >
                                                    {PAYMENT_METHODS.map(method => <option key={method} value={method}>{paymentMethodLabel(method)}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label htmlFor="purchase-notes" className={labelClass}>{t('purForm.notes')}</label>
                                <textarea
                                    id="purchase-notes"
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={t('purForm.notesPlaceholder')}
                                    className={`${inputClass} resize-none`}
                                />
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
                                    {t('purForm.save')}
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
