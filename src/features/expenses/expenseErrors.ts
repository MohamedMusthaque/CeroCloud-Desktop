import type { TranslationKey } from '@/i18n'
import { ExpenseServiceError } from '@/services/expenseService'

const KNOWN_CODES = ['NAME_REQUIRED', 'NAME_TAKEN', 'TYPE_IN_USE', 'TYPE_REQUIRED', 'AMOUNT_INVALID', 'DATE_INVALID', 'NOT_FOUND', 'FORBIDDEN', 'UNKNOWN'] as const
type ExpenseErrorCode = typeof KNOWN_CODES[number]

// Translates a main-process expense error code
export function expenseErrorMessage(error: unknown, t: (key: TranslationKey) => string): string {
    const code = error instanceof ExpenseServiceError ? error.code : 'UNKNOWN'
    const known: ExpenseErrorCode = (KNOWN_CODES as readonly string[]).includes(code) ? code as ExpenseErrorCode : 'UNKNOWN'
    return t(`expError.${known}`)
}
