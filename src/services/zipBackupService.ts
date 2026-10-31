import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { secureEncryptionService, arrayToBase64, base64ToArray } from './secureEncryptionService'
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
     * Creates a full backup with optional encryption
     * With a password: PBKDF2 + AES-256-GCM
     */
    /**
     * Creates a full backup with optional encryption
     * With a password: PBKDF2 + AES-256-GCM
     * @param password Optional password to encrypt with
     * @param download When true, downloads the file automatically (default true)
     */
    createZipBackup: async (password?: string, download: boolean = true): Promise<{ success: boolean; filename?: string; content?: Blob; error?: string }> => {
        try {
            // Get all the data
            const products = await window.electronAPI.products.getAll() as Product[]
            const categories = await window.electronAPI.categories.getAll() as Category[]
            const sales = await window.electronAPI.sales.getAll() as Sale[]
            const suppliers = await window.electronAPI.suppliers.getAll() as Supplier[]
            const clients = await window.electronAPI.clients.getAll() as Client[]
            const expenseTypes = await window.electronAPI.expenseTypes.getAll() as ExpenseType[]
            const expenses = await window.electronAPI.expenses.getAll() as Expense[]

            // Get the settings 
            const settingsStr = localStorage.getItem('companySettings')
            const settings = settingsStr ? JSON.parse(settingsStr) : {}

            // Create the ZIP
            const zip = new JSZip()

            // 1. metadata.json (NEVER encrypted - needed for detection)
            const metadata: BackupMetadata = {
                app: 'NexoraCloud',
                createdAt: new Date().toISOString(),
                appVersion: '0.2.0',
                schemaVersion: 1,
                encrypted: !!password
            }
            zip.file('metadata.json', JSON.stringify(metadata, null, 2))

            // 2. version.json (never encrypted)
            const versionInfo: VersionInfo = {
                backupFormatVersion: 1,
                minAppVersion: '0.2.0'
            }
            zip.file('version.json', JSON.stringify(versionInfo, null, 2))

            // 3. database/data.json (ENCRYPTED with PBKDF2 + AES-256-GCM)
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

            // 4. config/settings.json (ENCRYPTED when there is a password)
            const settingsJson = JSON.stringify(settings, null, 2)
            const settingsContent = password
                ? await secureEncryptionService.encrypt(settingsJson, password)
                : settingsJson

            zip.folder('config')
            zip.file('config/settings.json', settingsContent)

            // 5. images/ (copies of the image files)
            zip.folder('images')
            const imagesFolder = zip.folder('images/products')

            if (imagesFolder) {
                // Go through products and collect their images
                for (const product of products) {
                    if (product.image) {
                        try {
                            // Keep only the file name when a full path is given
                            // If it is an absolute path we still try to read it,
                            // but ideally we have the filename stored by saveImage
                            const filename = product.image.split(/[\\/]/).pop()

                            if (filename) {
                                // Ask the main process for the buffer
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

            // 6. attachments/nic/ (NIC scans of suppliers and clients)
            // They are identity documents, so with a password each one is encrypted like the database (stored as <name>.enc)
            const nicFolder = zip.folder('attachments/nic')
            const nicFiles = new Set([...suppliers, ...clients].map(r => r.nic_attachment).filter((f): f is string => !!f))
            if (nicFolder) {
                for (const filename of nicFiles) {
                    try {
                        const result = await window.electronAPI.attachments.readNic(filename)
                        if (!result.success || !result.buffer) continue
                        if (password) {
                            nicFolder.file(`${filename}.enc`, await secureEncryptionService.encrypt(arrayToBase64(new Uint8Array(result.buffer)), password))
                        } else {
                            nicFolder.file(filename, result.buffer)
                        }
                    } catch (nicError) {
                        console.warn(`Could not back up NIC attachment ${filename}:`, nicError)
                    }
                }
            }

            // Generate the ZIP file
            const content = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 9 }
            })

            // File name with the .cerobak extension
            const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
            const secureFlag = password ? t('zipBackup.protectedSuffix') : ''
            const filename = `nexoracloud_backup${secureFlag}_${timestamp}.cerobak`

            // Download only when download is true
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
     * Restores a backup from a .cerobak file, decrypting it when needed
     */
    restoreZipBackup: async (file: File, password?: string): Promise<{
        success: boolean
        data?: BackupData
        metadata?: BackupMetadata
        settings?: CompanySettings
        error?: string
    }> => {
        try {
            // Read the ZIP file
            const zip = await JSZip.loadAsync(file)

            // 1. Validate the structure
            if (!zip.files['metadata.json'] || !zip.files['version.json'] || !zip.files['database/data.json']) {
                return { success: false, error: t('zipBackup.invalidFile') }
            }

            // 2. Read the metadata // Fixed below lines by referencing original code context not shown here but following logic
            // ... (rest of function until settings)
            const metadataContent = await zip.files['metadata.json'].async('string')
            const metadata: BackupMetadata = JSON.parse(metadataContent)

            // Check whether a password is required
            if (metadata.encrypted && !password) {
                return { success: false, error: t('zipBackup.passwordRequired') }
            }

            // 3. Read the version and check compatibility
            const versionContent = await zip.files['version.json'].async('string')
            const versionInfo: VersionInfo = JSON.parse(versionContent)

            if (versionInfo.backupFormatVersion > 1) {
                return {
                    success: false,
                    error: t('zipBackup.newerVersion')
                }
            }

            // 4. Read and decrypt the data (PBKDF2 + AES-256-GCM)
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

            // 5. Read and decrypt the settings
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

            // 6. Restore images
            const imagesFolder = zip.folder('images/products')
            if (imagesFolder) {
                const imagePromises: Promise<void>[] = []
                imagesFolder.forEach((relativePath, file) => {
                    // relativePath is the file name when images/products is flat
                    // file is the JSZipObject
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
                // Wait for every image to be saved (optional, but recommended for integrity)
                await Promise.all(imagePromises)
            }

            // 7. Restore NIC attachments (encrypted ones end in .enc)
            const nicFolder = zip.folder('attachments/nic')
            if (nicFolder) {
                const nicEntries: { name: string; file: JSZip.JSZipObject }[] = []
                nicFolder.forEach((relativePath, file) => {
                    if (!file.dir) nicEntries.push({ name: relativePath, file })
                })
                for (const { name, file } of nicEntries) {
                    try {
                        if (name.endsWith('.enc')) {
                            if (!password) continue
                            const plain = await secureEncryptionService.decrypt(await file.async('string'), password)
                            await window.electronAPI.attachments.restoreNic(name.slice(0, -'.enc'.length), base64ToArray(plain))
                        } else {
                            await window.electronAPI.attachments.restoreNic(name, await file.async('uint8array'))
                        }
                    } catch (e) {
                        console.warn('Could not restore NIC attachment:', name, e)
                    }
                }
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
     * Checks whether a file is a valid NexoraCloud backup
     */
    validateZipBackup: async (file: File): Promise<{ valid: boolean; error?: string; metadata?: BackupMetadata }> => {
        try {
            if (!file.name.endsWith('.cerobak') && !file.name.endsWith('.cerobak')) {
                return { valid: false, error: t('zipBackup.mustBeCerobak') }
            }

            const zip = await JSZip.loadAsync(file)

            // Check the required files
            const requiredFiles = ['metadata.json', 'version.json', 'database/data.json']
            for (const requiredFile of requiredFiles) {
                if (!zip.files[requiredFile]) {
                    return { valid: false, error: t('zipBackup.missingFile', { file: requiredFile }) }
                }
            }

            // Read the metadata
            const metadataContent = await zip.files['metadata.json'].async('string')
            const metadata: BackupMetadata = JSON.parse(metadataContent)

            // Make sure it comes from NexoraCloud or its earlier names (CeroCloud, CeroCloud Gestor Local)
            if (!['NexoraCloud', 'CeroCloud', 'CeroCloud Gestor Local'].includes(metadata.app)) {
                return { valid: false, error: t('zipBackup.notNexoraCloud') }
            }

            return { valid: true, metadata }
        } catch (error) {
            return { valid: false, error: t('zipBackup.readFileError', { error: String(error) }) }
        }
    },

    /**
     * Gets information about a backup without restoring it
     * If it is encrypted and a password is given, tries to decrypt it to validate and show stats
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

            // Case 1: encrypted backup without a password (or an empty one)
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

            // Read the database
            const databaseRaw = await zip.files['database/data.json'].async('string')
            let databaseContent = databaseRaw

            // Case 2: encrypted backup with a password - try to decrypt
            if (isEncrypted && password) {
                try {
                    databaseContent = await secureEncryptionService.decrypt(databaseRaw, password)
                } catch (error) {
                    // If decryption fails, the password is wrong
                    return { success: false, error: t('zipBackup.wrongPassword') }
                }
            }

            // Parse the data (decrypted or plain text)
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
            // A JSON parse error on an encrypted file almost certainly means a wrong password
            if (isEncrypted && password) {
                return { success: false, error: t('zipBackup.wrongPassword') }
            }
            return { success: false, error: t('zipBackup.readBackupError') }
        }
    }
}
