import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseISO } from 'date-fns'
import {
    HandHeart, Coins, Scale, CalendarClock, Info, RefreshCw, RotateCcw, CheckCircle2, AlertCircle, Package, Landmark,
    Wallet, Banknote, BookOpen, Ban, HandCoins, Gem, Database, FileDown, FileSpreadsheet
} from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { AmountInput } from '@/components/ui/AmountInput'
import {
    DEFAULT_SETTINGS, LUNAR_YEAR_DAYS, NISAB_GRAMS, SOVEREIGN_GRAMS, ZAKAT_RATES,
    autoValue, calculate, loadFigures, loadSettings, saveSettings,
    type AutoAsset, type AutoLiability, type ManualAsset, type ManualLiability, type ZakatFigures, type ZakatSettings
} from './zakatCalc'
import { buildZakatReport } from './zakatReportData'
import { downloadZakatExcel, downloadZakatPdf } from './zakatReports'

const inputClass = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
const percent = (rate: number) => `${(rate * 100).toFixed(rate === ZAKAT_RATES.lunar ? 1 : 3)}%`

// Zakat on the complete business, set out in the order the rulings take it
export function Zakat() {
    const { t, locale } = useTranslation()
    const [settings, setSettings] = useState<ZakatSettings>(loadSettings)
    const [figures, setFigures] = useState<ZakatFigures | null>(null)
    const [loading, setLoading] = useState(true)
    const [failed, setFailed] = useState(false)

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            setFigures(await loadFigures())
            setFailed(false)
        } catch (error) {
            console.error('Error loading zakat figures:', error)
            setFailed(true)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { refresh() }, [refresh])
    useEffect(() => { saveSettings(settings) }, [settings])

    const update = (patch: Partial<ZakatSettings>) => setSettings(prev => ({ ...prev, ...patch }))
    const toggle = (key: AutoAsset | AutoLiability) => (checked: boolean) => update({ include: { ...settings.include, [key]: checked } })
    const setAsset = (key: ManualAsset) => (value: string) => update({ manualAssets: { ...settings.manualAssets, [key]: value } })
    const setDebt = (key: ManualLiability) => (value: string) => update({ manualLiabilities: { ...settings.manualLiabilities, [key]: value } })
    const result = useMemo(() => calculate(settings, figures), [settings, figures])
    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)
    const unitLabel = settings.priceUnit === 'sovereign' ? t('zakat.unit.sovereign') : t('zakat.unit.gram')
    const reset = () => setSettings({ ...DEFAULT_SETTINGS, goldPrice: settings.goldPrice, silverPrice: settings.silverPrice, priceUnit: settings.priceUnit, basis: settings.basis, hawlStart: settings.hawlStart, year: settings.year })

    // Shared props for a figure taken from the records
    const auto = (key: AutoAsset | AutoLiability) => ({
        value: figures ? autoValue(key, figures, settings) : null,
        loading,
        checked: settings.include[key],
        onToggle: toggle(key)
    })
    const cash = figures?.cashFlow

    // Reports of the calculation exactly as shown
    const [exporting, setExporting] = useState(false)
    const exportPdf = async () => {
        setExporting(true)
        try {
            await downloadZakatPdf(buildZakatReport(settings, figures, result, t)).unwrap()
        } catch (error) {
            console.error('Error generating zakat PDF:', error)
        } finally {
            setExporting(false)
        }
    }
    const exportExcel = () => downloadZakatExcel(buildZakatReport(settings, figures, result, t))

    return (
        <div className="space-y-6 pb-20 p-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        <HandHeart className="w-8 h-8 text-emerald-600" />
                        {t('zakat.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('zakat.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={exportPdf}
                        disabled={loading || exporting || !figures}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                    >
                        <FileDown className="w-4 h-4" />
                        {t('zakat.report.pdf')}
                    </button>
                    <button
                        onClick={exportExcel}
                        disabled={loading || !figures}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        {t('zakat.report.excel')}
                    </button>
                    <button onClick={refresh} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        {t('zakat.refresh')}
                    </button>
                    <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <RotateCcw className="w-4 h-4" />
                        {t('zakat.reset')}
                    </button>
                </div>
            </div>

            {/* How the law sets it out */}
            <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-5 space-y-4">
                <h2 className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
                    <BookOpen className="w-4 h-4" />
                    {t('zakat.law.title')}
                </h2>
                <p className="text-sm text-emerald-900 dark:text-emerald-200">{t('zakat.law.intro')}</p>
                <div className="rounded-xl bg-white/70 dark:bg-gray-900/40 px-4 py-3 font-mono text-sm text-emerald-900 dark:text-emerald-100 overflow-x-auto whitespace-nowrap">
                    {t('zakat.law.formula')}
                </div>
                <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-emerald-900 dark:text-emerald-200">
                    <li className="rounded-xl bg-white/60 dark:bg-gray-900/30 p-3"><strong className="block mb-0.5">{t('zakat.law.nisab')}</strong>{t('zakat.law.nisabText')}</li>
                    <li className="rounded-xl bg-white/60 dark:bg-gray-900/30 p-3"><strong className="block mb-0.5">{t('zakat.law.hawl')}</strong>{t('zakat.law.hawlText')}</li>
                    <li className="rounded-xl bg-white/60 dark:bg-gray-900/30 p-3"><strong className="block mb-0.5">{t('zakat.law.rate')}</strong>{t('zakat.law.rateText')}</li>
                </ol>
                <div className="flex gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                    <Ban className="w-4 h-4 shrink-0" />
                    <p><strong>{t('zakat.law.notZakatable')}</strong> {t('zakat.law.notZakatableText')}</p>
                </div>
                <div className="flex gap-2 text-xs text-emerald-800/80 dark:text-emerald-300/80">
                    <Info className="w-4 h-4 shrink-0" />
                    <p>{t('zakat.disclaimer')}</p>
                </div>
            </section>

            {/* What was read from the records */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <Database className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{t('zakat.coverage.title')}</span>
                {failed ? <span className="text-red-600">{t('zakat.loadError')}</span> : figures ? (
                    <>
                        <Chip>{t('zakat.coverage.sales', { count: figures.coverage.sales })}</Chip>
                        <Chip>{t('zakat.coverage.products', { count: figures.coverage.products })}</Chip>
                        <Chip>{t('zakat.coverage.suppliers', { count: figures.coverage.suppliers })}</Chip>
                        <Chip>{t('zakat.coverage.clients', { count: figures.coverage.clients })}</Chip>
                        <Chip>{t('zakat.coverage.capital', { count: figures.coverage.capital })}</Chip>
                        <Chip>{t('zakat.coverage.expenses', { count: figures.coverage.expenses })}</Chip>
                    </>
                ) : <span>…</span>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    {/* A. Money */}
                    <Step letter="A" title={t('zakat.a.title')} ruling={t('zakat.a.ruling')} icon={Banknote} total={result.groups.money}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                            <Choice active={settings.moneySource === 'records'} onClick={() => update({ moneySource: 'records' })}>
                                {t('zakat.a.records')}
                                <span className="block text-[11px] font-normal opacity-80">{t('zakat.a.recordsHint')}</span>
                            </Choice>
                            <Choice active={settings.moneySource === 'counted'} onClick={() => update({ moneySource: 'counted' })}>
                                {t('zakat.a.counted')}
                                <span className="block text-[11px] font-normal opacity-80">{t('zakat.a.countedHint')}</span>
                            </Choice>
                        </div>
                        {settings.moneySource === 'records' ? (
                            <>
                                <AutoRow label={t('zakat.auto.money')} hint={t('zakat.auto.money.hint')} icon={Banknote} {...auto('money')} />
                                {cash && (
                                    <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs px-1">
                                        <Flow label={t('zakat.flow.sales')} value={cash.salesCollected} />
                                        <Flow label={t('zakat.flow.expenses')} value={-cash.expensesPaid} />
                                        <Flow label={t('zakat.flow.income')} value={cash.otherIncome} />
                                        <Flow label={t('zakat.flow.suppliers')} value={-(cash.paidToSuppliers - cash.refundsFromSuppliers)} />
                                        <Flow label={t('zakat.flow.capital')} value={cash.capitalAdded} />
                                        <Flow label={t('zakat.flow.grn')} value={-cash.paidToClients} />
                                        <Flow label={t('zakat.flow.withdrawals')} value={-cash.ownerWithdrawals} />
                                        <Flow label={t('zakat.flow.loanRepayments')} value={-cash.loanRepayments} />
                                    </dl>
                                )}
                                {cash && cash.netCashFlow < 0 && (
                                    <p className="mt-3 flex gap-2 text-xs text-amber-700 dark:text-amber-400"><AlertCircle className="w-4 h-4 shrink-0" />{t('zakat.a.negative', { amount: formatCurrency(-cash.netCashFlow) })}</p>
                                )}
                                <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">{t('zakat.a.recordsNote')}</p>
                            </>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ManualField label={t('zakat.manual.cash')} hint={t('zakat.manual.cash.hint')} value={settings.manualAssets.cash} onChange={setAsset('cash')} />
                                <ManualField label={t('zakat.manual.bank')} hint={t('zakat.manual.bank.hint')} value={settings.manualAssets.bank} onChange={setAsset('bank')} />
                                {figures && <p className="sm:col-span-2 text-[11px] text-gray-500 dark:text-gray-400">{t('zakat.a.compare', { amount: formatCurrency(figures.money) })}</p>}
                            </div>
                        )}
                    </Step>

                    {/* B. Trade goods */}
                    <Step letter="B" title={t('zakat.b.title')} ruling={t('zakat.b.ruling')} icon={Package} total={result.groups.goods}>
                        <div className="space-y-4">
                            <AutoRow
                                label={t('zakat.auto.inventory')}
                                hint={t('zakat.auto.inventory.hint', { count: figures?.inventoryItems ?? 0 })}
                                icon={Package}
                                {...auto('inventory')}
                                extra={
                                    <select
                                        value={settings.inventoryValue}
                                        onChange={(e) => update({ inventoryValue: e.target.value as ZakatSettings['inventoryValue'] })}
                                        aria-label={t('zakat.inventoryValue')}
                                        className="mt-1.5 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200"
                                    >
                                        <option value="price">{t('zakat.inventoryValue.price', { amount: formatCurrency(figures?.inventoryPrice ?? 0) })}</option>
                                        <option value="cost">{t('zakat.inventoryValue.cost', { amount: formatCurrency(figures?.inventoryCost ?? 0) })}</option>
                                    </select>
                                }
                            />
                            <ManualField label={t('zakat.manual.otherAssets')} hint={t('zakat.manual.otherAssets.hint')} value={settings.manualAssets.otherAssets} onChange={setAsset('otherAssets')} />
                        </div>
                    </Step>

                    {/* C. Debts owed to the business */}
                    <Step letter="C" title={t('zakat.c.title')} ruling={t('zakat.c.ruling')} icon={HandCoins} total={result.groups.receivables}>
                        <div className="space-y-2">
                            <AutoRow label={t('zakat.auto.clientCredit')} hint={t('zakat.auto.clientCredit.hint')} icon={HandCoins} {...auto('clientCredit')} />
                            <AutoRow label={t('zakat.auto.supplierCredit')} hint={t('zakat.auto.supplierCredit.hint')} icon={HandCoins} {...auto('supplierCredit')} />
                            <AutoRow label={t('zakat.auto.sourceCredit')} hint={t('zakat.auto.sourceCredit.hint')} icon={Landmark} {...auto('sourceCredit')} />
                        </div>
                    </Step>

                    {/* D. Other zakatable wealth */}
                    <Step letter="D" title={t('zakat.d.title')} ruling={t('zakat.d.ruling')} icon={Gem} total={result.groups.other}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <ManualField label={t('zakat.manual.goldSilver')} hint={t('zakat.manual.goldSilver.hint')} value={settings.manualAssets.goldSilver} onChange={setAsset('goldSilver')} />
                            <ManualField label={t('zakat.manual.investments')} hint={t('zakat.manual.investments.hint')} value={settings.manualAssets.investments} onChange={setAsset('investments')} />
                        </div>
                        <AutoRow label={t('zakat.auto.savings')} hint={t('zakat.auto.savings.hint')} icon={Wallet} {...auto('savings')} />
                    </Step>

                    {/* E. Debts the business owes */}
                    <Step letter="E" title={t('zakat.e.title')} ruling={t('zakat.e.ruling')} icon={Scale} total={result.groups.debts} negative>
                        <div className="space-y-2 mb-4">
                            <AutoRow label={t('zakat.auto.supplierOwed')} hint={t('zakat.auto.supplierOwed.hint')} icon={Landmark} {...auto('supplierOwed')} />
                            <AutoRow label={t('zakat.auto.loans')} hint={t('zakat.auto.loans.hint')} icon={Landmark} {...auto('loans')} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ManualField label={t('zakat.manual.wages')} hint={t('zakat.manual.wages.hint')} value={settings.manualLiabilities.wages} onChange={setDebt('wages')} />
                            <ManualField label={t('zakat.manual.bills')} hint={t('zakat.manual.bills.hint')} value={settings.manualLiabilities.bills} onChange={setDebt('bills')} />
                            <ManualField label={t('zakat.manual.taxes')} hint={t('zakat.manual.taxes.hint')} value={settings.manualLiabilities.taxes} onChange={setDebt('taxes')} />
                            <ManualField label={t('zakat.manual.otherDebts')} hint={t('zakat.manual.otherDebts.hint')} value={settings.manualLiabilities.otherDebts} onChange={setDebt('otherDebts')} />
                        </div>
                    </Step>

                    {/* Nisab and the zakat year */}
                    <Step letter="F" title={t('zakat.nisabTitle')} ruling={t('zakat.f.ruling')} icon={Coins}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label={t('zakat.basis')}>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['gold', 'silver'] as const).map(basis => (
                                        <Choice key={basis} active={settings.basis === basis} onClick={() => update({ basis })}>
                                            {t(`zakat.basis.${basis}`)}
                                            <span className="block text-[11px] font-normal opacity-80">{t('zakat.grams', { grams: NISAB_GRAMS[basis] })}</span>
                                        </Choice>
                                    ))}
                                </div>
                            </Field>
                            <Field label={t('zakat.priceUnit')}>
                                <div className="grid grid-cols-2 gap-2">
                                    <Choice active={settings.priceUnit === 'gram'} onClick={() => update({ priceUnit: 'gram' })}>{t('zakat.unit.gram')}</Choice>
                                    <Choice active={settings.priceUnit === 'sovereign'} onClick={() => update({ priceUnit: 'sovereign' })}>
                                        {t('zakat.unit.sovereign')}
                                        <span className="block text-[11px] font-normal opacity-80">{t('zakat.grams', { grams: SOVEREIGN_GRAMS })}</span>
                                    </Choice>
                                </div>
                            </Field>
                            <Field label={t(settings.basis === 'gold' ? 'zakat.goldPrice' : 'zakat.silverPrice', { unit: unitLabel })} hint={t(settings.basis === 'gold' ? 'zakat.goldPriceHint' : 'zakat.silverPriceHint')}>
                                <AmountInput
                                    value={settings.basis === 'gold' ? settings.goldPrice : settings.silverPrice}
                                    onChange={(value) => update(settings.basis === 'gold' ? { goldPrice: value } : { silverPrice: value })}
                                    min={0}
                                    placeholder="0.00"
                                    className={inputClass}
                                />
                            </Field>
                            <Field label={t('zakat.nisabValue')}>
                                <p className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-900/50 text-sm font-bold text-gray-900 dark:text-white">
                                    {result.hasPrice ? formatCurrency(result.nisab) : <span className="font-normal text-gray-500">{t('zakat.enterPrice')}</span>}
                                </p>
                            </Field>
                            <Field label={t('zakat.yearType')}>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['lunar', 'solar'] as const).map(year => (
                                        <Choice key={year} active={settings.year === year} onClick={() => update({ year })}>
                                            {t(`zakat.year.${year}`)}
                                            <span className="block text-[11px] font-normal opacity-80">{percent(ZAKAT_RATES[year])}</span>
                                        </Choice>
                                    ))}
                                </div>
                            </Field>
                            <Field label={t('zakat.hawlStart')} hint={t('zakat.hawlStartHint')}>
                                <input type="date" value={settings.hawlStart} onChange={(e) => update({ hawlStart: e.target.value })} className={inputClass} />
                            </Field>
                        </div>
                    </Step>
                </div>

                {/* Result */}
                <div className="lg:sticky lg:top-4 space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
                            <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                                <HandHeart className="w-4 h-4 text-emerald-600" />
                                {t('zakat.resultTitle')}
                            </h2>
                        </div>
                        <div className="p-6 space-y-2.5 text-sm">
                            <ResultRow letter="A" label={t('zakat.a.short')} value={formatCurrency(result.groups.money)} />
                            <ResultRow letter="B" label={t('zakat.b.short')} value={formatCurrency(result.groups.goods)} />
                            <ResultRow letter="C" label={t('zakat.c.short')} value={formatCurrency(result.groups.receivables)} />
                            <ResultRow letter="D" label={t('zakat.d.short')} value={formatCurrency(result.groups.other)} />
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-2.5">
                                <ResultRow label={t('zakat.totalAssets')} value={formatCurrency(result.assets)} strong />
                            </div>
                            <ResultRow letter="E" label={t('zakat.e.short')} value={`− ${formatCurrency(result.liabilities)}`} />
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-2.5">
                                <ResultRow label={t('zakat.net')} value={formatCurrency(result.net)} strong />
                            </div>
                            <ResultRow letter="F" label={t('zakat.nisabOf', { basis: t(`zakat.basis.${settings.basis}`) })} value={result.hasPrice ? formatCurrency(result.nisab) : '—'} />

                            <div className={cn(
                                "flex items-start gap-2 p-3 rounded-xl text-xs font-medium",
                                !result.hasPrice ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                                    : result.meetsNisab ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300"
                            )}>
                                {result.hasPrice && result.meetsNisab ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                <span>{!result.hasPrice ? t('zakat.status.noPrice') : result.meetsNisab ? t('zakat.status.meets') : t('zakat.status.below')}</span>
                            </div>

                            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 text-center">
                                <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{t('zakat.due', { rate: percent(result.rate) })}</p>
                                <p className="text-3xl font-black mt-1 break-words">{formatCurrency(result.due)}</p>
                                {result.meetsNisab && <p className="text-[11px] opacity-90 mt-1">{t('zakat.dueFormula', { net: formatCurrency(result.net), rate: percent(result.rate) })}</p>}
                            </div>

                            {result.hawl ? (
                                <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                                    <CalendarClock className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>
                                        {t('zakat.hawl.period', { start: formatDay(result.hawl.start), end: formatDay(result.hawl.end) })}{' '}
                                        <strong>{result.hawl.daysLeft > 0 ? t('zakat.hawl.daysLeft', { days: result.hawl.daysLeft }) : result.hawl.daysLeft === 0 ? t('zakat.hawl.today') : t('zakat.hawl.passed', { days: -result.hawl.daysLeft })}</strong>
                                    </span>
                                </div>
                            ) : (
                                <p className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <CalendarClock className="w-4 h-4 shrink-0 mt-0.5" />
                                    {t('zakat.hawl.none', { days: LUNAR_YEAR_DAYS })}
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 px-1">{t('zakat.savedNote')}</p>
                </div>
            </div>
        </div>
    )
}

function Step({ letter, title, ruling, icon: Icon, total, negative, children }: { letter: string; title: string; ruling: string; icon: React.ElementType; total?: number; negative?: boolean; children: React.ReactNode }) {
    return (
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
                <h2 className="flex items-center gap-3 font-bold text-gray-900 dark:text-white">
                    <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black text-white shrink-0", negative ? "bg-red-500" : "bg-emerald-600")}>{letter}</span>
                    <Icon className="w-4 h-4 text-gray-400" />
                    {title}
                </h2>
                {total !== undefined && <span className={cn("font-black whitespace-nowrap", negative ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>{negative ? '− ' : ''}{formatCurrency(total)}</span>}
            </div>
            <div className="p-6">
                <p className="flex gap-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 rounded-xl px-3 py-2.5 mb-4">
                    <BookOpen className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{ruling}</span>
                </p>
                {children}
            </div>
        </section>
    )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">{label}</label>
            {children}
            {hint && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
        </div>
    )
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "px-3 py-2 rounded-xl border text-sm font-semibold text-center transition-colors",
                active
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            )}
        >
            {children}
        </button>
    )
}

function Chip({ children }: { children: React.ReactNode }) {
    return <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">{children}</span>
}

function Flow({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className={cn("font-semibold whitespace-nowrap", value < 0 ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-200")}>
                {value < 0 ? '− ' : '+ '}{formatCurrency(Math.abs(value))}
            </dd>
        </div>
    )
}

interface AutoRowProps {
    label: string
    hint: string
    icon: React.ElementType
    value: number | null
    loading: boolean
    checked: boolean
    onToggle: (checked: boolean) => void
    extra?: React.ReactNode
}

// A figure from the records, counted or left out
function AutoRow({ label, hint, icon: Icon, value, loading, checked, onToggle, extra }: AutoRowProps) {
    return (
        <div className={cn(
            "flex items-start gap-3 p-3 rounded-xl border transition-colors",
            checked ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10" : "border-gray-200 dark:border-gray-700"
        )}>
            <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} aria-label={label} className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            <Icon className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{hint}</p>
                {extra}
            </div>
            <span className={cn("text-sm font-bold whitespace-nowrap", checked ? "text-gray-900 dark:text-white" : "text-gray-400 line-through")}>
                {loading && value === null ? '…' : formatCurrency(value ?? 0)}
            </span>
        </div>
    )
}

function ManualField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string) => void }) {
    return (
        <Field label={label} hint={hint}>
            <AmountInput value={value} onChange={onChange} min={0} placeholder="0.00" className={inputClass} />
        </Field>
    )
}

function ResultRow({ letter, label, value, strong }: { letter?: string; label: string; value: string; strong?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <span className={cn("flex items-baseline gap-2", strong ? "font-bold text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300")}>
                {letter && <span className="text-[11px] font-black text-emerald-600 w-3">{letter}</span>}
                {label}
            </span>
            <span className={cn("text-right break-words", strong ? "font-black text-gray-900 dark:text-white" : "font-semibold text-gray-900 dark:text-white")}>{value}</span>
        </div>
    )
}
