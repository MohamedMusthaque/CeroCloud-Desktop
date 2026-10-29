
import { CompanySettings } from '@/types/database'
import { cn } from '@/lib/utils'
import {
    Sun,
    Moon,
    Monitor,
    Type,
    Layout,
    Palette,
    Languages,
    Check
} from 'lucide-react'
import { companyService } from '@/services/companyService'
import { useTranslation, Language } from '@/i18n'

// Language names are shown in their own language so they are recognizable either way
const languages: { id: Language, label: string }[] = [
    { id: 'es', label: 'Español' },
    { id: 'en', label: 'English' }
]

interface AppearanceTabProps {
    settings: CompanySettings
    setSettings: (settings: CompanySettings) => void
}

export function AppearanceTab({ settings, setSettings }: AppearanceTabProps) {
    const { t, language, setLanguage } = useTranslation()

    const fontSizes = [
        { id: 'small', label: 'Aa', sub: t('appearance.font.small'), class: 'text-xs' },
        { id: 'normal', label: 'Aa', sub: t('appearance.font.normal'), class: 'text-sm' },
        { id: 'large', label: 'Aa', sub: t('appearance.font.large'), class: 'text-lg' },
        { id: 'xlarge', label: 'Aa', sub: t('appearance.font.xlarge'), class: 'text-xl' }
    ]

    const radii = [
        { id: 'none', radius: '0px', label: t('appearance.radius.none') },
        { id: 'small', radius: '4px', label: t('appearance.radius.small') },
        { id: 'normal', radius: '8px', label: t('appearance.radius.normal') },
        { id: 'large', radius: '16px', label: t('appearance.radius.large') }
    ]
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-left">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('appearance.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 font-medium">{t('appearance.subtitle')}</p>
            </div>

            {/* Language Selection */}
            <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Languages className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('appearance.language')}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{t('appearance.languageDesc')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:w-80">
                        {languages.map((lang) => {
                            const isActive = language === lang.id
                            return (
                                <button
                                    key={lang.id}
                                    onClick={() => setLanguage(lang.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all",
                                        isActive
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 shadow-md"
                                            : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                                        {lang.id.toUpperCase()}
                                    </span>
                                    <span className="text-sm font-bold">{lang.label}</span>
                                    {isActive && <Check className="w-4 h-4 ml-auto text-emerald-500" />}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Theme Selection */}
                <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <Palette className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('appearance.theme')}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{t('appearance.themeDesc')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        {[
                            { id: 'light', label: t('appearance.theme.light'), icon: Sun },
                            { id: 'dark', label: t('appearance.theme.dark'), icon: Moon },
                            { id: 'system', label: t('appearance.theme.system'), icon: Monitor }
                        ].map((mode) => {
                            const isActive = settings.theme?.mode === mode.id
                            return (
                                <button
                                    key={mode.id}
                                    onClick={() => {
                                        const newMode = mode.id as 'light' | 'dark' | 'system'
                                        setSettings({ ...settings, theme: { ...settings.theme, mode: newMode } })
                                        companyService.applyTheme(newMode)
                                    }}
                                    className={cn(
                                        "group flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden",
                                        isActive
                                            ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 shadow-lg shadow-purple-500/10 scale-[1.02]"
                                            : "border-gray-200 dark:border-slate-700 bg-transparent text-gray-400 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                                        isActive ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300" : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                                    )}>
                                        <mode.icon className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-bold">{mode.label}</span>

                                    {isActive && (
                                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-purple-500 shadow ring-4 ring-purple-100 dark:ring-purple-900/40" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Interface Scaling & Density */}
                <div className="space-y-6">

                    {/* Size Controls */}
                    <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-700/50 shadow-sm relative">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Type className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('appearance.scale')}</h3>
                        </div>

                        <div className="space-y-6">
                            {/* Font Size */}
                            <div>
                                <div className="flex justify-between mb-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                    <span>{t('appearance.fontSize')}</span>
                                    <span className="text-gray-900 dark:text-white">{fontSizes.find(s => s.id === settings.theme?.fontSize)?.sub}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {fontSizes.map((size) => {
                                        const isActive = settings.theme?.fontSize === size.id
                                        return (
                                            <button
                                                key={size.id}
                                                onClick={() => {
                                                    const newSettings = { ...settings, theme: { ...settings.theme, fontSize: size.id as 'small' | 'normal' | 'large' | 'xlarge' } }
                                                    setSettings(newSettings)
                                                    companyService.applyUIScaling(size.id, settings.theme?.borderRadius || 'normal')
                                                }}
                                                className={cn(
                                                    "h-20 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1",
                                                    isActive
                                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300 shadow-md"
                                                        : "bg-transparent border-gray-100 dark:border-slate-700 text-gray-400 hover:border-gray-200 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                                                )}
                                            >
                                                <span className={cn("font-bold text-gray-900 dark:text-white", size.class)}>{size.label}</span>
                                                <span className="text-[10px] uppercase font-bold text-gray-400/80">{size.sub}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Border Radius */}
                            <div>
                                <div className="flex justify-between mb-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                    <span>{t('appearance.borderRadius')}</span>
                                    <span className="text-gray-900 dark:text-white">{radii.find(r => r.id === settings.theme?.borderRadius)?.label}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {radii.map((rad) => {
                                        const isActive = settings.theme?.borderRadius === rad.id
                                        return (
                                            <button
                                                key={rad.id}
                                                onClick={() => {
                                                    const newSettings = { ...settings, theme: { ...settings.theme, borderRadius: rad.id as 'none' | 'small' | 'normal' | 'large' } }
                                                    setSettings(newSettings)
                                                    companyService.applyUIScaling(settings.theme?.fontSize || 'normal', rad.id)
                                                }}
                                                className={cn(
                                                    "h-12 rounded-xl border-2 transition-all flex items-center justify-center relative",
                                                    isActive
                                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300"
                                                        : "bg-transparent border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600"
                                                )}
                                            >
                                                <div
                                                    className="w-8 h-8 border-2 border-current absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                                    style={{
                                                        borderRadius: rad.radius,
                                                        borderTopLeftRadius: rad.radius
                                                    }}
                                                />
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Density Toggle */}
                    <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] p-6 border border-gray-100 dark:border-slate-700/50 shadow-sm flex items-center justify-between group cursor-pointer hover:border-gray-200 dark:hover:border-slate-600 transition-colors"
                        onClick={() => {
                            const newDensity = settings.theme?.density === 'compact' ? 'normal' : 'compact'
                            setSettings({ ...settings, theme: { ...settings.theme, density: newDensity } })
                            companyService.applyDensity(newDensity)
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                settings.theme?.density === 'compact' ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600" : "bg-gray-100 dark:bg-slate-700 text-gray-500"
                            )}>
                                <Layout className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('appearance.compact')}</h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400">{t('appearance.compactDesc')}</p>
                            </div>
                        </div>
                        <div className={cn(
                            "w-12 h-6 rounded-full p-1 transition-colors duration-300 relative",
                            settings.theme?.density === 'compact' ? "bg-indigo-600" : "bg-gray-200 dark:bg-slate-700"
                        )}>
                            <div className={cn(
                                "w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300",
                                settings.theme?.density === 'compact' ? "translate-x-6" : "translate-x-0"
                            )} />
                        </div>
                    </div>

                </div>

            </div>
        </div>
    )
}
