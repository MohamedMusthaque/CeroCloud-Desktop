// Page-level access control shared by the renderer and the Electron main process (keep it dependency-free)

export const PAGE_IDS = ['dashboard', 'inventory', 'sales', 'suppliers', 'clients', 'reports', 'users', 'settings'] as const
export type PageId = typeof PAGE_IDS[number]

export const PAGE_PATHS: Record<PageId, string> = {
    dashboard: '/',
    inventory: '/inventory',
    sales: '/sales',
    suppliers: '/suppliers',
    clients: '/clients',
    reports: '/reports',
    users: '/users',
    settings: '/settings'
}

export type UserRole = 'admin' | 'user'

export interface AuthUser {
    id: number
    username: string
    role: UserRole
    permissions: PageId[]
}

// Administrators can open every page; other users only the pages granted to them
export function canAccessPage(user: Pick<AuthUser, 'role' | 'permissions'> | null | undefined, page: PageId): boolean {
    if (!user) return false
    return user.role === 'admin' || user.permissions.includes(page)
}

// Pages not listed (e.g. /about) are open to every signed-in user
export function canAccessPath(user: Pick<AuthUser, 'role' | 'permissions'> | null | undefined, path: string): boolean {
    const page = PAGE_IDS.find(id => PAGE_PATHS[id] === path)
    return page ? canAccessPage(user, page) : !!user
}

export function sanitizePermissions(value: unknown): PageId[] {
    if (!Array.isArray(value)) return []
    return PAGE_IDS.filter(id => value.includes(id))
}
