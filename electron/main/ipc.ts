import { ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs'
import { productQueries, categoryQueries, saleQueries, supplierQueries, clientQueries, userQueries, cancelSale, clearAll, restoreDatabase } from './database'
import { logger } from './logger'

export function registerIpcHandlers() {
    // Database Utils
    ipcMain.handle('database:restore', (_event, data) => {
        try {
            console.log('📦 Recibida solicitud de restauración IPC')

            // Validación de Versión Estricta
            if (data.version !== '1.0') {
                console.error('❌ Versión de backup incompatible:', data.version)
                return {
                    success: false,
                    error: `Versión de backup incompatible (${data.version}). Se requiere versión 1.0`
                }
            }

            if (!data.data || !data.data.products) {
                return { success: false, error: 'Estructura de backup inválida' }
            }

            restoreDatabase(data.data)
            logger.info('Restore', 'Base de datos restaurada correctamente')
            return { success: true }
        } catch (error) {
            logger.error('Database Restore', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('database:clearAll', () => {
        try {
            clearAll()
            logger.info('Database', 'Base de datos limpiada')
            return { success: true }
        } catch (error) {
            logger.error('Database Clear', error)
            return { success: false, error: String(error) }
        }
    })


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
            return productQueries.create(product)
        } catch (error) {
            logger.error('Products Create', error)
            throw error
        }
    })

    ipcMain.handle('products:createOrUpdate', (_event, product) => {
        return productQueries.createOrUpdate(product)
    })

    ipcMain.handle('products:update', (_event, id: number, product) => {
        const result = productQueries.update(id, product)
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
            // Directorio de imágenes en UserData
            const userDataPath = app.getPath('userData')
            const imagesDir = path.join(userDataPath, 'images', 'products')

            // Crear directorio si no existe
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true })
            }

            // Generar nombre único
            const ext = path.extname(sourcePath)
            const filename = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`
            const destPath = path.join(imagesDir, filename)

            // Copiar archivo
            await fs.promises.copyFile(sourcePath, destPath)

            return { success: true, filename }
        } catch (error) {
            console.error('Error saving image:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('products:getImage', async (_event, filename: string) => {
        try {
            const imagePath = path.join(app.getPath('userData'), 'images', 'products', filename)

            if (fs.existsSync(imagePath)) {
                // Leer como buffer para backup
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
            const userDataPath = app.getPath('userData')
            const imagesDir = path.join(userDataPath, 'images', 'products')

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

    ipcMain.handle('categories:create', (_event, name: string, description?: string) => {
        return categoryQueries.create(name, description)
    })

    // Sales
    ipcMain.handle('sales:getAll', () => {
        return saleQueries.getAll()
    })

    ipcMain.handle('sales:getById', (_event, id: number) => {
        return saleQueries.getById(id)
    })

    ipcMain.handle('sales:create', (_event, sale) => {
        return saleQueries.create(sale)
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
        return cancelSale(id)
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
            return supplierQueries.create(supplier)
        } catch (error) {
            logger.error('Suppliers Create', error)
            throw error
        }
    })

    ipcMain.handle('suppliers:update', (_event, id: number, supplier) => {
        const result = supplierQueries.update(id, supplier)
        return result || { id, ...supplier }
    })

    ipcMain.handle('suppliers:delete', (_event, id: number) => {
        supplierQueries.delete(id)
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
            return clientQueries.create(client)
        } catch (error) {
            logger.error('Clients Create', error)
            throw error
        }
    })

    ipcMain.handle('clients:update', (_event, id: number, client) => {
        const result = clientQueries.update(id, client)
        return result || { id, ...client }
    })

    ipcMain.handle('clients:delete', (_event, id: number) => {
        clientQueries.delete(id)
        return { success: true }
    })

    ipcMain.handle('clients:getCreditBalance', (_event, id: number) => {
        return clientQueries.getCreditBalance(id)
    })

    // Auth
    ipcMain.handle('auth:login', (_event, username: string, password: string) => {
        try {
            const user = userQueries.authenticate(String(username ?? ''), String(password ?? ''))
            return user ? { success: true, user } : { success: false }
        } catch (error) {
            logger.error('Auth Login', error)
            return { success: false }
        }
    })

    // Inventory Logs handlers REMOVED

    console.log('✅ IPC Handlers registered')
}
