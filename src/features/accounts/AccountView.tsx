import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import { ArrowDownLeft, ArrowUpRight, Minus, Search, Download, Banknote, Receipt, Scale, ListOrdered, ExternalLink, ArrowLeftRight, Ban } from 'lucide-react'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { DateRangeInputs } from '@/components/ui/DateRangeInputs'
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton'
import { ViewHeader, ViewAvatar, ViewSection, ViewStat, ViewTable, ViewLink, ViewLoading, ViewNotFound, viewCellClass } from '@/components/view/ViewPage'
import { parseId } from '@/components/view/useRecord'
import { supplierService } from '@/services/supplierService'
import { purchaseService, supplierAccountService } from '@/services/purchaseService'
import { capitalService } from '@/services/capitalService'
import type { CapitalEntry, Purchase, Supplier } from '@/types/database'
import { SupplierPaymentForm, type SupplierPaymentPreset } from '@/features/purchases/SupplierPaymentForm'
import { RepaymentForm } from '@/features/capital/RepaymentForm'
import {
    BALANCE_MODES, BUCKETS, bucketLabel, bucketTotals, cashTotals, isAccountType, lineLabel, typeLabel,
    type AccountLine, type LineKind
} from './accountLedger'
import { TYPE_STYLES, useAccounts } from './accountUi'
import { AccountBalance, AccountTypeBadge } from './AccountParts'

const inputClass = "px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
const STAT_COLORS = ['bg-amber-500', 'bg-green-500', 'bg-purple-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500']

