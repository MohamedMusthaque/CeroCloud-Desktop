
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { RefreshCw, CheckCircle2, Download, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import pkg from '../../../../package.json'
import { Switch } from '@/components/ui/switch'
import { CompanySettings } from '@/types/database'
import { updaterService } from '@/services/updaterService'
import { useTranslation } from '@/i18n'

interface UpdatesTabProps {
    settings: CompanySettings
    setSettings: (settings: CompanySettings) => void
}

export function UpdatesTab({ settings, setSettings }: UpdatesTabProps) {
    const { t } = useTranslation()
    const [currentVersion, setCurrentVersion] = useState<string>('...')
    const [checking, setChecking] = useState(false)
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'up-to-date'>('idle')

    useEffect(() => {
        // Get initial version
        updaterService.getCurrentVersion()
            .then(ver => setCurrentVersion(ver !== 'N/A' ? ver : `${pkg.version} (Dev)`))
            .catch(() => setCurrentVersion(`${pkg.version} (Dev)`))

        // Sync auto-check state
        // Note: updaterService doesn't allow reading back the state, so we rely on settings
    }, [])

    const handleCheckUpdate = async () => {
        setChecking(true)
        setUpdateStatus('checking')

        try {
            const result = await updaterService.checkForUpdates()
            setChecking(false)

            if (result.success && result.data) {
                setUpdateStatus('available')
                toast.info(t('updates.available'))
            } else {
                setUpdateStatus('up-to-date')
                toast.success(t('updates.upToDate'))
            }
        } catch (error) {
            setChecking(false)
            setUpdateStatus('idle')
            toast.error(t('updates.checkError'))
        }
    }

    const handleToggleAutoUpdate = async (checked: boolean) => {
        // Optimistic update
        setSettings({
            ...settings,
            updates: { ...settings.updates, autoCheck: checked }
        })

        try {
            await updaterService.setAutoCheck(checked)
            if (checked) {
                toast.success(t('updates.autoEnabled'))
            } else {
                toast.info(t('updates.autoDisabled'))
            }
        } catch (error) {
            toast.error(t('updates.autoError'))
            // Revert on error could be implemented here if strictly needed
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-left">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('updates.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 font-medium">{t('updates.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Status Card (Hero) */}
                <div className="lg:col-span-2 relative overflow-hidden rounded-[2rem] bg-slate-900 dark:bg-black text-white p-10 shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className={cn(
                                "w-20 h-20 rounded-3xl flex items-center justify-center shadow-inner",
                                updateStatus === 'up-to-date' ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white"
                            )}>
                                {updateStatus === 'checking' ? (
                                    <RefreshCw className="w-10 h-10 animate-spin" />
                                ) : updateStatus === 'up-to-date' ? (
                                    <CheckCircle2 className="w-10 h-10" />
                                ) : (
                                    <Zap className="w-10 h-10" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-3xl font-black tracking-tight mb-2">
                                    {updateStatus === 'checking' ? t('updates.status.checking') :
                                        updateStatus === 'up-to-date' ? t('updates.status.upToDate') :
                                            updateStatus === 'available' ? t('updates.status.available') :
                                                'NexoraCloud Desktop'}
                                </h3>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold font-mono border border-white/10">v{currentVersion}</span>
                                    <span className="text-sm text-slate-400">{t('updates.stableChannel')}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCheckUpdate}
                            disabled={checking}
                            className="w-full md:w-auto px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 shadow-xl shadow-white/5 flex items-center justify-center gap-3"
                        >
                            {checking ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    <span>{t('updates.verifying')}</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    <span>{t('updates.check')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Release Channel Info */}
                <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('updates.whatsNew')}</h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400">{t('updates.whatsNewDesc')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pl-4 border-l-2 border-gray-100 dark:border-slate-700">
                        <div className="relative">
                            <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-blue-500 text-white ring-4 ring-white dark:ring-slate-900" />
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t('updates.perf')}</h4>
                            <p className="text-xs text-gray-500 mt-1">{t('updates.perfDesc')}</p>
                        </div>
                        <div className="relative">
                            <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-gray-300 dark:bg-slate-600 ring-4 ring-white dark:ring-slate-900" />
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t('updates.fixes')}</h4>
                            <p className="text-xs text-gray-500 mt-1">{t('updates.fixesDesc')}</p>
                        </div>
                    </div>
                </div>

                {/* Auto Update Settings */}
                <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-700/50 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Download className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('updates.auto')}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{t('updates.autoDesc')}</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 flex items-center justify-between border border-gray-100 dark:border-slate-700">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('updates.enableAuto')}</span>
                        <Switch
                            checked={settings.updates?.autoCheck ?? true}
                            onChange={handleToggleAutoUpdate}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-4 text-center">
                        {t('updates.restartHint')}
                    </p>
                </div>

            </div>

            <div className="text-center pt-8">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                    NexoraCloud Desktop &copy; {new Date().getFullYear()}
                </p>
            </div>
        </div>
    )
}
