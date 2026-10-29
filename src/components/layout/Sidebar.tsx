import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    FileText,
    Settings,
    ChevronLeft,
    ChevronRight,
    Info,
    Truck,
    Users,
    UserCog,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { companyService } from '@/services/companyService'
import pkg from '../../../package.json'
import { useTranslation } from '@/i18n'
import { useAuthStore } from '@/stores/authStore'
import { canAccessPath } from '@/lib/permissions'

export function Sidebar() {
    const { t } = useTranslation()
    const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useUIStore()
    const user = useAuthStore((state) => state.user)
    const [companyInfo, setCompanyInfo] = useState({ name: 'CeroCloud', logo: '' })

    const loadCompanyInfo = () => {
        const settings = companyService.getSettings()
        // If user deleted the name, fallback to default. If name is "CeroCloud", it's default.
        setCompanyInfo({
            name: settings.name || 'CeroCloud',
            logo: settings.logo || ''
        })
    }

    useEffect(() => {
        loadCompanyInfo()

        const handleSettingsChange = () => {
            loadCompanyInfo()
        }

        // Auto-collapse on mount if screen is < 1024px to save space
        if (window.innerWidth < 1024 && !sidebarCollapsed) {
            setSidebarCollapsed(true)
        }

        window.addEventListener('company-settings-changed', handleSettingsChange)
        return () => window.removeEventListener('company-settings-changed', handleSettingsChange)
    }, [sidebarCollapsed, setSidebarCollapsed])


    const navigation = [
        { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard, shortcut: 'D' },
        { name: t('nav.inventory'), href: '/inventory', icon: Package, shortcut: 'I' },

        { name: t('nav.sales'), href: '/sales', icon: ShoppingCart, shortcut: 'V' },
        { name: t('nav.suppliers'), href: '/suppliers', icon: Truck, shortcut: 'P' },
        { name: t('nav.clients'), href: '/clients', icon: Users, shortcut: 'C' },
        { name: t('nav.reports'), href: '/reports', icon: FileText, shortcut: 'R' },
    ].filter(item => canAccessPath(user, item.href))

    const secondaryNavigation = [
        { name: t('nav.users'), href: '/users', icon: UserCog, shortcut: 'U' },
        { name: t('nav.settings'), href: '/settings', icon: Settings, shortcut: 'S' },
        { name: t('nav.about'), href: '/about', icon: Info, shortcut: 'A' },
    ].filter(item => canAccessPath(user, item.href))

    return (
        <motion.aside
            initial={false}
            animate={{ width: sidebarCollapsed ? 80 : 240 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative h-screen bg-gray-900 border-r border-gray-800 flex flex-col"
        >
            {/* Header with Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-900 z-20">
                {!sidebarCollapsed ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 overflow-hidden"
                    >
                        <img
                            src={companyInfo.logo || 'icon.png'}
                            alt="Icon"
                            className="w-9 h-9 object-contain rounded-lg bg-white/5"
                        />
                        <div className="min-w-0">
                            <h1 className="text-sm font-black text-white tracking-tight truncate leading-tight">
                                {companyInfo.name}
                            </h1>
                            {/* Mostrar subtítulo solo si es el nombre por defecto o si queremos siempre mostrar algo */}
                            {companyInfo.name === 'CeroCloud' && (
                                <p className="text-[10px] text-gray-400 -mt-0.5">{t('nav.tagline')}</p>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <div className="mx-auto shrink-0">
                        <img
                            src={companyInfo.logo || 'icon.png'}
                            alt="Logo"
                            className="w-9 h-9 object-contain rounded-lg bg-white/5"
                        />
                    </div>
                )}
            </div>

            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-20 z-10 p-1.5 bg-gray-900 border border-gray-700 rounded-full hover:bg-gray-800 transition-colors shadow-lg"
            >
                {sidebarCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                )}
            </button>

            {/* Main Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
                {navigation.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                            cn(
                                'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                                isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-medium'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
                                sidebarCollapsed && 'justify-center'
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={cn(
                                    'w-5 h-5 flex-shrink-0 transition-colors',
                                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                                )} />

                                {!sidebarCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-sm"
                                    >
                                        {item.name}
                                    </motion.span>
                                )}

                                {!sidebarCollapsed && (
                                    <kbd className="ml-auto px-1.5 py-0.5 text-[10px] font-mono bg-gray-800 border border-gray-700 rounded opacity-50 group-hover:opacity-100 transition-opacity">
                                        {item.shortcut}
                                    </kbd>
                                )}

                                {/* Tooltip for collapsed state */}
                                {sidebarCollapsed && (
                                    <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                                        <span className="text-xs font-medium text-white">{item.name}</span>
                                        <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-gray-900 border border-gray-600 rounded">
                                            {item.shortcut}
                                        </kbd>
                                    </div>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Secondary Navigation */}
            <div className="px-3 py-4 space-y-1 border-t border-gray-800">
                {secondaryNavigation.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                            cn(
                                'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                                isActive
                                    ? 'bg-gray-800 text-gray-200 font-medium'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50',
                                sidebarCollapsed && 'justify-center'
                            )
                        }
                    >
                        <>
                            <item.icon className="w-5 h-5 flex-shrink-0" />

                            {!sidebarCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-sm"
                                >
                                    {item.name}
                                </motion.span>
                            )}

                            {/* Tooltip for collapsed state */}
                            {sidebarCollapsed && (
                                <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                                    <span className="text-xs font-medium text-white">{item.name}</span>
                                </div>
                            )}
                        </>
                    </NavLink>
                ))}

                {/* Version */}
                {!sidebarCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="pt-4 mt-4 border-t border-gray-800"
                    >
                        <p className="text-[10px] text-gray-600 text-center font-mono">
                            v{pkg.version} RELEASE
                        </p>
                    </motion.div>
                )}
            </div>
        </motion.aside>
    )
}
