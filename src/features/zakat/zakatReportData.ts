import { format, parseISO } from 'date-fns'
import type { TranslationKey } from '@/i18n'
import { formatCurrency } from '@/lib/utils'
import {
    LUNAR_YEAR_DAYS, NISAB_GRAMS, SOVEREIGN_GRAMS, ZAKAT_RATES, autoValue, isCounted,
    type AutoAsset, type AutoLiability, type Group, type ManualAsset, type ManualLiability,
    type ZakatFigures, type ZakatResult, type ZakatSettings
} from './zakatCalc'

type T = (key: TranslationKey, params?: Record<string, string | number>) => string

export interface ZakatReportItem {
    label: string
    amount: number
    counted: boolean
    source: 'records' | 'entered'
    note?: string
}

export interface ZakatReportGroup {
    letter: 'A' | 'B' | 'C' | 'D' | 'E'
    group: Group
    title: string
    ruling: string
    total: number
    negative: boolean
    items: ZakatReportItem[]
}

// Everything the PDF and Excel reports show, worked out once from the page's settings and figures
export interface ZakatReport {
    groups: ZakatReportGroup[]
    result: ZakatResult
    rate: string
    nisab: { basis: string; grams: number; price: string; value: string }
    year: string
    hawl: string
    status: string
    // Money from the records, line by line (empty when the counted balance is used)
    moneyFlow: { label: string; amount: number }[]
    coverage: string[]
    rulings: { letter: string; title: string; text: string }[]
}

const percent = (rate: number) => `${(rate * 100).toFixed(rate === ZAKAT_RATES.lunar ? 1 : 3)}%`

export function buildZakatReport(settings: ZakatSettings, figures: ZakatFigures | null, result: ZakatResult, t: T): ZakatReport {
    const auto = (key: AutoAsset | AutoLiability, note?: string): ZakatReportItem => ({
        label: t(`zakat.auto.${key}`),
        amount: figures ? autoValue(key, figures, settings) : 0,
        counted: isCounted(key, settings),
        source: 'records',
        note
    })
    const asset = (key: ManualAsset): ZakatReportItem => ({
        label: t(`zakat.manual.${key}`), amount: Number(settings.manualAssets[key]) || 0, counted: isCounted(key, settings), source: 'entered'
    })
    const debt = (key: ManualLiability): ZakatReportItem => ({
        label: t(`zakat.manual.${key}`), amount: Number(settings.manualLiabilities[key]) || 0, counted: true, source: 'entered'
    })
    const inventoryNote = settings.inventoryValue === 'cost' ? t('zakat.report.atCost') : t('zakat.report.atMarket')

    const groups: ZakatReportGroup[] = [
        {
            letter: 'A', group: 'money', title: t('zakat.a.title'), ruling: t('zakat.a.ruling'), total: result.groups.money, negative: false,
            items: settings.moneySource === 'records' ? [auto('money')] : [asset('cash'), asset('bank')]
        },
        {
            letter: 'B', group: 'goods', title: t('zakat.b.title'), ruling: t('zakat.b.ruling'), total: result.groups.goods, negative: false,
            items: [auto('inventory', inventoryNote), asset('otherAssets')]
        },
        {
            letter: 'C', group: 'receivables', title: t('zakat.c.title'), ruling: t('zakat.c.ruling'), total: result.groups.receivables, negative: false,
            items: [auto('clientCredit'), auto('supplierCredit'), auto('sourceCredit')]
        },
        {
            letter: 'D', group: 'other', title: t('zakat.d.title'), ruling: t('zakat.d.ruling'), total: result.groups.other, negative: false,
            items: [asset('goldSilver'), asset('investments'), auto('savings')]
        },
        {
            letter: 'E', group: 'debts', title: t('zakat.e.title'), ruling: t('zakat.e.ruling'), total: result.groups.debts, negative: true,
            items: [auto('supplierOwed'), auto('loans'), debt('wages'), debt('bills'), debt('taxes'), debt('otherDebts')]
        }
    ]

    const unit = settings.priceUnit === 'sovereign' ? `${t('zakat.unit.sovereign')} (${SOVEREIGN_GRAMS} g)` : t('zakat.unit.gram')
    const rawPrice = Number(settings.basis === 'gold' ? settings.goldPrice : settings.silverPrice) || 0
    const formatDay = (day: string) => format(parseISO(day), 'dd/MM/yyyy')
    const cash = figures?.cashFlow

    return {
        groups,
        result,
        rate: percent(result.rate),
        nisab: {
            basis: t(`zakat.basis.${settings.basis}`),
            grams: NISAB_GRAMS[settings.basis],
            price: rawPrice > 0 ? t('zakat.report.pricePer', { price: formatCurrency(rawPrice), unit }) : t('zakat.enterPrice'),
            value: result.hasPrice ? formatCurrency(result.nisab) : '—'
        },
        year: `${t(`zakat.year.${settings.year}`)} · ${percent(result.rate)}`,
        hawl: result.hawl
            ? `${t('zakat.hawl.period', { start: formatDay(result.hawl.start), end: formatDay(result.hawl.end) })} ${result.hawl.daysLeft > 0 ? t('zakat.hawl.daysLeft', { days: result.hawl.daysLeft }) : result.hawl.daysLeft === 0 ? t('zakat.hawl.today') : t('zakat.hawl.passed', { days: -result.hawl.daysLeft })}`
            : t('zakat.hawl.none', { days: LUNAR_YEAR_DAYS }),
        status: !result.hasPrice ? t('zakat.status.noPrice') : result.meetsNisab ? t('zakat.status.meets') : t('zakat.status.below'),
        moneyFlow: settings.moneySource === 'records' && cash ? [
            { label: t('zakat.flow.sales'), amount: cash.salesCollected },
            { label: t('zakat.flow.income'), amount: cash.otherIncome },
            { label: t('zakat.flow.capital'), amount: cash.capitalAdded },
            { label: t('zakat.flow.expenses'), amount: -cash.expensesPaid },
            { label: t('zakat.flow.suppliers'), amount: -(cash.paidToSuppliers - cash.refundsFromSuppliers) },
            { label: t('zakat.flow.grn'), amount: -cash.paidToClients },
            { label: t('zakat.flow.withdrawals'), amount: -cash.ownerWithdrawals },
            { label: t('zakat.flow.loanRepayments'), amount: -cash.loanRepayments }
        ] : [],
        coverage: figures ? [
            t('zakat.coverage.sales', { count: figures.coverage.sales }),
            t('zakat.coverage.products', { count: figures.coverage.products }),
            t('zakat.coverage.suppliers', { count: figures.coverage.suppliers }),
            t('zakat.coverage.clients', { count: figures.coverage.clients }),
            t('zakat.coverage.capital', { count: figures.coverage.capital }),
            t('zakat.coverage.expenses', { count: figures.coverage.expenses })
        ] : [],
        rulings: [
            ...groups.map(g => ({ letter: g.letter, title: g.title, text: g.ruling })),
            { letter: 'F', title: t('zakat.nisabTitle'), text: `${t('zakat.law.nisabText')} ${t('zakat.law.hawlText')} ${t('zakat.law.rateText')}` }
        ]
    }
}
