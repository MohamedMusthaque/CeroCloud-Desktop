import type { TranslationKey } from '@/i18n'
import { SavingsServiceError } from '@/services/savingsService'

const KNOWN_CODES = ['NAME_REQUIRED', 'NAME_TAKEN', 'CATEGORY_INVALID', 'ACCOUNT_REQUIRED', 'ACCOUNT_IN_USE', 'TYPE_INVALID', 'AMOUNT_INVALID', 'DATE_INVALID', 'INSUFFICIENT_BALANCE', 'NOT_FOUND', 'FORBIDDEN', 'UNKNOWN'] as const
type SavingsErrorCode = typeof KNOWN_CODES[number]

// Translates a main-process savings error code
export function savingsErrorMessage(error: unknown, t: (key: TranslationKey) => string): string {
    const code = error instanceof SavingsServiceError ? error.code : 'UNKNOWN'
    const known: SavingsErrorCode = (KNOWN_CODES as readonly string[]).includes(code) ? code as SavingsErrorCode : 'UNKNOWN'
    return t(`savError.${known}`)
}
