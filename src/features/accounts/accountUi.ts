import { useCallback, useEffect, useState } from 'react'
import { Truck, Users, UserPlus, Landmark, PiggyBank, Wallet } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { loadAccounts, type Account, type AccountType } from './accountLedger'

export const TYPE_STYLES: Record<AccountType, { icon: React.ElementType; badge: string; gradient: string }> = {
    supplier: { icon: Truck, badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', gradient: 'from-indigo-500 to-purple-600' },
    client: { icon: Users, badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300', gradient: 'from-cyan-400 to-blue-600' },
    walkin: { icon: UserPlus, badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300', gradient: 'from-slate-400 to-slate-600' },
    source: { icon: Landmark, badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', gradient: 'from-amber-400 to-orange-600' },
    savings: { icon: PiggyBank, badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', gradient: 'from-emerald-400 to-teal-600' },
    expense: { icon: Wallet, badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', gradient: 'from-rose-400 to-pink-600' }
}

// Loads every account the signed-in user may see; `reload()` after recording something
export function useAccounts() {
    const user = useAuthStore((state) => state.user)
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [failed, setFailed] = useState(false)

    const reload = useCallback(async () => {
        try {
            setAccounts(await loadAccounts(user))
            setFailed(false)
        } catch (error) {
            console.error('Error loading accounts:', error)
            setFailed(true)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        setLoading(true)
        reload()
    }, [reload])

    return { accounts, loading, failed, reload }
}
