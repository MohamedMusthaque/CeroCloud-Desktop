import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Save, Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { cn, formatCurrency } from '@/lib/utils'
import { savingsTransactionService } from '@/services/savingsService'
import { companyService } from '@/services/companyService'
import { SAVINGS_CATEGORIES, type SavingsAccount, type SavingsTransaction, type SavingsTransactionType } from '@/types/database'
import { savingsErrorMessage } from './savingsErrors'
import { PAYMENT_METHODS, categoryLabel, signedAmount } from './savingsUi'

interface SavingsTransactionFormProps {
    isOpen: boolean
    transaction: SavingsTransaction | null
    accounts: SavingsAccount[]
    // Values preselected for a new transaction (e.g. "Deposit" on an account card)
    preset?: { accountId?: number; type?: SavingsTransactionType }
    onClose: () => void
    onSaved: () => void
}

export function SavingsTransactionForm({ isOpen, transaction, accounts, preset, onClose, onSaved }: SavingsTransactionFormProps) {
    const { t } = useTranslation()
    const [accountId, setAccountId] = useState('')
    const [type, setType] = useState<SavingsTransactionType>('deposit')
    const [date, setDate] = useState('')
    const [amount, setAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState<string>('cash')
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        const presetAccount = preset?.accountId ?? (accounts.length === 1 ? accounts[0].id : undefined)
        setAccountId(transaction ? String(transaction.account_id) : presetAccount ? String(presetAccount) : '')
        setType(transaction?.type ?? preset?.type ?? 'deposit')
        setDate(transaction?.transaction_date ?? format(new Date(), 'yyyy-MM-dd'))
        setAmount(transaction ? String(transaction.amount) : '')
        setPaymentMethod(transaction?.payment_method ?? 'cash')
        setDescription(transaction?.description ?? '')
    }, [isOpen, transaction, preset, accounts])

    // Balance the selected account would have without this transaction
    const selected = accounts.find(a => String(a.id) === accountId)
    const available = selected
        ? (selected.balance ?? 0) - (transaction && transaction.account_id === selected.id ? signedAmount(transaction.type, transaction.amount) : 0)
        : 0
    const overdrawn = !!selected && type === 'withdrawal' && Number(amount) > available + 0.005

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const input = {
                account_id: Number(accountId),
                type,
                amount: Number(amount),
                transaction_date: date,
                payment_method: paymentMethod,
                description
            }
            if (transaction?.id) {
                await savingsTransactionService.update(transaction.id, input)
                toast.success(t('savTxForm.updated'))
            } else {
                await savingsTransactionService.create(input)
                toast.success(t('savTxForm.created'))
            }
            onSaved()
            onClose()
        } catch (error) {
            toast.error(savingsErrorMessage(error, t))
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
                        <ModalHeader title={transaction ? t('savTxForm.editTitle') : t('savTxForm.newTitle')} onClose={onClose} className="sticky top-0 z-10" />

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Deposit / withdrawal */}
                            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('savTxForm.type')}>
                                {([
                                    { id: 'deposit', icon: ArrowDownCircle, active: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
                                    { id: 'withdrawal', icon: ArrowUpCircle, active: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' }
                                ] as const).map(option => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={type === option.id}
                                        onClick={() => setType(option.id)}
                                        className={cn(
                                            "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-colors",
                                            type === option.id
                                                ? option.active
                                                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                        )}
                                    >
                                        <option.icon className="w-4 h-4" />
                                        {t(`sav.type.${option.id}`)}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label htmlFor="savings-tx-account" className={labelClass}>{t('savTxForm.account')}</label>
                                <select
                                    id="savings-tx-account"
                                    required
                                    value={accountId}
                                    onChange={(e) => setAccountId(e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="" disabled>{t('savTxForm.selectAccount')}</option>
                                    {SAVINGS_CATEGORIES.map(category => {
                                        const inCategory = accounts.filter(a => a.category === category)
                                        if (inCategory.length === 0) return null
                                        return (
                                            <optgroup key={category} label={categoryLabel(category, t)}>
                                                {inCategory.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </optgroup>
                                        )
                                    })}
                                </select>
                                {accounts.length === 0 ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('savTxForm.noAccounts')}</p>
                                ) : selected && (
                                    <p className={cn("text-xs mt-1", overdrawn ? "text-red-500 font-medium" : "text-gray-500 dark:text-gray-400")}>
                                        {overdrawn ? t('savError.INSUFFICIENT_BALANCE') : t('savTxForm.available', { amount: formatCurrency(available) })}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="savings-tx-date" className={labelClass}>{t('savTxForm.date')}</label>
                                    <input
                                        id="savings-tx-date"
                                        type="date"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="savings-tx-amount" className={labelClass}>{t('savTxForm.amount')}</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                        <input
                                            id="savings-tx-amount"
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
                                <label htmlFor="savings-tx-payment" className={labelClass}>{t('savTxForm.paymentMethod')}</label>
                                <select
                                    id="savings-tx-payment"
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
                                <label htmlFor="savings-tx-description" className={labelClass}>{t('savTxForm.description')}</label>
                                <textarea
                                    id="savings-tx-description"
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={t('savTxForm.descriptionPlaceholder')}
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
                                    disabled={saving || overdrawn}
                                    className="px-5 py-2.5 text-sm font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {t('savTxForm.save')}
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
