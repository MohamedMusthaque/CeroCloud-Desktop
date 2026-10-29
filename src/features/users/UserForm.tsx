import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Loader2, ShieldCheck, User as UserIcon, Eye, EyeOff, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { PAGE_IDS, type PageId, type UserRole } from '@/lib/permissions'
import { userService, type ManagedUser } from '@/services/userService'
import { userErrorMessage } from './userErrors'

interface UserFormProps {
    isOpen: boolean
    user: ManagedUser | null
    onClose: () => void
    onSaved: (user: ManagedUser) => void
}

export function UserForm({ isOpen, user, onClose, onSaved }: UserFormProps) {
    const { t } = useTranslation()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [role, setRole] = useState<UserRole>('user')
    const [permissions, setPermissions] = useState<PageId[]>([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setUsername(user?.username ?? '')
        setPassword('')
        setConfirmPassword('')
        setShowPassword(false)
        setRole(user?.role ?? 'user')
        setPermissions(user?.permissions ?? [])
    }, [isOpen, user])

    const isAdmin = role === 'admin'

    const togglePage = (page: PageId) => {
        setPermissions(prev => prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            toast.error(t('userForm.passwordMismatch'))
            return
        }

        setSaving(true)
        try {
            const input = {
                username,
                role,
                permissions,
                ...(password ? { password } : {})
            }
            const saved = user?.id
                ? await userService.update(user.id, input)
                : await userService.create(input)
            toast.success(user ? t('userForm.updated') : t('userForm.created'))
            onSaved(saved)
            onClose()
        } catch (error) {
            toast.error(userErrorMessage(error, t))
        } finally {
            setSaving(false)
        }
    }

    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
    const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-bold text-white">
                                {user ? t('userForm.editTitle') : t('userForm.newTitle')}
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Credentials */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label htmlFor="user-username" className={labelClass}>{t('userForm.username')}</label>
                                    <input
                                        id="user-username"
                                        type="text"
                                        autoFocus
                                        autoComplete="off"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder={t('userForm.usernamePlaceholder')}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="user-password" className={labelClass}>{t('userForm.password')}</label>
                                    <div className="relative">
                                        <input
                                            id="user-password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={user ? t('userForm.passwordKeep') : t('userForm.passwordPlaceholder')}
                                            className={cn(inputClass, 'pr-10')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-500"
                                            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="user-confirm" className={labelClass}>{t('userForm.confirmPassword')}</label>
                                    <input
                                        id="user-confirm"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            {/* Role */}
                            <div>
                                <span className={labelClass}>{t('userForm.role')}</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {([
                                        { id: 'admin', icon: ShieldCheck, label: t('users.role.admin'), desc: t('userForm.roleAdminDesc') },
                                        { id: 'user', icon: UserIcon, label: t('users.role.user'), desc: t('userForm.roleUserDesc') }
                                    ] as const).map(option => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => setRole(option.id)}
                                            className={cn(
                                                "flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                                                role === option.id
                                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                            )}
                                        >
                                            <option.icon className={cn("w-5 h-5 mt-0.5 shrink-0", role === option.id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400")} />
                                            <div>
                                                <p className="font-bold text-sm text-gray-900 dark:text-white">{option.label}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{option.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Page access */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={cn(labelClass, 'mb-0')}>{t('userForm.pages')}</span>
                                    {!isAdmin && (
                                        <div className="flex gap-3 text-xs font-medium">
                                            <button type="button" onClick={() => setPermissions([...PAGE_IDS])} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                                {t('userForm.selectAll')}
                                            </button>
                                            <button type="button" onClick={() => setPermissions([])} className="text-gray-500 hover:underline">
                                                {t('userForm.clear')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {isAdmin && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('userForm.pagesAdminHint')}</p>
                                )}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {PAGE_IDS.map(page => {
                                        const checked = isAdmin || permissions.includes(page)
                                        return (
                                            <button
                                                key={page}
                                                type="button"
                                                role="checkbox"
                                                aria-checked={checked}
                                                disabled={isAdmin}
                                                onClick={() => togglePage(page)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed",
                                                    checked
                                                        ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                                                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                                                    isAdmin && "opacity-70"
                                                )}
                                            >
                                                <span className={cn(
                                                    "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                                                    checked ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 dark:border-gray-600"
                                                )}>
                                                    {checked && <Check className="w-3 h-3" />}
                                                </span>
                                                {t(`nav.${page}`)}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2 transition-all"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? t('userForm.saving') : t('userForm.save')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
