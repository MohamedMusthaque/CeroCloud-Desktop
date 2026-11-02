import { Landmark, PlusCircle, Coins, ArrowUpFromLine, Banknote, Package, Truck, HandCoins, CalendarClock } from 'lucide-react'
import type { TranslationKey } from '@/i18n'
import { CapitalServiceError } from '@/services/capitalService'
import type { CapitalEntry, CapitalEntryType, CapitalForm } from '@/types/database'

// Look of each entry type across the page, cards and form
export const TYPE_STYLES: Record<CapitalEntryType, { icon: React.ElementType; badge: string }> = {
    initial_capital: { icon: Landmark, badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
    capital: { icon: PlusCircle, badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    income: { icon: Coins, badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    withdrawal: { icon: ArrowUpFromLine, badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
}

export const FORM_ICONS: Record<CapitalForm, React.ElementType> = {
    money: Banknote,
    goods: Package,
    supplier_credit: Truck,
    loan: HandCoins,
    pledge: CalendarClock
}

export const typeLabel = (type: CapitalEntryType, t: (key: TranslationKey) => string) => t(`cap.type.${type}`)
export const formLabel = (form: CapitalForm, t: (key: TranslationKey) => string) => t(`cap.form.${form}`)

export const isCapitalType = (type: CapitalEntryType) => type === 'initial_capital' || type === 'capital'
export const isGoodsForm = (form: CapitalForm) => form === 'goods' || form === 'supplier_credit'
// Loans are repaid and promises paid in over time
export const isSettledForm = (form: CapitalForm) => form === 'loan' || form === 'pledge'

export const outstandingOf = (entry: CapitalEntry) => Math.max(Math.round((entry.amount - (entry.settled ?? 0)) * 100) / 100, 0)

// Money in (+) or out (−) shown next to the amount
export const amountSign = (entry: CapitalEntry) => entry.type === 'withdrawal' ? '−' : '+'

// Who the money came from: the supplier for goods on credit, otherwise the typed source
export const sourceOf = (entry: CapitalEntry) => entry.form === 'supplier_credit' ? entry.supplier_name ?? entry.source : entry.source

const KNOWN_CODES = [
    'TYPE_INVALID', 'FORM_INVALID', 'AMOUNT_INVALID', 'DATE_INVALID', 'SUPPLIER_REQUIRED', 'ITEMS_REQUIRED', 'PRODUCT_REQUIRED',
    'QUANTITY_INVALID', 'COST_INVALID', 'NOT_EDITABLE', 'NOT_SETTLEABLE', 'AMOUNT_TOO_HIGH', 'BELOW_SETTLED', 'HAS_SETTLEMENTS',
    'HAS_PAYMENTS', 'STOCK_USED', 'NOT_FOUND', 'FORBIDDEN', 'UNKNOWN'
] as const
type CapitalErrorCode = typeof KNOWN_CODES[number]

// Translates a main-process capital error code
export function capitalErrorMessage(error: unknown, t: (key: TranslationKey) => string): string {
    const code = error instanceof CapitalServiceError ? error.code : 'UNKNOWN'
    const known: CapitalErrorCode = (KNOWN_CODES as readonly string[]).includes(code) ? code as CapitalErrorCode : 'UNKNOWN'
    return t(`capError.${known}`)
}
