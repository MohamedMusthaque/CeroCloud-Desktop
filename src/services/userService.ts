import type { AuthUser, PageId, UserRole } from '@/lib/permissions'
import type { AuditFields } from '@/types/database'

export interface ManagedUser extends AuthUser, AuditFields {}

export interface UserInput {
    username?: string
    password?: string
    role?: UserRole
    permissions?: PageId[]
}

// Errors carry the main-process code (e.g. 'USERNAME_TAKEN'); the UI translates it via `userError.<code>`
export class UserServiceError extends Error {
    constructor(public code: string) {
        super(code)
    }
}

async function unwrap<T>(request: Promise<{ success: boolean; data?: T; error?: string }>): Promise<T> {
    const result = await request
    if (!result.success) throw new UserServiceError(result.error || 'UNKNOWN')
    return result.data as T
}

export const userService = {
    getAll: (): Promise<ManagedUser[]> => unwrap(window.electronAPI.users.getAll()),
    create: (input: UserInput): Promise<ManagedUser> => unwrap(window.electronAPI.users.create(input)),
    update: (id: number, input: UserInput): Promise<ManagedUser> => unwrap(window.electronAPI.users.update(id, input)),
    delete: (id: number): Promise<void> => unwrap(window.electronAPI.users.delete(id))
}
