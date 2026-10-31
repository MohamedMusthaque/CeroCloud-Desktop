// Audit fields: set by the main process from the session's user
export interface AuditFields {
    created_at?: string
    created_by?: string | null
    updated_at?: string | null
    updated_by?: string | null
}

export interface Product extends AuditFields {
    id?: number
    code: string
    name: string
    description?: string
    category?: string
    supplier_id?: number
    supplier_name?: string
    image?: string
    price: number
    cost?: number
    stock: number
    min_stock: number
    unit: string
}

export interface Supplier extends AuditFields {
    id?: number
    name: string
    contact?: string
    phone?: string
    email?: string
    address?: string
    products_count?: number
}

export interface Client extends AuditFields {
    id?: number
    name: string
    tax_id?: string
    address?: string
    phone?: string
    email?: string
    notes?: string
    credit_limit?: number
}

export interface Category extends AuditFields {
    id?: number
    name: string
    description?: string
    products_count?: number
}

export interface Sale extends AuditFields {
    id?: number
    items: SaleItem[]
    subtotal: number
    tax: number
    discount: number
    total: number
    payment_method: string
    cheque_number?: string | null // Only for payment_method 'cheque'
    cheque_bank?: string | null
    customer_name?: string
    client_id?: number
    notes?: string
    status: 'completed' | 'cancelled'
}

export interface ExpenseType extends AuditFields {
    id?: number
    name: string
    description?: string
    expenses_count?: number
    total_amount?: number
}

export interface Expense extends AuditFields {
    id?: number
    expense_type_id: number
    expense_type_name?: string
    amount: number
    expense_date: string // Local day 'YYYY-MM-DD'
    payment_method: string
    description?: string
}

export interface SaleItem {
    id?: number
    sale_id?: number
    product_id: number
    product_code: string
    product_name: string
    quantity: number
    unit_price: number
    unit_cost?: number | null // Product's cost at the time of sale
    subtotal: number
}

export interface CartItem {
    product: Product
    quantity: number
}

export interface InventoryLog {
    id?: number
    product_id: number
    product_code?: string
    product_name?: string
    movement_type: 'sale' | 'purchase' | 'adjustment' | 'return'
    quantity: number // Positive for stock in, negative for stock out
    stock_before: number
    stock_after: number
    reference_type?: string // 'sale', 'manual', 'purchase_order', etc.
    reference_id?: number
    notes?: string
    user?: string
    created_at?: string
}

export interface CompanySettings {
    name: string
    address?: string
    phone?: string
    email?: string
    website?: string
    logo?: string // Base64 or URL
    taxId?: string // RFC, NIT, etc.

    // Regional settings / currency
    currency: string
    currencySymbol: string
    locale: string // 'es-GT', 'es-MX', 'en-US'

    // Taxes
    enableTax: boolean
    taxRate: number
    taxIncluded: boolean // Whether prices already include tax (VAT)

    // Sales / POS
    enableDiscounts: boolean
    requireCustomerName: boolean
    askPaymentMethod: boolean
    pos: {
        autoConfirm: boolean
        showChangeCalculation: boolean
        allowNegativeStock: boolean
        soundEffects: boolean
    }

    // Enabled payment methods
    paymentMethods: {
        cash: boolean
        card: boolean
        transfer: boolean
        other: boolean
        credit: boolean // On account; needs a registered client with a credit limit
        cheque: boolean
    }

    // Invoicing
    invoice: {
        prefix: string
        nextNumber: number
        disclaimer: string // Legal text at the end of the ticket
        paperSize?: 'a4' | 'ticket80mm'
        headerImage?: string
        footerImage?: string
    }

    // Inventory
    inventory: {
        lowStockThreshold: number
        showVisualAlerts: boolean
    }

    backup: {
        autoBackup: boolean
        frequency: 'daily' | 'weekly' | 'monthly'
        time?: string // 'HH:mm' format (24h)
        lastBackupDate?: string
        location?: string
    }

    // Appearance
    theme: {
        mode: 'light' | 'dark' | 'system'
        density: 'normal' | 'compact'
        fontSize: 'small' | 'normal' | 'large' | 'xlarge' // UI Scaling
        borderRadius: 'none' | 'small' | 'normal' | 'large' // Corner radius
    }

    // Security
    security: {
        enablePin: boolean
        pin?: string
        lockSettings: boolean
    }

    // Updates
    updates: {
        autoCheck: boolean
    }
}
