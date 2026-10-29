import { app, BrowserWindow, protocol, net } from 'electron'
import path from 'path'
import fs from 'fs'
import { pathToFileURL } from 'url'
import { initializeDatabase, closeDatabase } from './database'
import { registerIpcHandlers } from './ipc'
import { AutoUpdateService } from './autoUpdater'

let mainWindow: BrowserWindow | null = null
let autoUpdateService: AutoUpdateService | null = null


function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
        titleBarStyle: 'default',
        show: false, // Don't show until ready
    })

    // Load the app
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173')
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show()
    })

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

// Register privileges BEFORE app is ready
// Register privileges BEFORE app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'cerocloud-image', privileges: { secure: true, supportFetchAPI: true, standard: true, bypassCSP: true, stream: true } }
])

// Prevent multiple instances: a second instance quits before touching the database or cache
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }
    })
}

// App lifecycle
app.whenReady().then(() => {
    if (!gotTheLock) return

    // Initialize database and IPC handlers
    initializeDatabase()
    registerIpcHandlers()
    rescueOldImages()

    // Register custom protocol handler
    // Register custom protocol handler
    protocol.handle('cerocloud-image', (request: Request) => {
        const urlRequest = request.url.replace('cerocloud-image://', '')
        let filename = decodeURIComponent(urlRequest)
        // Eliminar slash final que el navegador agrega automáticamente al tratar el archivo como hostname
        if (filename.endsWith('/') || filename.endsWith('\\')) {
            filename = filename.slice(0, -1)
        }
        const imagePath = path.join(app.getPath('userData'), 'images', 'products', filename)

        // Usar pathToFileURL para máxima compatibilidad
        return net.fetch(pathToFileURL(imagePath).toString())
    })

    createWindow()

    // Inicializar auto-updater (handlers siempre disponibles, pero solo verifica en producción)
    if (mainWindow) {
        autoUpdateService = new AutoUpdateService(mainWindow)
        // Solo activar verificación automática en producción
        if (app.isPackaged) {
            autoUpdateService.startAutoCheck(6)
        }
    }

    app.on('activate', () => {
        // On macOS, re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

function rescueOldImages() {
    try {
        const oldPath = path.join(app.getPath('appData'), 'nexus-gestor-local', 'images', 'products')
        const newPath = path.join(app.getPath('userData'), 'images', 'products')

        if (fs.existsSync(oldPath)) {
            console.log('🔄 Detectada instalación anterior. Intentando migrar imágenes...')
            if (!fs.existsSync(newPath)) {
                fs.mkdirSync(newPath, { recursive: true })
            }

            const files = fs.readdirSync(oldPath)
            let copied = 0
            for (const file of files) {
                const src = path.join(oldPath, file)
                const dest = path.join(newPath, file)
                if (!fs.existsSync(dest)) {
                    fs.copyFileSync(src, dest)
                    copied++
                }
            }
            if (copied > 0) console.log(`✅ ${copied} imágenes migradas exitosamente desde Nexus Gestor Local.`)
        }
    } catch (error) {
        console.error('Error migrando imágenes antiguas:', error)
    }
}

app.on('window-all-closed', () => {
    // Cleanup auto-updater
    if (autoUpdateService) {
        autoUpdateService.destroy()
        autoUpdateService = null
    }

    // Close database before quitting
    closeDatabase()

    // On macOS, apps stay active until user quits explicitly
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

