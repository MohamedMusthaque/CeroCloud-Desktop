import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
    sidebarCollapsed: boolean
    toggleSidebar: () => void
    setSidebarCollapsed: (collapsed: boolean) => void
    commandPaletteOpen: boolean
    setCommandPaletteOpen: (open: boolean) => void
    inventoryViewMode: 'list' | 'grid'
    setInventoryViewMode: (mode: 'list' | 'grid') => void
}

export const useUIStore = create<UIStore>()(
    persist(
        (set) => ({
            sidebarCollapsed: false,
            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
            setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
            commandPaletteOpen: false,
            setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
            inventoryViewMode: 'list', // Default to list
            setInventoryViewMode: (mode) => set({ inventoryViewMode: mode }),
        }),
        {
            name: 'nexoracloud-ui-store',
        }
    )
)
