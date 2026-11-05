import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { Search, Edit2, Trash2, Eye, Landmark, Coins, PlusCircle, Info, HandCoins, ArrowUpFromLine, ArrowLeftRight, FileDown, CheckCircle2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton'
import { DateRangeInputs } from '@/components/ui/DateRangeInputs'
import { ViewModeToggle, type ViewMode } from '@/components/ui/ViewModeToggle'
import { capitalService } from '@/services/capitalService'
import { productService } from '@/services/productService'
import { supplierService } from '@/services/supplierService'
import { companyService } from '@/services/companyService'
import { pdfGenerator } from '@/services/pdfGenerator'
import { periodLabel } from '@/lib/reportPeriod'
import { cn, formatCurrency } from '@/lib/utils'
import { CAPITAL_ENTRY_TYPES, CAPITAL_FORMS, type CapitalEntry, type CapitalEntryType, type CapitalForm, type Product, type Supplier } from '@/types/database'
import { CapitalEntryForm } from './CapitalEntryForm'
import { CapitalSettlementForm } from './CapitalSettlementForm'
import { RepaymentForm } from './RepaymentForm'
import { printCapitalBill } from './capitalBill'
import { FORM_ICONS, TYPE_STYLES, amountSign, billNumber, capitalErrorMessage, isBillable, formLabel, isCapitalType, isCreditEntry, isGoodsForm, isPaidOut, isSettledEntry, outstandingOf, settleActionKey, sourceOf, typeLabel } from './capitalUi'

export function Capital() {
    const { t, locale } = useTranslation()
    const [entries, setEntries] = useState<CapitalEntry[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<ViewMode>('list')

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState<'all' | CapitalEntryType>('all')
    const [formFilter, setFormFilter] = useState<'all' | CapitalForm>('all')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')

    // Modals
    const [formOpen, setFormOpen] = useState(false)
    const [formType, setFormType] = useState<CapitalEntryType>('capital')
    const [editing, setEditing] = useState<CapitalEntry | null>(null)
    const [settling, setSettling] = useState<CapitalEntry | null>(null)
    const [repayOpen, setRepayOpen] = useState(false)
    const [toDelete, setToDelete] = useState<CapitalEntry | null>(null)

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const [entryData, productData, supplierData] = await Promise.all([capitalService.getAll(), productService.getAll(), supplierService.getAll()])
            setEntries(entryData)
            setProducts(productData)
            setSuppliers(supplierData)
        } catch (error) {
            console.error('Error loading capital:', error)
            toast.error(t('cap.loadError'))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        loadData()
    }, [loadData])

    const stats = useMemo(() => {
        const sum = (list: CapitalEntry[], value: (e: CapitalEntry) => number = e => e.amount) => list.reduce((total, e) => total + value(e), 0)
        // Loans are owed back, so they aren't the owner's capital
        const ownCapital = entries.filter(e => isCapitalType(e.type) && e.form !== 'loan')
        const loans = entries.filter(e => isCapitalType(e.type) && e.form === 'loan')
        const withdrawals = sum(entries.filter(e => e.type === 'withdrawal'))
        const invested = sum(ownCapital)
        const month = format(new Date(), 'yyyy-MM')
        const income = entries.filter(e => e.type === 'income')
        return {
            invested,
            goods: sum(ownCapital.filter(e => isGoodsForm(e.form))),
            // Promised capital and capital on credit not yet received
            promised: sum(ownCapital.filter(e => e.form === 'pledge' || isCreditEntry(e)), outstandingOf),
            borrowed: sum(loans),
            borrowedOutstanding: sum(loans, outstandingOf),
            repaid: sum(loans, e => e.settled ?? 0),
            withdrawals,
            netCapital: invested - withdrawals,
            income: sum(income),
            incomeThisMonth: sum(income.filter(e => e.entry_date.startsWith(month))),
            incomeToReceive: sum(income.filter(isCreditEntry), outstandingOf),
            // Everything still owed on credit, capital and income
            creditDue: sum(entries.filter(isCreditEntry), outstandingOf),
            // Goods on credit still to be paid to suppliers
            supplierDue: sum(entries.filter(e => e.form === 'supplier_credit'), outstandingOf)
        }
    }, [entries])

    const filtered = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()
        // entry_date is 'YYYY-MM-DD', so string comparison orders by day
        return entries.filter(e =>
            (typeFilter === 'all' || e.type === typeFilter) &&
            (formFilter === 'all' || e.form === formFilter) &&
            (!fromDate || e.entry_date >= fromDate) &&
            (!toDate || e.entry_date <= toDate) &&
            (!term || sourceOf(e)?.toLowerCase().includes(term) || e.description?.toLowerCase().includes(term))
        )
    }, [entries, searchTerm, typeFilter, formFilter, fromDate, toDate])

    const hasFilters = !!(searchTerm || typeFilter !== 'all' || formFilter !== 'all' || fromDate || toDate)
    const clearFilters = () => {
        setSearchTerm('')
        setTypeFilter('all')
        setFormFilter('all')
        setFromDate('')
        setToDate('')
    }

    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)

    const openForm = (type: CapitalEntryType) => {
        setEditing(null)
        setFormType(type)
        setFormOpen(true)
    }

    // The filtered list, with the date range as the report period
    const exportPdf = () => {
        toast.promise(
            pdfGenerator.generateReport(
                t('rep.export.capitalTitle'),
                t('rep.export.capitalSubtitle'),
                filtered,
                'capital',
                companyService.getSettings(),
                periodLabel({ range: 'custom', from: fromDate || undefined, to: toDate || undefined }, t, locale)
            ),
            { loading: t('rep.export.generating'), success: t('rep.export.success'), error: t('rep.export.error') }
        )
    }

    const confirmDelete = async () => {
        if (!toDelete?.id) return
        try {
            await capitalService.delete(toDelete.id)
            toast.success(t('cap.deleted'))
            loadData()
        } catch (error) {
            toast.error(capitalErrorMessage(error, t))
        } finally {
            setToDelete(null)
        }
    }

    const filterInputClass = "px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
    const iconButton = "p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
    const deleteButton = "p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"

    const actions = (entry: CapitalEntry) => (
        <div className="flex justify-end items-center gap-1">
            {isSettledEntry(entry) && outstandingOf(entry) > 0 && (
                <button
                    onClick={() => setSettling(entry)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors whitespace-nowrap"
                >
                    {t(settleActionKey(entry))}
                </button>
            )}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <Link to={`/capital/${entry.id}`} className={iconButton} title={t('view.view')}><Eye className="w-4 h-4" /></Link>
                {isBillable(entry) && (
                    <button onClick={() => printCapitalBill(entry)} className={iconButton} title={`${t('cap.printBill')} · ${billNumber(entry)}`}>
                        <Printer className="w-4 h-4" />
                    </button>
                )}
                <button onClick={() => { setEditing(entry); setFormOpen(true) }} className={iconButton} title={t('common.edit')}>
                    <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => setToDelete(entry)} className={deleteButton} title={t('common.delete')}>
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )

    const typeBadge = (type: CapitalEntryType) => {
        const style = TYPE_STYLES[type] ?? TYPE_STYLES.capital
        return (
            <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap", style.badge)}>
                <style.icon className="w-3.5 h-3.5" />
                {typeLabel(type, t)}
            </span>
        )
    }

    const formTag = (form: CapitalForm) => {
        const Icon = FORM_ICONS[form] ?? FORM_ICONS.money
        return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                <Icon className="w-3.5 h-3.5" />
                {formLabel(form, t)}
            </span>
        )
    }

    // Loans, promises and credit: what's left, or that they're settled
    const outstandingTag = (entry: CapitalEntry) => {
        if (!isSettledEntry(entry)) return null
        const left = outstandingOf(entry)
        const settledText = isPaidOut(entry) ? t('cap.paidOff') : isCreditEntry(entry) ? t('cap.fullyReceived') : t('cap.fullyPaidIn')
        return left > 0
            ? <span className="text-xs font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">{t('cap.left', { amount: formatCurrency(left) })}</span>
            : <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 whitespace-nowrap"><CheckCircle2 className="w-3.5 h-3.5" />{settledText}</span>
    }

    const amountText = (entry: CapitalEntry) => (
        <span className={entry.type === 'withdrawal' ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}>
            {amountSign(entry)}{formatCurrency(entry.amount)}
        </span>
    )

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t('cap.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('cap.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={exportPdf}
                        disabled={filtered.length === 0}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileDown className="w-5 h-5" />
                        {t('cap.exportPdf')}
                    </button>
                    <button
                        onClick={() => setRepayOpen(true)}
                        disabled={stats.creditDue <= 0 && stats.borrowedOutstanding <= 0 && stats.supplierDue <= 0}
                        title={stats.creditDue > 0 || stats.borrowedOutstanding > 0 || stats.supplierDue > 0
                            ? t('cap.repaymentsHint', { credit: formatCurrency(stats.creditDue), loan: formatCurrency(stats.borrowedOutstanding), supplier: formatCurrency(stats.supplierDue) })
                            : t('cap.repaymentsNone')}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                        <ArrowLeftRight className="w-5 h-5" />
                        {t('cap.repayments')}
                    </button>
                    <button
                        onClick={() => openForm('withdrawal')}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all font-medium"
                    >
                        <ArrowUpFromLine className="w-5 h-5" />
                        {t('cap.addWithdrawal')}
                    </button>
                    <button
                        onClick={() => openForm('income')}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all font-medium"
                    >
                        <Coins className="w-5 h-5" />
                        {t('cap.addIncome')}
                    </button>
                    <button
                        onClick={() => openForm(entries.some(e => e.type === 'initial_capital') ? 'capital' : 'initial_capital')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                    >
                        <PlusCircle className="w-5 h-5" />
                        {t('cap.addCapital')}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label={t('cap.statInvested')}
                    value={formatCurrency(stats.invested)}
                    hint={stats.promised > 0 ? t('cap.statPromised', { amount: formatCurrency(stats.promised) }) : t('cap.statInvestedHint', { amount: formatCurrency(stats.goods) })}
                    icon={Landmark}
                    color="bg-indigo-500"
                />
                <StatCard
                    label={t('cap.statBorrowed')}
                    value={formatCurrency(stats.borrowedOutstanding)}
                    hint={t('cap.statBorrowedHint', { total: formatCurrency(stats.borrowed), repaid: formatCurrency(stats.repaid) })}
                    icon={HandCoins}
                    color="bg-amber-500"
                />
                <StatCard
                    label={t('cap.statWithdrawals')}
                    value={formatCurrency(stats.withdrawals)}
                    hint={t('cap.statNetCapital', { amount: formatCurrency(stats.netCapital) })}
                    icon={ArrowUpFromLine}
                    color="bg-red-500"
                />
                <StatCard label={t('cap.statIncome')} value={formatCurrency(stats.income)} hint={stats.incomeToReceive > 0
                        ? t('cap.statIncomeHintCredit', { amount: formatCurrency(stats.incomeThisMonth), pending: formatCurrency(stats.incomeToReceive) })
                        : t('cap.statIncomeHint', { amount: formatCurrency(stats.incomeThisMonth) })} icon={Coins} color="bg-emerald-500" />
            </div>

            <p className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-sm">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                {t('cap.note')}
            </p>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col lg:flex-row gap-3 lg:items-center flex-wrap">
                <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('cap.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(filterInputClass, "w-full pl-10 pr-4 placeholder-gray-500")}
                    />
                </div>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | CapitalEntryType)} aria-label={t('cap.col.type')} className={filterInputClass}>
                    <option value="all">{t('cap.allTypes')}</option>
                    {CAPITAL_ENTRY_TYPES.map(type => <option key={type} value={type}>{typeLabel(type, t)}</option>)}
                </select>
                <select value={formFilter} onChange={(e) => setFormFilter(e.target.value as 'all' | CapitalForm)} aria-label={t('cap.col.form')} className={filterInputClass}>
                    <option value="all">{t('cap.allForms')}</option>
                    {CAPITAL_FORMS.map(form => <option key={form} value={form}>{formLabel(form, t)}</option>)}
                </select>
                <DateRangeInputs
                    value={{ from: fromDate || undefined, to: toDate || undefined }}
                    onChange={(range) => { setFromDate(range.from ?? ''); setToDate(range.to ?? '') }}
                    inputClassName={filterInputClass}
                    showClear={false}
                />
                <ClearFiltersButton visible={hasFilters} onClick={clearFilters} />
                <ViewModeToggle value={viewMode} onChange={setViewMode} activeClassName="text-indigo-600" className="lg:ml-auto self-end lg:self-auto" />
            </div>

            {/* List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-gray-500">{t('cap.loading')}</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Landmark className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{entries.length === 0 ? t('cap.empty') : t('cap.noResults')}</h3>
                    {entries.length === 0 && <p className="text-gray-500 mt-2 max-w-md mx-auto">{t('cap.emptyDesc')}</p>}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(entry => (
                        <motion.div
                            key={entry.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-md hover:shadow-xl transition-all p-5 flex flex-col"
                        >
                            <div className="flex items-start justify-between gap-2">
                                {typeBadge(entry.type)}
                                {formTag(entry.form)}
                            </div>
                            <div className="mt-3 flex-1 min-w-0">
                                <Link to={`/capital/${entry.id}`} className="block text-2xl font-black truncate hover:underline">{amountText(entry)}</Link>
                                {sourceOf(entry) && <p className="font-bold text-gray-700 dark:text-gray-200 truncate mt-1" title={sourceOf(entry)}>{sourceOf(entry)}</p>}
                                <div className="mt-1">{outstandingTag(entry)}</div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                    {entry.description || <span className="italic opacity-70">{t('expType.noDescription')}</span>}
                                </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDay(entry.entry_date)}</span>
                                {actions(entry)}
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">{t('cap.col.date')}</th>
                                <th className="px-4 py-3">{t('cap.col.type')}</th>
                                <th className="px-4 py-3">{t('cap.col.form')}</th>
                                <th className="px-4 py-3">{t('cap.col.source')}</th>
                                <th className="px-4 py-3">{t('cap.col.payment')}</th>
                                <th className="px-4 py-3">{t('cap.col.recordedBy')}</th>
                                <th className="px-4 py-3 text-right">{t('cap.col.amount')}</th>
                                <th className="px-4 py-3">{t('cap.col.outstanding')}</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {filtered.map(entry => {
                                const wasEdited = entry.updated_by && entry.updated_at && entry.updated_at !== entry.created_at
                                return (
                                    <tr key={entry.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <Link to={`/capital/${entry.id}`} className="text-gray-900 dark:text-white hover:text-primary hover:underline">{formatDay(entry.entry_date)}</Link>
                                        </td>
                                        <td className="px-4 py-3">{typeBadge(entry.type)}</td>
                                        <td className="px-4 py-3">{formTag(entry.form)}</td>
                                        <td className="px-4 py-3 max-w-xs">
                                            <p className="font-medium text-gray-900 dark:text-white truncate" title={sourceOf(entry)}>{sourceOf(entry) || '-'}</p>
                                            {entry.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={entry.description}>{entry.description}</p>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{entry.payment_method ? paymentMethodLabel(entry.payment_method) : '-'}</td>
                                        <td
                                            className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300"
                                            title={wasEdited ? t('cap.updatedBy', { user: entry.updated_by!, date: new Date(entry.updated_at!).toLocaleString(locale) }) : undefined}
                                        >
                                            {entry.created_by || '-'}
                                            {wasEdited && <span className="ml-1 text-gray-400">*</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold whitespace-nowrap">{amountText(entry)}</td>
                                        <td className="px-4 py-3">{outstandingTag(entry) ?? <span className="text-gray-400">-</span>}</td>
                                        <td className="px-4 py-3">{actions(entry)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <CapitalEntryForm
                isOpen={formOpen}
                entry={editing}
                defaultType={formType}
                products={products}
                suppliers={suppliers}
                onClose={() => { setFormOpen(false); setEditing(null) }}
                onSaved={loadData}
            />

            <CapitalSettlementForm entry={settling} onClose={() => setSettling(null)} onSaved={loadData} />

            <RepaymentForm isOpen={repayOpen} entries={entries} onClose={() => setRepayOpen(false)} onSaved={loadData} />

            <ConfirmDialog
                isOpen={!!toDelete}
                title={t('cap.deleteTitle')}
                description={toDelete ? t(isGoodsForm(toDelete.form) ? 'cap.deleteGoodsDesc' : 'cap.deleteDesc', {
                    type: typeLabel(toDelete.type, t).toLowerCase(),
                    amount: formatCurrency(toDelete.amount),
                    date: formatDay(toDelete.entry_date)
                }) : ''}
                confirmText={t('cap.deleteConfirm')}
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setToDelete(null)}
            />
        </div>
    )
}

function StatCard({ label, value, hint, icon: Icon, color }: { label: string; value: string; hint?: string; icon: React.ElementType; color: string }) {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 min-w-0">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", color, "bg-opacity-10")}>
                <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
            </div>
            <div className="min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white truncate" title={value}>{value}</p>
                {hint && <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={hint}>{hint}</p>}
            </div>
        </div>
    )
}
