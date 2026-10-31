import type { AuditFields } from '@/types/database'

export interface Client extends AuditFields {
    id?: number
    name: string
    tax_id?: string
    address?: string
    phone?: string
    email?: string
    notes?: string
    credit_limit?: number
    nic_attachment?: string | null // NIC scan file name (userData/attachments/nic)
}

class ClientService {
    async getAll(): Promise<Client[]> {
        if (!window.electronAPI?.clients) {
            throw new Error('Client API not available')
        }
        return window.electronAPI.clients.getAll()
    }

    async getById(id: number): Promise<Client> {
        if (!window.electronAPI?.clients) {
            throw new Error('Client API not available')
        }
        return window.electronAPI.clients.getById(id)
    }

    async search(term: string): Promise<Client[]> {
        if (!window.electronAPI?.clients) {
            throw new Error('Client API not available')
        }
        return window.electronAPI.clients.search(term)
    }

    async create(client: Omit<Client, 'id' | keyof AuditFields>): Promise<Client> {
        if (!window.electronAPI?.clients) {
            throw new Error('Client API not available')
        }
        return window.electronAPI.clients.create(client)
    }

    async update(id: number, client: Partial<Omit<Client, 'id' | keyof AuditFields>>): Promise<Client> {
        if (!window.electronAPI?.clients) {
            throw new Error('Client API not available')
        }
        return window.electronAPI.clients.update(id, client)
    }

    async delete(id: number): Promise<{ success: boolean }> {
        if (!window.electronAPI?.clients) {
            throw new Error('Client API not available')
        }
        return window.electronAPI.clients.delete(id)
    }

    // Outstanding balance of the client's non-cancelled credit sales
    async getCreditBalance(id: number): Promise<number> {
        if (!window.electronAPI?.clients) {
            throw new Error('Client API not available')
        }
        return window.electronAPI.clients.getCreditBalance(id)
    }
}

export const clientService = new ClientService()
