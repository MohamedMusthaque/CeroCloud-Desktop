import { Supplier } from '@/types/database'

class SupplierService {
    async getAll(): Promise<Supplier[]> {
        if (!window.electronAPI?.suppliers) {
            throw new Error('Supplier API not available')
        }
        return window.electronAPI.suppliers.getAll()
    }

    async getById(id: number): Promise<Supplier> {
        if (!window.electronAPI?.suppliers) {
            throw new Error('Supplier API not available')
        }
        return window.electronAPI.suppliers.getById(id)
    }

    async create(supplier: Omit<Supplier, 'id' | 'created_at'>): Promise<Supplier> {
        if (!window.electronAPI?.suppliers) {
            throw new Error('Supplier API not available')
        }
        return window.electronAPI.suppliers.create(supplier)
    }

    async update(id: number, supplier: Partial<Omit<Supplier, 'id' | 'created_at'>>): Promise<Supplier> {
        if (!window.electronAPI?.suppliers) {
            throw new Error('Supplier API not available')
        }
        return window.electronAPI.suppliers.update(id, supplier)
    }

    // Fails with an Error whose message is the code (e.g. 'HAS_PURCHASES') when the supplier can't be deleted
    async delete(id: number): Promise<{ success: boolean }> {
        if (!window.electronAPI?.suppliers) {
            throw new Error('Supplier API not available')
        }
        const result = await window.electronAPI.suppliers.delete(id)
        if (!result.success) throw new Error(result.error || 'UNKNOWN')
        return result
    }
}

export const supplierService = new SupplierService()
