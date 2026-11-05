import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { BookOpen, Search, ArrowDownLeft, ArrowUpRight, ListOrdered, Users, ChevronRight, CalendarRange, FileDown } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton'
import { DateRangeInputs } from '@/components/ui/DateRangeInputs'
import { ACCOUNT_TYPES, BALANCE_MODES, accountKey, accountName, accountPath, typeLabel, type Account, type AccountType } from './accountLedger'
import { TYPE_STYLES, useAccounts } from './accountUi'
import { AccountBalance, AccountTypeBadge } from './AccountParts'
import { downloadAccountsSummary } from './accountReports'

type BalanceFilter = 'all' | 'owesYou' | 'youOwe' | 'settled' | 'active'
type SortKey = 'name' | 'recent' | 'balance'

const inputClass = "px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"

// One place for every account: suppliers, clients, capital sources and lenders, savings and expense categories
export function Accounts() {
    const { t, locale } = useTranslation()
    const navigate = useNavigate()
    const { accounts, loading, failed } = useAccounts()
    const [type, setType] = useState<'all' | AccountType>('all')
    const [search, setSearch] = useState('')
    const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all')
    const [sort, setSort] = useState<SortKey>('recent')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const dated = !!fromDate || !!toDate

    // Each account over the chosen dates: its transactions in the period and its balance at the end of it
    const periods = useMemo(() => accounts.map(account => {
        const lines = dated ? account.lines.filter(line => (!fromDate || line.date >= fromDate) && (!toDate || line.date <= toDate)) : account.lines
        const upToEnd = toDate ? account.lines.filter(line => line.date <= toDate) : account.lines
        return {
            account,
            count: lines.length,
            lastDate: lines.length > 0 ? lines[lines.length - 1].date : null,
            balance: upToEnd.length > 0 ? upToEnd[upToEnd.length - 1].balance : 0
        }
    }), [accounts, dated, fromDate, toDate])

    const counts = useMemo(() => {
        const byType: Partial<Record<AccountType, number>> = {}
        for (const account of accounts) byType[account.type] = (byType[account.type] ?? 0) + 1
        return byType
    }, [accounts])
    // Only the kinds this user can see
    const types = ACCOUNT_TYPES.filter(kind => counts[kind])

    // Owed figures are as of the end date; transactions are those in the period
    const stats = useMemo(() => {
        const parties = periods.filter(p => BALANCE_MODES[p.account.type] === 'party')
        return {
            owedToYou: parties.reduce((sum, p) => sum + Math.max(p.balance, 0), 0),
            youOwe: parties.reduce((sum, p) => sum + Math.max(-p.balance, 0), 0),
            transactions: periods.reduce((sum, p) => sum + p.count, 0)
        }
    }, [periods])

    const term = search.trim().toLowerCase()
    const shown = useMemo(() => {
        const isParty = (a: Account) => BALANCE_MODES[a.type] === 'party'
        const list = periods.filter(({ account: a, count, balance }) =>
            // With dates set, only accounts that had transactions in the period
            (!dated || count > 0) &&
            (type === 'all' || a.type === type) &&
            (!term || accountName(a, t).toLowerCase().includes(term) || (a.info ?? '').toLowerCase().includes(term)) &&
            (balanceFilter === 'all' ||
                (balanceFilter === 'active' && count > 0) ||
                (balanceFilter === 'owesYou' && isParty(a) && balance > 0) ||
                (balanceFilter === 'youOwe' && isParty(a) && balance < 0) ||
                (balanceFilter === 'settled' && isParty(a) && balance === 0))
        )
        return list.sort((a, b) =>
            sort === 'name' ? accountName(a.account, t).localeCompare(accountName(b.account, t))
                : sort === 'balance' ? Math.abs(b.balance) - Math.abs(a.balance) || accountName(a.account, t).localeCompare(accountName(b.account, t))
                    : (b.lastDate ?? '').localeCompare(a.lastDate ?? '') || accountName(a.account, t).localeCompare(accountName(b.account, t)))
    }, [periods, dated, type, term, balanceFilter, sort, t])

    const hasFilters = type !== 'all' || !!term || balanceFilter !== 'all' || dated
    const clearFilters = () => { setType('all'); setSearch(''); setBalanceFilter('all'); setFromDate(''); setToDate('') }
    // The account page opens on the same dates
    const linkTo = (account: Account) => {
        const query = new URLSearchParams()
        if (fromDate) query.set('from', fromDate)
        if (toDate) query.set('to', toDate)
        const queryString = query.toString()
        return queryString ? `${accountPath(account)}?${queryString}` : accountPath(account)
    }
    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)

    // PDF of the list exactly as filtered on screen
    const [exporting, setExporting] = useState(false)
    const exportPdf = async () => {
        const filters = [
            fromDate && toDate ? t('acct.report.range', { from: formatDay(fromDate), to: formatDay(toDate) })
                : fromDate ? t('acct.report.from', { date: formatDay(fromDate) })
                    : toDate ? t('acct.report.until', { date: formatDay(toDate) }) : '',
            type !== 'all' ? t(typeLabel(type)) : '',
            balanceFilter !== 'all' ? t(`acct.filter.${balanceFilter}`) : '',
            term ? t('acct.report.search', { term: search.trim() }) : ''
        ].filter(Boolean)
        setExporting(true)
        try {
            await downloadAccountsSummary({
                rows: shown,
                filters,
                balanceLabel: toDate ? t('acct.col.balanceAsOf', { date: formatDay(toDate) }) : t('acct.col.balance')
            }).unwrap()
        } catch (error) {
            console.error('Error generating accounts PDF:', error)
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="space-y-6 pb-20 p-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        <BookOpen className="w-8 h-8 text-primary" />
                        {t('acct.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('acct.subtitle')}</p>
                </div>
                <button
                    onClick={exportPdf}
                    disabled={loading || exporting || shown.length === 0}
                    title={t('acct.report.pdfHint')}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all font-semibold shadow-lg shadow-primary/20 active:scale-95 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FileDown className="w-4 h-4" />
                    {t('acct.report.pdf')}
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label={t('acct.stat.accounts')} value={String(accounts.length)} icon={Users} color="bg-indigo-500" />
                <StatCard label={t('acct.stat.transactions')} value={String(stats.transactions)} hint={dated ? t('acct.stat.inPeriod') : undefined} icon={ListOrdered} color="bg-purple-500" />
                <StatCard label={t('acct.stat.owedToYou')} value={formatCurrency(stats.owedToYou)} hint={toDate ? t('acct.stat.asOf', { date: formatDay(toDate) }) : t('acct.stat.owedToYouHint')} icon={ArrowDownLeft} color="bg-blue-500" />
                <StatCard label={t('acct.stat.youOwe')} value={formatCurrency(stats.youOwe)} hint={toDate ? t('acct.stat.asOf', { date: formatDay(toDate) }) : t('acct.stat.youOweHint')} icon={ArrowUpRight} color="bg-red-500" />
            </div>

            {/* Kind of account */}
            <div className="flex flex-wrap gap-2">
                <TypeTab active={type === 'all'} onClick={() => setType('all')} label={t('acct.type.all')} count={accounts.length} />
                {types.map(kind => (
                    <TypeTab key={kind} active={type === kind} onClick={() => setType(kind)} label={t(typeLabel(kind))} count={counts[kind] ?? 0} icon={TYPE_STYLES[kind].icon} />
                ))}
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-3">
                <div className="relative flex-1 min-w-[14rem]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('acct.search')} className={cn(inputClass, "w-full pl-9")} />
                </div>
                <select value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value as BalanceFilter)} aria-label={t('acct.col.balance')} className={inputClass}>
                    <option value="all">{t('acct.filter.all')}</option>
                    <option value="owesYou">{t('acct.filter.owesYou')}</option>
                    <option value="youOwe">{t('acct.filter.youOwe')}</option>
                    <option value="settled">{t('acct.filter.settled')}</option>
                    <option value="active">{t('acct.filter.active')}</option>
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label={t('acct.sort.label')} className={inputClass}>
                    <option value="recent">{t('acct.sort.recent')}</option>
                    <option value="name">{t('acct.sort.name')}</option>
                    <option value="balance">{t('acct.sort.balance')}</option>
                </select>
                <DateRangeInputs
                    value={{ from: fromDate || undefined, to: toDate || undefined }}
                    onChange={(range) => { setFromDate(range.from ?? ''); setToDate(range.to ?? '') }}
                    inputClassName={inputClass}
                    showClear={false}
                />
                <ClearFiltersButton visible={hasFilters} onClick={clearFilters} />
            </div>
            {dated && (
                <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <CalendarRange className="w-3.5 h-3.5 shrink-0" />
                    {toDate ? t('acct.periodHint', { date: formatDay(toDate) }) : t('acct.periodHintOpen')}
                </p>
            )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-gray-500">{t('acct.loading')}</p>
                </div>
            ) : failed ? (
                <Empty title={t('acct.loadError')} />
            ) : shown.length === 0 ? (
                <Empty title={accounts.length === 0 ? t('acct.empty') : dated ? t('acct.noPeriodResults') : t('acct.noResults')} />
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">{t('acct.col.account')}</th>
                                <th className="px-4 py-3">{t('acct.col.type')}</th>
                                <th className="px-4 py-3 text-right">{t('acct.col.transactions')}</th>
                                <th className="px-4 py-3">{t('acct.col.lastActivity')}</th>
                                <th className="px-4 py-3 text-right">{toDate ? t('acct.col.balanceAsOf', { date: formatDay(toDate) }) : t('acct.col.balance')}</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {shown.map(({ account, count, lastDate, balance }) => (
                                <motion.tr
                                    key={accountKey(account)}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={() => navigate(linkTo(account))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(linkTo(account)) }}
                                    tabIndex={0}
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700/30 transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-gray-900 dark:text-white">{accountName(account, t)}</p>
                                        {account.info && <p className="text-xs text-gray-500 truncate max-w-xs">{account.info}</p>}
                                    </td>
                                    <td className="px-4 py-3"><AccountTypeBadge type={account.type} /></td>
                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{count}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{lastDate ? formatDay(lastDate) : '-'}</td>
                                    <td className="px-4 py-3 text-right"><AccountBalance type={account.type} value={balance} /></td>
                                    <td className="px-4 py-3 text-right"><ChevronRight className="w-4 h-4 text-gray-400 inline" /></td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

function TypeTab({ active, onClick, label, count, icon: Icon }: { active: boolean; onClick: () => void; label: string; count: number; icon?: React.ElementType }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border",
                active
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
        >
            {Icon && <Icon className="w-4 h-4" />}
            {label}
            <span className={cn("px-1.5 rounded-md text-xs", active ? "bg-white/20" : "bg-gray-100 dark:bg-gray-700")}>{count}</span>
        </button>
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
                <p className="text-2xl font-black text-gray-900 dark:text-white break-words leading-tight">{value}</p>
                {hint && <p className="text-xs text-gray-500 dark:text-gray-400 break-words mt-0.5">{hint}</p>}
            </div>
        </div>
    )
}

function Empty({ title }: { title: string }) {
    return (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
    )
}
