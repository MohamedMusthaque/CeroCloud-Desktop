import type { TranslationKey } from '@/i18n'
import type { InventoryLog } from '@/types/database'
import type { PageId } from '@/lib/permissions'
import { grnId } from '@/features/purchases/purchaseUi'

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string

export const movementLabel = (log: InventoryLog, t: Translate) => t(`stock.type.${log.movement_type}`)

// What caused a movement, and the page that shows it (none for bills and removed capital entries)
export function movementReference(log: InventoryLog, t: Translate): { label: string; to?: string; page?: PageId } {
    const id = log.reference_id
    if (!id) return { label: '-' }
    switch (log.reference_type) {
        case 'grn': return { label: t('grn.number', { id: grnId(id) }), to: `/purchases/grn/${id}`, page: 'purchases' }
        case 'purchase': return { label: t('stock.ref.purchase', { id }), to: `/purchases/${id}`, page: 'purchases' }
        case 'capital': return log.movement_type === 'capital_delete'
            ? { label: t('stock.ref.capital', { id }) }
            : { label: t('stock.ref.capital', { id }), to: `/capital/${id}`, page: 'capital' }
        case 'sale': return { label: t('stock.ref.sale', { id }) }
        default: return { label: '-' }
    }
}

// Units in and out across movements, for summaries
export function movementTotals(logs: InventoryLog[]) {
    const round = (value: number) => Math.round(value * 1000) / 1000 + 0
    return {
        in: round(logs.filter(l => l.quantity > 0).reduce((sum, l) => sum + l.quantity, 0)),
        out: round(logs.filter(l => l.quantity < 0).reduce((sum, l) => sum - l.quantity, 0))
    }
}
