
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, Loader2 } from 'lucide-react'
import { clientService, type Client } from '@/services/clientService'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { companyService } from '@/services/companyService'
import { useTranslation } from '@/i18n'

interface ClientFormProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    clientToEdit?: Client | null
}

export function ClientForm({ isOpen, onClose, onSuccess, clientToEdit }: ClientFormProps) {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<Client>>({
        name: '',
        tax_id: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        credit_limit: 0
    })

    useEffect(() => {
        if (isOpen) {
            if (clientToEdit) {
                setFormData({
                    name: clientToEdit.name,
                    tax_id: clientToEdit.tax_id || '',
                    email: clientToEdit.email || '',
                    phone: clientToEdit.phone || '',
                    address: clientToEdit.address || '',
                    notes: clientToEdit.notes || '',
                    credit_limit: clientToEdit.credit_limit || 0
                })
            } else {
                setFormData({
                    name: '',
                    tax_id: '',
                    email: '',
                    phone: '',
                    address: '',
                    notes: '',
                    credit_limit: 0
                })
            }
        }
    }, [isOpen, clientToEdit])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (!formData.name?.trim()) {
                toast.error(t('cliForm.nameRequired'))
                setLoading(false)
                return
            }

            if ((formData.credit_limit ?? 0) < 0) {
                toast.error(t('cliForm.creditLimitInvalid'))
                setLoading(false)
                return
            }

            if (clientToEdit?.id) {
                await clientService.update(clientToEdit.id, formData)
                toast.success(t('cliForm.updated'))
            } else {
                await clientService.create(formData as Client)
                toast.success(t('cliForm.created'))
            }
            onSuccess()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error(t('cliForm.saveError'))
        } finally {
            setLoading(false)
        }
    }

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {clientToEdit ? t('cliForm.editTitle') : t('cliForm.newTitle')}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nombre */}
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                        {t('cliForm.fullName')}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder={t('cliForm.namePlaceholder')}
                                    />
                                </div>

                                {/* NIT/RUC */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                        {t('cliForm.taxId')}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.tax_id}
                                        onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder={t('cliForm.taxIdPlaceholder')}
                                    />
                                </div>

                                {/* Teléfono */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                        {t('cliForm.phone')}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="+502 1234 5678"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                        {t('cliForm.email')}
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder={t('cliForm.emailPlaceholder')}
                                    />
                                </div>

                                {/* Dirección */}
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                        {t('cliForm.address')}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder={t('cliForm.addressPlaceholder')}
                                    />
                                </div>

                                {/* Límite de crédito */}
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                        {t('cliForm.creditLimit')} ({companyService.getSettings().currencySymbol})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.credit_limit ?? 0}
                                        onChange={(e) => setFormData({ ...formData, credit_limit: Math.max(0, Number(e.target.value) || 0) })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">{t('cliForm.creditLimitHint')}</p>
                                </div>

                                {/* Notas */}
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                        {t('cliForm.notes')}
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                                        placeholder={t('cliForm.notesPlaceholder')}
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {t('cliForm.saving')}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {t('cliForm.save')}
                                        </>
                                    )}
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
