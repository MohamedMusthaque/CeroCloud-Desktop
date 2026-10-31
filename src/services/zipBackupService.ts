import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { secureEncryptionService } from './secureEncryptionService'
import { Product, Category, Sale, Supplier, CompanySettings, Client, Expense, ExpenseType } from '@/types/database'
import { t } from '@/i18n'

interface BackupMetadata {
    app: string
    createdAt: string
    appVersion: string
    schemaVersion: number
    encrypted: boolean
}

interface VersionInfo {
    backupFormatVersion: number
    minAppVersion: string
}

interface BackupData {
    products: Product[]
    categories: Category[]
    sales: Sale[]
    suppliers: Supplier[]
    clients: Client[]
    // Absent in backups made before expenses existed
    expenseTypes?: ExpenseType[]
    expenses?: Expense[]
}

export const zipBackupService = {
    /**
     * Crea un backup completo con cifrado profesional opcional
     * Si se proporciona contraseña: PBKDF2 + AES-256-GCM
     */
    /**
     * Crea un backup completo con cifrado profesional opcional
     * Si se proporciona contraseña: PBKDF2 + AES-256-GCM
     * @param password Contraseña opcional para cifrar
     * @param download Si es true, descarga el archivo automáticamente (default true)
     */
    createZipBackup: async (password?: string, download: boolean = true): Promise<{ success: boolean; filename?: string; content?: Blob; error?: string }> => {
        try {
            // Obtener todos los datos
            const products = await window.electronAPI.products.getAll() as Product[]
            const categories = await window.electronAPI.categories.getAll() as Category[]
            const sales = await window.electronAPI.sales.getAll() as Sale[]
            const suppliers = await window.electronAPI.suppliers.getAll() as Supplier[]
            const clients = await window.electronAPI.clients.getAll() as Client[]
            const expenseTypes = await window.electronAPI.expenseTypes.getAll() as ExpenseType[]
            const expenses = await window.electronAPI.expenses.getAll() as Expense[]

            // Obtener configuración 
            const settingsStr = localStorage.getItem('companySettings')
            const settings = settingsStr ? JSON.parse(settingsStr) : {}

            // Crear el ZIP
            const zip = new JSZip()

            // 1. metadata.json (NUNCA cifrado - necesario para detectar)
            const metadata: BackupMetadata = {
                app: 'NexoraCloud',
                createdAt: new Date().toISOString(),
                appVersion: '0.2.0',
                schemaVersion: 1,
                encrypted: !!password
            }
            zip.file('metadata.json', JSON.stringify(metadata, null, 2))

            // 2. version.json (nunca cifrado)
            const versionInfo: VersionInfo = {
                backupFormatVersion: 1,
                minAppVersion: '0.2.0'
            }
            zip.file('version.json', JSON.stringify(versionInfo, null, 2))

            // 3. database/data.json (CIFRADO con PBKDF2 + AES-256-GCM)
            const databaseData: BackupData = {
                products,
                categories,
                sales,
                suppliers,
                clients,
                expenseTypes,
                expenses
            }
            const databaseJson = JSON.stringify(databaseData, null, 2)
            const databaseContent = password
                ? await secureEncryptionService.encrypt(databaseJson, password)
                : databaseJson

            zip.folder('database')
            zip.file('database/data.json', databaseContent)

            // 4. config/settings.json (CIFRADO si hay password)
            const settingsJson = JSON.stringify(settings, null, 2)
            const settingsContent = password
                ? await secureEncryptionService.encrypt(settingsJson, password)
                : settingsJson

            zip.folder('config')
            zip.file('config/settings.json', settingsContent)

            // 5. images/ (Respaldo físico de imágenes)
            zip.folder('images')
            const imagesFolder = zip.folder('images/products')

            if (imagesFolder) {
                // Iterar productos y buscar imágenes
                for (const product of products) {
                    if (product.image) {
                        try {
                            // Extraer solo el nombre del archivo si viene una ruta completa
                            // Asumimos que si es ruta absoluta, igual intentamos leerla,
                            // pero idealmente deberíamos tener el filename guardado por saveImage
                            const filename = product.image.split(/[\\/]/).pop()

                            if (filename) {
                                // Pedir buffer al main process
                                const imageResult = await window.electronAPI.products.getImage(filename)

                                if (imageResult.success && imageResult.buffer) {
                                    imagesFolder.file(filename, imageResult.buffer)
                                }
                            }
                        } catch (imgError) {
                            console.warn(`Could not backup image for product ${product.id}:`, imgError)
                        }
                    }
                }
            }

            // Generar el archivo ZIP
            const content = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 9 }
            })

            // Nombre del archivo con extensión .cerobak
            const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
            const secureFlag = password ? t('zipBackup.protectedSuffix') : ''
            const filename = `nexoracloud_backup${secureFlag}_${timestamp}.cerobak`

            // Descargar solo si download es true
            if (download) {
                saveAs(content, filename)
            }

            return { success: true, filename, content }
        } catch (error) {
            console.error('Error creating backup:', error)
            return { success: false, error: String(error) }
        }
    },

    /**
     * Restaura un backup desde un archivo .cerobak con descifrado profesional
     */
    restoreZipBackup: async (file: File, password?: string): Promise<{
        success: boolean
        data?: BackupData
        metadata?: BackupMetadata
        settings?: CompanySettings
        error?: string
    }> => {
        try {
            // Leer el archivo ZIP
            const zip = await JSZip.loadAsync(file)

            // 1. Validar estructura
            if (!zip.files['metadata.json'] || !zip.files['version.json'] || !zip.files['database/data.json']) {
                return { success: false, error: t('zipBackup.invalidFile') }
            }

            // 2. Leer metadata // Fixed below lines by referencing original code context not shown here but following logic
            // ... (rest of function until settings)
            const metadataContent = await zip.files['metadata.json'].async('string')
            const metadata: BackupMetadata = JSON.parse(metadataContent)

            // Verificar si requiere contraseña
            if (metadata.encrypted && !password) {
                return { success: false, error: t('zipBackup.passwordRequired') }
            }

            // 3. Leer version y validar compatibilidad
            const versionContent = await zip.files['version.json'].async('string')
            const versionInfo: VersionInfo = JSON.parse(versionContent)

            if (versionInfo.backupFormatVersion > 1) {
                return {
                    success: false,
                    error: t('zipBackup.newerVersion')
                }
            }

            // 4. Leer y descifrar datos (con PBKDF2 + AES-256-GCM)
            const databaseRaw = await zip.files['database/data.json'].async('string')
            let databaseContent = databaseRaw

            if (metadata.encrypted && password) {
                try {
                    databaseContent = await secureEncryptionService.decrypt(databaseRaw, password)
                } catch (error) {
                    return { success: false, error: t('zipBackup.wrongPassword') }
                }
            }

            const data: BackupData = JSON.parse(databaseContent)

            // 5. Leer y descifrar configuración
            let settings: CompanySettings = {} as CompanySettings
            if (zip.files['config/settings.json']) {
                const settingsRaw = await zip.files['config/settings.json'].async('string')
                let settingsContent = settingsRaw

                if (metadata.encrypted && password) {
                    try {
                        settingsContent = await secureEncryptionService.decrypt(settingsRaw, password)
                    } catch (error) {
                        console.warn('No se pudo descifrar la configuración')
                    }
                }

                if (settingsContent) {
                    settings = JSON.parse(settingsContent)
                }
            }

            // 6. Restaurar Imágenes
            const imagesFolder = zip.folder('images/products')
            if (imagesFolder) {
                const imagePromises: Promise<void>[] = []
                imagesFolder.forEach((relativePath, file) => {
                    // relativePath es el nombre del archivo si la estructura es plana dentro de images/products
                    // file es el objeto JSZipObject
                    if (!file.dir) {
                        const promise = (async () => {
                            try {
                                const buffer = await file.async('uint8array')
                                await window.electronAPI.products.restoreImage(relativePath, buffer)
                            } catch (e) {
                                console.warn('Error restaurando imagen:', relativePath, e)
                            }
                        })()
                        imagePromises.push(promise)
                    }
                })
                // Esperar a que todas las imágenes se guarden (opcional, pero recomendable para asegurar integridad)
                await Promise.all(imagePromises)
            }

            return {
                success: true,
                data,
                metadata,
                settings
            }
        } catch (error) {
            console.error('Error restoring backup:', error)
            return { success: false, error: String(error) }
        }
    },

    /**
     * Valida si un archivo es un backup válido de NexoraCloud
     */
    validateZipBackup: async (file: File): Promise<{ valid: boolean; error?: string; metadata?: BackupMetadata }> => {
        try {
            if (!file.name.endsWith('.cerobak') && !file.name.endsWith('.cerobak')) {
                return { valid: false, error: t('zipBackup.mustBeCerobak') }
            }

            const zip = await JSZip.loadAsync(file)

            // Verificar archivos requeridos
            const requiredFiles = ['metadata.json', 'version.json', 'database/data.json']
            for (const requiredFile of requiredFiles) {
                if (!zip.files[requiredFile]) {
                    return { valid: false, error: t('zipBackup.missingFile', { file: requiredFile }) }
                }
            }

            // Leer metadata
            const metadataContent = await zip.files['metadata.json'].async('string')
            const metadata: BackupMetadata = JSON.parse(metadataContent)

            // Validar que sea de NexoraCloud o de sus nombres anteriores (CeroCloud, CeroCloud Gestor Local)
            if (!['NexoraCloud', 'CeroCloud', 'CeroCloud Gestor Local'].includes(metadata.app)) {
                return { valid: false, error: t('zipBackup.notNexoraCloud') }
            }

            return { valid: true, metadata }
        } catch (error) {
            return { valid: false, error: t('zipBackup.readFileError', { error: String(error) }) }
        }
    },

    /**
     * Obtiene información sobre un backup sin restaurarlo
     * Si está cifrado y se da contraseña, intenta descifrar para validar y mostrar stats
     */
    getBackupInfo: async (file: File, password?: string): Promise<{
        success: boolean
        metadata?: BackupMetadata
        stats?: {
            productsCount: number
            categoriesCount: number
            salesCount: number
            suppliersCount: number
            clientsCount: number
            hasImages: boolean
            fileSize: string
        }
        error?: string
    }> => {
        let isEncrypted = false
        try {
            const validation = await zipBackupService.validateZipBackup(file)
            if (!validation.valid) {
                return { success: false, error: validation.error }
            }

            isEncrypted = validation.metadata?.encrypted || false
            const zip = await JSZip.loadAsync(file)

            // Caso 1: Backup cifrado sin contraseña (o contraseña vacía)
            if (isEncrypted && !password) {
                return {
                    success: true,
                    metadata: validation.metadata,
                    stats: {
                        productsCount: 0,
                        categoriesCount: 0,
                        salesCount: 0,
                        suppliersCount: 0,
                        clientsCount: 0,
                        hasImages: false,
                        fileSize: (file.size / 1024).toFixed(2) + ' KB'
                    }
                }
            }

            // Leer base de datos
            const databaseRaw = await zip.files['database/data.json'].async('string')
            let databaseContent = databaseRaw

            // Caso 2: Backup cifrado con contraseña - Intentar descifrar
            if (isEncrypted && password) {
                try {
                    databaseContent = await secureEncryptionService.decrypt(databaseRaw, password)
                } catch (error) {
                    // Si falla el descifrado, es contraseña incorrecta
                    return { success: false, error: t('zipBackup.wrongPassword') }
                }
            }

            // Parsear datos (ya sea descifrados o texto plano)
            const data: BackupData = JSON.parse(databaseContent)

            const stats = {
                productsCount: data.products?.length || 0,
                categoriesCount: data.categories?.length || 0,
                salesCount: data.sales?.length || 0,
                suppliersCount: data.suppliers?.length || 0,
                clientsCount: data.clients?.length || 0,
                hasImages: Object.keys(zip.files).some(f => f.startsWith('images/')),
                fileSize: (file.size / 1024).toFixed(2) + ' KB'
            }

            return {
                success: true,
                metadata: validation.metadata,
                stats
            }
        } catch (error) {
            console.error('Error in getBackupInfo:', error)
            // Si el error es de JSON parse en un archivo cifrado, casi seguro es contraseña incorrecta
            if (isEncrypted && password) {
                return { success: false, error: t('zipBackup.wrongPassword') }
            }
            return { success: false, error: t('zipBackup.readBackupError') }
        }
    }
}
