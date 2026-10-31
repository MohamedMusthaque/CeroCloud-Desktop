/**
 * Auto-update service
 * Handles checking for, downloading and installing updates
 */

import { t } from '@/i18n'

export interface UpdateInfo {
    version: string
    releaseDate?: string
    releaseNotes?: string
}

export interface DownloadProgress {
    percent: number
    transferred: number
    total: number
    bytesPerSecond: number
}

export interface UpdateStatus {
    event: 'checking-for-update' | 'update-available' | 'update-not-available' | 'download-progress' | 'update-downloaded' | 'error'
    data?: unknown
}

class UpdaterService {
    private listeners: Array<(status: UpdateStatus) => void> = []

    constructor() {
        // Register the global listener
        if (window.electronAPI?.updater) {
            window.electronAPI.updater.onStatusUpdate((status: unknown) => {
                this.notifyListeners(status as UpdateStatus)
            })
        }
    }

    /**
     * Check whether updates are available
     */
    async checkForUpdates(): Promise<{ success: boolean; data?: UpdateInfo; error?: string }> {
        if (!window.electronAPI?.updater) {
            return { success: false, error: t('updaterService.unavailable') }
        }

        try {
            const result = await window.electronAPI.updater.checkForUpdates()
            return result
        } catch (error) {
            console.error('Error al verificar actualizaciones:', error)
            return { success: false, error: error instanceof Error ? error.message : String(error) }
        }
    }

    /**
     * Download the available update
     */
    async downloadUpdate(): Promise<{ success: boolean; error?: string }> {
        if (!window.electronAPI?.updater) {
            return { success: false, error: t('updaterService.unavailable') }
        }

        try {
            const result = await window.electronAPI.updater.downloadUpdate()
            return result
        } catch (error) {
            console.error('Error al descargar actualización:', error)
            return { success: false, error: error instanceof Error ? error.message : String(error) }
        }
    }

    /**
     * Install the update and restart the app
     */
    async quitAndInstall(): Promise<void> {
        if (!window.electronAPI?.updater) {
            throw new Error(t('updaterService.unavailable'))
        }

        await window.electronAPI.updater.quitAndInstall()
    }

    /**
     * Get the app's current version
     */
    async getCurrentVersion(): Promise<string> {
        if (!window.electronAPI?.updater) {
            return 'N/A'
        }

        try {
            const version = await window.electronAPI.updater.getCurrentVersion()
            return version
        } catch (error) {
            console.error('Error al obtener versión:', error)
            return 'N/A'
        }
    }

    /**
     * Configure automatic checks
     * @param enabled - Turn automatic checks on/off
     * @param intervalHours - Interval in hours (default: 6)
     */
    async setAutoCheck(enabled: boolean, intervalHours: number = 6): Promise<void> {
        if (!window.electronAPI?.updater) {
            throw new Error(t('updaterService.unavailable'))
        }

        await window.electronAPI.updater.setAutoCheck(enabled, intervalHours)
    }

    /**
     * Subscribe to update events
     * @param listener - Callback that receives the update status
     * @returns Function to unsubscribe
     */
    subscribe(listener: (status: UpdateStatus) => void): () => void {
        this.listeners.push(listener)

        // Return the cleanup function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener)
        }
    }

    /**
     * Notify every listener
     */
    private notifyListeners(status: UpdateStatus) {
        this.listeners.forEach(listener => {
            try {
                listener(status)
            } catch (error) {
                console.error('Error en listener de actualización:', error)
            }
        })
    }

    /**
     * Clear listeners when the service is destroyed
     */
    destroy() {
        this.listeners = []
        if (window.electronAPI?.updater) {
            window.electronAPI.updater.removeStatusListener()
        }
    }
}

// Export the singleton instance
export const updaterService = new UpdaterService()
