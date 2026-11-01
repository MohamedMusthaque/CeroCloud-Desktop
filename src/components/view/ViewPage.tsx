import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, SearchX, Edit2, Contact } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { canAccessPage, type PageId } from '@/lib/permissions'
import { useAuthStore } from '@/stores/authStore'
import type { AuditFields, Sale } from '@/types/database'

// Shared building blocks for the read-only record pages (/clients/:id, /inventory/:id, ...)

export function ViewLoading() {
    const { t } = useTranslation()
    return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-500">{t('view.loading')}</p>
        </div>
    )
}

export function ViewNotFound({ backTo, backLabel }: { backTo: string; backLabel: string }) {
    const { t } = useTranslation()
    return (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <SearchX className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('view.notFound')}</h3>
            <p className="text-gray-500 mt-2">{t('view.notFoundDesc')}</p>
            <Link to={backTo} className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                {backLabel}
            </Link>
        </div>
    )
}

interface ViewHeaderProps {
    backTo: string
    backLabel: string
    avatar: ReactNode
    title: string
    subtitle?: ReactNode
    badges?: ReactNode
    onEdit?: () => void
}

export function ViewHeader({ backTo, backLabel, avatar, title, subtitle, badges, onEdit }: ViewHeaderProps) {
    const { t } = useTranslation()
    return (
        <div className="space-y-4">
            <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary transition-colors">
                <ArrowLeft className="w-4 h-4" />
                {backLabel}
            </Link>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    {avatar}
                    <div className="min-w-0">
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight break-words">{title}</h1>
                        {subtitle && <div className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</div>}
                        {badges && <div className="flex flex-wrap gap-2 mt-2">{badges}</div>}
                    </div>
                </div>
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all font-semibold shadow-lg shadow-primary/20 active:scale-95 shrink-0"
                    >
                        <Edit2 className="w-4 h-4" />
                        {t('common.edit')}
                    </button>
                )}
            </div>
        </div>
    )
}

// Gradient tile with the record's initial (or an icon)
export function ViewAvatar({ children, gradient }: { children: ReactNode; gradient: string }) {
    return (
        <div className={cn("w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg bg-gradient-to-br", gradient)}>
            {children}
        </div>
    )
}

export function ViewBadge({ children, tone = 'gray', icon: Icon }: { children: ReactNode; tone?: 'gray' | 'primary' | 'green' | 'red' | 'amber'; icon?: React.ElementType }) {
    const tones = {
        gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        primary: 'bg-primary/10 text-primary',
        green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    }
    return (
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold", tones[tone])}>
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {children}
        </span>
    )
}

interface ViewStatProps {
    label: string
    value: ReactNode
    hint?: string
    icon: React.ElementType
    color: string
}

export function ViewStat({ label, value, hint, icon: Icon, color }: ViewStatProps) {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 min-w-0">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", color, "bg-opacity-10")}>
                <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
            </div>
            <div className="min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white truncate">{value}</p>
                {hint && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{hint}</p>}
            </div>
        </div>
    )
}

export function ViewSection({ title, icon: Icon, actions, children, className }: { title: string; icon: React.ElementType; actions?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden", className)}
        >
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
                <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                    <Icon className="w-4 h-4 text-primary" />
                    {title}
                </h2>
                {actions}
            </div>
            <div className="p-6">{children}</div>
        </motion.section>
    )
}

// Label / value pairs; empty values show a dash
export function ViewFields({ children }: { children: ReactNode }) {
    return <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">{children}</dl>
}

export function ViewField({ label, value, icon: Icon, mono, wide }: { label: string; value?: ReactNode; icon?: React.ElementType; mono?: boolean; wide?: boolean }) {
    const empty = value === undefined || value === null || value === ''
    return (
        <div className={cn("min-w-0", wide && "sm:col-span-2")}>
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
            </dt>
            <dd className={cn("text-gray-900 dark:text-white break-words whitespace-pre-line", mono && "font-mono text-sm", empty && "text-gray-400")}>
                {empty ? '-' : value}
            </dd>
        </div>
    )
}

// Who created / last changed the record and when
export function ViewAudit({ record }: { record: AuditFields }) {
    const { t, locale } = useTranslation()
    const when = (date?: string | null) => date ? new Date(date).toLocaleString(locale) : undefined
    const wasEdited = !!record.updated_at && record.updated_at !== record.created_at

    return (
        <ViewSection title={t('view.audit')} icon={Clock}>
            <ViewFields>
                <ViewField label={t('view.createdAt')} value={when(record.created_at)} />
                <ViewField label={t('view.createdBy')} value={record.created_by || undefined} />
                <ViewField label={t('view.updatedAt')} value={wasEdited ? when(record.updated_at) : undefined} />
                <ViewField label={t('view.updatedBy')} value={wasEdited ? record.updated_by || undefined : undefined} />
            </ViewFields>
        </ViewSection>
    )
}

// Compact table used for related records (products of a category, purchases of a client...)
export function ViewTable({ columns, children, empty }: { columns: { label: string; align?: 'right' }[]; children: ReactNode; empty?: string }) {
    if (empty) return <p className="text-center text-gray-500 py-8">{empty}</p>
    return (
        <div className="overflow-x-auto -mx-6 -mb-6">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <tr>
                        {columns.map((column, index) => (
                            <th key={index} className={cn("px-6 py-3 whitespace-nowrap", column.align === 'right' && "text-right")}>{column.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">{children}</tbody>
            </table>
        </div>
    )
}

export function ViewSaleStatus({ status }: { status: Sale['status'] }) {
    const { t } = useTranslation()
    return status === 'cancelled'
        ? <ViewBadge tone="red">{t('cliHistory.cancelled')}</ViewBadge>
        : <ViewBadge tone="green">{t('cliHistory.completed')}</ViewBadge>
}

// Opens the attached NIC scan in the system viewer
export function ViewNic({ filename }: { filename?: string | null }) {
    const { t } = useTranslation()
    if (!filename) return <span className="text-gray-400">{t('view.nic.none')}</span>

    const open = async () => {
        const result = await window.electronAPI.attachments.openNic(filename)
        if (!result.success) toast.error(t(result.error === 'NOT_FOUND' ? 'nic.error.NOT_FOUND' : 'view.nic.openError'))
    }
    return (
        <button onClick={open} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Contact className="w-4 h-4" />
            {t('view.nic.open')}
        </button>
    )
}

// Link to another record's page, or plain text when the user can't open that page
export function ViewLink({ to, page, children, className }: { to: string; page: PageId; children: ReactNode; className?: string }) {
    const allowed = useAuthStore((state) => canAccessPage(state.user, page))
    if (!allowed) return <span className={className}>{children}</span>
    return <Link to={to} className={cn(viewLinkClass, className)}>{children}</Link>
}

export const viewCellClass = "px-6 py-3 text-gray-700 dark:text-gray-300"
export const viewLinkClass = "font-medium text-gray-900 dark:text-white hover:text-primary hover:underline"
