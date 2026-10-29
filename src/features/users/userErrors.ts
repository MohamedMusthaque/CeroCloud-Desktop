import type { TranslationKey } from '@/i18n'
import { UserServiceError } from '@/services/userService'

const KNOWN_CODES = ['USERNAME_REQUIRED', 'USERNAME_TAKEN', 'PASSWORD_TOO_SHORT', 'LAST_ADMIN', 'SELF_DELETE', 'SELF_DEMOTE', 'NOT_FOUND', 'FORBIDDEN', 'UNKNOWN'] as const
type UserErrorCode = typeof KNOWN_CODES[number]

// Translates a main-process user-management error code
export function userErrorMessage(error: unknown, t: (key: TranslationKey) => string): string {
    const code = error instanceof UserServiceError ? error.code : 'UNKNOWN'
    const known: UserErrorCode = (KNOWN_CODES as readonly string[]).includes(code) ? code as UserErrorCode : 'UNKNOWN'
    return t(`userError.${known}`)
}
