import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { cn, formatCurrency } from '@/lib/utils'
import { PAYMENT_METHODS } from '@/lib/paymentMethods'
import { purchaseService } from '@/services/purchaseService'
import { companyService } from '@/services/companyService'
import type { Product, Purchase, Supplier } from '@/types/database'
import { purchaseErrorMessage } from './purchaseErrors'
import { roundMoney } from './purchaseUi'

interface ItemRow {
    key: number
    productId: string
    quantity: string
    unitCost: string
}

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

let nextKey = 1
const emptyRow = (): ItemRow => ({ key: nextKey++, productId: '', quantity: '1', unitCost: '' })

export function PurchaseForm({ isOpen, purchase, suppliers, products, defaultSupplierId, onClose, onSaved }: PurchaseFormProps) {
    const { t } = useTranslation()
    const [supplierId, setSupplierId] = useState('')
    const [orderDate, setOrderDate] = useState('')
    const [notes, setNotes] = useState('')
    const [rows, setRows] = useState<ItemRow[]>([])
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
            ? purchase.items.map(item => ({ key: nextKey++, productId: String(item.product_id), quantity: String(item.ordered_quantity), unitCost: String(item.unit_cost) }))
            : [emptyRow()])
        setPayAdvance(false)
        setAdvanceAmount('')
        setAdvanceMethod('cash')
    }, [isOpen, purchase, defaultSupplierId])

    // The chosen supplier's products are listed first
    const { supplierProducts, otherProducts } = useMemo(() => ({
        supplierProducts: products.filter(p => supplierId && String(p.supplier_id) === supplierId),
        otherProducts: products.filter(p => !supplierId || String(p.supplier_id) !== supplierId)
    }), [products, supplierId])

    const total = roundMoney(rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.unitCost) || 0), 0))

    const updateRow = (key: number, patch: Partial<ItemRow>) => {
        setRows(prev => prev.map(row => row.key === key ? { ...row, ...patch } : row))
    }

    // Picking a product fills in its current cost
    const selectProduct = (key: number, productId: string) => {
        const product = products.find(p => String(p.id) === productId)
        const row = rows.find(r => r.key === key)
        updateRow(key, { productId, unitCost: row?.unitCost || (product?.cost ? String(product.cost) : '') })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const input = {
                supplier_id: Number(supplierId),
                order_date: orderDate,
                notes,
                items: rows.map(row => ({ product_id: Number(row.productId), quantity: Number(row.quantity), unit_cost: Number(row.unitCost) || 0 })),
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
                            <div>
                                <span className={labelClass}>{t('purForm.items')}</span>
                                <div className="space-y-2">
                                    <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_6rem_8rem_7rem_2.5rem] gap-2 px-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                        <span>{t('purForm.product')}</span>
                                        <span>{t('purForm.quantity')}</span>
                                        <span>{t('purForm.unitCost')}</span>
                                        <span className="text-right">{t('purForm.subtotal')}</span>
                                        <span />
                                    </div>
                                    {rows.map(row => (
                                        <div key={row.key} className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_7rem_2.5rem] gap-2 items-center p-2 sm:p-0 rounded-xl border sm:border-0 border-gray-200 dark:border-gray-700">
                                            <select
                                                required
                                                aria-label={t('purForm.product')}
                                                value={row.productId}
                                                onChange={(e) => selectProduct(row.key, e.target.value)}
                                                className={cn(inputClass, "col-span-2 sm:col-span-1")}
                                            >
                                                <option value="" disabled>{t('purForm.selectProduct')}</option>
                                                {supplierProducts.length > 0 && (
                                                    <optgroup label={t('purForm.supplierProducts')}>
                                                        {supplierProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                                                    </optgroup>
                                                )}
                                                <optgroup label={supplierProducts.length > 0 ? t('purForm.otherProducts') : t('purForm.product')}>
                                                    {otherProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                                                </optgroup>
                                            </select>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                required
                                                aria-label={t('purForm.quantity')}
                                                value={row.quantity}
                                                onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                                                className={inputClass}
                                            />
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                    aria-label={t('purForm.unitCost')}
                                                    value={row.unitCost}
                                                    onChange={(e) => updateRow(row.key, { unitCost: e.target.value })}
                                                    placeholder="0.00"
                                                    className={cn(inputClass, "pl-7")}
                                                />
                                            </div>
                                            <span className="text-right text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                                {formatCurrency((Number(row.quantity) || 0) * (Number(row.unitCost) || 0))}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setRows(prev => prev.filter(r => r.key !== row.key))}
                                                disabled={rows.length === 1}
                                                title={t('purForm.removeItem')}
                                                aria-label={t('purForm.removeItem')}
                                                className="justify-self-end p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between gap-4 mt-3">
                                    <button
                                        type="button"
                                        onClick={() => setRows(prev => [...prev, emptyRow()])}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t('purForm.addItem')}
                                    </button>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('purForm.total')}: <span className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(total)}</span>
                                    </p>
                                </div>
                            </div>

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
                                                    <input
                                                        id="purchase-advance"
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        required
                                                        value={advanceAmount}
                                                        onChange={(e) => setAdvanceAmount(e.target.value)}
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
