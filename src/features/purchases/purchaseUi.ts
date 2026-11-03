import { Clock, PackageCheck, Ban } from 'lucide-react'
import type { TranslationKey } from '@/i18n'
import type { PurchaseStatus, SupplierAccount } from '@/types/database'

export const STATUS_STYLES: Record<PurchaseStatus, { icon: React.ElementType; badge: string }> = {
    ordered: { icon: Clock, badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    received: { icon: PackageCheck, badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    cancelled: { icon: Ban, badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' }
}

export const statusLabel = (status: PurchaseStatus, t: (key: TranslationKey) => string) => t(`pur.status.${status}`)

export const roundMoney = (value: number) => Math.round(value * 100) / 100 + 0

// GRN numbers are zero-padded like bill numbers (GRN-000012)
export const grnId = (id?: number) => String(id ?? '').padStart(6, '0')

// What happens when goods worth `goodsValue` arrive for an order (same rule as the main process):
// the order's own advance plus any free credit with the supplier pays for them first
export function settlementFor(advance: number, account: SupplierAccount | null, goodsValue: number) {
    const available = account?.available ?? 0
    const credit = Math.max(available, 0)
    const result = roundMoney(advance + credit - goodsValue)
    return {
        advance,
        credit,
        // Owed for earlier goods; not part of this order's settlement
        owedBefore: Math.max(-available, 0),
        // > 0 overpaid (refund or keep as advance), < 0 still to pay, 0 settled
        result
    }
}
