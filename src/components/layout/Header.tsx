import { useState, useEffect } from 'react'
import { Moon, Sun, Bell, User, Search, LogOut } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { cn } from '@/lib/utils'
import { companyService } from '@/services/companyService'
import { useTranslation } from '@/i18n'
import { useAuthStore } from '@/stores/authStore'

export function Header() {
    const { t } = useTranslation()
    const [darkMode, setDarkMode] = useState(false)
    const { setCommandPaletteOpen } = useUIStore()
    const { user, logout } = useAuthStore()
    const [showUserMenu, setShowUserMenu] = useState(false)

    useEffect(() => {
        // Initialize state based on current settings
        const settings = companyService.getSettings()
        const isDark = settings.theme.mode === 'dark' ||
            (settings.theme.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        setDarkMode(isDark)
    }, [])

    const toggleDarkMode = () => {
        const newMode = !darkMode
        setDarkMode(newMode)

        // Update global settings
        const currentSettings = companyService.getSettings()
        currentSettings.theme.mode = newMode ? 'dark' : 'light'
        companyService.saveSettings(currentSettings)
        companyService.applyTheme(newMode ? 'dark' : 'light')
    }

    const [showNotifications, setShowNotifications] = useState(false)
    const {
        notifications,
        unreadCount,
        markAsRead,
        clearAll,
        requestPermission
    } = useNotificationStore()
    const unread = unreadCount()

    useEffect(() => {
        requestPermission()

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setCommandPaletteOpen(true)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [setCommandPaletteOpen, requestPermission])

    return (
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
            <div className="h-full px-6 flex items-center justify-between">
                {/* Command Palette Trigger */}
                <button
                    onClick={() => setCommandPaletteOpen(true)}
                    className="flex-1 max-w-xl group"
                >
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 group-hover:shadow-sm">
                        <Search className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300 transition-colors" />
                        <span className="text-sm text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-200 font-medium">
                            {t('header.searchPlaceholder')}
                        </span>
                        <kbd className="ml-auto hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-400 dark:text-gray-400 font-mono font-bold shadow-sm group-hover:text-gray-600 dark:group-hover:text-gray-200">
                            <span className="text-xs">Ctrl+K</span>
                        </kbd>
                    </div>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-3 ml-6">
                    {/* Dark Mode Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className={cn(
                            "p-2.5 rounded-full transition-all duration-300 relative group overflow-hidden border",
                            "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                        title={darkMode ? t('header.switchToLight') : t('header.switchToDark')}
                    >
                        <div className="relative w-5 h-5">
                            <Sun className={cn(
                                "absolute inset-0 w-5 h-5 transition-all duration-500 rotate-0 scale-100",
                                darkMode && "rotate-90 scale-0 opacity-0"
                            )} />
                            <Moon className={cn(
                                "absolute inset-0 w-5 h-5 transition-all duration-500 rotate-90 scale-0 opacity-0",
                                darkMode && "rotate-0 scale-100 opacity-100"
                            )} />
                        </div>
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            className={cn(
                                "p-2 rounded-lg transition-colors relative",
                                showNotifications ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                            )}
                            title={t('header.notifications')}
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell className="w-5 h-5 transition-colors" />
                            {unread > 0 && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900 shadow-sm" />
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowNotifications(false)}
                                />
                                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t('header.notifications')}</h3>
                                        {notifications.length > 0 && (
                                            <button
                                                onClick={clearAll}
                                                className="text-[10px] font-medium text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                            >
                                                {t('header.clearAll')}
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400">
                                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                <p className="text-xs">{t('header.noNotifications')}</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {notifications.map(notif => (
                                                    <div
                                                        key={notif.id}
                                                        onClick={() => markAsRead(notif.id)}
                                                        className={cn(
                                                            "p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer flex gap-3 items-start",
                                                            !notif.read && "bg-blue-50/30 dark:bg-blue-900/10"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-2 h-2 mt-1.5 rounded-full shrink-0",
                                                            notif.type === 'warning' ? "bg-amber-500" :
                                                                notif.type === 'error' ? "bg-red-500" :
                                                                    notif.type === 'success' ? "bg-green-500" : "bg-blue-500"
                                                        )} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className={cn("text-xs font-bold mb-0.5 truncate", notif.read ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white")}>
                                                                {notif.title}
                                                            </p>
                                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug break-words">
                                                                {notif.message}
                                                            </p>
                                                            <p className="text-[10px] text-gray-300 mt-1">
                                                                {new Date(notif.timestamp).toLocaleTimeString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* User Menu */}
                    <div className="relative pl-3 border-l border-gray-200 dark:border-gray-700">
                        <button
                            className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors group"
                            onClick={() => setShowUserMenu(!showUserMenu)}
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{user?.username ?? t('header.user')}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    {user?.role === 'admin' ? t('auth.role.admin') : (user?.role ?? t('header.admin'))}
                                </p>
                            </div>
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700 group-hover:border-gray-300">
                                <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </div>
                        </button>

                        {showUserMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                                    <button
                                        onClick={() => { setShowUserMenu(false); logout() }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        {t('auth.logout')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
