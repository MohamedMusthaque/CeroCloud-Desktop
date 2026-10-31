import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import {
    Search,
    Package,
    ShoppingCart,
    FileText,
    Settings,
    Plus,
    BarChart3,
    Home,
    X
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/i18n'
import { useAuthStore } from '@/stores/authStore'
import { canAccessPath } from '@/lib/permissions'

export function CommandPalette() {
    const navigate = useNavigate()
    const user = useAuthStore((state) => state.user)
    const allowed = (path: string) => canAccessPath(user, path)
    const { t } = useTranslation()
    const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore()

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setCommandPaletteOpen(!commandPaletteOpen)
            }
            if (e.key === 'Escape') {
                setCommandPaletteOpen(false)
            }
        }

        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [commandPaletteOpen, setCommandPaletteOpen])

    const runCommand = (callback: () => void) => {
        setCommandPaletteOpen(false)
        callback()
    }

    if (!commandPaletteOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setCommandPaletteOpen(false)}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                {/* Command Dialog */}
                <div className="fixed top-0 left-0 right-0 flex justify-center pt-[15vh] px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="w-full max-w-2xl"
                    >
                        <Command className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl overflow-hidden">
                            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4">
                                <Search className="w-5 h-5 text-gray-400 mr-2" />
                                <Command.Input
                                    autoFocus
                                    placeholder={t('cmd.placeholder')}
                                    className="flex-1 py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-sm"
                                />
                                <button
                                    onClick={() => setCommandPaletteOpen(false)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>

                            <Command.List className="max-h-[400px] overflow-y-auto p-2">
                                <Command.Empty className="py-6 text-center text-sm text-gray-500">
                                    {t('cmd.noResults')}
                                </Command.Empty>

                                {/* Navigation */}
                                <Command.Group heading={t('cmd.navigation')} className="px-2 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    {allowed('/') && (
                                        <Command.Item
                                            onSelect={() => runCommand(() => navigate('/'))}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white mb-1 data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary transition-colors"
                                        >
                                            <Home className="w-4 h-4" />
                                            <span className="text-sm font-medium">{t('cmd.goDashboard')}</span>
                                            <kbd className="ml-auto px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">D</kbd>
                                        </Command.Item>
                                    )}

                                    {allowed('/inventory') && (
                                        <Command.Item
                                            onSelect={() => runCommand(() => navigate('/inventory'))}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white mb-1 data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary transition-colors"
                                        >
                                            <Package className="w-4 h-4" />
                                            <span className="text-sm font-medium">{t('cmd.goInventory')}</span>
                                            <kbd className="ml-auto px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">I</kbd>
                                        </Command.Item>
                                    )}

                                    {allowed('/sales') && (
                                        <Command.Item
                                            onSelect={() => runCommand(() => navigate('/sales'))}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white mb-1 data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary transition-colors"
                                        >
                                            <ShoppingCart className="w-4 h-4" />
                                            <span className="text-sm font-medium">{t('cmd.goSales')}</span>
                                            <kbd className="ml-auto px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">V</kbd>
                                        </Command.Item>
                                    )}

                                    {allowed('/reports') && (
                                        <Command.Item
                                            onSelect={() => runCommand(() => navigate('/reports'))}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white mb-1 data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary transition-colors"
                                        >
                                            <FileText className="w-4 h-4" />
                                            <span className="text-sm font-medium">{t('cmd.goReports')}</span>
                                            <kbd className="ml-auto px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">R</kbd>
                                        </Command.Item>
                                    )}

                                    {allowed('/settings') && (
                                        <Command.Item
                                            onSelect={() => runCommand(() => navigate('/settings'))}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white mb-1 data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary transition-colors"
                                        >
                                            <Settings className="w-4 h-4" />
                                            <span className="text-sm font-medium">{t('cmd.goSettings')}</span>
                                            <kbd className="ml-auto px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">S</kbd>
                                        </Command.Item>
                                    )}
                                </Command.Group>

                                {/* Quick actions */}
                                <Command.Group heading={t('cmd.actions')} className="px-2 pt-3 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-2">
                                    {allowed('/inventory') && (
                                        <Command.Item
                                            onSelect={() => runCommand(() => navigate('/inventory'))}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white mb-1 data-[selected=true]:bg-green-500/10 data-[selected=true]:text-green-600 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span className="text-sm font-medium">{t('cmd.createProduct')}</span>
                                            <kbd className="ml-auto px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+N</kbd>
                                        </Command.Item>
                                    )}

                                    {allowed('/sales') && (
                                        <Command.Item
                                            onSelect={() => runCommand(() => navigate('/sales'))}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white mb-1 data-[selected=true]:bg-blue-500/10 data-[selected=true]:text-blue-600 transition-colors"
                                        >
                                            <ShoppingCart className="w-4 h-4" />
                                            <span className="text-sm font-medium">{t('cmd.newSale')}</span>
                                            <kbd className="ml-auto px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+V</kbd>
                                        </Command.Item>
                                    )}

                                    {allowed('/reports') && (
                                        <Command.Item
                                            onSelect={() => runCommand(() => navigate('/reports'))}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white mb-1 data-[selected=true]:bg-purple-500/10 data-[selected=true]:text-purple-600 transition-colors"
                                        >
                                            <BarChart3 className="w-4 h-4" />
                                            <span className="text-sm font-medium">{t('cmd.viewReports')}</span>
                                            <kbd className="ml-auto px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+R</kbd>
                                        </Command.Item>
                                    )}
                                </Command.Group>
                            </Command.List>

                            {/* Footer */}
                            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-900/50">
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1">
                                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">↑↓</kbd>
                                            {t('cmd.navigate')}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">↵</kbd>
                                            {t('cmd.select')}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">ESC</kbd>
                                            {t('cmd.close')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Command>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    )
}
