import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { formatCurrency } from '@/lib/utils'
import type { CompanySettings } from '@/types/database'
import {
    BALANCE_MODES, accountName, balanceState, lineLabel, typeLabel,
    type Account, type AccountLine, type AccountType
} from '@/features/accounts/accountLedger'

// Pages are A4 at 1000px wide; long text is shortened so rows keep a steady height
const shorten = (text: string | undefined | null, max: number) => {
    const value = (text ?? '').trim()
    return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

interface FrameProps {
    settings: CompanySettings
    title: string
    subtitle: string
    // Dates, kind and search in force when the report was made
    filters: string[]
    page: { current: number; total: number }
    children: ReactNode
}

function ReportFrame({ settings, title, subtitle, filters, page, children }: FrameProps) {
    const { t, dateLocale } = useTranslation()
    return (
        <div className="w-[1000px] h-[1414px] bg-white p-12 text-gray-900 border-t-8 border-indigo-600 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-full opacity-50" />
            <div className="flex justify-between items-start mb-8 relative">
                <div className="flex gap-5 items-center">
                    <img src={settings.logo || 'logo.png'} className="w-16 h-16 object-contain bg-white rounded-lg border border-gray-100" alt="" />
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">{settings.name}</h1>
                        {(settings.phone || settings.address) && <p className="text-gray-500 text-xs">{[settings.address, settings.phone].filter(Boolean).join(' · ')}</p>}
                        <p className="text-gray-500 text-xs mt-1">{t('print.reportGenerated', { date: format(new Date(), t('print.longDateTimeFormat'), { locale: dateLocale }) })}</p>
                    </div>
                </div>
                <div className="text-right max-w-[420px]">
                    <h2 className="text-3xl font-black text-indigo-900 mb-1 break-words">{title}</h2>
                    <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs">{subtitle}</p>
                    {filters.length > 0 && (
                        <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                            {filters.map(filter => (
                                <span key={filter} className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">{filter}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 relative">{children}</div>

            <div className="pt-4 text-center border-t border-gray-100">
                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest">{t('print.confidential')}</p>
                <p className="text-gray-400 text-xs mt-1 font-mono">{t('print.page', { current: page.current, total: page.total })}</p>
            </div>
        </div>
    )
}

function Card({ label, value, tone = 'text-gray-900' }: { label: string; value: ReactNode; tone?: string }) {
    return (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-[11px] font-bold text-gray-500 uppercase">{label}</p>
            <p className={`text-2xl font-black ${tone}`}>{value}</p>
        </div>
    )
}

// Balance with its meaning, as on screen (owes you / you owe / held / spent)
function BalanceText({ type, value, currency }: { type: AccountType; value: number; currency: string }) {
    const { t } = useTranslation()
    const mode = BALANCE_MODES[type]
    if (mode === 'party' && value === 0) return <span className="font-bold text-green-600">{t('acct.balance.settled')}</span>
    const state = balanceState(mode, value)
    const tone = state.tone.split(' ').filter(c => !c.startsWith('dark:')).join(' ')
    return (
        <span className="inline-flex flex-col items-end">
            <span className={`font-bold ${tone}`}>{formatCurrency(state.amount, currency)}</span>
            <span className="text-[10px] text-gray-500">{t(state.key)}</span>
        </span>
    )
}

export interface SummaryRow {
    account: Account
    count: number
    lastDate: string | null
    balance: number
}

interface SummaryPageProps {
    settings: CompanySettings
    filters: string[]
    rows: SummaryRow[]
    // Cards on the first page, totals on the last
    stats?: { accounts: number; transactions: number; owedToYou: number; youOwe: number; balanceLabel: string }
    showTotals: boolean
    totals: { transactions: number; owedToYou: number; youOwe: number }
    page: { current: number; total: number }
}

export function AccountsSummaryPage({ settings, filters, rows, stats, showTotals, totals, page }: SummaryPageProps) {
    const { t } = useTranslation()
    const currency = settings.currencySymbol
    const formatDay = (day: string | null) => day ? format(parseISO(day), 'dd/MM/yyyy') : '-'
    return (
        <ReportFrame settings={settings} title={t('acct.report.summaryTitle')} subtitle={t('acct.report.summarySubtitle')} filters={filters} page={page}>
            {stats && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <Card label={t('acct.stat.accounts')} value={stats.accounts} />
                    <Card label={t('acct.stat.transactions')} value={stats.transactions} />
                    <Card label={t('acct.stat.owedToYou')} value={formatCurrency(stats.owedToYou, currency)} tone="text-blue-600" />
                    <Card label={t('acct.stat.youOwe')} value={formatCurrency(stats.youOwe, currency)} tone="text-red-600" />
                </div>
            )}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600 uppercase text-[11px] tracking-wider text-left">
                            <th className="py-3 px-4">{t('acct.col.account')}</th>
                            <th className="py-3 px-4">{t('acct.col.type')}</th>
                            <th className="py-3 px-4 text-right">{t('acct.col.transactions')}</th>
                            <th className="py-3 px-4">{t('acct.col.lastActivity')}</th>
                            <th className="py-3 px-4 text-right">{stats?.balanceLabel ?? t('acct.col.balance')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={`${row.account.type}-${row.account.id}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="py-2.5 px-4">
                                    <p className="font-bold text-gray-900">{shorten(accountName(row.account, t), 48)}</p>
                                    {row.account.info && <p className="text-[11px] text-gray-500">{shorten(row.account.info, 60)}</p>}
                                </td>
                                <td className="py-2.5 px-4 text-gray-600">{t(typeLabel(row.account.type))}</td>
                                <td className="py-2.5 px-4 text-right text-gray-600">{row.count}</td>
                                <td className="py-2.5 px-4 text-gray-600">{formatDay(row.lastDate)}</td>
                                <td className="py-2.5 px-4 text-right"><BalanceText type={row.account.type} value={row.balance} currency={currency} /></td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr><td colSpan={5} className="py-10 text-center text-gray-500">{t('acct.noResults')}</td></tr>
                        )}
                    </tbody>
                    {showTotals && (
                        <tfoot>
                            <tr className="bg-indigo-50 font-bold border-t-2 border-indigo-200">
                                <td className="py-3 px-4" colSpan={2}>{t('acct.report.totals')}</td>
                                <td className="py-3 px-4 text-right">{totals.transactions}</td>
                                <td className="py-3 px-4" />
                                <td className="py-3 px-4 text-right">
                                    <p className="text-blue-600">{t('acct.report.owedToYouTotal', { amount: formatCurrency(totals.owedToYou, currency) })}</p>
                                    <p className="text-red-600">{t('acct.report.youOweTotal', { amount: formatCurrency(totals.youOwe, currency) })}</p>
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </ReportFrame>
    )
}

interface StatementPageProps {
    settings: CompanySettings
    account: Account
    filters: string[]
    rows: AccountLine[]
    // First page: cards and the balance brought forward
    first?: {
        balance: number
        balanceLabel: string
        transactions: number
        moneyIn: number
        moneyOut: number
        opening: number | null
        openingDate: string
    }
    // Last page: closing line
    last?: { closing: number | null; moneyIn: number; moneyOut: number; label: string }
    page: { current: number; total: number }
}

export function AccountStatementPage({ settings, account, filters, rows, first, last, page }: StatementPageProps) {
    const { t } = useTranslation()
    const currency = settings.currencySymbol
    const formatDay = (day: string) => day ? format(parseISO(day), 'dd/MM/yyyy') : '-'
    const name = accountName(account, t)
    return (
        <ReportFrame
            settings={settings}
            title={shorten(name, 40)}
            subtitle={`${t('acct.report.statementSubtitle')} · ${t(typeLabel(account.type))}`}
            filters={filters}
            page={page}
        >
            {first && (
                <>
                    {account.info && <p className="text-sm text-gray-500 -mt-4 mb-4">{account.info}</p>}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <Card label={first.balanceLabel} value={<BalanceText type={account.type} value={first.balance} currency={currency} />} />
                        <Card label={t('acct.stat.transactions')} value={first.transactions} />
                        <Card label={t('acct.cash.in')} value={formatCurrency(first.moneyIn, currency)} tone="text-green-600" />
                        <Card label={t('acct.cash.out')} value={formatCurrency(first.moneyOut, currency)} tone="text-red-600" />
                    </div>
                </>
            )}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600 uppercase text-[11px] tracking-wider text-left">
                            <th className="py-3 px-3 w-[92px]">{t('acct.col.date')}</th>
                            <th className="py-3 px-3">{t('acct.col.transaction')}</th>
                            <th className="py-3 px-3">{t('acct.col.details')}</th>
                            <th className="py-3 px-3 text-right">{t('acct.col.amount')}</th>
                            <th className="py-3 px-3 text-right">{t('acct.col.balance')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {first && first.opening !== null && (
                            <tr className="bg-indigo-50/60">
                                <td className="py-2.5 px-3 text-gray-600">{formatDay(first.openingDate)}</td>
                                <td className="py-2.5 px-3 font-bold" colSpan={3}>{t('acct.opening')}</td>
                                <td className="py-2.5 px-3 text-right"><BalanceText type={account.type} value={first.opening} currency={currency} /></td>
                            </tr>
                        )}
                        {rows.map((line, index) => {
                            const cash = line.cancelled ? t('acct.cancelled') : line.cash === 'in' ? t('acct.cash.in') : line.cash === 'out' ? t('acct.cash.out') : ''
                            const sub = [line.ref?.text, line.method ? paymentMethodLabel(line.method) : '', line.by ?? '', cash].filter(Boolean).join(' · ')
                            const details = [line.details, line.itemCount ? t('acct.items', { count: line.itemCount }) : ''].filter(Boolean).join(' · ')
                            return (
                                <tr key={line.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="py-2.5 px-3 text-gray-600 align-top whitespace-nowrap">{formatDay(line.date)}</td>
                                    <td className="py-2.5 px-3 align-top">
                                        <p className={`font-bold ${line.cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{t(lineLabel(line.kind))}</p>
                                        {sub && <p className="text-[11px] text-gray-500">{shorten(sub, 60)}</p>}
                                    </td>
                                    <td className="py-2.5 px-3 align-top">
                                        {details && <p className="text-gray-700 text-xs">{shorten(details, 90)}</p>}
                                        {line.notes && <p className="text-[11px] text-gray-500">{shorten(line.notes, 80)}</p>}
                                        {!details && !line.notes && <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className={`py-2.5 px-3 text-right align-top whitespace-nowrap font-semibold ${line.cancelled ? 'text-gray-400 line-through' : ''}`}>{formatCurrency(line.amount, currency)}</td>
                                    <td className="py-2.5 px-3 text-right align-top whitespace-nowrap">
                                        {line.effect !== 0 ? <BalanceText type={account.type} value={line.balance} currency={currency} /> : <span className="text-gray-300">—</span>}
                                    </td>
                                </tr>
                            )
                        })}
                        {rows.length === 0 && (first?.opening ?? null) === null && (
                            <tr><td colSpan={5} className="py-10 text-center text-gray-500">{t('acct.noLineResults')}</td></tr>
                        )}
                    </tbody>
                    {last && (
                        <tfoot>
                            <tr className="bg-indigo-50 font-bold border-t-2 border-indigo-200">
                                <td className="py-3 px-3" colSpan={3}>
                                    <span className="mr-6">{last.label}</span>
                                    {last.moneyIn > 0 && <span className="text-xs text-green-700 mr-4">{t('acct.cash.inTotal', { amount: formatCurrency(last.moneyIn, currency) })}</span>}
                                    {last.moneyOut > 0 && <span className="text-xs text-red-600">{t('acct.cash.outTotal', { amount: formatCurrency(last.moneyOut, currency) })}</span>}
                                </td>
                                <td className="py-3 px-3" />
                                <td className="py-3 px-3 text-right">{last.closing !== null && <BalanceText type={account.type} value={last.closing} currency={currency} />}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            {last && <p className="text-[11px] text-gray-500 mt-4">{t(`acct.legend.${BALANCE_MODES[account.type]}`)}</p>}
        </ReportFrame>
    )
}
