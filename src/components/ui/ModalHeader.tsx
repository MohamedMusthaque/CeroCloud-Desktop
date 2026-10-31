import { X } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'

interface ModalHeaderProps {
    title: string
    onClose: () => void
    className?: string
}

// Dark title bar shared by the New / Edit forms (client, product, category, supplier, expense, expense type)
export function ModalHeader({ title, onClose, className }: ModalHeaderProps) {
    const { t } = useTranslation()

    return (
        <div className={cn("bg-slate-900 dark:bg-slate-950 px-6 py-4 flex items-center justify-between shrink-0", className)}>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">{title}</h2>
            <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
            >
                <X size={20} />
            </button>
        </div>
    )
}
