import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FolderOpen, FolderSearch, RotateCcw, Trash2, Loader2, HardDrive, Users } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useTranslation, type TranslationKey } from '@/i18n'
import { useAuthStore } from '@/stores/authStore'
import { databaseService, DatabaseServiceError, type DataLocation, type MoveMode } from '@/services/databaseService'

const KNOWN_ERRORS = ['FORBIDDEN', 'NOT_WRITABLE', 'SAME_LOCATION', 'UNKNOWN'] as const

type PendingMove = { directory: string; hasDatabase: boolean }

// Data folder and reset options (administrators only)
export function DataManagement() {
    const { t } = useTranslation()
    const isAdmin = useAuthStore((state) => state.user?.role === 'admin')

    const [location, setLocation] = useState<DataLocation | null>(null)
    const [busy, setBusy] = useState<'pick' | 'move' | 'reset' | null>(null)
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
    const [confirmReset, setConfirmReset] = useState(false)

    useEffect(() => {
        if (isAdmin) databaseService.getLocation().then(setLocation).catch(console.error)
    }, [isAdmin])

    if (!isAdmin) return null

    const showError = (error: unknown) => {
        const code = error instanceof DatabaseServiceError ? error.code : 'UNKNOWN'
        if (code === 'CANCELED') return
        const known = (KNOWN_ERRORS as readonly string[]).includes(code) ? code : 'UNKNOWN'
        toast.error(t(`dataManagement.error.${known}` as TranslationKey))
    }

    const handlePick = async () => {
        setBusy('pick')
        try {
            setPendingMove(await databaseService.pickLocation())
        } catch (error) {
            showError(error)
        } finally {
            setBusy(null)
        }
    }

    const handleUseDefault = () => {
        if (!location) return
        setPendingMove({ directory: location.defaultDirectory, hasDatabase: location.defaultHasDatabase })
    }

    const handleMove = async (mode: MoveMode) => {
        if (!pendingMove) return
        const { directory } = pendingMove
        setPendingMove(null)
        setBusy('move')
        try {
            await databaseService.moveLocation(directory, mode)
            // The main process restarts the app on the new folder; keep the buttons disabled until then
            toast.success(t('dataManagement.restarting'))
        } catch (error) {
            showError(error)
            setBusy(null)
        }
    }

    const handleReset = async () => {
        setConfirmReset(false)
        setBusy('reset')
        try {
            await databaseService.reset()
            toast.success(t('dataManagement.resetSuccess'))
            // Reload so every page drops data it still holds in memory
            setTimeout(() => window.location.reload(), 800)
        } catch (error) {
            showError(error)
            setBusy(null)
        }
    }

    const cardClass = "bg-white dark:bg-slate-800/40 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-700/50 shadow-sm"
    const secondaryButton = "flex-1 min-w-[10rem] py-3 rounded-xl font-bold text-sm border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"

    return (
        <div className="space-y-6">
            <div className="text-left">
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{t('dataManagement.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 font-medium">{t('dataManagement.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Data folder */}
                <div className={cardClass}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <HardDrive className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('dataManagement.location')}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{t('dataManagement.locationDesc')}</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700/50 mb-6">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('dataManagement.currentFolder')}</span>
                            {location && (
                                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                    {location.isDefault ? t('dataManagement.default') : t('dataManagement.custom')}
                                </span>
                            )}
                        </div>
                        <p className="font-mono text-xs text-gray-700 dark:text-slate-300 break-all">{location?.directory ?? '...'}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button onClick={handlePick} disabled={busy !== null} className={secondaryButton}>
                            {busy === 'pick' || busy === 'move' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderSearch className="w-4 h-4" />}
                            {t('dataManagement.change')}
                        </button>
                        <button onClick={() => databaseService.showLocation()} disabled={busy !== null} className={secondaryButton}>
                            <FolderOpen className="w-4 h-4" />
                            {t('dataManagement.showFolder')}
                        </button>
                        {location && !location.isDefault && (
                            <button onClick={handleUseDefault} disabled={busy !== null} className={secondaryButton}>
                                <RotateCcw className="w-4 h-4" />
                                {t('dataManagement.useDefault')}
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-4">{t('dataManagement.locationNote')}</p>
                </div>

                {/* Reset */}
                <div className={`${cardClass} border-red-100 dark:border-red-900/30`}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('dataManagement.reset')}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{t('dataManagement.resetDesc')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 mb-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                        <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{t('dataManagement.resetKeeps')}</span>
                    </div>

                    <button
                        onClick={() => setConfirmReset(true)}
                        disabled={busy !== null}
                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {busy === 'reset' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {t('dataManagement.resetButton')}
                    </button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={pendingMove !== null && !pendingMove.hasDatabase}
                variant="info"
                title={t('dataManagement.moveTitle')}
                description={t('dataManagement.moveConfirm', { path: pendingMove?.directory ?? '' })}
                confirmText={t('dataManagement.moveButton')}
                onConfirm={() => handleMove('copy')}
                onCancel={() => setPendingMove(null)}
            />

            <ConfirmDialog
                isOpen={pendingMove !== null && pendingMove.hasDatabase}
                variant="warning"
                title={t('dataManagement.existingTitle')}
                description={t('dataManagement.existingConfirm', { path: pendingMove?.directory ?? '' })}
                confirmText={t('dataManagement.openExisting')}
                onConfirm={() => handleMove('useExisting')}
                secondaryText={t('dataManagement.replaceExisting')}
                onSecondary={() => handleMove('copy')}
                onCancel={() => setPendingMove(null)}
            />

            <ConfirmDialog
                isOpen={confirmReset}
                variant="danger"
                title={t('dataManagement.resetTitle')}
                description={t('dataManagement.resetConfirm')}
                confirmText={t('dataManagement.resetButton')}
                onConfirm={handleReset}
                onCancel={() => setConfirmReset(false)}
            />
        </div>
    )
}
