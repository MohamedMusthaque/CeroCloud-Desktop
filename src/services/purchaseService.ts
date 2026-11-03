import type { GoodsReceipt, Purchase, SupplierAccount, SupplierPayment, SupplierPaymentType } from '@/types/database'

// Errors carry the main-process code (e.g. 'REFUND_TOO_HIGH'); the UI translates it via `purError.<code>`
export class PurchaseServiceError extends Error {
    constructor(public code: string) {
        super(code)
    }
}

async function unwrap<T>(request: Promise<{ success: boolean; data?: T; error?: string }>): Promise<T> {
    const result = await request
    if (!result.success) throw new PurchaseServiceError(result.error || 'UNKNOWN')
    return result.data as T
}

export interface PaymentDetails {
    amount: number
    payment_date?: string
    payment_method: string
    notes?: string
}

export interface PurchaseInput {
    supplier_id: number
    order_date: string
    notes?: string
    items: { product_id: number; quantity: number; unit_cost: number }[]
    // Paid when placing the order (new orders only)
    advance?: PaymentDetails | null
}

export interface ReceiveInput {
    received_date: string
    items: { id: number; received_quantity: number; unit_cost: number }[]
    update_costs: boolean
    // Pay what's still due, or take back an overpayment; null keeps the difference on the supplier account
    settlement?: (PaymentDetails & { type: SupplierPaymentType }) | null
}

export interface SupplierPaymentInput extends PaymentDetails {
    supplier_id: number
    purchase_id?: number | null
    type: SupplierPaymentType
}

export const purchaseService = {
    // Newest first, with `supplier_name`, `items_count` and `paid`
    getAll: (): Promise<Purchase[]> => window.electronAPI.purchases.getAll(),
    // Includes `items`; null when it doesn't exist
    getById: (id: number): Promise<Purchase | null> => window.electronAPI.purchases.getById(id),
    create: (input: PurchaseInput): Promise<Purchase> => unwrap(window.electronAPI.purchases.create(input)),
    update: (id: number, input: PurchaseInput): Promise<Purchase> => unwrap(window.electronAPI.purchases.update(id, input)),
    receive: (id: number, input: ReceiveInput): Promise<Purchase> => unwrap(window.electronAPI.purchases.receive(id, input)),
    cancel: (id: number): Promise<Purchase> => unwrap(window.electronAPI.purchases.cancel(id)),
    // Only orders without payments that haven't been received
    delete: (id: number): Promise<void> => unwrap(window.electronAPI.purchases.delete(id))
}

export interface GoodsReceiptInput {
    client_id?: number | null
    // Walk-in seller when there's no registered client
    client_name?: string
    receipt_date: string
    payment_method: string
    notes?: string
    items: { product_id: number; quantity: number; unit_cost: number }[]
    update_costs: boolean
}

// Goods Received Notes: goods bought from clients
export const goodsReceiptService = {
    // Newest first, with `items`
    getAll: (): Promise<GoodsReceipt[]> => window.electronAPI.goodsReceipts.getAll(),
    getById: (id: number): Promise<GoodsReceipt | null> => window.electronAPI.goodsReceipts.getById(id),
    create: (input: GoodsReceiptInput): Promise<GoodsReceipt> => unwrap(window.electronAPI.goodsReceipts.create(input)),
    // Takes the goods back out of stock; fails with STOCK_USED once they were sold
    cancel: (id: number): Promise<GoodsReceipt> => unwrap(window.electronAPI.goodsReceipts.cancel(id))
}

export const supplierPaymentService = {
    // Newest first, with `supplier_name`
    getAll: (): Promise<SupplierPayment[]> => window.electronAPI.supplierPayments.getAll(),
    create: (input: SupplierPaymentInput): Promise<SupplierPayment> => unwrap(window.electronAPI.supplierPayments.create(input)),
    delete: (id: number): Promise<void> => unwrap(window.electronAPI.supplierPayments.delete(id))
}

export const supplierAccountService = {
    get: (supplierId: number): Promise<SupplierAccount> => window.electronAPI.supplierAccounts.get(supplierId),
    getAll: (): Promise<SupplierAccount[]> => window.electronAPI.supplierAccounts.getAll()
}
