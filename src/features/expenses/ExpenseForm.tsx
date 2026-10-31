import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { X, Save, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { expenseService } from '@/services/expenseService'
import { companyService } from '@/services/companyService'
import type { Expense, ExpenseType } from '@/types/database'
import { expenseErrorMessage } from './expenseErrors'
import { ExpenseTypeForm } from './ExpenseTypes'

const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'cheque', 'other'] as const

interface ExpenseFormProps {
    isOpen: boolean
    expense: Expense | null
    types: ExpenseType[]
    onClose: () => void
    onSaved: () => void
    // A type was created from inside the form
    onTypeCreated: () => void
}

export function ExpenseForm({ isOpen, expense, types, onClose, onSaved, onTypeCreated }: ExpenseFormProps) {
    const { t } = useTranslation()
    const [date, setDate] = useState('')
    const [typeId, setTypeId] = useState('')
    const [amount, setAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState<string>('cash')
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)
    const [typeFormOpen, setTypeFormOpen] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setDate(expense?.expense_date ?? format(new Date(), 'yyyy-MM-dd'))
        setTypeId(expense ? String(expense.expense_type_id) : '')
        setAmount(expense ? String(expense.amount) : '')
        setPaymentMethod(expense?.payment_method ?? 'cash')
        setDescription(expense?.description ?? '')
    }, [isOpen, expense])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const input = {
                expense_type_id: Number(typeId),
                amount: Number(amount),
                expense_date: date,
                payment_method: paymentMethod,
                description
            }
            if (expense?.id) {
                await expenseService.update(expense.id, input)
                toast.success(t('expForm.updated'))
            } else {
                await expenseService.create(input)
                toast.success(t('expForm.created'))
            }
            onSaved()
            onClose()
        } catch (error) {
            toast.error(expenseErrorMessage(error, t))
        } finally {
            setSaving(false)
        }
    }

    const handleTypeCreated = (type: ExpenseType) => {
        if (type.id) setTypeId(String(type.id))
        onTypeCreated()
    }

    const { currencySymbol } = companyService.getSettings()
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
                        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {expense ? t('expForm.editTitle') : t('expForm.newTitle')}
                            </h2>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="expense-date" className={labelClass}>{t('expForm.date')}</label>
                                    <input
                                        id="expense-date"
                                        type="date"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="expense-amount" className={labelClass}>{t('expForm.amount')}</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                        <input
                                            id="expense-amount"
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
                            </div>

                            <div>
                                <label htmlFor="expense-type" className={labelClass}>{t('expForm.type')}</label>
                                <div className="flex gap-2">
                                    <select
                                        id="expense-type"
                                        required
                                        value={typeId}
                                        onChange={(e) => setTypeId(e.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="" disabled>{t('expForm.selectType')}</option>
                                        {types.map(type => (
                                            <option key={type.id} value={type.id}>{type.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setTypeFormOpen(true)}
                                        title={t('expForm.newType')}
                                        aria-label={t('expForm.newType')}
                                        className="shrink-0 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-primary hover:bg-primary/10 transition-colors"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                {types.length === 0 && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('expForm.noTypes')}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="expense-payment" className={labelClass}>{t('expForm.paymentMethod')}</label>
                                <select
                                    id="expense-payment"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className={inputClass}
                                >
                                    {PAYMENT_METHODS.map(method => (
                                        <option key={method} value={method}>{paymentMethodLabel(method)}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="expense-description" className={labelClass}>{t('expForm.description')}</label>
                                <textarea
                                    id="expense-description"
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={t('expForm.descriptionPlaceholder')}
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
                                    {t('expForm.save')}
                                </button>
                            </div>
                        </form>
                    </motion.div>

                    <ExpenseTypeForm
                        isOpen={typeFormOpen}
                        type={null}
                        onClose={() => setTypeFormOpen(false)}
                        onSaved={handleTypeCreated}
                    />
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
