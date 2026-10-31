import { app, BrowserWindow, protocol, net } from 'electron'
import path from 'path'
import fs from 'fs'
import { pathToFileURL } from 'url'
import './migrateLegacyData'
import { initializeDatabase, closeDatabase, getNicAttachmentNames } from './database'
import { sweepNicAttachments } from './attachments'
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
    { scheme: 'nexoracloud-image', privileges: { secure: true, supportFetchAPI: true, standard: true, bypassCSP: true, stream: true } }
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
    // NIC files left by forms closed without saving, or replaced by a restore
    sweepNicAttachments(getNicAttachmentNames())

    // Register custom protocol handler
    // Register custom protocol handler
    protocol.handle('nexoracloud-image', (request: Request) => {
        const urlRequest = request.url.replace('nexoracloud-image://', '')
        let filename = decodeURIComponent(urlRequest)
        // Remove the trailing slash the browser adds when it treats the file as a hostname
        if (filename.endsWith('/') || filename.endsWith('\\')) {
            filename = filename.slice(0, -1)
        }
        const imagePath = path.join(app.getPath('userData'), 'images', 'products', filename)

        // Use pathToFileURL for maximum compatibility
        return net.fetch(pathToFileURL(imagePath).toString())
    })

    createWindow()

    // Initialize the auto-updater (handlers are always available, but it only checks in production)
    if (mainWindow) {
        autoUpdateService = new AutoUpdateService(mainWindow)
        // Only enable automatic checks in production
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
            console.log('Previous installation found. Migrating images...')
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
            if (copied > 0) console.log(`${copied} images migrated from Nexus Gestor Local.`)
        }
    } catch (error) {
        console.error('Error migrating old images:', error)
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

