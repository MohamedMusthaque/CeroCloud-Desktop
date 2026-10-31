import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, Trash2, Shapes, X, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/i18n'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { expenseTypeService } from '@/services/expenseService'
import { formatCurrency } from '@/lib/utils'
import type { ExpenseType } from '@/types/database'
import { expenseErrorMessage } from './expenseErrors'

interface ExpenseTypesProps {
    types: ExpenseType[]
    loading: boolean
    // Reload types (and expenses, whose type names may have changed)
    onChanged: () => void
}

export function ExpenseTypes({ types, loading, onChanged }: ExpenseTypesProps) {
    const { t } = useTranslation()
    const [searchTerm, setSearchTerm] = useState('')
    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<ExpenseType | null>(null)
    const [toDelete, setToDelete] = useState<ExpenseType | null>(null)

    const filtered = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()
        if (!term) return types
        return types.filter(type => type.name.toLowerCase().includes(term) || type.description?.toLowerCase().includes(term))
    }, [types, searchTerm])

    // Types with recorded expenses can't be deleted; explain instead of asking
    const requestDelete = (type: ExpenseType) => {
        if (type.expenses_count) toast.error(t('expError.TYPE_IN_USE'))
        else setToDelete(type)
    }

    const confirmDelete = async () => {
        if (!toDelete?.id) return
        try {
            await expenseTypeService.delete(toDelete.id)
            toast.success(t('expType.deleted'))
            onChanged()
        } catch (error) {
            toast.error(expenseErrorMessage(error, t))
        } finally {
            setToDelete(null)
        }
    }

    const countLabel = (count: number) => count === 1 ? t('expType.expenseCountOne') : t('expType.expenseCount', { count })

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('expType.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    />
                </div>
                <button
                    onClick={() => { setEditing(null); setFormOpen(true) }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 active:scale-95 transition-all font-medium shadow-lg shadow-primary/20 shrink-0"
                >
                    <Plus className="w-5 h-5" />
                    {t('expType.new')}
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-gray-500">{t('expType.loading')}</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shapes className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {types.length === 0 ? t('expType.empty') : t('expType.noResults')}
                    </h3>
                    {types.length === 0 && <p className="text-gray-500 mt-2">{t('expType.emptyDesc')}</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(type => (
                        <motion.div
                            key={type.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-md hover:shadow-xl transition-all p-5 flex flex-col"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        <Shapes className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate" title={type.name}>{type.name}</h3>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                        onClick={() => { setEditing(type); setFormOpen(true) }}
                                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        title={t('common.edit')}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => requestDelete(type)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        title={t('common.delete')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2 flex-1">
                                {type.description || <span className="italic opacity-70">{t('expType.noDescription')}</span>}
                            </p>
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2">
                                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {countLabel(type.expenses_count ?? 0)}
                                </span>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    {t('expType.total', { amount: formatCurrency(type.total_amount ?? 0) })}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <ExpenseTypeForm
                isOpen={formOpen}
                type={editing}
                onClose={() => { setFormOpen(false); setEditing(null) }}
                onSaved={onChanged}
            />

            <ConfirmDialog
                isOpen={!!toDelete}
                title={t('expType.deleteTitle')}
                description={t('expType.deleteDesc', { name: toDelete?.name ?? '' })}
                confirmText={t('expType.deleteConfirm')}
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setToDelete(null)}
            />
        </div>
    )
}

interface ExpenseTypeFormProps {
    isOpen: boolean
    type: ExpenseType | null
    onClose: () => void
    onSaved: (type: ExpenseType) => void
}

export function ExpenseTypeForm({ isOpen, type, onClose, onSaved }: ExpenseTypeFormProps) {
    const { t } = useTranslation()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setName(type?.name ?? '')
        setDescription(type?.description ?? '')
    }, [isOpen, type])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        // Keep the submit from also submitting a form this modal was opened from
        e.stopPropagation()
        setSaving(true)
        try {
            const saved = type?.id
                ? await expenseTypeService.update(type.id, { name, description })
                : await expenseTypeService.create(name, description)
            toast.success(type?.id ? t('expType.updated') : t('expType.created'))
            onSaved(saved)
            onClose()
        } catch (error) {
            toast.error(expenseErrorMessage(error, t))
        } finally {
            setSaving(false)
        }
    }

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
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {type ? t('expTypeForm.editTitle') : t('expTypeForm.newTitle')}
                            </h2>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label htmlFor="expense-type-name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('expTypeForm.name')}</label>
                                <input
                                    id="expense-type-name"
                                    type="text"
                                    autoFocus
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('expTypeForm.namePlaceholder')}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label htmlFor="expense-type-description" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('expTypeForm.description')}</label>
                                <textarea
                                    id="expense-type-description"
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
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
                                    {t('expTypeForm.save')}
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
