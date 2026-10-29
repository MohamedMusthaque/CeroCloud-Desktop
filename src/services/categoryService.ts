import type { Category } from '@/types/database'

// Errors carry the main-process code (e.g. 'NAME_TAKEN'); the UI translates it via `catError.<code>`
export class CategoryServiceError extends Error {
    constructor(public code: string) {
        super(code)
    }
}

async function unwrap<T>(request: Promise<{ success: boolean; data?: T; error?: string }>): Promise<T> {
    const result = await request
    if (!result.success) throw new CategoryServiceError(result.error || 'UNKNOWN')
    return result.data as T
}

export const categoryService = {
    // Includes `products_count`; categories only present on products are registered automatically
    getAll: (): Promise<Category[]> => window.electronAPI.categories.getAll(),
    create: (name: string, description?: string): Promise<Category> => unwrap(window.electronAPI.categories.create(name, description)),
    // Renaming also renames the category on its products
    update: (id: number, data: { name?: string; description?: string }): Promise<Category> => unwrap(window.electronAPI.categories.update(id, data)),
    // Products of a deleted category become uncategorized
    delete: (id: number): Promise<void> => unwrap(window.electronAPI.categories.delete(id))
}
