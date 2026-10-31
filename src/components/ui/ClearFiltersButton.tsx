import { FilterX } from 'lucide-react'
import { useTranslation } from '@/i18n'

interface ClearFiltersButtonProps {
    // Shown only while a search or filter is set
    visible: boolean
    onClick: () => void
}

// Resets a page's search text and filters in one click
export function ClearFiltersButton({ visible, onClick }: ClearFiltersButtonProps) {
    const { t } = useTranslation()
    if (!visible) return null

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors w-fit shrink-0 whitespace-nowrap"
        >
            <FilterX className="w-4 h-4" />
            {t('common.clearFilters')}
        </button>
    )
}
