import { ipcMain, app, dialog, shell, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { productQueries, categoryQueries, CategoryError, saleQueries, supplierQueries, clientQueries, userQueries, UserError, cancelSale, clearAll, restoreDatabase, backupDatabaseTo, closeDatabase, getNicAttachmentNames, expenseQueries, expenseTypeQueries, ExpenseError, type AuthUser, type Actor } from './database'
import { canAccessPage } from '../../src/lib/permissions'
import { logger } from './logger'
import { AttachmentError, saveNicAttachment, openNicAttachment, deleteNicAttachment, readNicAttachment, restoreNicAttachment, sweepNicAttachments } from './attachments'
import { dataPath, getDataDirectory, getDbPath, defaultDirectory, isDefaultDirectory, isWritableDirectory, hasDatabase, samePath, copyDataTo, saveDataDirectory } from './dataLocation'

// Signed-in user of this app session (set on login, cleared on logout)
let sessionUser: AuthUser | null = null

// Re-read the session user so role/permission changes apply immediately
function currentUser(): AuthUser | null {
    if (!sessionUser) return null
    sessionUser = userQueries.getById(sessionUser.id)
    return sessionUser
}

// Username recorded as created_by / updated_by on records changed by this session
function actorName(): Actor {
    return currentUser()?.username ?? null
}

// Runs a user-management action only for users allowed on the Users page
function withUserAdmin<T>(action: (actor: AuthUser) => T) {
    const actor = currentUser()
    if (!actor || !canAccessPage(actor, 'users')) return { success: false, error: 'FORBIDDEN' }
    try {
        return { success: true, data: action(actor) }
    } catch (error) {
        if (error instanceof UserError) return { success: false, error: error.code }
        logger.error('Users', error)
        return { success: false, error: 'UNKNOWN' }
    }
}

// Database maintenance (reset, data folder) is limited to administrators
async function withAdmin<T>(action: (actor: AuthUser) => Promise<T> | T): Promise<{ success: boolean; data?: T; error?: string }> {
    const actor = currentUser()
    if (!actor || actor.role !== 'admin') return { success: false, error: 'FORBIDDEN' }
    try {
        return { success: true, data: await action(actor) }
    } catch (error) {
        if (error instanceof DataLocationError) return { success: false, error: error.code }
        logger.error('Database', error)
        return { success: false, error: 'UNKNOWN' }
    }
}

class DataLocationError extends Error {
    constructor(public code: 'CANCELED' | 'SAME_LOCATION' | 'NOT_WRITABLE') {
        super(code)
    }
}

function dataLocationInfo() {
    const directory = getDataDirectory()
    return {
        directory,
        dbPath: getDbPath(),
        defaultDirectory: defaultDirectory(),
        isDefault: isDefaultDirectory(directory),
        // Moving back to the default folder usually finds the copy left there by the previous move
        defaultHasDatabase: hasDatabase(defaultDirectory())
    }
}

// Runs an expense change only for users allowed on the Expenses page
function withExpenseAccess<T>(action: (actor: AuthUser) => T) {
    const actor = currentUser()
    if (!actor || !canAccessPage(actor, 'expenses')) return { success: false, error: 'FORBIDDEN' }
    try {
        return { success: true, data: action(actor) }
    } catch (error) {
        if (error instanceof ExpenseError) return { success: false, error: error.code }
        logger.error('Expenses', error)
        return { success: false, error: 'UNKNOWN' }
    }
}

function withCategoryErrors<T>(action: () => T) {
    try {
        return { success: true, data: action() }
    } catch (error) {
        if (error instanceof CategoryError) return { success: false, error: error.code }
        logger.error('Categories', error)
        return { success: false, error: 'UNKNOWN' }
    }
}

export function registerIpcHandlers() {
    // Database Utils
    ipcMain.handle('database:restore', (_event, data) => {
        try {
            console.log('Restore request received')

            // Strict version check
            if (data.version !== '1.0') {
                console.error('Incompatible backup version:', data.version)
                return {
                    success: false,
                    error: `Incompatible backup version (${data.version}). Version 1.0 is required.`
                }
            }

            if (!data.data || !data.data.products) {
                return { success: false, error: 'Invalid backup structure' }
            }

            restoreDatabase(data.data)
            logger.info('Restore', 'Database restored')
            return { success: true }
        } catch (error) {
            logger.error('Database Restore', error)
            return { success: false, error: String(error) }
        }
    })

    // Reset: deletes all business data but keeps users
    ipcMain.handle('database:clearAll', () => withAdmin(actor => {
        clearAll()
        // The records are gone, so are the files they pointed to
        fs.rmSync(dataPath('images', 'products'), { recursive: true, force: true })
        sweepNicAttachments(getNicAttachmentNames())
        logger.info('Database', `Database reset by ${actor.username}`)
    }))

    // Data folder (database + product images + NIC scans)
    ipcMain.handle('database:getLocation', () => dataLocationInfo())

    ipcMain.handle('database:showLocation', () => {
        shell.showItemInFolder(getDbPath())
        return { success: true }
    })

    // Step 1: the admin picks a folder; the UI then asks what to do if it already holds a database
    ipcMain.handle('database:pickLocation', (event) => withAdmin(async () => {
        const window = BrowserWindow.fromWebContents(event.sender)
        const options: Electron.OpenDialogOptions = {
            defaultPath: getDataDirectory(),
            properties: ['openDirectory', 'createDirectory']
        }
        const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
        const directory = result.filePaths[0]
        if (result.canceled || !directory) throw new DataLocationError('CANCELED')
        if (samePath(directory, getDataDirectory())) throw new DataLocationError('SAME_LOCATION')
        if (!isWritableDirectory(directory)) throw new DataLocationError('NOT_WRITABLE')
        return { directory, hasDatabase: hasDatabase(directory) }
    }))

    // Step 2: copy the current data there (or open the database already there), then restart on it.
    // The previous folder is left untouched as a safety copy.
    ipcMain.handle('database:moveLocation', (_event, directory: string, mode: 'copy' | 'useExisting') => withAdmin(async actor => {
        const target = String(directory ?? '')
        if (!target || samePath(target, getDataDirectory())) throw new DataLocationError('SAME_LOCATION')
        if (!isWritableDirectory(target)) throw new DataLocationError('NOT_WRITABLE')
        const useExisting = mode === 'useExisting' && hasDatabase(target)
        if (!useExisting) await copyDataTo(backupDatabaseTo, target)
        saveDataDirectory(target)
        logger.info('Data Location', `${actor.username} moved the data folder to ${target}${useExisting ? ' (existing database)' : ''}`)

        // Give the UI a moment to show the result, then restart on the new folder
        setTimeout(() => {
            closeDatabase()
            app.relaunch()
            app.exit(0)
        }, 1500)
    }))


    // Products
    ipcMain.handle('products:getAll', () => {
        return productQueries.getAll()
    })

    ipcMain.handle('products:getById', (_event, id: number) => {
        return productQueries.getById(id)
    })

    ipcMain.handle('products:search', (_event, term: string) => {
        return productQueries.search(term)
    })

    ipcMain.handle('products:create', (_event, product) => {
        try {
            return productQueries.create(product, actorName())
        } catch (error) {
            logger.error('Products Create', error)
            throw error
        }
    })

    ipcMain.handle('products:createOrUpdate', (_event, product) => {
        return productQueries.createOrUpdate(product, actorName())
    })

    ipcMain.handle('products:update', (_event, id: number, product) => {
        const result = productQueries.update(id, product, actorName())
        return result || { id, ...product }
    })

    ipcMain.handle('products:delete', (_event, id: number) => {
        productQueries.delete(id)
        return { success: true }
    })

    ipcMain.handle('products:getLowStock', () => {
        return productQueries.getLowStock()
    })

    // Image Handlers
    ipcMain.handle('products:saveImage', async (_event, sourcePath: string) => {
        try {
            // Images folder inside the data folder
            const imagesDir = dataPath('images', 'products')

            // Create the folder if it doesn't exist
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true })
            }

            // Generate a unique name
            const ext = path.extname(sourcePath)
            const filename = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`
            const destPath = path.join(imagesDir, filename)

            // Copy the file
            await fs.promises.copyFile(sourcePath, destPath)

            return { success: true, filename }
        } catch (error) {
            console.error('Error saving image:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('products:getImage', async (_event, filename: string) => {
        try {
            const imagePath = dataPath('images', 'products', filename)

            if (fs.existsSync(imagePath)) {
                // Read as a buffer for the backup
                const buffer = await fs.promises.readFile(imagePath)
                return { success: true, buffer }
            }
            return { success: false, error: 'Image not found' }
        } catch (error) {
            console.error('Error reading image:', error)
            return { success: false, error: String(error) }
        }
    })

    // Restore Image
    ipcMain.handle('products:restoreImage', async (_event, filename: string, buffer: Uint8Array) => {
        try {
            const imagesDir = dataPath('images', 'products')

            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true })
            }

            const destPath = path.join(imagesDir, filename)
            await fs.promises.writeFile(destPath, Buffer.from(buffer))

            return { success: true }
        } catch (error) {
            console.error('Error restoring image:', error)
            return { success: false, error: String(error) }
        }
    })

    // Categories
    ipcMain.handle('categories:getAll', () => {
        return categoryQueries.getAll()
    })

    ipcMain.handle('categories:create', (_event, name: string, description?: string) =>
        withCategoryErrors(() => categoryQueries.create(name, description, actorName())))

    ipcMain.handle('categories:update', (_event, id: number, data: { name?: string; description?: string }) =>
        withCategoryErrors(() => categoryQueries.update(id, data ?? {}, actorName())))

    ipcMain.handle('categories:delete', (_event, id: number) =>
        withCategoryErrors(() => categoryQueries.delete(id, actorName())))

    // Sales
    ipcMain.handle('sales:getAll', () => {
        return saleQueries.getAll()
    })

    ipcMain.handle('sales:getById', (_event, id: number) => {
        return saleQueries.getById(id)
    })

    ipcMain.handle('sales:create', (_event, sale) => {
        return saleQueries.create(sale, actorName())
    })

    ipcMain.handle('sales:getRecent', (_event, limit?: number) => {
        return saleQueries.getRecent(limit)
    })

    ipcMain.handle('sales:getTotalSales', () => {
        return saleQueries.getTotalSales()
    })

    ipcMain.handle('sales:getSalesToday', () => {
        return saleQueries.getSalesToday()
    })

    ipcMain.handle('sales:cancel', (_event, id: number) => {
        return cancelSale(id, actorName())
    })

    ipcMain.handle('sales:getByProductId', (_event, productId: number) => {
        return saleQueries.getByProductId(productId)
    })

    ipcMain.handle('sales:getByCustomerName', (_event, name: string) => {
        return saleQueries.getByCustomerName(name)
    })

    // Suppliers
    ipcMain.handle('suppliers:getAll', () => {
        return supplierQueries.getAll()
    })

    ipcMain.handle('suppliers:getById', (_event, id: number) => {
        return supplierQueries.getById(id)
    })

    ipcMain.handle('suppliers:create', (_event, supplier) => {
        try {
            return supplierQueries.create(supplier, actorName())
        } catch (error) {
            logger.error('Suppliers Create', error)
            throw error
        }
    })

    ipcMain.handle('suppliers:update', (_event, id: number, supplier) => {
        const previousNic = supplierQueries.getById(id)?.nic_attachment
        const result = supplierQueries.update(id, supplier, actorName())
        if (previousNic && previousNic !== result?.nic_attachment) deleteNicAttachment(previousNic)
        return result || { id, ...supplier }
    })

    ipcMain.handle('suppliers:delete', (_event, id: number) => {
        const nic = supplierQueries.getById(id)?.nic_attachment
        supplierQueries.delete(id)
        deleteNicAttachment(nic)
        return { success: true }
    })

    // Clients
    ipcMain.handle('clients:getAll', () => {
        return clientQueries.getAll()
    })

    ipcMain.handle('clients:getById', (_event, id: number) => {
        return clientQueries.getById(id)
    })

    ipcMain.handle('clients:search', (_event, term: string) => {
        return clientQueries.search(term)
    })

    ipcMain.handle('clients:create', (_event, client) => {
        try {
            return clientQueries.create(client, actorName())
        } catch (error) {
            logger.error('Clients Create', error)
            throw error
        }
    })

    ipcMain.handle('clients:update', (_event, id: number, client) => {
        const previousNic = clientQueries.getById(id)?.nic_attachment
        const result = clientQueries.update(id, client, actorName())
        if (previousNic && previousNic !== result?.nic_attachment) deleteNicAttachment(previousNic)
        return result || { id, ...client }
    })

    ipcMain.handle('clients:delete', (_event, id: number) => {
        const nic = clientQueries.getById(id)?.nic_attachment
        clientQueries.delete(id)
        deleteNicAttachment(nic)
        return { success: true }
    })

    // NIC attachments (suppliers and clients)
    ipcMain.handle('attachments:saveNic', async (_event, sourcePath: string) => {
        try {
            return { success: true, filename: await saveNicAttachment(sourcePath) }
        } catch (error) {
            if (error instanceof AttachmentError) return { success: false, error: error.code }
            logger.error('NIC Attachment Save', error)
            return { success: false, error: 'UNKNOWN' }
        }
    })

    ipcMain.handle('attachments:openNic', async (_event, filename: string) => {
        try {
            await openNicAttachment(filename)
            return { success: true }
        } catch (error) {
            if (error instanceof AttachmentError) return { success: false, error: error.code }
            logger.error('NIC Attachment Open', error)
            return { success: false, error: 'UNKNOWN' }
        }
    })

    ipcMain.handle('attachments:readNic', async (_event, filename: string) => {
        try {
            return { success: true, buffer: await readNicAttachment(filename) }
        } catch (error) {
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('attachments:restoreNic', async (_event, filename: string, buffer: Uint8Array) => {
        try {
            await restoreNicAttachment(filename, buffer)
            return { success: true }
        } catch (error) {
            logger.error('NIC Attachment Restore', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('clients:getCreditBalance', (_event, id: number) => {
        return clientQueries.getCreditBalance(id)
    })

    // Expense types (reads stay open so backups include them for every user)
    ipcMain.handle('expenseTypes:getAll', () => expenseTypeQueries.getAll())
    ipcMain.handle('expenseTypes:create', (_event, name: string, description?: string) =>
        withExpenseAccess(actor => expenseTypeQueries.create(name, description, actor.username)))
    ipcMain.handle('expenseTypes:update', (_event, id: number, data: { name?: string; description?: string }) =>
        withExpenseAccess(actor => expenseTypeQueries.update(id, data ?? {}, actor.username)))
    ipcMain.handle('expenseTypes:delete', (_event, id: number) =>
        withExpenseAccess(() => expenseTypeQueries.delete(id)))

    // Expenses
    ipcMain.handle('expenses:getAll', () => expenseQueries.getAll())
    ipcMain.handle('expenses:create', (_event, input) =>
        withExpenseAccess(actor => expenseQueries.create(input ?? {}, actor.username)))
    ipcMain.handle('expenses:update', (_event, id: number, input) =>
        withExpenseAccess(actor => expenseQueries.update(id, input ?? {}, actor.username)))
    ipcMain.handle('expenses:delete', (_event, id: number) =>
        withExpenseAccess(() => expenseQueries.delete(id)))

    // Auth
    ipcMain.handle('auth:login', (_event, username: string, password: string) => {
        try {
            const user = userQueries.authenticate(String(username ?? ''), String(password ?? ''))
            sessionUser = user
            return user ? { success: true, user } : { success: false }
        } catch (error) {
            logger.error('Auth Login', error)
            return { success: false }
        }
    })

    ipcMain.handle('auth:logout', () => {
        sessionUser = null
        return { success: true }
    })

    ipcMain.handle('auth:getSession', () => {
        return currentUser()
    })

    // Users (management requires access to the Users page)
    ipcMain.handle('users:getAll', () => withUserAdmin(() => userQueries.getAll()))
    ipcMain.handle('users:create', (_event, input) => withUserAdmin(actor => userQueries.create(input ?? {}, actor)))
    ipcMain.handle('users:update', (_event, id: number, input) => withUserAdmin(actor => userQueries.update(id, input ?? {}, actor)))
    ipcMain.handle('users:delete', (_event, id: number) => withUserAdmin(actor => userQueries.delete(id, actor.id)))

    // Inventory Logs handlers REMOVED

    console.log('IPC handlers registered')
}
