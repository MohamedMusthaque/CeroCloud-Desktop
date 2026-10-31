import { InventoryLog } from '@/types/database'

// Mock IPC for web development
const isMockMode = !window.electronAPI

const mockLogs: InventoryLog[] = []

export const inventoryLogService = {
    // Get all logs
    async getAll(): Promise<InventoryLog[]> {
        if (isMockMode) return mockLogs
        return window.electronAPI.inventoryLogs.getAll()
    },

    // Get a specific product's logs
    async getByProductId(productId: number): Promise<InventoryLog[]> {
        if (isMockMode) return mockLogs.filter(log => log.product_id === productId)
        return window.electronAPI.inventoryLogs.getByProductId(productId)
    },

    // Get logs by movement type
    async getByMovementType(movementType: string): Promise<InventoryLog[]> {
        if (isMockMode) return mockLogs.filter(log => log.movement_type === movementType)
        return window.electronAPI.inventoryLogs.getByMovementType(movementType)
    },

    // Get logs within a date range
    async getByDateRange(startDate: string, endDate: string): Promise<InventoryLog[]> {
        if (isMockMode) {
            return mockLogs.filter(log =>
                log.created_at && log.created_at >= startDate && log.created_at <= endDate
            )
        }
        return window.electronAPI.inventoryLogs.getByDateRange(startDate, endDate)
    },

    // Get recent logs
    async getRecent(limit: number = 50): Promise<InventoryLog[]> {
        if (isMockMode) return mockLogs.slice(0, limit)
        return window.electronAPI.inventoryLogs.getRecent(limit)
    },

    // Create a log manually (for manual adjustments from the UI)
    async create(log: Omit<InventoryLog, 'id'>): Promise<InventoryLog> {
        if (isMockMode) {
            const newLog: InventoryLog = { ...log, id: mockLogs.length + 1 }
            mockLogs.push(newLog)
            return newLog
        }
        return window.electronAPI.inventoryLogs.create(log)
    },
    async getCount(): Promise<number> {
        if (isMockMode) return mockLogs.length
        return window.electronAPI.inventoryLogs.count()
    }
}
