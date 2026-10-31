/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_NAME: string
    readonly VITE_DB_PATH: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

// Electron API Types
type UserResult<T> = { success: boolean; data?: T; error?: string }

interface ElectronAPI {
    auth: {
        login: (username: string, password: string) => Promise<{ success: boolean; user?: import('@/lib/permissions').AuthUser }>
        logout: () => Promise<{ success: boolean }>
        getSession: () => Promise<import('@/lib/permissions').AuthUser | null>
    }
    users: {
        getAll: () => Promise<UserResult<any[]>>
        create: (user: any) => Promise<UserResult<any>>
        update: (id: number, user: any) => Promise<UserResult<any>>
        delete: (id: number) => Promise<UserResult<void>>
    }
    products: {
        getAll: () => Promise<any[]>
        getById: (id: number) => Promise<any>
        search: (term: string) => Promise<any[]>
        create: (product: any) => Promise<any>
        createOrUpdate: (product: any) => Promise<{ product: any; isNew: boolean }>
        update: (id: number, product: any) => Promise<any>
        delete: (id: number) => Promise<{ success: boolean }>
        getLowStock: () => Promise<any[]>
        saveImage: (sourcePath: string) => Promise<string>
        getImage: (filename: string) => Promise<{ success: boolean; buffer?: Uint8Array; error?: string }>
        restoreImage: (filename: string, buffer: Uint8Array) => Promise<void>
    }
    categories: {
        getAll: () => Promise<any[]>
        create: (name: string, description?: string) => Promise<UserResult<any>>
        update: (id: number, data: { name?: string; description?: string }) => Promise<UserResult<any>>
        delete: (id: number) => Promise<UserResult<void>>
    }
    sales: {
        getAll: () => Promise<any[]>
        getById: (id: number) => Promise<any>
        getRecent: (limit?: number) => Promise<any[]>
        getTotalSales: () => Promise<number>
        getSalesToday: () => Promise<any[]>
        create: (sale: any) => Promise<any>
        cancel: (id: number) => Promise<any>
        getByCustomerName: (name: string) => Promise<any[]>
    }
    suppliers: {
        getAll: () => Promise<any[]>
        getById: (id: number) => Promise<any>
        create: (supplier: any) => Promise<any>
        update: (id: number, supplier: any) => Promise<any>
        delete: (id: number) => Promise<{ success: boolean }>
    }
    clients: {
        getAll: () => Promise<any[]>
        getById: (id: number) => Promise<any>
        search: (term: string) => Promise<any[]>
        create: (client: any) => Promise<any>
        update: (id: number, client: any) => Promise<any>
        delete: (id: number) => Promise<{ success: boolean }>
        getCreditBalance: (id: number) => Promise<number>
    }
    expenseTypes: {
        getAll: () => Promise<any[]>
        create: (name: string, description?: string) => Promise<UserResult<any>>
        update: (id: number, data: { name?: string; description?: string }) => Promise<UserResult<any>>
        delete: (id: number) => Promise<UserResult<void>>
    }
    expenses: {
        getAll: () => Promise<any[]>
        create: (expense: any) => Promise<UserResult<any>>
        update: (id: number, expense: any) => Promise<UserResult<any>>
        delete: (id: number) => Promise<UserResult<void>>
    }
    attachments: {
        saveNic: (sourcePath: string) => Promise<{ success: boolean; filename?: string; error?: string }>
        openNic: (filename: string) => Promise<{ success: boolean; error?: string }>
        readNic: (filename: string) => Promise<{ success: boolean; buffer?: Uint8Array; error?: string }>
        restoreNic: (filename: string, buffer: Uint8Array) => Promise<{ success: boolean; error?: string }>
    }
    database: {
        clearAll: () => Promise<{ success: boolean; error?: string }>
        restore: (data: any) => Promise<{ success: boolean; error?: string }>
    }
    inventoryLogs: {
        getAll: () => Promise<any[]>
        getByProductId: (productId: number) => Promise<any[]>
        getByMovementType: (type: string) => Promise<any[]>
        getByDateRange: (startDate: string, endDate: string) => Promise<any[]>
        getRecent: (limit: number) => Promise<any[]>
        create: (log: any) => Promise<any>
        count: () => Promise<number>
    }
    backup: {
        create: (password?: string) => Promise<{ path: string; filename: string; encrypted: boolean }>
        createZip: (password?: string) => Promise<{ buffer: Uint8Array; filename: string; encrypted: boolean }>
        restore: (backupPath: string, password?: string) => Promise<{ success: boolean }>
        restoreFromBuffer: (buffer: Uint8Array, password?: string) => Promise<{ success: boolean }>
        verifyBackup: (backupPath: string, password?: string) => Promise<any>
        verifyBackupBuffer: (buffer: Uint8Array, password?: string) => Promise<any>
    }
    company: {
        get: () => Promise<any>
        update: (data: any) => Promise<void>
    }
    updater: {
        checkForUpdates: () => Promise<{ success: boolean; data?: any; error?: string }>
        downloadUpdate: () => Promise<{ success: boolean; error?: string }>
        quitAndInstall: () => Promise<void>
        getCurrentVersion: () => Promise<string>
        setAutoCheck: (enabled: boolean, intervalHours?: number) => Promise<{ success: boolean }>
        onStatusUpdate: (callback: (status: any) => void) => void
        removeStatusListener: () => void
    }
}

interface Window {
    electronAPI: ElectronAPI
}
