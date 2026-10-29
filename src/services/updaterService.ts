/**
 * Servicio de Auto-Actualización
 * Maneja la verificación, descarga e instalación de actualizaciones
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
        // Registrar listener global
        if (window.electronAPI?.updater) {
            window.electronAPI.updater.onStatusUpdate((status: unknown) => {
                this.notifyListeners(status as UpdateStatus)
            })
        }
    }

    /**
     * Verificar si hay actualizaciones disponibles
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
     * Descargar actualización disponible
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
     * Instalar actualización y reiniciar la aplicación
     */
    async quitAndInstall(): Promise<void> {
        if (!window.electronAPI?.updater) {
            throw new Error(t('updaterService.unavailable'))
        }

        await window.electronAPI.updater.quitAndInstall()
    }

    /**
     * Obtener versión actual de la aplicación
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
     * Configurar verificación automática
     * @param enabled - Activar/desactivar verificación automática
     * @param intervalHours - Intervalo en horas (default: 6)
     */
    async setAutoCheck(enabled: boolean, intervalHours: number = 6): Promise<void> {
        if (!window.electronAPI?.updater) {
            throw new Error(t('updaterService.unavailable'))
        }

        await window.electronAPI.updater.setAutoCheck(enabled, intervalHours)
    }

    /**
     * Suscribirse a eventos de actualización
     * @param listener - Callback que recibe el estado de actualización
     * @returns Función para desuscribirse
     */
    subscribe(listener: (status: UpdateStatus) => void): () => void {
        this.listeners.push(listener)

        // Retornar función de cleanup
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener)
        }
    }

    /**
     * Notificar a todos los listeners
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
     * Limpiar listeners al destruir el servicio
     */
    destroy() {
        this.listeners = []
        if (window.electronAPI?.updater) {
            window.electronAPI.updater.removeStatusListener()
        }
    }
}

// Exportar instancia singleton
export const updaterService = new UpdaterService()
