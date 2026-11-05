import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { formatCurrency } from '@/lib/utils'
import { PAYMENT_METHODS } from '@/lib/paymentMethods'
import { capitalService } from '@/services/capitalService'
import { companyService } from '@/services/companyService'
import type { CapitalEntry } from '@/types/database'
import { capitalErrorMessage, outstandingOf, sourceOf } from './capitalUi'

interface CapitalSettlementFormProps {
    // Loan, promised capital or credit entry being settled; null closes the form
    entry: CapitalEntry | null
    onClose: () => void
    onSaved: () => void
}

// Loan repayment (money out), or payment in towards promised capital or a credit entry (money in)
export function CapitalSettlementForm({ entry, onClose, onSaved }: CapitalSettlementFormProps) {
    const { t } = useTranslation()
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState('')
    const [method, setMethod] = useState<string>('cash')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const outstanding = entry ? outstandingOf(entry) : 0

    useEffect(() => {
        if (!entry) return
        setAmount(outstandingOf(entry) > 0 ? String(outstandingOf(entry)) : '')
        setDate(format(new Date(), 'yyyy-MM-dd'))
        setMethod('cash')
        setNotes('')
    }, [entry])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!entry?.id) return
        setSaving(true)
        try {
            await capitalService.settle(entry.id, { amount: Number(amount), settlement_date: date, payment_method: method, notes })
            toast.success(t('capSettle.saved'))
            onSaved()
            onClose()
        } catch (error) {
            toast.error(capitalErrorMessage(error, t))
        } finally {
            setSaving(false)
        }
    }

    const { currencySymbol } = companyService.getSettings()
    const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"

    return createPortal(
        <AnimatePresence>
            {entry && (
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
                        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <ModalHeader
                            title={entry.form === 'loan' ? t('capSettle.repayTitle')
                                : entry.form === 'supplier_credit' ? t('capSettle.supplierTitle')
                                    : entry.payment_method === 'credit' ? t('capSettle.receiveTitle') : t('capSettle.payInTitle')}
                            onClose={onClose}
                        />

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-bold text-gray-900 dark:text-white">{sourceOf(entry) || '-'}</span>
                                {' · '}
                                {t('capSettle.outstanding', { amount: formatCurrency(outstanding) })}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="settle-amount" className={labelClass}>{t('capSettle.amount')}</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                        <input
                                            id="settle-amount"
                                            type="number"
                                            inputMode="decimal"
                                            min="0.01"
                                            max={outstanding}
                                            step="0.01"
                                            required
                                            autoFocus
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className={`${inputClass} pl-8`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="settle-date" className={labelClass}>{t('capSettle.date')}</label>
                                    <input id="settle-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="settle-method" className={labelClass}>{t('capSettle.method')}</label>
                                <select id="settle-method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="settle-notes" className={labelClass}>{t('capSettle.notes')}</label>
                                <textarea id="settle-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} resize-none`} />
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
                                    {t('capSettle.save')}
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
