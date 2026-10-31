import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, Trash2, Tags, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, type TranslationKey } from '@/i18n'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton'
import { categoryService, CategoryServiceError } from '@/services/categoryService'
import type { Category } from '@/types/database'

const ERROR_CODES = ['NAME_REQUIRED', 'NAME_TAKEN', 'NOT_FOUND', 'UNKNOWN'] as const
type CategoryErrorCode = typeof ERROR_CODES[number]

function categoryErrorMessage(error: unknown, t: (key: TranslationKey) => string): string {
    const code = error instanceof CategoryServiceError ? error.code : 'UNKNOWN'
    const known: CategoryErrorCode = (ERROR_CODES as readonly string[]).includes(code) ? code as CategoryErrorCode : 'UNKNOWN'
    return t(`catError.${known}`)
}

interface CategoriesProps {
    // Called after a change that also affects products (rename/delete)
    onProductsChanged: () => void
}

export function Categories({ onProductsChanged }: CategoriesProps) {
    const { t } = useTranslation()
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<Category | null>(null)
    const [toDelete, setToDelete] = useState<Category | null>(null)

    const loadCategories = useCallback(async () => {
        try {
            setLoading(true)
            setCategories(await categoryService.getAll())
        } catch (error) {
            console.error('Error loading categories:', error)
            toast.error(t('cat.loadError'))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        loadCategories()
    }, [loadCategories])

    const filtered = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()
        if (!term) return categories
        return categories.filter(c => c.name.toLowerCase().includes(term) || c.description?.toLowerCase().includes(term))
    }, [categories, searchTerm])

    const handleSaved = (renamed: boolean) => {
        loadCategories()
        if (renamed) onProductsChanged()
    }

    const confirmDelete = async () => {
        if (!toDelete?.id) return
        try {
            await categoryService.delete(toDelete.id)
            toast.success(t('cat.deleted'))
            loadCategories()
            if (toDelete.products_count) onProductsChanged()
        } catch (error) {
            toast.error(categoryErrorMessage(error, t))
        } finally {
            setToDelete(null)
        }
    }

    const countLabel = (count: number) => count === 1 ? t('cat.productCountOne') : t('cat.productCount', { count })

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 w-full sm:max-w-xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('cat.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                        />
                    </div>
                    <ClearFiltersButton visible={!!searchTerm} onClick={() => setSearchTerm('')} />
                </div>
                <button
                    onClick={() => { setEditing(null); setFormOpen(true) }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 active:scale-95 transition-all font-medium shadow-lg shadow-primary/20 shrink-0"
                >
                    <Plus className="w-5 h-5" />
                    {t('cat.new')}
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-gray-500">{t('cat.loading')}</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Tags className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {categories.length === 0 ? t('cat.empty') : t('cat.noResults')}
                    </h3>
                    {categories.length === 0 && <p className="text-gray-500 mt-2">{t('cat.emptyDesc')}</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(category => (
                        <motion.div
                            key={category.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-md hover:shadow-xl transition-all p-5 flex flex-col"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        <Tags className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate" title={category.name}>{category.name}</h3>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                        onClick={() => { setEditing(category); setFormOpen(true) }}
                                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        title={t('common.edit')}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setToDelete(category)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        title={t('common.delete')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2 flex-1">
                                {category.description || <span className="italic opacity-70">{t('cat.noDescription')}</span>}
                            </p>
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {countLabel(category.products_count ?? 0)}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <CategoryForm
                isOpen={formOpen}
                category={editing}
                onClose={() => { setFormOpen(false); setEditing(null) }}
                onSaved={handleSaved}
            />

            <ConfirmDialog
                isOpen={!!toDelete}
                title={t('cat.deleteTitle')}
                description={toDelete?.products_count
                    ? t('cat.deleteDescProducts', { name: toDelete.name, count: toDelete.products_count })
                    : t('cat.deleteDesc', { name: toDelete?.name ?? '' })}
                confirmText={t('cat.deleteConfirm')}
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setToDelete(null)}
            />
        </div>
    )
}

interface CategoryFormProps {
    isOpen: boolean
    category: Category | null
    onClose: () => void
    onSaved: (renamed: boolean) => void
}

function CategoryForm({ isOpen, category, onClose, onSaved }: CategoryFormProps) {
    const { t } = useTranslation()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setName(category?.name ?? '')
        setDescription(category?.description ?? '')
    }, [isOpen, category])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (category?.id) {
                await categoryService.update(category.id, { name, description })
                toast.success(t('cat.updated'))
                onSaved(name.trim() !== category.name)
            } else {
                await categoryService.create(name, description)
                toast.success(t('cat.created'))
                onSaved(false)
            }
            onClose()
        } catch (error) {
            toast.error(categoryErrorMessage(error, t))
        } finally {
            setSaving(false)
        }
    }

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
                        className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <ModalHeader title={category ? t('catForm.editTitle') : t('catForm.newTitle')} onClose={onClose} />

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label htmlFor="category-name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('catForm.name')}</label>
                                <input
                                    id="category-name"
                                    type="text"
                                    autoFocus
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('catForm.namePlaceholder')}
                                    className={inputClass}
                                />
                                {category && (category.products_count ?? 0) > 0 && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('catForm.renameHint')}</p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="category-description" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('catForm.description')}</label>
                                <textarea
                                    id="category-description"
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
                                    {t('catForm.save')}
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
