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

    // Database
    database: {
        clearAll: () => ipcRenderer.invoke('database:clearAll'),
        restore: (data: any) => ipcRenderer.invoke('database:restore', data),
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
