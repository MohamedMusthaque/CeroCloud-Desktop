import type { CapitalEntry, CapitalEntryType, CapitalForm } from '@/types/database'

// Errors carry the main-process code (e.g. 'AMOUNT_INVALID'); the UI translates it via `capError.<code>`
export class CapitalServiceError extends Error {
    constructor(public code: string) {
        super(code)
    }
}

async function unwrap<T>(request: Promise<{ success: boolean; data?: T; error?: string }>): Promise<T> {
    const result = await request
    if (!result.success) throw new CapitalServiceError(result.error || 'UNKNOWN')
    return result.data as T
}

export interface CapitalEntryInput {
    type: CapitalEntryType
    form: CapitalForm
    source?: string
    // Ignored for goods: their value is the sum of the items
    amount?: number
    entry_date: string
    payment_method?: string
    description?: string
    supplier_id?: number | null
    items?: { product_id: number; quantity: number; unit_cost: number }[]
    update_costs?: boolean
}

export interface CapitalSettlementInput {
    amount: number
    settlement_date: string
    payment_method: string
    notes?: string
}

export const capitalService = {
    // Newest first, with `items`, `settlements` and `settled`
    getAll: (): Promise<CapitalEntry[]> => window.electronAPI.capital.getAll(),
    create: (input: CapitalEntryInput): Promise<CapitalEntry> => unwrap(window.electronAPI.capital.create(input)),
    // Type, form and goods stay as recorded
    update: (id: number, input: Partial<CapitalEntryInput>): Promise<CapitalEntry> => unwrap(window.electronAPI.capital.update(id, input)),
    delete: (id: number): Promise<void> => unwrap(window.electronAPI.capital.delete(id)),
    // Loan repayment or payment in towards promised capital
    settle: (id: number, input: CapitalSettlementInput): Promise<CapitalEntry> => unwrap(window.electronAPI.capital.settle(id, input)),
    deleteSettlement: (id: number): Promise<void> => unwrap(window.electronAPI.capital.deleteSettlement(id))
}
