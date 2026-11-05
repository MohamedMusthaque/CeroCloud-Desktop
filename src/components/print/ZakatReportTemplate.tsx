import { useTranslation } from '@/i18n'
import { formatCurrency } from '@/lib/utils'
import type { CompanySettings } from '@/types/database'
import type { ZakatReport } from '@/features/zakat/zakatReportData'
import { ReportFrame } from './AccountsReportTemplate'

interface PageProps {
    settings: CompanySettings
    report: ZakatReport
    page: { current: number; total: number }
}

// Page 1: the calculation, step by step, and the zakat due
export function ZakatStatementPage({ settings, report, page }: PageProps) {
    const { t } = useTranslation()
    const currency = settings.currencySymbol
    const money = (value: number) => formatCurrency(value, currency)
    const { result } = report
    return (
        <ReportFrame settings={settings} title={t('zakat.report.title')} subtitle={t('zakat.report.subtitle')} filters={[report.year]} page={page}>
            {/* Result */}
            <div className="grid grid-cols-4 gap-3 mb-5">
                <Box label={t('zakat.totalAssets')} value={money(result.assets)} />
                <Box label={t('zakat.e.short')} value={`− ${money(result.liabilities)}`} tone="text-red-600" />
                <Box label={t('zakat.net')} value={money(result.net)} />
                <div className="rounded-xl p-3 text-white bg-emerald-600">
                    <p className="text-[10px] font-bold uppercase opacity-90">{t('zakat.due', { rate: report.rate })}</p>
                    <p className="text-xl font-black">{money(result.due)}</p>
                </div>
            </div>
            <p className={`text-xs font-semibold mb-5 px-3 py-2 rounded-lg ${result.meetsNisab ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                {report.status}{result.meetsNisab ? `  ${t('zakat.dueFormula', { net: money(result.net), rate: report.rate })} = ${money(result.due)}` : ''}
            </p>

            {/* Steps A–E */}
            <table className="w-full text-xs border border-gray-200 rounded-xl overflow-hidden mb-5">
                <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-[10px] tracking-wider text-left">
                        <th className="py-2 px-3">{t('zakat.report.col.item')}</th>
                        <th className="py-2 px-3">{t('zakat.report.col.source')}</th>
                        <th className="py-2 px-3 text-right">{t('zakat.report.col.amount')}</th>
                    </tr>
                </thead>
                {report.groups.map(group => (
                    <tbody key={group.letter}>
                        <tr className="bg-gray-50 border-t border-gray-200">
                            <td className="py-2 px-3 font-bold text-gray-900" colSpan={2}>
                                <span className={`inline-block w-5 text-center mr-2 rounded text-white text-[10px] ${group.negative ? 'bg-red-500' : 'bg-emerald-600'}`}>{group.letter}</span>
                                {group.title}
                            </td>
                            <td className={`py-2 px-3 text-right font-black ${group.negative ? 'text-red-600' : 'text-emerald-700'}`}>{group.negative ? '− ' : ''}{money(group.total)}</td>
                        </tr>
                        {group.items.map(item => (
                            <tr key={item.label}>
                                <td className="py-1.5 px-3 pl-10 text-gray-700">
                                    {item.label}
                                    {item.note && <span className="text-gray-400"> · {item.note}</span>}
                                </td>
                                <td className="py-1.5 px-3 text-gray-500">{t(item.source === 'records' ? 'zakat.report.fromRecords' : 'zakat.report.entered')}</td>
                                <td className={`py-1.5 px-3 text-right ${item.counted ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {item.counted ? (item.amount ? money(item.amount) : '—') : <><span className="line-through">{money(item.amount)}</span> <span className="text-[10px]">{t('zakat.report.notCounted')}</span></>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                ))}
            </table>

            {/* F. Nisab and year */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs border border-gray-200 rounded-xl p-4">
                <p className="col-span-2 font-bold text-gray-900 mb-1">
                    <span className="inline-block w-5 text-center mr-2 rounded text-white text-[10px] bg-emerald-600">F</span>
                    {t('zakat.nisabTitle')}
                </p>
                <Pair label={t('zakat.basis')} value={`${report.nisab.basis} (${t('zakat.grams', { grams: report.nisab.grams })})`} />
                <Pair label={t('zakat.report.price')} value={report.nisab.price} />
                <Pair label={t('zakat.nisabValue')} value={report.nisab.value} />
                <Pair label={t('zakat.yearType')} value={report.year} />
                <div className="col-span-2"><Pair label={t('zakat.hawlStart')} value={report.hawl} /></div>
            </div>
        </ReportFrame>
    )
}

// Page 2: the rulings applied, where the money figure comes from, and sign-off
export function ZakatRulingsPage({ settings, report, page }: PageProps) {
    const { t } = useTranslation()
    const money = (value: number) => formatCurrency(Math.abs(value), settings.currencySymbol)
    return (
        <ReportFrame settings={settings} title={t('zakat.report.title')} subtitle={t('zakat.report.rulingsSubtitle')} filters={[]} page={page}>
            <p className="text-sm text-gray-700 mb-3">{t('zakat.law.intro')}</p>
            <p className="font-mono text-xs bg-emerald-50 text-emerald-900 rounded-lg px-3 py-2 mb-5">{t('zakat.law.formula')}</p>

            <div className="space-y-2.5 mb-5">
                {report.rulings.map(ruling => (
                    <div key={ruling.letter} className="flex gap-3 text-xs">
                        <span className="w-5 h-5 shrink-0 rounded bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">{ruling.letter}</span>
                        <p><strong className="text-gray-900">{ruling.title}.</strong> <span className="text-gray-700">{ruling.text}</span></p>
                    </div>
                ))}
                <p className="text-xs text-gray-700"><strong>{t('zakat.law.notZakatable')}</strong> {t('zakat.law.notZakatableText')}</p>
            </div>

            {report.moneyFlow.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4 mb-5">
                    <p className="text-xs font-bold text-gray-900 mb-2">{t('zakat.report.moneyFromRecords')}</p>
                    <table className="w-full text-xs">
                        <tbody>
                            {report.moneyFlow.map(row => (
                                <tr key={row.label}>
                                    <td className="py-1 text-gray-600">{row.label}</td>
                                    <td className={`py-1 text-right ${row.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>{row.amount < 0 ? '− ' : '+ '}{money(row.amount)}</td>
                                </tr>
                            ))}
                            <tr className="border-t border-gray-200 font-bold">
                                <td className="py-1.5">{t('zakat.auto.money')}</td>
                                <td className="py-1.5 text-right">{money(report.result.groups.money)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {report.coverage.length > 0 && <p className="text-[11px] text-gray-500 mb-2">{t('zakat.coverage.title')} {report.coverage.join(' · ')}</p>}
            <p className="text-[11px] text-gray-500 mb-10">{t('zakat.disclaimer')}</p>

            <div className="grid grid-cols-2 gap-16 mt-auto pt-10">
                <Signature label={t('zakat.report.preparedBy')} />
                <Signature label={t('zakat.report.checkedBy')} />
            </div>
        </ReportFrame>
    )
}

function Box({ label, value, tone = 'text-gray-900' }: { label: string; value: string; tone?: string }) {
    return (
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
            <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
            <p className={`text-lg font-black ${tone}`}>{value}</p>
        </div>
    )
}

function Pair({ label, value }: { label: string; value: string }) {
    return (
        <p><span className="text-gray-500">{label}: </span><span className="font-semibold text-gray-900">{value}</span></p>
    )
}

function Signature({ label }: { label: string }) {
    return (
        <div className="text-center">
            <div className="border-t border-gray-400 mb-1" />
            <p className="text-xs text-gray-600">{label}</p>
        </div>
    )
}
