import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { canAccessPage } from '@/lib/permissions'
import { useAuthStore } from '@/stores/authStore'
import { ACCOUNT_PAGES, BALANCE_MODES, balanceState, typeLabel, type AccountType } from './accountLedger'
import { TYPE_STYLES } from './accountUi'

export function AccountTypeBadge({ type }: { type: AccountType }) {
    const { t } = useTranslation()
    const style = TYPE_STYLES[type]
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap", style.badge)}>
            <style.icon className="w-3 h-3" />
            {t(typeLabel(type))}
        </span>
    )
}

// Balance with what it means underneath (owes you / you owe / held / spent)
export function AccountBalance({ type, value, align = 'right', size = 'sm' }: { type: AccountType; value: number; align?: 'left' | 'right'; size?: 'sm' | 'lg' }) {
    const { t } = useTranslation()
    const state = balanceState(BALANCE_MODES[type], value)
    const settled = BALANCE_MODES[type] === 'party' && value === 0
    return (
        <span className={cn("inline-flex flex-col whitespace-nowrap", align === 'right' ? "items-end" : "items-start")}>
            <span className={cn("font-bold", size === 'lg' ? "text-2xl font-black" : "", state.tone)}>
                {settled ? t('acct.balance.settled') : formatCurrency(state.amount)}
            </span>
            {!settled && <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t(state.key)}</span>}
        </span>
    )
}

// "View account" link from a supplier, client or other record page (hidden without access)
export function AccountLink({ type, id, className }: { type: AccountType; id?: number; className?: string }) {
    const { t } = useTranslation()
    const user = useAuthStore((state) => state.user)
    if (!id || !canAccessPage(user, 'accounts') || !canAccessPage(user, ACCOUNT_PAGES[type])) return null
    return (
        <Link
            to={`/accounts/${type}/${id}`}
            className={cn("inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline whitespace-nowrap", className)}
        >
            <BookOpen className="w-4 h-4" />
            {t('acct.viewAccount')}
        </Link>
    )
}
