import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AuthUser {
    id: number
    username: string
    role: string
}

interface AuthState {
    user: AuthUser | null
    login: (username: string, password: string) => Promise<boolean>
    logout: () => void
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

            logout: () => set({ user: null })
        }),
        {
            name: 'cerocloud-session',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({ user: state.user })
        }
    )
)
