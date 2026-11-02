import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/i18n'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { cn } from '@/lib/utils'
import { savingsAccountService } from '@/services/savingsService'
import { SAVINGS_CATEGORIES, type SavingsAccount, type SavingsCategory } from '@/types/database'
import { savingsErrorMessage } from './savingsErrors'
import { CATEGORY_STYLES, categoryLabel } from './savingsUi'

interface SavingsAccountFormProps {
    isOpen: boolean
    account: SavingsAccount | null
    // Category preselected for a new account
    defaultCategory?: SavingsCategory
    onClose: () => void
    onSaved: (account: SavingsAccount) => void
}

export function SavingsAccountForm({ isOpen, account, defaultCategory, onClose, onSaved }: SavingsAccountFormProps) {
    const { t } = useTranslation()
    const [name, setName] = useState('')
    const [category, setCategory] = useState<SavingsCategory>('employee')
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setName(account?.name ?? '')
        setCategory(account?.category ?? defaultCategory ?? 'employee')
        setDescription(account?.description ?? '')
    }, [isOpen, account, defaultCategory])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        // Keep the submit from also submitting a form this modal was opened from
        e.stopPropagation()
        setSaving(true)
        try {
            const input = { name, category, description }
            const saved = account?.id
                ? await savingsAccountService.update(account.id, input)
                : await savingsAccountService.create(input)
            toast.success(account?.id ? t('savAcc.updated') : t('savAcc.created'))
            onSaved(saved)
            onClose()
        } catch (error) {
            toast.error(savingsErrorMessage(error, t))
        } finally {
            setSaving(false)
        }
    }

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
                        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <ModalHeader title={account ? t('savAccForm.editTitle') : t('savAccForm.newTitle')} onClose={onClose} />

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <span className={labelClass}>{t('savAccForm.category')}</span>
                                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('savAccForm.category')}>
                                    {SAVINGS_CATEGORIES.map(option => {
                                        const Icon = CATEGORY_STYLES[option].icon
                                        const selected = category === option
                                        return (
                                            <button
                                                key={option}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                onClick={() => setCategory(option)}
                                                className={cn(
                                                    "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-sm font-medium transition-colors",
                                                    selected
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                )}
                                            >
                                                <Icon className="w-5 h-5" />
                                                {categoryLabel(option, t)}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="savings-account-name" className={labelClass}>{t('savAccForm.name')}</label>
                                <input
                                    id="savings-account-name"
                                    type="text"
                                    autoFocus
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('savAccForm.namePlaceholder')}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label htmlFor="savings-account-description" className={labelClass}>{t('savAccForm.description')}</label>
                                <textarea
                                    id="savings-account-description"
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={t('savAccForm.descriptionPlaceholder')}
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
                                    {t('savAccForm.save')}
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