// Every transaction on one account, oldest first, with the running balance
export function AccountView() {
    const { t, locale } = useTranslation()
    const params = useParams()
    const type = isAccountType(params.type) ? params.type : null
    // Walk-in accounts are keyed by name, the others by record id
    const id = type === 'walkin' ? params.id ?? null : parseId(params.id)
    const { accounts, loading, reload } = useAccounts()
    const account = id === null ? undefined : accounts.find(a => a.type === type && String(a.id) === String(id))

    const [kind, setKind] = useState<'all' | LineKind>('all')
    const [search, setSearch] = useState('')
    // Dates chosen on the Accounts page come along in the link
    const [searchParams] = useSearchParams()
    const dayParam = (name: string) => {
        const value = searchParams.get(name) ?? ''
        return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
    }
    const [fromDate, setFromDate] = useState(() => dayParam('from'))
    const [toDate, setToDate] = useState(() => dayParam('to'))
    const [hideCancelled, setHideCancelled] = useState(false)
    // Payment forms open with the data they need
    const [supplierPayment, setSupplierPayment] = useState<{ preset: SupplierPaymentPreset; suppliers: Supplier[]; orders: Purchase[] } | null>(null)
    const [repayment, setRepayment] = useState<CapitalEntry[] | null>(null)

    const term = search.trim().toLowerCase()
    const view = useMemo(() => {
        const lines = account?.lines ?? []
        // Balance before the period, so each line still shows the real account balance
        const before = fromDate ? lines.filter(line => line.date < fromDate) : []
        const opening = before.length > 0 ? before[before.length - 1].balance : 0
        const inPeriod = lines.filter(line => (!fromDate || line.date >= fromDate) && (!toDate || line.date <= toDate))
        const rows = inPeriod.filter(line =>
            (kind === 'all' || line.kind === kind) &&
            (!hideCancelled || !line.cancelled) &&
            (!term || [line.ref?.text, line.notes, line.details, line.by, line.method ? paymentMethodLabel(line.method) : '', t(lineLabel(line.kind))]
                .some(text => (text ?? '').toLowerCase().includes(term)))
        )
        return {
            rows,
            opening,
            hasOpening: before.length > 0,
            closing: inPeriod.length > 0 ? inPeriod[inPeriod.length - 1].balance : opening,
            cash: cashTotals(rows),
            kinds: [...new Set(lines.map(line => line.kind))]
        }
    }, [account, kind, hideCancelled, term, fromDate, toDate, t])

    const backLabel = t('view.backTo', { page: t('nav.accounts') })
    if (loading) return <ViewLoading />
    if (!account || !type) return <ViewNotFound backTo="/accounts" backLabel={backLabel} />

    const style = TYPE_STYLES[account.type]
    const totals = bucketTotals(account.lines)
    const buckets = BUCKETS[account.type].filter(bucket => totals[bucket])
    const hasCancelled = account.lines.some(line => line.cancelled)
    const filtered = kind !== 'all' || !!term || hideCancelled
    const hasFilters = filtered || !!fromDate || !!toDate
    const clearFilters = () => { setKind('all'); setSearch(''); setFromDate(''); setToDate(''); setHideCancelled(false) }
    const formatDay = (day: string) => day ? parseISO(day).toLocaleDateString(locale) : '-'

    const exportCsv = () => {
        const quote = (cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`
        const lines = [
            [t('acct.col.date'), t('acct.col.transaction'), t('acct.col.reference'), t('acct.col.method'), t('acct.col.details'),
                t('acct.col.notes'), t('acct.col.recordedBy'), t('acct.col.cash'), t('acct.col.amount'), t('acct.col.balance')],
            ...view.rows.map(line => [
                line.date, t(lineLabel(line.kind)) + (line.cancelled ? ` (${t('acct.cancelled')})` : ''), line.ref?.text ?? '',
                line.method ? paymentMethodLabel(line.method) : '', [line.details, line.itemCount ? t('acct.items', { count: line.itemCount }) : ''].filter(Boolean).join(' · '),
                line.notes ?? '', line.by ?? '', line.cash === 'in' ? t('acct.cash.in') : line.cash === 'out' ? t('acct.cash.out') : '',
                line.amount, line.balance
            ])
        ]
        const csv = lines.map(line => line.map(quote).join(',')).join('\n')
        const safeName = account.name.replace(/[\\/:*?"<>|]+/g, '').trim() || String(account.id)
        saveAs(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), `${safeName}_${t('acct.file')}_${new Date().toISOString().split('T')[0]}.csv`)
    }

    const openSupplierPayment = async () => {
        try {
            const [suppliers, orders, supplierAccount] = await Promise.all([
                supplierService.getAll(), purchaseService.getAll(), supplierAccountService.get(Number(account.id))
            ])
            // Same preset as the Purchases accounts tab: advances held for open orders aren't refundable
            const available = supplierAccount.available
            setSupplierPayment({
                suppliers,
                orders: orders.filter(o => o.supplier_id === Number(account.id)),
                preset: { supplierId: Number(account.id), type: available > 0 ? 'refund' : 'payment', amount: available !== 0 ? Math.abs(available) : undefined }
            })
        } catch (error) {
            console.error(error)
            toast.error(t('acct.loadError'))
        }
    }

    const openRepayment = async () => {
        try {
            setRepayment(await capitalService.getAll())
        } catch (error) {
            console.error(error)
            toast.error(t('acct.loadError'))
        }
    }

    const buttonClass = "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"

    return (
        <div className="space-y-6 pb-20 p-2">
            <ViewHeader
                backTo="/accounts"
                backLabel={backLabel}
                avatar={<ViewAvatar gradient={style.gradient}>{account.name.charAt(0).toUpperCase()}</ViewAvatar>}
                title={account.name}
                subtitle={account.info ?? (account.type === 'walkin' ? t('acct.walkinInfo') : undefined)}
                badges={<AccountTypeBadge type={account.type} />}
            />

            <div className="flex flex-wrap gap-2">
                {account.type === 'supplier' && (
                    <button onClick={openSupplierPayment} className={cn(buttonClass, "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20")}>
                        <Banknote className="w-4 h-4" />
                        {t('pur.recordPayment')}
                    </button>
                )}
                {account.type === 'source' && account.balance !== 0 && (
                    <button onClick={openRepayment} className={cn(buttonClass, "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20")}>
                        <ArrowLeftRight className="w-4 h-4" />
                        {t(account.balance < 0 ? 'acct.repay' : 'acct.collect')}
                    </button>
                )}
                <button
                    onClick={exportCsv}
                    disabled={view.rows.length === 0}
                    className={cn(buttonClass, "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed")}
                >
                    <Download className="w-4 h-4" />
                    {t('acct.export')}
                </button>
                {account.link && (
                    <ViewLink to={account.link.to} page={account.link.page} className={cn(buttonClass, "text-gray-600 dark:text-gray-300 hover:no-underline hover:bg-gray-100 dark:hover:bg-gray-700")}>
                        <ExternalLink className="w-4 h-4" />
                        {t('acct.openRecord', { type: t(typeLabel(account.type)) })}
                    </ViewLink>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ViewStat
                    label={t('acct.col.balance')}
                    value={<AccountBalance type={account.type} value={account.balance} align="left" />}
                    icon={Scale}
                    color="bg-blue-500"
                />
                <ViewStat label={t('acct.stat.transactions')} value={account.lines.length} hint={account.lastDate ? t('acct.lastOn', { date: formatDay(account.lastDate) }) : undefined} icon={ListOrdered} color="bg-gray-500" />
                {buckets.map((bucket, index) => (
                    <ViewStat key={bucket} label={t(bucketLabel(bucket))} value={formatCurrency(totals[bucket] ?? 0)} icon={Receipt} color={STAT_COLORS[index % STAT_COLORS.length]} />
                ))}
            </div>

            <ViewSection
                title={t('acct.transactions')}
                icon={ListOrdered}
                actions={<span className="text-xs text-gray-500">{t('acct.count', { count: view.rows.length })}</span>}
            >
                <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-3 mb-6">
                    <div className="relative flex-1 min-w-[14rem]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('acct.searchLines')} className={cn(inputClass, "w-full pl-9")} />
                    </div>
                    <select value={kind} onChange={(e) => setKind(e.target.value as 'all' | LineKind)} aria-label={t('acct.col.transaction')} className={inputClass}>
                        <option value="all">{t('acct.allTransactions')}</option>
                        {view.kinds.map(k => <option key={k} value={k}>{t(lineLabel(k))}</option>)}
                    </select>
                    <DateRangeInputs
                        value={{ from: fromDate || undefined, to: toDate || undefined }}
                        onChange={(range) => { setFromDate(range.from ?? ''); setToDate(range.to ?? '') }}
                        inputClassName={inputClass}
                        showClear={false}
                    />
                    {hasCancelled && (
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            <input type="checkbox" checked={hideCancelled} onChange={(e) => setHideCancelled(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                            {t('acct.hideCancelled')}
                        </label>
                    )}
                    <ClearFiltersButton visible={hasFilters} onClick={clearFilters} />
                </div>

                <ViewTable
                    columns={[
                        { label: t('acct.col.date') }, { label: t('acct.col.transaction') }, { label: t('acct.col.details') },
                        { label: t('acct.col.amount'), align: 'right' }, { label: t('acct.col.balance'), align: 'right' }
                    ]}
                    empty={account.lines.length === 0 ? t('acct.noTransactions') : view.rows.length === 0 && !view.hasOpening ? t('acct.noLineResults') : undefined}
                >
                    {view.hasOpening && (
                        <tr className="bg-gray-50/60 dark:bg-gray-900/30">
                            <td className={cn(viewCellClass, "whitespace-nowrap")}>{formatDay(fromDate)}</td>
                            <td className={cn(viewCellClass, "font-semibold")} colSpan={3}>{t('acct.opening')}</td>
                            <td className={cn(viewCellClass, "text-right")}><AccountBalance type={account.type} value={view.opening} /></td>
                        </tr>
                    )}
                    {view.rows.map(line => <LedgerRow key={line.key} line={line} type={account.type} formatDay={formatDay} />)}
                    {view.rows.length === 0 && view.hasOpening && (
                        <tr><td className={cn(viewCellClass, "text-center text-gray-500 py-6")} colSpan={5}>{t('acct.noLineResults')}</td></tr>
                    )}
                    {view.rows.length > 0 && (
                        <tr className="bg-gray-50 dark:bg-gray-900/50">
                            <td className={viewCellClass} colSpan={3}>
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                                    <span className="font-bold text-gray-900 dark:text-white">{filtered ? t('acct.totalsShown') : t('acct.closing')}</span>
                                    {view.cash.moneyIn > 0 && <span className="text-xs text-green-700 dark:text-green-400 font-semibold">{t('acct.cash.inTotal', { amount: formatCurrency(view.cash.moneyIn) })}</span>}
                                    {view.cash.moneyOut > 0 && <span className="text-xs text-red-600 dark:text-red-400 font-semibold">{t('acct.cash.outTotal', { amount: formatCurrency(view.cash.moneyOut) })}</span>}
                                </div>
                            </td>
                            <td className={viewCellClass} />
                            <td className={cn(viewCellClass, "text-right")}>{!filtered && <AccountBalance type={account.type} value={view.closing} />}</td>
                        </tr>
                    )}
                </ViewTable>

                {account.lines.length > 0 && <p className="text-xs text-gray-500 dark:text-gray-400 mt-8">{t(`acct.legend.${BALANCE_MODES[account.type]}`)}</p>}
            </ViewSection>

            {supplierPayment && (
                <SupplierPaymentForm
                    isOpen
                    suppliers={supplierPayment.suppliers}
                    orders={supplierPayment.orders}
                    preset={supplierPayment.preset}
                    onClose={() => setSupplierPayment(null)}
                    onSaved={() => { setSupplierPayment(null); reload() }}
                />
            )}
            {repayment && (
                <RepaymentForm
                    isOpen
                    entries={repayment}
                    defaultKind={account.balance < 0 ? 'loan' : 'credit'}
                    defaultSourceId={Number(account.id)}
                    onClose={() => setRepayment(null)}
                    onSaved={() => { setRepayment(null); reload() }}
                />
            )}
        </div>
    )
}

function LedgerRow({ line, type, formatDay }: { line: AccountLine; type: Parameters<typeof AccountBalance>[0]['type']; formatDay: (day: string) => string }) {
    const { t } = useTranslation()
    const CashIcon = line.cancelled ? Ban : line.cash === 'in' ? ArrowDownLeft : line.cash === 'out' ? ArrowUpRight : Minus
    const tone = line.cancelled ? 'text-gray-400' : line.cash === 'in' ? 'text-green-600 dark:text-green-400' : line.cash === 'out' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
    const cashTitle = line.cancelled ? t('acct.cancelled') : line.cash === 'in' ? t('acct.cash.in') : line.cash === 'out' ? t('acct.cash.out') : t('acct.cash.none')
    const details = [line.details, line.itemCount ? t('acct.items', { count: line.itemCount }) : ''].filter(Boolean).join(' · ')
    return (
        <tr className={cn("hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors", line.cancelled && "opacity-60")}>
            <td className={cn(viewCellClass, "whitespace-nowrap align-top")}>{formatDay(line.date)}</td>
            <td className={cn(viewCellClass, "align-top")}>
                <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap", tone)} title={cashTitle}>
                    <CashIcon className="w-3.5 h-3.5" />
                    <span className={cn(line.cancelled && "line-through")}>{t(lineLabel(line.kind))}</span>
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap">
                    {line.ref && (line.ref.to && line.ref.page
                        ? <ViewLink to={line.ref.to} page={line.ref.page} className="text-primary font-medium">{line.ref.text}</ViewLink>
                        : <span className="font-mono">{line.ref.text}</span>)}
                    {line.method ? `${line.ref ? ' · ' : ''}${paymentMethodLabel(line.method)}` : ''}
                    {line.by ? ` · ${line.by}` : ''}
                </p>
            </td>
            <td className={cn(viewCellClass, "align-top max-w-md")}>
                {details && <p className="text-gray-700 dark:text-gray-300 line-clamp-2" title={details}>{details}</p>}
                {line.notes && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2" title={line.notes}>{line.notes}</p>}
                {!details && !line.notes && <span className="text-gray-400">-</span>}
            </td>
            <td className={cn(viewCellClass, "text-right whitespace-nowrap align-top font-semibold", line.cancelled ? "line-through text-gray-400" : "text-gray-900 dark:text-white")}>
                {formatCurrency(line.amount)}
            </td>
            <td className={cn(viewCellClass, "text-right align-top")}>
                {line.effect !== 0 ? <AccountBalance type={type} value={line.balance} /> : <span className="text-xs text-gray-400" title={t('acct.noEffect')}>—</span>}
            </td>
        </tr>
    )
}
