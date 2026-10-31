import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { CartItem, Product } from '@/types/database'

export interface CartTab {
    id: string
    name: string
    items: CartItem[]
    customerName: string
    clientId?: number | null // Set only when a registered client is picked (required for credit)
    discount: number
    paymentMethod: PaymentMethod
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit' | 'cheque' | 'other'

// Display order everywhere methods are listed; each shows only when enabled in Settings > Payment Methods
export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer', 'other', 'cheque', 'credit']

interface CartState {
    tabs: CartTab[]
    activeTabId: string

    // Actions
    addTab: () => void
    removeTab: (id: string) => void
    setActiveTab: (id: string) => void
    updateTabName: (id: string, name: string) => void

    // Cart Actions (operate on active tab)
    addItem: (product: Product, allowNegativeStock?: boolean) => void
    updateQuantity: (productId: number, delta: number, allowNegativeStock?: boolean) => void
    removeItem: (productId: number) => void
    clearCart: () => void

    // Transaction Data
    setCustomerName: (name: string) => void
    setCustomer: (name: string, clientId: number | null) => void
    setDiscount: (discount: number) => void
    setPaymentMethod: (method: PaymentMethod) => void
}

const generateId = () => Math.random().toString(36).substring(2, 9)

const createEmptyTab = (index: number): CartTab => ({
    id: generateId(),
    name: `Ticket ${index + 1}`,
    items: [],
    customerName: '',
    clientId: null,
    discount: 0,
    paymentMethod: 'cash'
})

export const useCartStore = create<CartState>()(
    persist(
        (set, _get) => ({
            tabs: [createEmptyTab(0)],
            activeTabId: '', // Will be set in hydration or init

            addTab: () => set(state => {
                const newTab = createEmptyTab(state.tabs.length)
                return {
                    tabs: [...state.tabs, newTab],
                    activeTabId: newTab.id
                }
            }),

            removeTab: (id) => set(state => {
                if (state.tabs.length <= 1) return state // Don't remove last tab

                const newTabs = state.tabs.filter(t => t.id !== id)
                const newActiveId = state.activeTabId === id ? newTabs[0].id : state.activeTabId

                return { tabs: newTabs, activeTabId: newActiveId }
            }),

            setActiveTab: (id) => set({ activeTabId: id }),
            updateTabName: (id, name) => set(state => ({
                tabs: state.tabs.map(t => t.id === id ? { ...t, name } : t)
            })),

            addItem: (product, allowNegativeStock = false) => set(state => {
                const tabs = state.tabs.map(tab => {
                    if (tab.id !== state.activeTabId) return tab

                    const existing = tab.items.find(i => i.product.id === product.id)
                    if (existing) {
                        if (!allowNegativeStock && existing.quantity >= product.stock) {
                            return tab // Stock limit reached
                        }
                        return {
                            ...tab,
                            items: tab.items.map(i => i.product.id === product.id
                                ? { ...i, quantity: i.quantity + 1 }
                                : i
                            )
                        }
                    } else {
                        if (!allowNegativeStock && product.stock <= 0) {
                            return tab // No stock
                        }
                        return {
                            ...tab,
                            items: [...tab.items, { product, quantity: 1 }]
                        }
                    }
                })
                return { tabs }
            }),

            updateQuantity: (productId, delta, allowNegativeStock = false) => set(state => {
                const tabs = state.tabs.map(tab => {
                    if (tab.id !== state.activeTabId) return tab

                    const item = tab.items.find(i => i.product.id === productId)
                    if (!item) return tab

                    const newQuantity = item.quantity + delta

                    if (newQuantity <= 0) {
                        return {
                            ...tab,
                            items: tab.items.filter(i => i.product.id !== productId)
                        }
                    }

                    if (!allowNegativeStock && newQuantity > item.product.stock) {
                        return tab // Stock limit reached
                    }

                    return {
                        ...tab,
                        items: tab.items.map(i => i.product.id === productId
                            ? { ...i, quantity: newQuantity }
                            : i
                        )
                    }
                })
                return { tabs }
            }),

            removeItem: (productId) => set(state => ({
                tabs: state.tabs.map(tab =>
                    tab.id === state.activeTabId
                        ? { ...tab, items: tab.items.filter(i => i.product.id !== productId) }
                        : tab
                )
            })),

            clearCart: () => set(state => ({
                tabs: state.tabs.map(tab =>
                    tab.id === state.activeTabId
                        ? { ...createEmptyTab(0), id: tab.id, name: tab.name } // Keep id and name
                        : tab
                )
            })),

            // Typing a name unlinks the registered client, so credit is no longer allowed
            setCustomerName: (name) => set(state => ({
                tabs: state.tabs.map(tab =>
                    tab.id === state.activeTabId
                        ? { ...tab, customerName: name, clientId: null, paymentMethod: tab.paymentMethod === 'credit' ? 'cash' : tab.paymentMethod }
                        : tab
                )
            })),

            setCustomer: (name, clientId) => set(state => ({
                tabs: state.tabs.map(tab =>
                    tab.id === state.activeTabId ? { ...tab, customerName: name, clientId } : tab
                )
            })),

            setDiscount: (discount) => set(state => ({
                tabs: state.tabs.map(tab =>
                    tab.id === state.activeTabId ? { ...tab, discount } : tab
                )
            })),

            setPaymentMethod: (method) => set(state => ({
                tabs: state.tabs.map(tab =>
                    tab.id === state.activeTabId ? { ...tab, paymentMethod: method } : tab
                )
            })),
        }),
        {
            name: 'pos-storage',
            storage: createJSONStorage(() => localStorage),
            onRehydrateStorage: () => (state) => {
                if (state && !state.activeTabId && state.tabs.length > 0) {
                    state.activeTabId = state.tabs[0].id
                }
            }
        }
    )
)
