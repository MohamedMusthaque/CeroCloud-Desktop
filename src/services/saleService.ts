import { Sale } from '@/types/database'

export const saleService = {
    async getAll(): Promise<Sale[]> {
        return await window.electronAPI.sales.getAll()
    },

    async getById(id: number): Promise<Sale> {
        return await window.electronAPI.sales.getById(id)
    },

    async create(sale: Omit<Sale, 'id'>): Promise<Sale> {
        return await window.electronAPI.sales.create(sale)
    },

    async getRecent(limit?: number): Promise<Sale[]> {
        return await window.electronAPI.sales.getRecent(limit)
    },

    async getTotalSales(): Promise<number> {
        return await window.electronAPI.sales.getTotalSales()
    },

    async getSalesToday(): Promise<Sale[]> {
        return await window.electronAPI.sales.getSalesToday()
    },

    async getByCustomerName(name: string): Promise<Sale[]> {
        return await window.electronAPI.sales.getByCustomerName(name)
    },

    async getByProductId(productId: number): Promise<Sale[]> {
        return await window.electronAPI.sales.getByProductId(productId)
    },
}
