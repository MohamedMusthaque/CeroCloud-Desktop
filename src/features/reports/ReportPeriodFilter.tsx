import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { REPORT_RANGES, type ReportPeriod } from '@/lib/reportPeriod'
import { DateRangeInputs } from '@/components/ui/DateRangeInputs'

interface ReportPeriodFilterProps {
    value: ReportPeriod
    onChange: (period: ReportPeriod) => void
}

// Period buttons plus From / To dates when "Custom" is selected
export function ReportPeriodFilter({ value, onChange }: ReportPeriodFilterProps) {
    const { t } = useTranslation()

    return (
        <div className="flex flex-wrap items-center gap-2">
            {value.range === 'custom' && (
                <DateRangeInputs value={value} onChange={(range) => onChange({ range: value.range, ...range })} />
            )}
            <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl overflow-x-auto">
                {REPORT_RANGES.map(range => (
                    <button
                        key={range}
                        onClick={() => onChange({ ...value, range })}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                            value.range === range
                                ? "bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                    >
                        {t(`rep.filter.${range}`)}
                    </button>
                ))}
            </div>
        </div>
    )
}
