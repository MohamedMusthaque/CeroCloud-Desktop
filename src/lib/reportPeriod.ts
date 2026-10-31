import { parseISO, startOfMonth, startOfWeek } from 'date-fns'
import type { Locale } from 'date-fns'
import type { TranslationKey } from '@/i18n'
import { saleDay } from '@/lib/profit'
import type { Sale } from '@/types/database'

export type ReportRange = 'today' | 'week' | 'month' | 'all' | 'custom'

export const REPORT_RANGES: ReportRange[] = ['today', 'week', 'month', 'all', 'custom']

// `from` / `to` are inclusive local days ('YYYY-MM-DD') used by 'custom'; an empty end means no limit
export interface ReportPeriod {
    range: ReportRange
    from?: string
    to?: string
}

// Calendar periods so far; the week starts on the language's first weekday (Mon in es, Sun in en)
export function filterSalesByPeriod(sales: Sale[], period: ReportPeriod, dateLocale: Locale): Sale[] {
    const now = new Date()
    return sales.filter(sale => {
        if (!sale.created_at) return false
        const date = new Date(sale.created_at)
        switch (period.range) {
            case 'today': return date.toDateString() === now.toDateString()
            case 'week': return date >= startOfWeek(now, { locale: dateLocale })
            case 'month': return date >= startOfMonth(now)
            case 'custom': {
                const day = saleDay(sale)
                return (!period.from || day >= period.from) && (!period.to || day <= period.to)
            }
            default: return true
        }
    })
}

// Human label of the period ("This Week", "01/10/2026 – 15/10/2026", ...), used in descriptions and PDFs
export function periodLabel(period: ReportPeriod, t: (key: TranslationKey, params?: Record<string, string | number>) => string, locale: string): string {
    if (period.range !== 'custom') return t(`rep.range.${period.range}`)
    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)
    if (period.from && period.to) return t('rep.range.between', { from: formatDay(period.from), to: formatDay(period.to) })
    if (period.from) return t('rep.range.since', { date: formatDay(period.from) })
    if (period.to) return t('rep.range.until', { date: formatDay(period.to) })
    return t('rep.range.all')
}
