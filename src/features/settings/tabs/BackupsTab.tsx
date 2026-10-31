
import { useState, useEffect } from 'react'
import { CompanySettings } from '@/types/database'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n'
import {
    Download,
    Upload,
    RefreshCw,
    HardDrive,
    Database,
    Clock,
    ShieldCheck
} from 'lucide-react'

interface BackupsTabProps {
    settings: CompanySettings
    setSettings: (settings: CompanySettings) => void
    onOpenWizard: () => void
    onOpenRestoreWizard: () => void
}

export function BackupsTab({ settings, setSettings, onOpenWizard, onOpenRestoreWizard }: BackupsTabProps) {
    const { t, locale } = useTranslation()
    const [storageInfo, setStorageInfo] = useState<{ usage: number, quota: number } | null>(null)
    const [nextBackup, setNextBackup] = useState<string>('')

    useEffect(() => {
        // 1. Get Real Storage Estimate
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
                setStorageInfo({
                    usage: estimate.usage || 0,
                    quota: estimate.quota || (1024 * 1024 * 1024 * 500) // Fallback 500GB
                })
            }).catch(e => console.error(e))
        }

        // 2. Calculate Next Backup Date
        const calculateNextBackup = () => {
            const freq = settings.backup?.frequency || 'weekly'
            const time = settings.backup?.time || '02:00'
            const [hours, minutes] = time.split(':').map(Number)

            const now = new Date()
            const nextDate = new Date()

            // Set user preferred time
            nextDate.setHours(hours || 2, minutes || 0, 0, 0)

            // If time passed for today and freq is daily, move to tomorrow
            if (freq === 'daily') {
                if (now > nextDate) {
                    nextDate.setDate(now.getDate() + 1)
                }
            } else if (freq === 'weekly') {
                // Next Monday
                const day = now.getDay()
                const diff = now.getDate() - day + (day === 0 ? -6 : 1) + 7
                nextDate.setDate(diff)
            } else if (freq === 'monthly') {
                // 1st of next month
                nextDate.setMonth(now.getMonth() + 1)
                nextDate.setDate(1)
            }

            // Format: 12 October, 02:00 AM
            const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
            setNextBackup(nextDate.toLocaleDateString(locale, options))
        }

        calculateNextBackup()

    }, [settings.backup?.frequency, settings.backup?.time, locale])

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes'
        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }

    const usagePercent = storageInfo ? Math.min((storageInfo.usage / storageInfo.quota) * 100, 100) : 0

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="text-left">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('backups.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 font-medium">{t('backups.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column: Actions */}
                <div className="space-y-6">
                    {/* Create Backup Card */}
                    <div className="relative overflow-hidden rounded-[2rem] p-8 bg-indigo-600 dark:bg-indigo-900 text-white shadow-xl transition-all group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                        <div className="relative z-10 flex flex-col gap-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                                        <Download className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold">{t('backups.create')}</h3>
                                    <p className="text-indigo-100 text-sm mt-1 max-w-sm">{t('backups.createDesc')}</p>
                                </div>
                                <ShieldCheck className="w-16 h-16 text-white/10 absolute right-4 top-4 rotate-12" />
                            </div>

                            <button
                                onClick={onOpenWizard}
                                className="w-full py-3.5 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg active:scale-95 transform duration-100 flex items-center justify-center gap-2"
                            >
                                <Database className="w-4 h-4" />
                                {t('backups.start')}
                            </button>
                        </div>
                    </div>

                    {/* Restore Backup Card */}
                    <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
                        <div className="flex flex-col gap-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('backups.restore')}</h3>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">{t('backups.restoreDesc')}</p>
                                </div>
                            </div>

                            <button
                                onClick={onOpenRestoreWizard}
                                className="w-full py-3.5 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl font-bold text-gray-500 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all flex items-center justify-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                {t('backups.selectFile')}
                            </button>

                            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                    {t('backups.restoreWarning')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Settings & Info */}
                <div className="space-y-6">

                    {/* Automation Settings */}
                    <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <RefreshCw className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('backups.auto')}</h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">{t('backups.autoDesc')}</p>
                                </div>
                            </div>
                            <Switch
                                checked={settings.backup?.autoBackup ?? false}
                                onChange={(c) => setSettings({
                                    ...settings,
                                    backup: { ...settings.backup, autoBackup: c }
                                })}
                            />
                        </div>

                        <div className={cn(
                            "space-y-4 transition-all duration-300",
                            settings.backup?.autoBackup ? "opacity-100" : "opacity-40 pointer-events-none grayscale"
                        )}>
                            <div className="grid grid-cols-2 gap-3">
                                {['daily', 'weekly', 'monthly'].map((freq) => (
                                    <button
                                        key={freq}
                                        onClick={() => setSettings({
                                            ...settings,
                                            backup: { ...settings.backup, frequency: freq as 'daily' | 'weekly' | 'monthly' }
                                        })}
                                        className={cn(
                                            "p-3 rounded-xl border text-sm font-medium transition-all text-center capitalize",
                                            settings.backup?.frequency === freq
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold"
                                                : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900/50"
                                        )}
                                    >
                                        {t(`backups.freq.${freq as 'daily' | 'weekly' | 'monthly'}`)}
                                    </button>
                                ))}
                            </div>

                            <div className="pt-4 flex items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-700/50">
                                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{t('backups.nextBackup')} <strong className="text-gray-600 dark:text-gray-300">{nextBackup || t('backups.calculating')}</strong></span>
                                </div>

                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                                    {t('backups.time')}
                                    <input
                                        type="time"
                                        value={settings.backup?.time || '02:00'}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            backup: { ...settings.backup, time: e.target.value }
                                        })}
                                        className="bg-transparent border-none p-0 h-auto w-auto focus:ring-0 text-gray-900 dark:text-white font-mono"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Storage Info (Real Data) */}
                    <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] p-6 border border-gray-100 dark:border-slate-700/50 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-gray-400">
                            <HardDrive className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t('backups.localStorage')}</h4>
                                <span className="text-xs font-bold text-gray-500">{usagePercent.toFixed(2)}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">
                                {t('backups.used', { used: storageInfo ? formatBytes(storageInfo.usage) : '0 B', total: storageInfo ? formatBytes(storageInfo.quota) : '...' })}
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
