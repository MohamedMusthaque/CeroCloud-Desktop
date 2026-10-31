import { X } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'

// Inclusive local days ('YYYY-MM-DD'); an empty end means no limit
export interface DateRange {
    from?: string
    to?: string
}

interface DateRangeInputsProps {
    value: DateRange
    onChange: (range: DateRange) => void
    // Matches the inputs to the surrounding toolbar
    inputClassName?: string
}

const defaultInputClass = "px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"

// From / To date pickers with a button to clear both, shown once either date is set
export function DateRangeInputs({ value, onChange, inputClassName = defaultInputClass }: DateRangeInputsProps) {
    const { t } = useTranslation()
    const hasDates = !!(value.from || value.to)

    return (
        <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-500">
                {t('common.from')}
                <input type="date" value={value.from ?? ''} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value || undefined })} className={inputClassName} />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-500">
                {t('common.to')}
                <input type="date" value={value.to ?? ''} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value || undefined })} className={inputClassName} />
            </label>
            {hasDates && (
                <button
                    type="button"
                    onClick={() => onChange({})}
                    title={t('common.clearDates')}
                    className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        "text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                    )}
                >
                    <X className="w-4 h-4" />
                    {t('common.clearDates')}
                </button>
            )}
        </div>
    )
}
