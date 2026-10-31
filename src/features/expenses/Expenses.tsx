import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Search, Edit2, Trash2, Wallet, Shapes, CalendarDays, Receipt, TrendingUp, FilterX } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { expenseService, expenseTypeService } from '@/services/expenseService'
import { cn, formatCurrency } from '@/lib/utils'
import type { Expense, ExpenseType } from '@/types/database'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseTypes } from './ExpenseTypes'
import { expenseErrorMessage } from './expenseErrors'

export function Expenses() {
    const { t, locale } = useTranslation()
    const [section, setSection] = useState<'expenses' | 'types'>('expenses')
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [types, setTypes] = useState<ExpenseType[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')

    // Modals
    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<Expense | null>(null)
    const [toDelete, setToDelete] = useState<Expense | null>(null)

    const loadTypes = useCallback(async () => {
        try {
            setTypes(await expenseTypeService.getAll())
        } catch (error) {
            console.error('Error loading expense types:', error)
            toast.error(t('expType.loadError'))
        }
    }, [t])

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const [expenseData, typeData] = await Promise.all([expenseService.getAll(), expenseTypeService.getAll()])
            setExpenses(expenseData)
            setTypes(typeData)
        } catch (error) {
            console.error('Error loading expenses:', error)
            toast.error(t('exp.loadError'))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        loadData()
    }, [loadData])

    const filtered = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()
        // expense_date is 'YYYY-MM-DD', so string comparison orders by day
        return expenses.filter(e =>
            (typeFilter === 'all' || String(e.expense_type_id) === typeFilter) &&
            (!fromDate || e.expense_date >= fromDate) &&
            (!toDate || e.expense_date <= toDate) &&
            (!term || e.description?.toLowerCase().includes(term) || e.expense_type_name?.toLowerCase().includes(term))
        )
    }, [expenses, searchTerm, typeFilter, fromDate, toDate])

    const stats = useMemo(() => {
        const month = format(new Date(), 'yyyy-MM')
        const thisMonth = expenses.filter(e => e.expense_date.startsWith(month)).reduce((sum, e) => sum + e.amount, 0)
        const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0)

        const byType = new Map<string, number>()
        for (const e of filtered) {
            const name = e.expense_type_name ?? ''
            byType.set(name, (byType.get(name) ?? 0) + e.amount)
        }
        const topType = [...byType.entries()].sort((a, b) => b[1] - a[1])[0]
        return { thisMonth, filteredTotal, topType }
    }, [expenses, filtered])

    const hasFilters = searchTerm || typeFilter !== 'all' || fromDate || toDate
    const clearFilters = () => {
        setSearchTerm('')
        setTypeFilter('all')
        setFromDate('')
        setToDate('')
    }

    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)

    const confirmDelete = async () => {
        if (!toDelete?.id) return
        try {
            await expenseService.delete(toDelete.id)
            toast.success(t('exp.deleted'))
            loadData()
        } catch (error) {
            toast.error(expenseErrorMessage(error, t))
        } finally {
            setToDelete(null)
        }
    }

    const filterInputClass = "px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        {t('exp.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('exp.subtitle')}
                    </p>
                </div>
                {section === 'expenses' && (
                    <button
                        onClick={() => { setEditing(null); setFormOpen(true) }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 w-fit"
                    >
                        <Plus className="w-5 h-5" />
                        {t('exp.new')}
                    </button>
                )}
            </div>

            {/* Section tabs */}
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                {([
                    { id: 'expenses', label: t('exp.section.expenses'), icon: Wallet },
                    { id: 'types', label: t('exp.section.types'), icon: Shapes }
                ] as const).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSection(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            section === tab.id
                                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {section === 'types' ? (
                <ExpenseTypes types={types} loading={loading} onChanged={loadData} />
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label={t('exp.statThisMonth')} value={formatCurrency(stats.thisMonth)} icon={CalendarDays} color="bg-blue-500" />
                        <StatCard label={t('exp.statFiltered')} value={formatCurrency(stats.filteredTotal)} icon={Wallet} color="bg-red-500" />
                        <StatCard label={t('exp.statCount')} value={String(filtered.length)} icon={Receipt} color="bg-purple-500" />
                        <StatCard
                            label={t('exp.statTopType')}
                            value={stats.topType ? stats.topType[0] : '-'}
                            hint={stats.topType ? formatCurrency(stats.topType[1]) : undefined}
                            icon={TrendingUp}
                            color="bg-orange-500"
                        />
                    </div>

                    {/* Filters */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col lg:flex-row gap-3 lg:items-center">
                        <div className="relative w-full lg:max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('exp.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={cn(filterInputClass, "w-full pl-10 pr-4 placeholder-gray-500")}
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            aria-label={t('exp.col.type')}
                            className={filterInputClass}
                        >
                            <option value="all">{t('exp.allTypes')}</option>
                            {types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                        </select>
                        <label className="flex items-center gap-2 text-sm text-gray-500">
                            {t('exp.from')}
                            <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className={filterInputClass} />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-500">
                            {t('exp.to')}
                            <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className={filterInputClass} />
                        </label>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors w-fit"
                            >
                                <FilterX className="w-4 h-4" />
                                {t('exp.clearFilters')}
                            </button>
                        )}
                    </div>

                    {/* List */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <p className="text-gray-500">{t('exp.loading')}</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Wallet className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {expenses.length === 0 ? t('exp.empty') : t('exp.noResults')}
                            </h3>
                            {expenses.length === 0 && <p className="text-gray-500 mt-2">{t('exp.emptyDesc')}</p>}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3">{t('exp.col.date')}</th>
                                        <th className="px-4 py-3">{t('exp.col.type')}</th>
                                        <th className="px-4 py-3">{t('exp.col.description')}</th>
                                        <th className="px-4 py-3">{t('exp.col.payment')}</th>
                                        <th className="px-4 py-3">{t('exp.col.recordedBy')}</th>
                                        <th className="px-4 py-3 text-right">{t('exp.col.amount')}</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {filtered.map(expense => {
                                        const wasEdited = expense.updated_by && expense.updated_at && expense.updated_at !== expense.created_at
                                        return (
                                            <tr key={expense.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-white">{formatDay(expense.expense_date)}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary whitespace-nowrap">
                                                        {expense.expense_type_name}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={expense.description}>
                                                    {expense.description || '-'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{paymentMethodLabel(expense.payment_method)}</td>
                                                <td
                                                    className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300"
                                                    title={wasEdited ? t('exp.updatedBy', { user: expense.updated_by!, date: new Date(expense.updated_at!).toLocaleString(locale) }) : undefined}
                                                >
                                                    {expense.created_by || '-'}
                                                    {wasEdited && <span className="ml-1 text-gray-400">*</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(expense.amount)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => { setEditing(expense); setFormOpen(true) }}
                                                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                            title={t('common.edit')}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setToDelete(expense)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                            title={t('common.delete')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            <ExpenseForm
                isOpen={formOpen}
                expense={editing}
                types={types}
                onClose={() => { setFormOpen(false); setEditing(null) }}
                onSaved={loadData}
                onTypeCreated={loadTypes}
            />

            <ConfirmDialog
                isOpen={!!toDelete}
                title={t('exp.deleteTitle')}
                description={toDelete ? t('exp.deleteDesc', {
                    type: toDelete.expense_type_name ?? '',
                    amount: formatCurrency(toDelete.amount),
                    date: formatDay(toDelete.expense_date)
                }) : ''}
                confirmText={t('exp.deleteConfirm')}
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setToDelete(null)}
            />
        </div>
    )
}

interface StatCardProps {
    label: string
    value: string
    hint?: string
    icon: React.ElementType
    color: string
}

function StatCard({ label, value, hint, icon: Icon, color }: StatCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 min-w-0">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", color, "bg-opacity-10")}>
                <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
            </div>
            <div className="min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white truncate" title={value}>{value}</p>
                {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
            </div>
        </div>
    )
}
