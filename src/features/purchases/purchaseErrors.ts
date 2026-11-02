import type { TranslationKey } from '@/i18n'
import { PurchaseServiceError } from '@/services/purchaseService'

const KNOWN_CODES = ['SUPPLIER_REQUIRED', 'ITEMS_REQUIRED', 'PRODUCT_REQUIRED', 'QUANTITY_INVALID', 'COST_INVALID', 'DATE_INVALID', 'AMOUNT_INVALID', 'TYPE_INVALID', 'NOT_EDITABLE', 'HAS_PAYMENTS', 'ORDER_INVALID', 'REFUND_TOO_HIGH', 'NOT_FOUND', 'FORBIDDEN', 'UNKNOWN'] as const
type PurchaseErrorCode = typeof KNOWN_CODES[number]

// Translates a main-process purchase error code
export function purchaseErrorMessage(error: unknown, t: (key: TranslationKey) => string): string {
    const code = error instanceof PurchaseServiceError ? error.code : 'UNKNOWN'
    const known: PurchaseErrorCode = (KNOWN_CODES as readonly string[]).includes(code) ? code as PurchaseErrorCode : 'UNKNOWN'
    return t(`purError.${known}`)
}
