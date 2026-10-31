import type { Expense, ExpenseType } from '@/types/database'

// Errors carry the main-process code (e.g. 'TYPE_IN_USE'); the UI translates it via `expError.<code>`
export class ExpenseServiceError extends Error {
    constructor(public code: string) {
        super(code)
    }
}

async function unwrap<T>(request: Promise<{ success: boolean; data?: T; error?: string }>): Promise<T> {
    const result = await request
    if (!result.success) throw new ExpenseServiceError(result.error || 'UNKNOWN')
    return result.data as T
}

export type ExpenseInput = Pick<Expense, 'expense_type_id' | 'amount' | 'expense_date' | 'payment_method' | 'description'>

export const expenseTypeService = {
    // Includes `expenses_count` and `total_amount`
    getAll: (): Promise<ExpenseType[]> => window.electronAPI.expenseTypes.getAll(),
    create: (name: string, description?: string): Promise<ExpenseType> => unwrap(window.electronAPI.expenseTypes.create(name, description)),
    update: (id: number, data: { name?: string; description?: string }): Promise<ExpenseType> => unwrap(window.electronAPI.expenseTypes.update(id, data)),
    // Fails with TYPE_IN_USE while expenses still use the type
    delete: (id: number): Promise<void> => unwrap(window.electronAPI.expenseTypes.delete(id))
}

export const expenseService = {
    // Newest first, with `expense_type_name`
    getAll: (): Promise<Expense[]> => window.electronAPI.expenses.getAll(),
    create: (input: ExpenseInput): Promise<Expense> => unwrap(window.electronAPI.expenses.create(input)),
    update: (id: number, input: ExpenseInput): Promise<Expense> => unwrap(window.electronAPI.expenses.update(id, input)),
    delete: (id: number): Promise<void> => unwrap(window.electronAPI.expenses.delete(id))
}
