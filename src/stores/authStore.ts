import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser } from '@/lib/permissions'

export type { AuthUser }

interface AuthState {
    user: AuthUser | null
    login: (username: string, password: string) => Promise<boolean>
    logout: () => void
    setUser: (user: AuthUser) => void
    syncSession: () => Promise<void>
}

// Session lives in sessionStorage: it survives reloads but ends when the app is closed
export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,

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
                const user = await window.electronAPI.auth.getSession()
                set({ user })
            }
        }),
        {
            name: 'nexoracloud-session',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({ user: state.user })
        }
    )
)
