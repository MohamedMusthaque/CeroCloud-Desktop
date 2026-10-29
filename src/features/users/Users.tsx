import { useCallback, useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, ShieldCheck, User as UserIcon, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/stores/authStore'
import { userService, type ManagedUser } from '@/services/userService'
import { UserForm } from './UserForm'
import { userErrorMessage } from './userErrors'

export function Users() {
    const { t, locale } = useTranslation()
    const { user: currentUser, setUser } = useAuthStore()

    const [users, setUsers] = useState<ManagedUser[]>([])
    const [loading, setLoading] = useState(true)
    const [formOpen, setFormOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
    const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null)

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true)
            setUsers(await userService.getAll())
        } catch (error) {
            console.error('Error loading users:', error)
            toast.error(userErrorMessage(error, t))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        loadUsers()
    }, [loadUsers])

    const handleSaved = (saved: ManagedUser) => {
        // Keep the header/session in sync when editing yourself
        if (saved.id === currentUser?.id) {
            setUser({ id: saved.id, username: saved.username, role: saved.role, permissions: saved.permissions })
        }
        loadUsers()
    }

    const confirmDelete = async () => {
        if (!userToDelete) return
        try {
            await userService.delete(userToDelete.id)
            toast.success(t('users.deleted'))
            loadUsers()
        } catch (error) {
            toast.error(userErrorMessage(error, t))
        } finally {
            setUserToDelete(null)
        }
    }

    return (
        <div className="space-y-6 pb-20 p-2">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t('users.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('users.subtitle')}</p>
                </div>
                <button
                    onClick={() => { setEditingUser(null); setFormOpen(true) }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-semibold shadow-lg shadow-indigo-500/25 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    {t('users.new')}
                </button>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700">
                    <div className="col-span-3">{t('users.col.user')}</div>
                    <div className="col-span-2">{t('users.col.role')}</div>
                    <div className="col-span-4">{t('users.col.access')}</div>
                    <div className="col-span-2">{t('users.col.created')}</div>
                    <div className="col-span-1 text-right">{t('users.col.actions')}</div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-gray-500">{t('users.loading')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {users.map(user => {
                            const isSelf = user.id === currentUser?.id
                            const isAdmin = user.role === 'admin'
                            return (
                                <div key={user.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-6 py-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                    {/* User */}
                                    <div className="md:col-span-3 flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 dark:text-white truncate">{user.username}</p>
                                            {isSelf && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{t('users.you')}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Role */}
                                    <div className="md:col-span-2">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                                            isAdmin
                                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                                                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                        )}>
                                            {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                                            {isAdmin ? t('users.role.admin') : t('users.role.user')}
                                        </span>
                                    </div>

                                    {/* Page access */}
                                    <div className="md:col-span-4 flex flex-wrap gap-1.5">
                                        {isAdmin ? (
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('users.allPages')}</span>
                                        ) : user.permissions.length === 0 ? (
                                            <span className="text-xs font-medium text-red-500">{t('users.noPages')}</span>
                                        ) : (
                                            user.permissions.map(page => (
                                                <span key={page} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                    {t(`nav.${page}`)}
                                                </span>
                                            ))
                                        )}
                                    </div>

                                    {/* Created */}
                                    <div className="md:col-span-2 text-sm text-gray-500 dark:text-gray-400">
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString(locale) : '-'}
                                    </div>

                                    {/* Actions */}
                                    <div className="md:col-span-1 flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => { setEditingUser(user); setFormOpen(true) }}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                            title={t('common.edit')}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        {!isSelf && (
                                            <button
                                                onClick={() => setUserToDelete(user)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                title={t('common.delete')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {users.length === 0 && (
                            <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
                                <UserCog className="w-10 h-10" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <UserForm
                isOpen={formOpen}
                user={editingUser}
                onClose={() => { setFormOpen(false); setEditingUser(null) }}
                onSaved={handleSaved}
            />

            <ConfirmDialog
                isOpen={!!userToDelete}
                title={t('users.deleteTitle')}
                description={t('users.deleteDesc', { name: userToDelete?.username ?? '' })}
                confirmText={t('users.deleteConfirm')}
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setUserToDelete(null)}
            />
        </div>
    )
}
