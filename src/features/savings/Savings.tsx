import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { Plus, Search, Edit2, Trash2, PiggyBank, Wallet, ArrowLeftRight, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton'
import { DateRangeInputs } from '@/components/ui/DateRangeInputs'
import { ViewModeToggle, type ViewMode } from '@/components/ui/ViewModeToggle'
import { savingsAccountService, savingsTransactionService } from '@/services/savingsService'
import { cn, formatCurrency } from '@/lib/utils'
import { SAVINGS_CATEGORIES, type SavingsAccount, type SavingsCategory, type SavingsTransaction, type SavingsTransactionType } from '@/types/database'
import { SavingsAccountForm } from './SavingsAccountForm'
import { SavingsTransactionForm } from './SavingsTransactionForm'
import { savingsErrorMessage } from './savingsErrors'
import { CATEGORY_STYLES, categoryLabel, typeLabel } from './savingsUi'

type CategoryFilter = 'all' | SavingsCategory

export function Savings() {
    const { t, locale } = useTranslation()
    const [section, setSection] = useState<'accounts' | 'transactions'>('accounts')
    // Each section remembers its own layout: accounts read best as cards, transactions as a table
    const [accountsView, setAccountsView] = useState<ViewMode>('grid')
    const [transactionsView, setTransactionsView] = useState<ViewMode>('list')
    const [accounts, setAccounts] = useState<SavingsAccount[]>([])
    const [transactions, setTransactions] = useState<SavingsTransaction[]>([])
    const [loading, setLoading] = useState(true)

    // Filters (the category applies to both sections)
    const [category, setCategory] = useState<CategoryFilter>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [accountFilter, setAccountFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState<'all' | SavingsTransactionType>('all')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')

    // Modals
    const [accountFormOpen, setAccountFormOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<SavingsAccount | null>(null)
    const [accountToDelete, setAccountToDelete] = useState<SavingsAccount | null>(null)
    const [txFormOpen, setTxFormOpen] = useState(false)
    const [editingTx, setEditingTx] = useState<SavingsTransaction | null>(null)
    const [txPreset, setTxPreset] = useState<{ accountId?: number; type?: SavingsTransactionType }>({})
    const [txToDelete, setTxToDelete] = useState<SavingsTransaction | null>(null)

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const [accountData, transactionData] = await Promise.all([savingsAccountService.getAll(), savingsTransactionService.getAll()])
            setAccounts(accountData)
            setTransactions(transactionData)
        } catch (error) {
            console.error('Error loading savings:', error)
            toast.error(t('sav.loadError'))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Balance per category, for the stat cards
    const totals = useMemo(() => {
        const byCategory = Object.fromEntries(SAVINGS_CATEGORIES.map(c => [c, { balance: 0, count: 0 }])) as Record<SavingsCategory, { balance: number; count: number }>
        for (const a of accounts) {
            const entry = byCategory[a.category] ?? byCategory.other
            entry.balance += a.balance ?? 0
            entry.count++
        }
        const balance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0)
        return { byCategory, balance, count: accounts.length }
    }, [accounts])

    const term = searchTerm.trim().toLowerCase()
    const filteredAccounts = useMemo(() => accounts.filter(a =>
        (category === 'all' || a.category === category) &&
        (!term || a.name.toLowerCase().includes(term) || a.description?.toLowerCase().includes(term))
    ), [accounts, category, term])

    const filteredTransactions = useMemo(() => transactions.filter(tx =>
        (category === 'all' || tx.account_category === category) &&
        (accountFilter === 'all' || String(tx.account_id) === accountFilter) &&
        (typeFilter === 'all' || tx.type === typeFilter) &&
        // transaction_date is 'YYYY-MM-DD', so string comparison orders by day
        (!fromDate || tx.transaction_date >= fromDate) &&
        (!toDate || tx.transaction_date <= toDate) &&
        (!term || tx.description?.toLowerCase().includes(term) || tx.account_name?.toLowerCase().includes(term))
    ), [transactions, category, accountFilter, typeFilter, fromDate, toDate, term])

    const hasFilters = section === 'accounts'
        ? !!term
        : !!(term || accountFilter !== 'all' || typeFilter !== 'all' || fromDate || toDate)
    const clearFilters = () => {
        setSearchTerm('')
        setAccountFilter('all')
        setTypeFilter('all')
        setFromDate('')
        setToDate('')
    }

    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)
    const countLabel = (count: number) => count === 1 ? t('sav.statAccountsOne') : t('sav.statAccounts', { count })
    const txCountLabel = (count: number) => count === 1 ? t('savAcc.txCountOne') : t('savAcc.txCount', { count })

    const openTransaction = (preset: { accountId?: number; type?: SavingsTransactionType } = {}) => {
        setEditingTx(null)
        setTxPreset(preset)
        setTxFormOpen(true)
    }

    // Accounts with transactions can't be deleted; explain instead of asking
    const requestDeleteAccount = (account: SavingsAccount) => {
        if (account.transactions_count) toast.error(t('savError.ACCOUNT_IN_USE'))
        else setAccountToDelete(account)
    }

    const confirmDeleteAccount = async () => {
        if (!accountToDelete?.id) return
        try {
            await savingsAccountService.delete(accountToDelete.id)
            toast.success(t('savAcc.deleted'))
            loadData()
        } catch (error) {
            toast.error(savingsErrorMessage(error, t))
        } finally {
            setAccountToDelete(null)
        }
    }

    const confirmDeleteTx = async () => {
        if (!txToDelete?.id) return
        try {
            await savingsTransactionService.delete(txToDelete.id)
            toast.success(t('savTx.deleted'))
            loadData()
        } catch (error) {
            toast.error(savingsErrorMessage(error, t))
        } finally {
            setTxToDelete(null)
        }
    }

    const filterInputClass = "px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
    const accountsInCategory = category === 'all' ? accounts : accounts.filter(a => a.category === category)

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        {t('sav.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('sav.subtitle')}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => { setEditingAccount(null); setAccountFormOpen(true) }}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        {t('sav.newAccount')}
                    </button>
                    <button
                        onClick={() => openTransaction()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                    >
                        <ArrowLeftRight className="w-5 h-5" />
                        {t('sav.newTransaction')}
                    </button>
                </div>
            </div>

            {/* Stats: click a category to filter by it */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label={t('sav.statTotal')}
                    value={formatCurrency(totals.balance)}
                    hint={countLabel(totals.count)}
                    icon={PiggyBank}
                    color="bg-purple-500"
                    active={category === 'all'}
                    onClick={() => setCategory('all')}
                />
                {SAVINGS_CATEGORIES.map(c => (
                    <StatCard
                        key={c}
                        label={categoryLabel(c, t)}
                        value={formatCurrency(totals.byCategory[c].balance)}
                        hint={countLabel(totals.byCategory[c].count)}
                        icon={CATEGORY_STYLES[c].icon}
                        color={CATEGORY_STYLES[c].stat}
                        active={category === c}
                        onClick={() => setCategory(category === c ? 'all' : c)}
                    />
                ))}
            </div>

            {/* Section tabs */}
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                {([
                    { id: 'accounts', label: t('sav.section.accounts'), icon: Wallet },
                    { id: 'transactions', label: t('sav.section.transactions'), icon: ArrowLeftRight }
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

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col lg:flex-row gap-3 lg:items-center flex-wrap">
                <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={section === 'accounts' ? t('savAcc.searchPlaceholder') : t('savTx.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(filterInputClass, "w-full pl-10 pr-4 placeholder-gray-500")}
                    />
                </div>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CategoryFilter)}
                    aria-label={t('savAccForm.category')}
                    className={filterInputClass}
                >
                    <option value="all">{t('sav.allCategories')}</option>
                    {SAVINGS_CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c, t)}</option>)}
                </select>
                {section === 'transactions' && (
                    <>
                        <select
                            value={accountFilter}
                            onChange={(e) => setAccountFilter(e.target.value)}
                            aria-label={t('savTx.col.account')}
                            className={filterInputClass}
                        >
                            <option value="all">{t('sav.allAccounts')}</option>
                            {accountsInCategory.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as 'all' | SavingsTransactionType)}
                            aria-label={t('savTx.col.type')}
                            className={filterInputClass}
                        >
                            <option value="all">{t('sav.allTypes')}</option>
                            <option value="deposit">{t('sav.type.deposit')}</option>
                            <option value="withdrawal">{t('sav.type.withdrawal')}</option>
                        </select>
                        <DateRangeInputs
                            value={{ from: fromDate || undefined, to: toDate || undefined }}
                            onChange={(range) => { setFromDate(range.from ?? ''); setToDate(range.to ?? '') }}
                            inputClassName={filterInputClass}
                        />
                    </>
                )}
                <ClearFiltersButton visible={hasFilters} onClick={clearFilters} />
                <ViewModeToggle
                    value={section === 'accounts' ? accountsView : transactionsView}
                    onChange={section === 'accounts' ? setAccountsView : setTransactionsView}
                    className="lg:ml-auto self-end lg:self-auto"
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-gray-500">{t('sav.loading')}</p>
                </div>
            ) : section === 'accounts' ? (
                filteredAccounts.length === 0 ? (
                    <EmptyState
                        icon={PiggyBank}
                        title={accounts.length === 0 ? t('savAcc.empty') : t('savAcc.noResults')}
                        description={accounts.length === 0 ? t('savAcc.emptyDesc') : undefined}
                    />
                ) : accountsView === 'list' ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">{t('savTx.col.account')}</th>
                                    <th className="px-4 py-3">{t('savAccForm.category')}</th>
                                    <th className="px-4 py-3">{t('savTx.col.description')}</th>
                                    <th className="px-4 py-3">{t('sav.section.transactions')}</th>
                                    <th className="px-4 py-3">{t('savView.lastTransaction')}</th>
                                    <th className="px-4 py-3 text-right">{t('savAcc.balance')}</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {filteredAccounts.map(account => {
                                    const style = CATEGORY_STYLES[account.category] ?? CATEGORY_STYLES.other
                                    return (
                                        <tr key={account.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <Link to={`/savings/${account.id}`} className="flex items-center gap-3 min-w-0 font-bold text-gray-900 dark:text-white hover:text-primary">
                                                    <span className={cn("w-9 h-9 shrink-0 rounded-lg flex items-center justify-center", style.badge)}>
                                                        <style.icon className="w-4 h-4" />
                                                    </span>
                                                    <span className="truncate max-w-[14rem]" title={account.name}>{account.name}</span>
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-bold", style.badge)}>{categoryLabel(account.category, t)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={account.description}>
                                                {account.description || '-'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{account.transactions_count ?? 0}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                                {account.last_transaction_date ? formatDay(account.last_transaction_date) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(account.balance ?? 0)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => openTransaction({ accountId: account.id, type: 'deposit' })}
                                                        className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                                        title={t('sav.deposit')}
                                                        aria-label={t('sav.deposit')}
                                                    >
                                                        <ArrowDownCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openTransaction({ accountId: account.id, type: 'withdrawal' })}
                                                        disabled={(account.balance ?? 0) <= 0}
                                                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                        title={t('sav.withdraw')}
                                                        aria-label={t('sav.withdraw')}
                                                    >
                                                        <ArrowUpCircle className="w-4 h-4" />
                                                    </button>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => { setEditingAccount(account); setAccountFormOpen(true) }}
                                                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                            title={t('common.edit')}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => requestDeleteAccount(account)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                            title={t('common.delete')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredAccounts.map(account => {
                            const style = CATEGORY_STYLES[account.category] ?? CATEGORY_STYLES.other
                            return (
                                <motion.div
                                    key={account.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-md hover:shadow-xl transition-all p-5 flex flex-col"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <Link to={`/savings/${account.id}`} className="flex items-center gap-3 min-w-0 hover:text-primary">
                                            <div className={cn("w-11 h-11 shrink-0 rounded-xl flex items-center justify-center", style.badge)}>
                                                <style.icon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-primary" title={account.name}>{account.name}</h3>
                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{categoryLabel(account.category, t)}</span>
                                            </div>
                                        </Link>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                                            <button
                                                onClick={() => { setEditingAccount(account); setAccountFormOpen(true) }}
                                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title={t('common.edit')}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => requestDeleteAccount(account)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                title={t('common.delete')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Grows so the buttons line up at the bottom of every card in the row */}
                                    <div className="mt-4 flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('savAcc.balance')}</p>
                                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                {txCountLabel(account.transactions_count ?? 0)}
                                            </span>
                                        </div>
                                        <p className="text-2xl font-black text-gray-900 dark:text-white truncate" title={formatCurrency(account.balance ?? 0)}>
                                            {formatCurrency(account.balance ?? 0)}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                            {account.description || <span className="italic opacity-70">{t('savAcc.noDescription')}</span>}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => openTransaction({ accountId: account.id, type: 'deposit' })}
                                            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors min-w-0"
                                        >
                                            <ArrowDownCircle className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{t('sav.deposit')}</span>
                                        </button>
                                        <button
                                            onClick={() => openTransaction({ accountId: account.id, type: 'withdrawal' })}
                                            disabled={(account.balance ?? 0) <= 0}
                                            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-w-0"
                                        >
                                            <ArrowUpCircle className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{t('sav.withdraw')}</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )
            ) : filteredTransactions.length === 0 ? (
                <EmptyState
                    icon={ArrowLeftRight}
                    title={transactions.length === 0 ? t('savTx.empty') : t('savTx.noResults')}
                    description={transactions.length === 0 ? t('savTx.emptyDesc') : undefined}
                />
            ) : transactionsView === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredTransactions.map(tx => {
                        const isDeposit = tx.type === 'deposit'
                        const category = tx.account_category ?? 'other'
                        return (
                            <motion.div
                                key={tx.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-md hover:shadow-xl transition-all p-5 flex flex-col"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                                        isDeposit ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                    )}>
                                        {isDeposit ? <ArrowDownCircle className="w-3.5 h-3.5" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                                        {typeLabel(tx.type, t)}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                                        <button
                                            onClick={() => { setEditingTx(tx); setTxPreset({}); setTxFormOpen(true) }}
                                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            title={t('common.edit')}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setTxToDelete(tx)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 flex-1 min-w-0">
                                    <p className={cn("text-2xl font-black truncate", isDeposit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                        {isDeposit ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 min-w-0">
                                        <Link to={`/savings/${tx.account_id}`} className="font-bold text-gray-900 dark:text-white hover:text-primary truncate" title={tx.account_name}>
                                            {tx.account_name}
                                        </Link>
                                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0", CATEGORY_STYLES[category].badge)}>
                                            {categoryLabel(category, t)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                                        {tx.description || <span className="italic opacity-70">{t('savAcc.noDescription')}</span>}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="whitespace-nowrap">{formatDay(tx.transaction_date)}</span>
                                    <span className="truncate">{paymentMethodLabel(tx.payment_method)}{tx.created_by ? ` · ${tx.created_by}` : ''}</span>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">{t('savTx.col.date')}</th>
                                <th className="px-4 py-3">{t('savTx.col.account')}</th>
                                <th className="px-4 py-3">{t('savTx.col.type')}</th>
                                <th className="px-4 py-3">{t('savTx.col.description')}</th>
                                <th className="px-4 py-3">{t('savTx.col.payment')}</th>
                                <th className="px-4 py-3">{t('savTx.col.recordedBy')}</th>
                                <th className="px-4 py-3 text-right">{t('savTx.col.amount')}</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {filteredTransactions.map(tx => {
                                const wasEdited = tx.updated_by && tx.updated_at && tx.updated_at !== tx.created_at
                                const isDeposit = tx.type === 'deposit'
                                return (
                                    <tr key={tx.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-white">{formatDay(tx.transaction_date)}</td>
                                        <td className="px-4 py-3">
                                            <Link to={`/savings/${tx.account_id}`} className="font-medium text-gray-900 dark:text-white hover:text-primary hover:underline">{tx.account_name}</Link>
                                            <span className={cn("ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap", CATEGORY_STYLES[tx.account_category ?? 'other'].badge)}>
                                                {categoryLabel(tx.account_category, t)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={cn("inline-flex items-center gap-1 text-xs font-bold", isDeposit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                                {isDeposit ? <ArrowDownCircle className="w-3.5 h-3.5" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                                                {typeLabel(tx.type, t)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={tx.description}>
                                            {tx.description || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{paymentMethodLabel(tx.payment_method)}</td>
                                        <td
                                            className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300"
                                            title={wasEdited ? t('savTx.updatedBy', { user: tx.updated_by!, date: new Date(tx.updated_at!).toLocaleString(locale) }) : undefined}
                                        >
                                            {tx.created_by || '-'}
                                            {wasEdited && <span className="ml-1 text-gray-400">*</span>}
                                        </td>
                                        <td className={cn("px-4 py-3 text-right font-bold whitespace-nowrap", isDeposit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                            {isDeposit ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setEditingTx(tx); setTxPreset({}); setTxFormOpen(true) }}
                                                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title={t('common.edit')}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setTxToDelete(tx)}
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

            <SavingsAccountForm
                isOpen={accountFormOpen}
                account={editingAccount}
                defaultCategory={category === 'all' ? undefined : category}
                onClose={() => { setAccountFormOpen(false); setEditingAccount(null) }}
                onSaved={loadData}
            />

            <SavingsTransactionForm
                isOpen={txFormOpen}
                transaction={editingTx}
                accounts={accounts}
                preset={txPreset}
                onClose={() => { setTxFormOpen(false); setEditingTx(null) }}
                onSaved={loadData}
            />

            <ConfirmDialog
                isOpen={!!accountToDelete}
                title={t('savAcc.deleteTitle')}
                description={t('savAcc.deleteDesc', { name: accountToDelete?.name ?? '' })}
                confirmText={t('savAcc.deleteConfirm')}
                variant="danger"
                onConfirm={confirmDeleteAccount}
                onCancel={() => setAccountToDelete(null)}
            />

            <ConfirmDialog
                isOpen={!!txToDelete}
                title={t('savTx.deleteTitle')}
                description={txToDelete ? t('savTx.deleteDesc', {
                    type: typeLabel(txToDelete.type, t).toLowerCase(),
                    amount: formatCurrency(txToDelete.amount),
                    date: formatDay(txToDelete.transaction_date),
                    account: txToDelete.account_name ?? ''
                }) : ''}
                confirmText={t('savTx.deleteConfirm')}
                variant="danger"
                onConfirm={confirmDeleteTx}
                onCancel={() => setTxToDelete(null)}
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
    active?: boolean
    onClick?: () => void
}

function StatCard({ label, value, hint, icon: Icon, color, active, onClick }: StatCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border flex items-center gap-4 min-w-0 text-left transition-all hover:shadow-md",
                active ? "border-primary ring-2 ring-primary/20" : "border-gray-200 dark:border-gray-700"
            )}
        >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", color, "bg-opacity-10")}>
                <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
            </div>
            <div className="min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white truncate" title={value}>{value}</p>
                {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
            </div>
        </button>
    )
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
    return (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
            {description && <p className="text-gray-500 mt-2">{description}</p>}
        </div>
    )
}
