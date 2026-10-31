import { saveAs } from 'file-saver'
import { t } from '@/i18n'

export const backupService = {
    // Create backup (export current database)
    createBackup: async (password?: string) => {
        try {
            // Get all data
            const products = await window.electronAPI.products.getAll()
            const categories = await window.electronAPI.categories.getAll()
            const sales = await window.electronAPI.sales.getAll()
            const suppliers = await window.electronAPI.suppliers.getAll()
            const expenseTypes = await window.electronAPI.expenseTypes.getAll()
            const expenses = await window.electronAPI.expenses.getAll()

            const backupData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                data: {
                    products,
                    categories,
                    sales,
                    suppliers,
                    expenseTypes,
                    expenses,
                }
            }

            const jsonString = JSON.stringify(backupData, null, 2)

            let finalContent = jsonString
            let fileExtension = 'json'

            // Encrypt if password provided
            if (password) {
                // Dynamic import to avoid circular dependencies if any
                const { secureEncryptionService } = await import('./secureEncryptionService')
                finalContent = await secureEncryptionService.encrypt(jsonString, password)
                fileExtension = 'cerobak'
            }

            const blob = new Blob([finalContent], { type: 'application/json' })
            const filename = `backup_nexoracloud_${new Date().toISOString().split('T')[0]}_${Date.now()}.${fileExtension}`

            saveAs(blob, filename)
            return { success: true, filename }
        } catch (error) {
            console.error('Error creating backup:', error)
            return { success: false, error }
        }
    },

    // Restore from backup file
    restoreBackup: async (file: File, password?: string): Promise<{ success: boolean; message: string; needPassword?: boolean }> => {
        return new Promise((resolve) => {
            const reader = new FileReader()

            reader.onload = async (e) => {
                try {
                    let content = e.target?.result as string

                    // Check if encrypted
                    const { secureEncryptionService } = await import('./secureEncryptionService')
                    const isEncrypted = secureEncryptionService.isEncrypted(content)

                    if (isEncrypted) {
                        if (!password) {
                            resolve({ success: false, message: t('backupService.needPassword'), needPassword: true })
                            return
                        }
                        try {
                            content = await secureEncryptionService.decrypt(content, password)
                        } catch (err) {
                            resolve({ success: false, message: t('backupService.wrongPassword') })
                            return
                        }
                    }

                    const backup = JSON.parse(content)

                    // Validate backup structure
                    // Validate backup structure
                    if (!backup.data || !backup.data.products) {
                        resolve({ success: false, message: t('backupService.invalidFile') })
                        return
                    }

                    // Execute Restore via IPC
                    const result = await window.electronAPI.database.restore(backup)

                    if (!result.success) {
                        resolve({ success: false, message: result.error || t('backupService.unknownRestoreError') })
                        return
                    }

                    resolve({
                        success: true,
                        message: t('backupService.restoreSuccess', { products: backup.data.products.length, sales: backup.data.sales?.length || 0 })
                    })
                } catch (error) {
                    console.error(error)
                    resolve({ success: false, message: t('backupService.processError') })
                }
            }

            reader.onerror = () => {
                resolve({ success: false, message: t('backupService.readError') })
            }

            reader.readAsText(file)
        })
    },

    // Validate backup file
    validateBackup: async (file: File): Promise<boolean> => {
        try {
            const result = await backupService.restoreBackup(file)
            return result.success
        } catch {
            return false
        }
    },

    // Get backup settings from localStorage
    getBackupSettings: () => {
        const settings = localStorage.getItem('backupSettings')
        return settings ? JSON.parse(settings) : {
            autoBackup: false,
            frequency: 'daily', // daily, weekly, monthly
            backupPath: '',
            lastBackup: null
        }
    },

    // Save backup settings to localStorage
    saveBackupSettings: (settings: { autoBackup: boolean; frequency: 'daily' | 'weekly' | 'monthly'; backupPath: string; lastBackup: string | null }) => {
        localStorage.setItem('backupSettings', JSON.stringify(settings))
    },

    // Check if auto backup is needed
    shouldAutoBackup: () => {
        const settings = backupService.getBackupSettings()
        if (!settings.autoBackup) return false

        const lastBackup = settings.lastBackup ? new Date(settings.lastBackup) : null
        if (!lastBackup) return true

        const now = new Date()
        const daysSinceBackup = Math.floor((now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))

        switch (settings.frequency) {
            case 'daily':
                return daysSinceBackup >= 1
            case 'weekly':
                return daysSinceBackup >= 7
            case 'monthly':
                return daysSinceBackup >= 30
            default:
                return false
        }
    },

    // Perform auto backup
    performAutoBackup: async () => {
        const settings = backupService.getBackupSettings()
        const result = await backupService.createBackup()

        if (result.success) {
            settings.lastBackup = new Date().toISOString()
            backupService.saveBackupSettings(settings)
        }

        return result
    }
}
