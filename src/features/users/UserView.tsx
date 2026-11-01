import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShieldCheck, User as UserIcon, Info, KeyRound, Check, X } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { PAGE_IDS, canAccessPage } from '@/lib/permissions'
import { useAuthStore } from '@/stores/authStore'
import { userService, type ManagedUser } from '@/services/userService'
import { ViewHeader, ViewAvatar, ViewBadge, ViewSection, ViewFields, ViewField, ViewAudit, ViewLoading, ViewNotFound } from '@/components/view/ViewPage'
import { useRecord, parseId } from '@/components/view/useRecord'
import { UserForm } from './UserForm'

export function UserView() {
    const { t } = useTranslation()
    const userId = parseId(useParams().id)
    const { user: currentUser, setUser } = useAuthStore()
    const [editing, setEditing] = useState(false)

    // Users are only listed as a whole (admin-only IPC); there are few of them
    const load = useCallback(async () => userId ? (await userService.getAll()).find(u => u.id === userId) : null, [userId])
    const { data: user, loading, reload } = useRecord<ManagedUser>(load)

    const backLabel = t('view.backTo', { page: t('nav.users') })
    if (loading) return <ViewLoading />
    if (!user) return <ViewNotFound backTo="/users" backLabel={backLabel} />

    const isAdmin = user.role === 'admin'
    const isSelf = user.id === currentUser?.id

    const handleSaved = (saved: ManagedUser) => {
        // Keep the header/session in sync when editing yourself
        if (saved.id === currentUser?.id) {
            setUser({ id: saved.id, username: saved.username, role: saved.role, permissions: saved.permissions })
        }
        reload()
    }

    return (
        <div className="space-y-6 pb-20 p-2">
            <ViewHeader
                backTo="/users"
                backLabel={backLabel}
                avatar={<ViewAvatar gradient="from-indigo-500 to-purple-600">{user.username.charAt(0).toUpperCase()}</ViewAvatar>}
                title={user.username}
                badges={<>
                    <ViewBadge tone={isAdmin ? 'primary' : 'gray'} icon={isAdmin ? ShieldCheck : UserIcon}>
                        {isAdmin ? t('users.role.admin') : t('users.role.user')}
                    </ViewBadge>
                    {isSelf && <ViewBadge tone="green">{t('users.you')}</ViewBadge>}
                </>}
                onEdit={() => setEditing(true)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ViewSection title={t('view.details')} icon={Info} className="lg:col-span-2">
                    <ViewFields>
                        <ViewField label={t('userForm.username')} value={user.username} />
                        <ViewField label={t('userForm.role')} value={isAdmin ? t('users.role.admin') : t('users.role.user')} />
                        <ViewField
                            label={t('view.user.access')}
                            value={isAdmin ? t('users.allPages') : t('view.user.pagesCount', { count: user.permissions.length, total: PAGE_IDS.length })}
                        />
                    </ViewFields>
                </ViewSection>

                <ViewAudit record={user} />
            </div>

            <ViewSection title={t('userForm.pages')} icon={KeyRound}>
                {isAdmin && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('userForm.pagesAdminHint')}</p>}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {PAGE_IDS.map(page => {
                        const allowed = canAccessPage(user, page)
                        return (
                            <div
                                key={page}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium",
                                    allowed
                                        ? "border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                        : "border-gray-200 dark:border-gray-700 text-gray-400"
                                )}
                            >
                                {allowed ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
                                {t(`nav.${page}`)}
                            </div>
                        )
                    })}
                </div>
            </ViewSection>

            <UserForm isOpen={editing} user={user} onClose={() => setEditing(false)} onSaved={handleSaved} />
        </div>
    )
}
