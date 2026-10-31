import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain, app } from 'electron'
import log from 'electron-log'

// Configure logging for debugging
autoUpdater.logger = log
log.transports.file.level = 'info'

export class AutoUpdateService {
    private mainWindow: BrowserWindow | null = null
    private updateCheckInterval: NodeJS.Timeout | null = null

    constructor(window: BrowserWindow) {
        this.mainWindow = window
        this.setupAutoUpdater()
        this.setupIpcHandlers()
    }

    private setupAutoUpdater() {
        // Auto-updater configuration
        autoUpdater.autoDownload = false // Manual download: notify first
        autoUpdater.autoInstallOnAppQuit = true // Install on quit

        // Configure for GitHub Releases
        autoUpdater.setFeedURL({
            provider: 'github',
            owner: 'CeroCloud',
            repo: 'CeroCloud-Desktop',
        })

        // Event listeners
        autoUpdater.on('checking-for-update', () => {
            log.info('🔍 Verificando actualizaciones...')
            this.sendStatusToWindow('checking-for-update')
        })

        autoUpdater.on('update-available', (info) => {
            log.info('✅ Actualización disponible:', info.version)
            this.sendStatusToWindow('update-available', {
                version: info.version,
                releaseDate: info.releaseDate,
                releaseNotes: info.releaseNotes,
            })
        })

        autoUpdater.on('update-not-available', (info) => {
            log.info('✅ Ya estás en la última versión:', info.version)
            this.sendStatusToWindow('update-not-available', { version: info.version })
        })

        autoUpdater.on('error', (err) => {
            log.error('❌ Error en auto-updater:', err)
            this.sendStatusToWindow('error', { message: err.message })
        })

        autoUpdater.on('download-progress', (progressObj) => {
            const logMessage = `Descargando: ${progressObj.percent.toFixed(2)}% - ${(progressObj.transferred / 1024 / 1024).toFixed(2)}MB / ${(progressObj.total / 1024 / 1024).toFixed(2)}MB`
            log.info(logMessage)
            this.sendStatusToWindow('download-progress', {
                percent: progressObj.percent,
                transferred: progressObj.transferred,
                total: progressObj.total,
                bytesPerSecond: progressObj.bytesPerSecond,
            })
        })

        autoUpdater.on('update-downloaded', (info) => {
            log.info('✅ Actualización descargada:', info.version)
            this.sendStatusToWindow('update-downloaded', {
                version: info.version,
                releaseNotes: info.releaseNotes,
            })
        })
    }

    private setupIpcHandlers() {
        // Handler to check for updates manually
        ipcMain.handle('updater:check-for-updates', async () => {
            // In development, don't try to check
            if (!app.isPackaged) {
                return {
                    success: false,
                    error: 'Auto-updater no disponible en modo desarrollo. Usa npm run build para probar.'
                }
            }

            try {
                const result = await autoUpdater.checkForUpdates()
                return { success: true, data: result }
            } catch (error) {
                log.error('Error al verificar actualizaciones:', error)
                return { success: false, error: error instanceof Error ? error.message : String(error) }
            }
        })

        // Handler to download the update
        ipcMain.handle('updater:download-update', async () => {
            if (!app.isPackaged) {
                return { success: false, error: 'No disponible en desarrollo' }
            }

            try {
                await autoUpdater.downloadUpdate()
                return { success: true }
            } catch (error) {
                log.error('Error al descargar actualización:', error)
                return { success: false, error: error instanceof Error ? error.message : String(error) }
            }
        })

        // Handler to install the update and restart
        ipcMain.handle('updater:quit-and-install', () => {
            if (!app.isPackaged) return
            autoUpdater.quitAndInstall(false, true)
        })

        // Handler to get the current version
        ipcMain.handle('updater:get-current-version', () => {
            return app.getVersion()
        })

        // Handler to configure automatic checks
        ipcMain.handle('updater:set-auto-check', (_event, enabled: boolean, intervalHours: number = 6) => {
            if (!app.isPackaged) {
                return { success: false, error: 'No disponible en desarrollo' }
            }

            if (enabled) {
                this.startAutoCheck(intervalHours)
            } else {
                this.stopAutoCheck()
            }
            return { success: true }
        })
    }

    private sendStatusToWindow(event: string, data?: unknown) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('updater-status', { event, data })
        }
    }

    /**
     * Check for updates when the app starts
     * Runs 5 seconds after startup so it does not interfere with loading
     */
    public checkForUpdatesOnStartup() {
        setTimeout(() => {
            log.info('🚀 Verificación automática al inicio')
            autoUpdater.checkForUpdates().catch((err) => {
                log.error('Error en verificación de inicio:', err)
            })
        }, 5000)
    }

    /**
     * Start periodic automatic checks
     * @param intervalHours - Interval in hours (default: 6 hours)
     */
    public startAutoCheck(intervalHours: number = 6) {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval)
        }

        const intervalMs = intervalHours * 60 * 60 * 1000
        log.info(`⏰ Auto-verificación configurada cada ${intervalHours} horas`)

        this.updateCheckInterval = setInterval(() => {
            log.info('⏰ Verificación automática programada')
            autoUpdater.checkForUpdates().catch((err) => {
                log.error('Error en verificación automática:', err)
            })
        }, intervalMs)

        // First check right away
        this.checkForUpdatesOnStartup()
    }

    /**
     * Stop automatic checks
     */
    public stopAutoCheck() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval)
            this.updateCheckInterval = null
            log.info('⏹️ Auto-verificación deshabilitada')
        }
    }

    /**
     * Destroy the service (release resources)
     */
    public destroy() {
        this.stopAutoCheck()
        this.mainWindow = null
    }
}
