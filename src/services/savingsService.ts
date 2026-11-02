import type { SavingsAccount, SavingsTransaction } from '@/types/database'

// Errors carry the main-process code (e.g. 'INSUFFICIENT_BALANCE'); the UI translates it via `savError.<code>`
export class SavingsServiceError extends Error {
    constructor(public code: string) {
        super(code)
    }
}

async function unwrap<T>(request: Promise<{ success: boolean; data?: T; error?: string }>): Promise<T> {
    const result = await request
    if (!result.success) throw new SavingsServiceError(result.error || 'UNKNOWN')
    return result.data as T
}

export type SavingsAccountInput = Pick<SavingsAccount, 'name' | 'category' | 'description'>
export type SavingsTransactionInput = Pick<SavingsTransaction, 'account_id' | 'type' | 'amount' | 'transaction_date' | 'payment_method' | 'description'>

export const savingsAccountService = {
    // Sorted by name, with `balance`, `total_deposits`, `total_withdrawals` and `transactions_count`
    getAll: (): Promise<SavingsAccount[]> => window.electronAPI.savingsAccounts.getAll(),
    create: (input: SavingsAccountInput): Promise<SavingsAccount> => unwrap(window.electronAPI.savingsAccounts.create(input)),
    update: (id: number, input: SavingsAccountInput): Promise<SavingsAccount> => unwrap(window.electronAPI.savingsAccounts.update(id, input)),
    // Fails with ACCOUNT_IN_USE while the account still has transactions
    delete: (id: number): Promise<void> => unwrap(window.electronAPI.savingsAccounts.delete(id))
}

export const savingsTransactionService = {
    // Newest first, with `account_name` and `account_category`
    getAll: (): Promise<SavingsTransaction[]> => window.electronAPI.savingsTransactions.getAll(),
    // Fails with INSUFFICIENT_BALANCE when the change would leave the account below zero
    create: (input: SavingsTransactionInput): Promise<SavingsTransaction> => unwrap(window.electronAPI.savingsTransactions.create(input)),
    update: (id: number, input: SavingsTransactionInput): Promise<SavingsTransaction> => unwrap(window.electronAPI.savingsTransactions.update(id, input)),
    delete: (id: number): Promise<void> => unwrap(window.electronAPI.savingsTransactions.delete(id))
}
