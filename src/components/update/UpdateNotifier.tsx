import { useEffect, useState, useCallback } from 'react'
import { updaterService, UpdateStatus, DownloadProgress, UpdateInfo } from '@/services/updaterService'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { t, useTranslation } from '@/i18n'

export function UpdateNotifier() {
    useTranslation()
    const [updateAvailable, setUpdateAvailable] = useState(false)
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
    const [downloading, setDownloading] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
    const [updateDownloaded, setUpdateDownloaded] = useState(false)

    // Handlers defined with useCallback to keep stable references
    const handleDownload = useCallback(async () => {
        toast.dismiss('update-available')
        toast.loading(t('updater.downloading'), {
            id: 'downloading-update',
        })

        const result = await updaterService.downloadUpdate()
        if (!result.success) {
            toast.error(t('updater.downloadError', { error: result.error ?? '' }), {
                id: 'downloading-update',
            })
        }
    }, [])

    const handleInstall = useCallback(async () => {
        toast.dismiss('update-downloaded')
        toast.info(t('updater.installing'), {
            id: 'installing-update',
            duration: 2000,
        })

        // Wait 1 second so the user sees the message
        setTimeout(async () => {
            await updaterService.quitAndInstall()
        }, 1000)
    }, [])

    useEffect(() => {
        const handleUpdateStatus = (status: UpdateStatus) => {
            console.log('📦 Update Status:', status.event, status.data)

            switch (status.event) {
                case 'checking-for-update':
                    toast.info(t('updater.checking'), {
                        id: 'checking-update',
                        duration: 2000,
                    })
                    break

                case 'update-available':
                    setUpdateAvailable(true)
                    setUpdateInfo(status.data as UpdateInfo)
                    toast.success(
                        t('updater.available', { version: (status.data as UpdateInfo).version }),
                        {
                            id: 'update-available',
                            duration: Infinity,
                            action: {
                                label: t('updater.download'),
                                onClick: () => handleDownload(),
                            },
                        }
                    )
                    break

                case 'update-not-available':
                    toast.dismiss('checking-update')
                    break

                case 'download-progress':
                    setDownloading(true)
                    setDownloadProgress(status.data as DownloadProgress)
                    break

                case 'update-downloaded':
                    setDownloading(false)
                    setUpdateDownloaded(true)
                    toast.success(
                        t('updater.downloaded', { version: (status.data as UpdateInfo).version }),
                        {
                            id: 'update-downloaded',
                            duration: Infinity,
                            action: {
                                label: t('updater.installRestart'),
                                onClick: () => handleInstall(),
                            },
                        }
                    )
                    break

                case 'error': {
                    setDownloading(false)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const errMsg = (status.data as any)?.message || t('updater.unknown')
                    toast.error(
                        t('updater.error', { error: errMsg }),
                        {
                            id: 'update-error',
                            duration: 5000,
                        }
                    )
                    break
                }
            }
        }

        const unsubscribe = updaterService.subscribe(handleUpdateStatus)

        return () => {
            unsubscribe()
        }
    }, [handleDownload, handleInstall]) // Dependencies included correctly

    return (
        <>
            {/* Floating download indicator */}
            <AnimatePresence>
                {downloading && downloadProgress && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-2xl p-6 min-w-[320px] backdrop-blur-xl">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/20 p-2 rounded-lg">
                                        <Download className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">{t('updater.downloadingTitle')}</h3>
                                        <p className="text-xs text-white/80">v{updateInfo?.version}</p>
                                    </div>
                                </div>
                                <Loader2 className="w-5 h-5 animate-spin" />
                            </div>

                            {/* Progress bar */}
                            <div className="mb-3">
                                <div className="flex justify-between text-xs mb-1">
                                    <span>{downloadProgress.percent.toFixed(1)}%</span>
                                    <span>
                                        {(downloadProgress.transferred / 1024 / 1024).toFixed(1)}MB /{' '}
                                        {(downloadProgress.total / 1024 / 1024).toFixed(1)}MB
                                    </span>
                                </div>
                                <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                                    <motion.div
                                        className="bg-white h-full rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${downloadProgress.percent}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            </div>

                            {/* Download speed */}
                            <div className="text-xs text-white/70">
                                <span>
                                    {(downloadProgress.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Update-available badge in the header (optional) */}
            {updateAvailable && !downloading && !updateDownloaded && (
                <div className="hidden">
                    {/* Placeholder for a future header badge */}
                </div>
            )}
        </>
    )
}
