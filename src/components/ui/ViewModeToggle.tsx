import { LayoutGrid, List as ListIcon } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'

export type ViewMode = 'grid' | 'list'

// Grid / list switch shown at the end of a page's filter bar
export function ViewModeToggle({ value, onChange, className }: { value: ViewMode; onChange: (mode: ViewMode) => void; className?: string }) {
    const { t } = useTranslation()
    const options = [
        { mode: 'grid' as const, icon: LayoutGrid, label: t('common.gridView') },
        { mode: 'list' as const, icon: ListIcon, label: t('common.listView') }
    ]
    return (
        <div className={cn("flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-4", className)}>
            {options.map(({ mode, icon: Icon, label }) => (
                <button
                    key={mode}
                    type="button"
                    onClick={() => onChange(mode)}
                    title={label}
                    aria-label={label}
                    aria-pressed={value === mode}
                    className={cn(
                        "p-2 rounded-lg transition-colors",
                        value === mode
                            ? "bg-gray-100 dark:bg-gray-700 text-cyan-600"
                            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    )}
                >
                    <Icon className="w-5 h-5" />
                </button>
            ))}
        </div>
    )
}
