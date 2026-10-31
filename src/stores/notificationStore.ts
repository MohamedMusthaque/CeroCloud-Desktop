import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AppNotification {
    id: string
    title: string
    message: string
    type: 'info' | 'warning' | 'error' | 'success'
    read: boolean
    timestamp: number
}

interface NotificationState {
    notifications: AppNotification[]
    addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => void
    markAsRead: (id: string) => void
    clearAll: () => void
    unreadCount: () => number
    requestPermission: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],

            addNotification: (data) => {
                const newNotification: AppNotification = {
                    ...data,
                    id: crypto.randomUUID(),
                    read: false,
                    timestamp: Date.now()
                }

                set((state) => ({
                    notifications: [newNotification, ...state.notifications]
                }))

                // System Notification Logic
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(data.title, {
                        body: data.message,
                        icon: '/vite.svg', // Default or custom icon
                        silent: false
                    })
                }
            },

            markAsRead: (id) => set((state) => ({
                notifications: state.notifications.map(n =>
                    n.id === id ? { ...n, read: true } : n
                )
            })),

            clearAll: () => set({ notifications: [] }),

            unreadCount: () => get().notifications.filter(n => !n.read).length,

            requestPermission: async () => {
                if (!('Notification' in window)) {
                    console.log('Este navegador no soporta notificaciones de escritorio')
                    return
                }

                if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                    await Notification.requestPermission()
                }
            }
        }),
        {
            name: 'notification-storage',
            storage: createJSONStorage(() => localStorage)
        }
    )
)
