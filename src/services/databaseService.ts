// Database maintenance: reset and data folder location (administrators only, enforced by the main process)

export interface DataLocation {
    directory: string
    dbPath: string
    defaultDirectory: string
    isDefault: boolean
    defaultHasDatabase: boolean
}

export type MoveMode = 'copy' | 'useExisting'

// Errors carry the main-process code (e.g. 'NOT_WRITABLE'); the UI translates it via `dataLocation.error.<code>`
export class DatabaseServiceError extends Error {
    constructor(public code: string) {
        super(code)
    }
}

async function unwrap<T>(request: Promise<{ success: boolean; data?: T; error?: string }>): Promise<T> {
    const result = await request
    if (!result.success) throw new DatabaseServiceError(result.error || 'UNKNOWN')
    return result.data as T
}

// Saved POS tickets and notifications point at records of the current database
function clearLocalCaches() {
    localStorage.removeItem('pos-storage')
    localStorage.removeItem('notification-storage')
}

export const databaseService = {
    getLocation: (): Promise<DataLocation> => window.electronAPI.database.getLocation(),
    showLocation: () => window.electronAPI.database.showLocation(),
    pickLocation: () => unwrap(window.electronAPI.database.pickLocation()),

    // The app restarts on the new folder shortly after this resolves
    moveLocation: async (directory: string, mode: MoveMode): Promise<void> => {
        await unwrap(window.electronAPI.database.moveLocation(directory, mode))
        clearLocalCaches()
    },

    // Deletes all business data; user accounts are kept
    reset: async (): Promise<void> => {
        await unwrap(window.electronAPI.database.clearAll())
        clearLocalCaches()
    }
}
