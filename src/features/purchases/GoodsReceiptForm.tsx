import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Save, Loader2, UserCheck, UserPlus, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { cn } from '@/lib/utils'
import { PAYMENT_METHODS } from '@/lib/paymentMethods'
import { goodsReceiptService } from '@/services/purchaseService'
import { companyService } from '@/services/companyService'
import { pdfGenerator } from '@/services/pdfGenerator'
import type { Client, GoodsReceipt, Product, Supplier } from '@/types/database'
import { GoodsItemsEditor } from './GoodsItemsEditor'
import { emptyGoodsRow, goodsInput, type GoodsRow } from './goodsRows'
import { purchaseErrorMessage } from './purchaseErrors'

interface GoodsReceiptFormProps {
    isOpen: boolean
    clients: Client[]
    suppliers: Supplier[]
    products: Product[]
    // Client or supplier preselected (e.g. from their page)
    defaultClientId?: number
    defaultSupplierId?: number
    onClose: () => void
    onSaved: (receipt: GoodsReceipt) => void
}

type SellerKind = 'client' | 'supplier' | 'walkIn'

// New Goods Received Note: goods bought from a client, a supplier or a walk-in seller, paid on the spot
export function GoodsReceiptForm({ isOpen, clients, suppliers, products, defaultClientId, defaultSupplierId, onClose, onSaved }: GoodsReceiptFormProps) {
    const { t } = useTranslation()
    const [sellerKind, setSellerKind] = useState<SellerKind>('client')
    const [clientId, setClientId] = useState('')
    const [supplierId, setSupplierId] = useState('')
    // Buying from a supplier can update the products' cost, like receiving an order
    const [updateCosts, setUpdateCosts] = useState(true)
    const [sellerName, setSellerName] = useState('')
    const [date, setDate] = useState('')
    const [rows, setRows] = useState<GoodsRow[]>([])
    const [method, setMethod] = useState<string>('cash')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setSellerKind(
            defaultSupplierId ? 'supplier'
                : defaultClientId || clients.length > 0 ? 'client'
                    : suppliers.length > 0 ? 'supplier'
                        : 'walkIn'
        )
        setClientId(defaultClientId ? String(defaultClientId) : '')
        setSupplierId(defaultSupplierId ? String(defaultSupplierId) : '')
        setUpdateCosts(true)
        setSellerName('')
        setDate(format(new Date(), 'yyyy-MM-dd'))
        setRows([emptyGoodsRow()])
        setMethod('cash')
        setNotes('')
    }, [isOpen, defaultClientId, defaultSupplierId, clients.length, suppliers.length])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const receipt = await goodsReceiptService.create({
                client_id: sellerKind === 'client' ? Number(clientId) : null,
                supplier_id: sellerKind === 'supplier' ? Number(supplierId) : null,
                client_name: sellerKind === 'walkIn' ? sellerName : undefined,
                receipt_date: date,
                payment_method: method,
                notes,
                items: goodsInput(rows),
                // Buying from a client or walk-in seller never changes the products' cost
                update_costs: sellerKind === 'supplier' && updateCosts
            })
            const settings = companyService.getSettings()
            toast.success(t('grn.created'), {
                action: { label: t('grn.print'), onClick: () => pdfGenerator.generateGoodsReceipt(receipt, settings) },
                duration: 8000
            })
            onSaved(receipt)
            onClose()
        } catch (error) {
            toast.error(purchaseErrorMessage(error, t))
        } finally {
            setSaving(false)
        }
    }

    const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"

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
                        <ModalHeader title={t('grnForm.title')} onClose={onClose} className="sticky top-0 z-10" />

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Seller */}
                            <div>
                                <span className={labelClass}>{t('grnForm.receivedFrom')}</span>
                                <div className="grid grid-cols-3 gap-2 mb-3" role="radiogroup" aria-label={t('grnForm.receivedFrom')}>
                                    {([
                                        { id: 'client', label: t('grnForm.registered'), icon: UserCheck },
                                        { id: 'supplier', label: t('grnForm.supplier'), icon: Truck },
                                        { id: 'walkIn', label: t('grnForm.walkIn'), icon: UserPlus }
                                    ] as const).map(option => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={sellerKind === option.id}
                                            onClick={() => setSellerKind(option.id)}
                                            className={cn(
                                                "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                                                sellerKind === option.id
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                            )}
                                        >
                                            <option.icon className="w-4 h-4" />
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                {sellerKind === 'client' ? (
                                    <select required value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label={t('grnForm.registered')} className={inputClass}>
                                        <option value="" disabled>{t('grnForm.selectClient')}</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.tax_id ? ` · ${c.tax_id}` : ''}</option>)}
                                    </select>
                                ) : sellerKind === 'supplier' ? (
                                    <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} aria-label={t('grnForm.supplier')} className={inputClass}>
                                        <option value="" disabled>{t('grnForm.selectSupplier')}</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}{s.contact ? ` · ${s.contact}` : ''}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        required
                                        value={sellerName}
                                        onChange={(e) => setSellerName(e.target.value)}
                                        placeholder={t('grnForm.sellerPlaceholder')}
                                        aria-label={t('grnForm.sellerName')}
                                        className={inputClass}
                                    />
                                )}
                            </div>

                            <GoodsItemsEditor rows={rows} onChange={setRows} products={products} totalLabel={t('grnForm.total')} />
                            {sellerKind === 'supplier' && (
                                <label className="flex items-center gap-2 cursor-pointer w-fit">
                                    <input
                                        type="checkbox"
                                        checked={updateCosts}
                                        onChange={(e) => setUpdateCosts(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-200">{t('purRecv.updateCosts')}</span>
                                </label>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="grn-date" className={labelClass}>{t('grnForm.date')}</label>
                                    <input id="grn-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label htmlFor="grn-method" className={labelClass}>{t('grnForm.paidBy')}</label>
                                    <select id="grn-method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="grn-notes" className={labelClass}>{t('grnForm.notes')}</label>
                                <textarea
                                    id="grn-notes"
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={t('grnForm.notesPlaceholder')}
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
                                    {t('grnForm.save')}
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
