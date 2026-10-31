import { useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns'
import { TrendingUp, TrendingDown, Wallet, ShoppingBag, Scale, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useTranslation } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { computeProfit, computeProductProfit, type ProfitPeriod } from '@/lib/profit'
import type { Expense, Product, Sale } from '@/types/database'
import { DateRangeInputs } from '@/components/ui/DateRangeInputs'

type PeriodPreset = 'thisMonth' | 'lastMonth' | 'thisYear' | 'all' | 'custom'

const PRESETS: PeriodPreset[] = ['thisMonth', 'lastMonth', 'thisYear', 'all', 'custom']

const day = (date: Date) => format(date, 'yyyy-MM-dd')

function presetPeriod(preset: PeriodPreset, custom: ProfitPeriod): ProfitPeriod {
    const now = new Date()
    switch (preset) {
        case 'thisMonth': return { from: day(startOfMonth(now)), to: day(endOfMonth(now)) }
        case 'lastMonth': {
            const last = subMonths(now, 1)
            return { from: day(startOfMonth(last)), to: day(endOfMonth(last)) }
        }
        case 'thisYear': return { from: day(startOfYear(now)), to: day(now) }
        case 'all': return {}
        case 'custom': return custom
    }
}

// Validated categorical steps (light / dark surfaces); one per series, fixed order
const SERIES_COLORS = {
    light: { netSales: '#2563eb', costs: '#d97706', netProfit: '#0d9488' },
    dark: { netSales: '#3b82f6', costs: '#d97706', netProfit: '#0d9488' }
}

interface ProfitReportProps {
    sales: Sale[]
    expenses: Expense[]
    products: Product[]
}

export function ProfitReport({ sales, expenses, products }: ProfitReportProps) {
    const { t, dateLocale } = useTranslation()
    const [preset, setPreset] = useState<PeriodPreset>('thisMonth')
    const [custom, setCustom] = useState<ProfitPeriod>({})

    const period = useMemo(() => presetPeriod(preset, custom), [preset, custom])
    const summary = useMemo(() => computeProfit(sales, expenses, products, period), [sales, expenses, products, period])
    const productProfit = useMemo(() => computeProductProfit(sales, products, period), [sales, products, period])

    // Last 6 months, independent of the selected period
    const trend = useMemo(() => Array.from({ length: 6 }, (_, i) => {
        const month = subMonths(new Date(), 5 - i)
        const m = computeProfit(sales, expenses, products, { from: day(startOfMonth(month)), to: day(endOfMonth(month)) })
        return {
            key: format(month, 'yyyy-MM'),
            month: format(month, 'MMM yyyy', { locale: dateLocale }),
            netSales: m.netSales,
            costs: m.costOfGoods + m.expenses,
            netProfit: m.netProfit
        }
    }), [sales, expenses, products, dateLocale])

    const topProfitable = productProfit.filter(p => p.quantity > 0).sort((a, b) => b.profit - a.profit).slice(0, 10)
    const lowMargin = productProfit.filter(p => p.quantity > 0 && p.margin < 20).sort((a, b) => a.margin - b.margin).slice(0, 10)

    const isLoss = summary.netProfit < 0
    const colors = SERIES_COLORS[document.documentElement.classList.contains('dark') ? 'dark' : 'light']
    const seriesLabels = {
        netSales: t('profit.series.netSales'),
        costs: t('profit.series.costs'),
        netProfit: t('profit.series.netProfit')
    }

    const statement: { label: string; amount: number; kind: 'line' | 'minus' | 'total' }[] = [
        { label: t('profit.line.grossSales'), amount: summary.grossSales, kind: 'line' },
        { label: t('profit.line.discounts'), amount: summary.discounts, kind: 'minus' },
        { label: t('profit.line.netSales'), amount: summary.netSales, kind: 'total' },
        { label: t('profit.line.cogs'), amount: summary.costOfGoods, kind: 'minus' },
        { label: t('profit.line.grossProfit'), amount: summary.grossProfit, kind: 'total' },
        { label: t('profit.line.expenses'), amount: summary.expenses, kind: 'minus' },
        { label: t('profit.line.netProfit'), amount: summary.netProfit, kind: 'total' }
    ]

    return (
        <div className="space-y-6">
            {/* Title + period */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('profit.title')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('profit.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-900/50 rounded-xl overflow-x-auto">
                        {PRESETS.map(id => (
                            <button
                                key={id}
                                onClick={() => setPreset(id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                                    preset === id
                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                )}
                            >
                                {t(`profit.period.${id}`)}
                            </button>
                        ))}
                    </div>
                    {preset === 'custom' && <DateRangeInputs value={custom} onChange={setCustom} />}
                </div>
            </div>

            {/* Headline figures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Figure label={t('profit.netSales')} value={formatCurrency(summary.netSales)} hint={t('profit.billsCount', { count: summary.bills })} icon={ShoppingBag} />
                <Figure label={t('profit.grossProfit')} value={formatCurrency(summary.grossProfit)} hint={t('profit.marginOf', { margin: summary.grossMargin.toFixed(1) })} icon={Scale} />
                <Figure
                    label={t('profit.expenses')}
                    value={formatCurrency(summary.expenses)}
                    hint={t('profit.expenseShare', { percent: (summary.netSales > 0 ? (summary.expenses / summary.netSales) * 100 : 0).toFixed(1) })}
                    icon={Wallet}
                />
                <Figure
                    label={isLoss ? t('profit.netLoss') : t('profit.netProfit')}
                    value={formatCurrency(summary.netProfit)}
                    hint={t('profit.marginOf', { margin: summary.netMargin.toFixed(1) })}
                    icon={isLoss ? TrendingDown : TrendingUp}
                    tone={isLoss ? 'loss' : 'gain'}
                />
            </div>

            {summary.itemsWithoutCost > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">{t('profit.missingCost', { count: summary.itemsWithoutCost })}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Statement */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-300 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('profit.statement')}</h3>
                    <dl className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {statement.map(line => (
                            <div key={line.label} className={cn("flex items-center justify-between py-2.5", line.kind === 'total' && "font-bold")}>
                                <dt className={cn("text-sm", line.kind === 'total' ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 pl-4")}>
                                    {line.label}
                                </dt>
                                <dd className={cn(
                                    "text-sm tabular-nums",
                                    line.kind === 'total' ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300",
                                    line.kind === 'total' && line.amount < 0 && "text-red-600 dark:text-red-400"
                                )}>
                                    {line.kind === 'minus' ? `− ${formatCurrency(line.amount)}` : formatCurrency(line.amount)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">{t('profit.taxNote', { amount: formatCurrency(summary.taxCollected) })}</p>
                </div>

                {/* Expenses by type */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-300 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('profit.byType')}</h3>
                    {summary.expensesByType.length === 0 ? (
                        <p className="text-center py-10 text-gray-400 text-sm">{t('profit.noExpenses')}</p>
                    ) : (
                        <ul className="space-y-3">
                            {summary.expensesByType.map(type => {
                                const share = summary.expenses > 0 ? (type.amount / summary.expenses) * 100 : 0
                                return (
                                    <li key={type.name}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="font-medium text-gray-900 dark:text-white">{type.name}</span>
                                            <span className="tabular-nums text-gray-600 dark:text-gray-300">
                                                {formatCurrency(type.amount)} <span className="text-gray-400">· {share.toFixed(0)}%</span>
                                            </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: colors.costs }} />
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* 6-month trend: chart + the same numbers as a table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-300 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t('profit.trend')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trend} barGap={2} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(value: number) => value.toLocaleString()} width={70} />
                        <ReferenceLine y={0} stroke="#9ca3af" strokeOpacity={0.5} />
                        <Tooltip
                            cursor={{ fill: '#9ca3af', fillOpacity: 0.1 }}
                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.75rem', color: '#f9fafb' }}
                            labelStyle={{ color: '#9ca3af', marginBottom: '0.5rem', fontSize: '0.875rem' }}
                            formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name]}
                        />
                        <Legend wrapperStyle={{ fontSize: '0.875rem', paddingTop: '1rem' }} />
                        <Bar dataKey="netSales" name={seriesLabels.netSales} fill={colors.netSales} radius={[4, 4, 0, 0]} maxBarSize={24} />
                        <Bar dataKey="costs" name={seriesLabels.costs} fill={colors.costs} radius={[4, 4, 0, 0]} maxBarSize={24} />
                        <Bar dataKey="netProfit" name={seriesLabels.netProfit} fill={colors.netProfit} radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                </ResponsiveContainer>
                <div className="overflow-x-auto mt-6">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="py-2 pr-4">{t('profit.col.month')}</th>
                                <th className="py-2 px-4 text-right">{seriesLabels.netSales}</th>
                                <th className="py-2 px-4 text-right">{seriesLabels.costs}</th>
                                <th className="py-2 pl-4 text-right">{seriesLabels.netProfit}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 tabular-nums">
                            {trend.map(row => (
                                <tr key={row.key}>
                                    <td className="py-2 pr-4 text-gray-900 dark:text-white capitalize">{row.month}</td>
                                    <td className="py-2 px-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(row.netSales)}</td>
                                    <td className="py-2 px-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(row.costs)}</td>
                                    <td className={cn("py-2 pl-4 text-right font-semibold", row.netProfit < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white")}>
                                        {formatCurrency(row.netProfit)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Product profitability for the period */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-300 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('rep.mostProfitable')}</h3>
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {topProfitable.map((item, index) => (
                            <div key={item.product.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 shrink-0">
                                                {index + 1}
                                            </span>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{item.product.name}</p>
                                        </div>
                                        <p className="text-xs text-gray-500 font-mono mt-1">{item.product.code}</p>
                                    </div>
                                    <div className="text-right ml-2">
                                        <p className="text-sm font-black text-green-600 dark:text-green-400">{formatCurrency(item.profit)}</p>
                                        <p className="text-xs text-gray-500">{t('rep.soldCount', { count: item.quantity })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <span className="text-gray-500">{t('rep.marginLabel')}</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{item.margin.toFixed(1)}%</span>
                                </div>
                            </div>
                        ))}
                        {topProfitable.length === 0 && (
                            <div className="text-center py-10 text-gray-400 text-sm">{t('rep.notEnoughData')}</div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-amber-300 dark:border-amber-700">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('rep.lowMargin')}</h3>
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium leading-relaxed">{t('rep.lowMarginHint')}</p>
                    </div>
                    <div className="space-y-3 max-h-[350px] overflow-y-auto">
                        {lowMargin.map(item => (
                            <div key={item.product.id} className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/50">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{item.product.name}</p>
                                        <p className="text-xs text-gray-500 font-mono">{item.product.code}</p>
                                    </div>
                                    <div className="text-right ml-2">
                                        <p className={cn("text-sm font-black", item.margin < 10 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                                            {item.margin.toFixed(1)}%
                                        </p>
                                        <p className="text-xs text-gray-500">{t('rep.marginLower')}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/50 text-xs">
                                    <div>
                                        <p className="text-gray-500">{t('rep.sale')}</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.revenue)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">{t('rep.cost')}</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.cost)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">{t('rep.profit')}</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.profit)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {lowMargin.length === 0 && (
                            <div className="text-center py-10 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
                                <p className="text-sm font-medium">{t('rep.excellent')}</p>
                                <p className="text-xs text-gray-500 mt-1">{t('rep.goodMargins')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

interface FigureProps {
    label: string
    value: string
    hint: string
    icon: React.ElementType
    tone?: 'gain' | 'loss'
}

function Figure({ label, value, hint, icon: Icon, tone }: FigureProps) {
    return (
        <div className={cn(
            "bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border flex items-start justify-between gap-3",
            tone === 'gain' && "border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20",
            tone === 'loss' && "border-red-500 dark:border-red-600 ring-2 ring-red-500/20",
            !tone && "border-gray-300 dark:border-gray-700"
        )}>
            <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                <p className={cn(
                    "text-2xl font-black mt-1 truncate tabular-nums",
                    tone === 'loss' ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                )} title={value}>{value}</p>
                <p className="text-xs text-gray-400 mt-1">{hint}</p>
            </div>
            <div className={cn(
                "p-3 rounded-xl shrink-0",
                tone === 'gain' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" :
                    tone === 'loss' ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" :
                        "bg-gray-50 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300"
            )}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    )
}
