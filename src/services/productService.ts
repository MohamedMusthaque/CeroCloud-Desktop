import { Product } from '@/types/database'

export const productService = {
    async getAll(): Promise<Product[]> {
        return await window.electronAPI.products.getAll()
    },

    async getById(id: number): Promise<Product> {
        return await window.electronAPI.products.getById(id)
    },

    async search(term: string): Promise<Product[]> {
        return await window.electronAPI.products.search(term)
    },

    // Next unused in-store EAN-13 barcode (starts with "20")
    async generateBarcode(): Promise<string> {
        return await window.electronAPI.products.generateBarcode()
    },

    async create(product: Omit<Product, 'id'>): Promise<Product> {
        return await window.electronAPI.products.create(product)
    },

    async update(id: number, product: Partial<Product>): Promise<Product> {
        return await window.electronAPI.products.update(id, product)
    },

    async delete(id: number): Promise<{ success: boolean }> {
        return await window.electronAPI.products.delete(id)
    },

    async getLowStock(): Promise<Product[]> {
        return await window.electronAPI.products.getLowStock()
    },
}
