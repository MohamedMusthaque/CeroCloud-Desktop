import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser } from '@/lib/permissions'
import { UserServiceError } from '@/services/userService'

export type { AuthUser }

interface AuthState {
    user: AuthUser | null
    // null until the main process answers; true on a fresh install with no users yet
    needsSetup: boolean | null
    login: (username: string, password: string) => Promise<boolean>
    logout: () => void
    setUser: (user: AuthUser) => void
    syncSession: () => Promise<void>
    completeSetup: (username: string, password: string) => Promise<void>
}

// Session lives in sessionStorage: it survives reloads but ends when the app is closed
export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            needsSetup: null,

            login: async (username, password) => {
                const result = await window.electronAPI.auth.login(username, password)
                if (result.success && result.user) {
                    set({ user: result.user })
                    return true
                }
                return false
            },

            logout: () => {
                set({ user: null })
                window.electronAPI.auth.logout().catch(console.error)
            },

            setUser: (user) => set({ user }),

            // Main process is the source of truth: picks up permission changes, ends stale sessions
            syncSession: async () => {
                try {
                    const [user, status] = await Promise.all([
                        window.electronAPI.auth.getSession(),
                        window.electronAPI.setup.getStatus()
                    ])
                    set({ user, needsSetup: status.needsSetup })
                } catch (error) {
                    // Fall back to the login screen rather than a blank window
                    set({ needsSetup: false })
                    throw error
                }
            },

            // Creates the first administrator and signs them in; throws UserServiceError with the main-process code
            completeSetup: async (username, password) => {
                const result = await window.electronAPI.setup.createAdmin(username, password)
                if (!result.success || !result.data) throw new UserServiceError(result.error || 'UNKNOWN')
                set({ user: result.data, needsSetup: false })
            }
        }),
        {
            name: 'nexoracloud-session',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({ user: state.user })
        }
    )
)
