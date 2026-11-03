/* eslint-disable @typescript-eslint/no-explicit-any */
import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Auth
    auth: {
        login: (username: string, password: string) => ipcRenderer.invoke('auth:login', username, password),
        logout: () => ipcRenderer.invoke('auth:logout'),
        getSession: () => ipcRenderer.invoke('auth:getSession'),
    },
    // First-run Admin Setup
    setup: {
        getStatus: () => ipcRenderer.invoke('setup:getStatus'),
        createAdmin: (username: string, password: string) => ipcRenderer.invoke('setup:createAdmin', username, password),
    },
    // Users
    users: {
        getAll: () => ipcRenderer.invoke('users:getAll'),
        create: (user: any) => ipcRenderer.invoke('users:create', user),
        update: (id: number, user: any) => ipcRenderer.invoke('users:update', id, user),
        delete: (id: number) => ipcRenderer.invoke('users:delete', id),
    },
    // Products
    products: {
        getAll: () => ipcRenderer.invoke('products:getAll'),
        getById: (id: number) => ipcRenderer.invoke('products:getById', id),
        search: (term: string) => ipcRenderer.invoke('products:search', term),
        create: (product: any) => ipcRenderer.invoke('products:create', product),
        generateBarcode: () => ipcRenderer.invoke('products:generateBarcode'),
        createOrUpdate: (product: any) => ipcRenderer.invoke('products:createOrUpdate', product),
        update: (id: number, product: any) => ipcRenderer.invoke('products:update', id, product),
        delete: (id: number) => ipcRenderer.invoke('products:delete', id),
        getLowStock: () => ipcRenderer.invoke('products:getLowStock'),
        saveImage: (sourcePath: string) => ipcRenderer.invoke('products:saveImage', sourcePath),
        getImage: (filename: string) => ipcRenderer.invoke('products:getImage', filename),
        restoreImage: (filename: string, buffer: Uint8Array) => ipcRenderer.invoke('products:restoreImage', filename, buffer),
    },

    // Categories
    categories: {
        getAll: () => ipcRenderer.invoke('categories:getAll'),
        create: (name: string, description?: string) => ipcRenderer.invoke('categories:create', name, description),
        update: (id: number, data: { name?: string; description?: string }) => ipcRenderer.invoke('categories:update', id, data),
        delete: (id: number) => ipcRenderer.invoke('categories:delete', id),
    },

    // Sales
    sales: {
        getAll: () => ipcRenderer.invoke('sales:getAll'),
        getById: (id: number) => ipcRenderer.invoke('sales:getById', id),
        create: (sale: any) => ipcRenderer.invoke('sales:create', sale),
        getRecent: (limit?: number) => ipcRenderer.invoke('sales:getRecent', limit),
        getTotalSales: () => ipcRenderer.invoke('sales:getTotalSales'),
        getSalesToday: () => ipcRenderer.invoke('sales:getSalesToday'),
        cancel: (id: number) => ipcRenderer.invoke('sales:cancel', id),
        getByCustomerName: (name: string) => ipcRenderer.invoke('sales:getByCustomerName', name),
        getByProductId: (productId: number) => ipcRenderer.invoke('sales:getByProductId', productId),
    },

    // Suppliers
    suppliers: {
        getAll: () => ipcRenderer.invoke('suppliers:getAll'),
        getById: (id: number) => ipcRenderer.invoke('suppliers:getById', id),
        create: (supplier: any) => ipcRenderer.invoke('suppliers:create', supplier),
        update: (id: number, supplier: any) => ipcRenderer.invoke('suppliers:update', id, supplier),
        delete: (id: number) => ipcRenderer.invoke('suppliers:delete', id),
    },

    // Clients
    clients: {
        getAll: () => ipcRenderer.invoke('clients:getAll'),
        getById: (id: number) => ipcRenderer.invoke('clients:getById', id),
        search: (term: string) => ipcRenderer.invoke('clients:search', term),
        create: (client: any) => ipcRenderer.invoke('clients:create', client),
        update: (id: number, client: any) => ipcRenderer.invoke('clients:update', id, client),
        delete: (id: number) => ipcRenderer.invoke('clients:delete', id),
        getCreditBalance: (id: number) => ipcRenderer.invoke('clients:getCreditBalance', id),
    },

    // Expense types
    expenseTypes: {
        getAll: () => ipcRenderer.invoke('expenseTypes:getAll'),
        create: (name: string, description?: string) => ipcRenderer.invoke('expenseTypes:create', name, description),
        update: (id: number, data: { name?: string; description?: string }) => ipcRenderer.invoke('expenseTypes:update', id, data),
        delete: (id: number) => ipcRenderer.invoke('expenseTypes:delete', id),
    },

    // Expenses
    expenses: {
        getAll: () => ipcRenderer.invoke('expenses:getAll'),
        create: (expense: any) => ipcRenderer.invoke('expenses:create', expense),
        update: (id: number, expense: any) => ipcRenderer.invoke('expenses:update', id, expense),
        delete: (id: number) => ipcRenderer.invoke('expenses:delete', id),
    },

    // Capital and other income
    capital: {
        getAll: () => ipcRenderer.invoke('capital:getAll'),
        create: (entry: any) => ipcRenderer.invoke('capital:create', entry),
        update: (id: number, entry: any) => ipcRenderer.invoke('capital:update', id, entry),
        delete: (id: number) => ipcRenderer.invoke('capital:delete', id),
        settle: (id: number, input: any) => ipcRenderer.invoke('capital:settle', id, input),
        deleteSettlement: (id: number) => ipcRenderer.invoke('capital:deleteSettlement', id),
    },

    // Purchase orders
    purchases: {
        getAll: () => ipcRenderer.invoke('purchases:getAll'),
        getById: (id: number) => ipcRenderer.invoke('purchases:getById', id),
        create: (purchase: any) => ipcRenderer.invoke('purchases:create', purchase),
        update: (id: number, purchase: any) => ipcRenderer.invoke('purchases:update', id, purchase),
        receive: (id: number, input: any) => ipcRenderer.invoke('purchases:receive', id, input),
        cancel: (id: number) => ipcRenderer.invoke('purchases:cancel', id),
        delete: (id: number) => ipcRenderer.invoke('purchases:delete', id),
    },

    // Goods Received Notes (goods bought from clients)
    goodsReceipts: {
        getAll: () => ipcRenderer.invoke('goodsReceipts:getAll'),
        getById: (id: number) => ipcRenderer.invoke('goodsReceipts:getById', id),
        create: (receipt: any) => ipcRenderer.invoke('goodsReceipts:create', receipt),
        cancel: (id: number) => ipcRenderer.invoke('goodsReceipts:cancel', id),
    },

    // Supplier payments and running accounts
    supplierPayments: {
        getAll: () => ipcRenderer.invoke('supplierPayments:getAll'),
        create: (payment: any) => ipcRenderer.invoke('supplierPayments:create', payment),
        delete: (id: number) => ipcRenderer.invoke('supplierPayments:delete', id),
    },
    supplierAccounts: {
        get: (supplierId: number) => ipcRenderer.invoke('supplierAccounts:get', supplierId),
        getAll: () => ipcRenderer.invoke('supplierAccounts:getAll'),
    },

    // Savings accounts
    savingsAccounts: {
        getAll: () => ipcRenderer.invoke('savingsAccounts:getAll'),
        create: (account: any) => ipcRenderer.invoke('savingsAccounts:create', account),
        update: (id: number, account: any) => ipcRenderer.invoke('savingsAccounts:update', id, account),
        delete: (id: number) => ipcRenderer.invoke('savingsAccounts:delete', id),
    },

    // Savings transactions
    savingsTransactions: {
        getAll: () => ipcRenderer.invoke('savingsTransactions:getAll'),
        create: (transaction: any) => ipcRenderer.invoke('savingsTransactions:create', transaction),
        update: (id: number, transaction: any) => ipcRenderer.invoke('savingsTransactions:update', id, transaction),
        delete: (id: number) => ipcRenderer.invoke('savingsTransactions:delete', id),
    },

    // NIC attachments (suppliers and clients)
    attachments: {
        saveNic: (sourcePath: string) => ipcRenderer.invoke('attachments:saveNic', sourcePath),
        openNic: (filename: string) => ipcRenderer.invoke('attachments:openNic', filename),
        readNic: (filename: string) => ipcRenderer.invoke('attachments:readNic', filename),
        restoreNic: (filename: string, buffer: Uint8Array) => ipcRenderer.invoke('attachments:restoreNic', filename, buffer),
    },

    // Database
    database: {
        clearAll: () => ipcRenderer.invoke('database:clearAll'),
        restore: (data: any) => ipcRenderer.invoke('database:restore', data),
        getLocation: () => ipcRenderer.invoke('database:getLocation'),
        showLocation: () => ipcRenderer.invoke('database:showLocation'),
        pickLocation: () => ipcRenderer.invoke('database:pickLocation'),
        moveLocation: (directory: string, mode: 'copy' | 'useExisting') => ipcRenderer.invoke('database:moveLocation', directory, mode),
    },

    // Inventory Logs
    inventoryLogs: {
        getAll: () => ipcRenderer.invoke('inventory-logs:getAll'),
        getByProductId: (productId: number) => ipcRenderer.invoke('inventory-logs:getByProductId', productId),
        getByMovementType: (type: string) => ipcRenderer.invoke('inventory-logs:getByMovementType', type),
        getByDateRange: (startDate: string, endDate: string) => ipcRenderer.invoke('inventory-logs:getByDateRange', startDate, endDate),
        getRecent: (limit: number) => ipcRenderer.invoke('inventory-logs:getRecent', limit),
        create: (log: any) => ipcRenderer.invoke('inventory-logs:create', log),
        count: () => ipcRenderer.invoke('inventory-logs:count'),
    },

    // Auto Updater
    updater: {
        checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
        downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
        quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
        getCurrentVersion: () => ipcRenderer.invoke('updater:get-current-version'),
        setAutoCheck: (enabled: boolean, intervalHours?: number) =>
            ipcRenderer.invoke('updater:set-auto-check', enabled, intervalHours),
        onStatusUpdate: (callback: (status: any) => void) => {
            ipcRenderer.on('updater-status', (_event, status) => callback(status))
        },
        removeStatusListener: () => {
            ipcRenderer.removeAllListeners('updater-status')
        },
    },
})

// TypeScript declaration for window.electronAPI
declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}
