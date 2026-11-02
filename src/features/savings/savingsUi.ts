import { Briefcase, User, Target } from 'lucide-react'
import type { TranslationKey } from '@/i18n'
import type { SavingsCategory, SavingsTransactionType } from '@/types/database'

export { PAYMENT_METHODS } from '@/lib/paymentMethods'

// Look of each savings category across the page, cards and detail view
export const CATEGORY_STYLES: Record<SavingsCategory, { icon: React.ElementType; badge: string; stat: string; gradient: string }> = {
    employee: {
        icon: Briefcase,
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        stat: 'bg-blue-500',
        gradient: 'from-blue-500 to-indigo-600'
    },
    personal: {
        icon: User,
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        stat: 'bg-emerald-500',
        gradient: 'from-emerald-500 to-teal-600'
    },
    other: {
        icon: Target,
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        stat: 'bg-amber-500',
        gradient: 'from-amber-500 to-orange-600'
    }
}

export const categoryLabel = (category: SavingsCategory | undefined, t: (key: TranslationKey) => string) =>
    t(`sav.category.${category ?? 'other'}`)

export const typeLabel = (type: SavingsTransactionType, t: (key: TranslationKey) => string) =>
    t(`sav.type.${type}`)

// Deposits add to the balance, withdrawals subtract
export const signedAmount = (type: SavingsTransactionType, amount: number) => type === 'deposit' ? amount : -amount
