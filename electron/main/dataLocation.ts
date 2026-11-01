import { app, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

// ==========================================
// Data folder: the SQLite database plus the files its records point to (product images, NIC scans).
// Defaults to userData; a folder chosen in Settings is remembered in userData/data-location.json.
// Logs and the location file itself always stay in userData.
// ==========================================

export const DB_FILENAME = 'nexoracloud.db'

// Folders that belong to a database and move with it
const DATA_FOLDERS = [path.join('images', 'products'), path.join('attachments', 'nic')]

let dataDirectory = ''

const configPath = () => path.join(app.getPath('userData'), 'data-location.json')
export const defaultDirectory = () => app.getPath('userData')

export function getDataDirectory(): string {
    return dataDirectory || defaultDirectory()
}

export function dataPath(...parts: string[]): string {
    return path.join(getDataDirectory(), ...parts)
}

export function getDbPath(): string {
    return dataPath(DB_FILENAME)
}

export function samePath(a: string, b: string): boolean {
    const norm = (p: string) => path.resolve(p).replace(/[\\/]+$/, '')
    return process.platform === 'win32' ? norm(a).toLowerCase() === norm(b).toLowerCase() : norm(a) === norm(b)
}

export function isDefaultDirectory(directory: string): boolean {
    return samePath(directory, defaultDirectory())
}

function readConfiguredDirectory(): string | null {
    try {
        const { directory } = JSON.parse(fs.readFileSync(configPath(), 'utf-8'))
        return typeof directory === 'string' && directory ? directory : null
    } catch {
        return null // no file yet = default location
    }
}

export function saveDataDirectory(directory: string) {
    if (isDefaultDirectory(directory)) fs.rmSync(configPath(), { force: true })
    else fs.writeFileSync(configPath(), JSON.stringify({ directory }, null, 2))
}

// Writes a probe file: access checks are unreliable on Windows and network drives
export function isWritableDirectory(directory: string): boolean {
    try {
        if (!fs.statSync(directory).isDirectory()) return false
        const probe = path.join(directory, `.nexoracloud-write-test-${process.pid}`)
        fs.writeFileSync(probe, '')
        fs.rmSync(probe, { force: true })
        return true
    } catch {
        return false
    }
}

// Runs once the app is ready, before the database opens. A custom folder that can't be reached
// (unplugged drive, deleted folder) is never silently replaced by a fresh, empty database.
// Returns false when the user chose to quit.
export function initDataDirectory(): boolean {
    let directory = readConfiguredDirectory() ?? defaultDirectory()

    while (!isDefaultDirectory(directory) && !isWritableDirectory(directory)) {
        const choice = dialog.showMessageBoxSync({
            type: 'warning',
            title: 'NexoraCloud',
            message: 'The data folder cannot be reached',
            detail: `${directory}\n\nConnect the drive or restore the folder and choose Retry. "Use default location" opens the database in the app folder instead.`,
            buttons: ['Retry', 'Use default location', 'Quit'],
            defaultId: 0,
            cancelId: 2,
            noLink: true
        })
        if (choice === 2) return false
        if (choice === 1) {
            saveDataDirectory(defaultDirectory())
            directory = defaultDirectory()
        }
    }

    dataDirectory = directory
    return true
}

// Copies the open database (consistent snapshot, WAL included) and its files into `target`.
// Files at the current location are left in place as a safety copy.
export async function copyDataTo(backup: (destination: string) => Promise<unknown>, target: string) {
    const targetDb = path.join(target, DB_FILENAME)
    const tempDb = `${targetDb}.tmp`
    fs.rmSync(tempDb, { force: true })
    await backup(tempDb)
    // Stale WAL/SHM files from a database being replaced would corrupt the new copy
    for (const suffix of ['', '-wal', '-shm']) fs.rmSync(targetDb + suffix, { force: true })
    fs.renameSync(tempDb, targetDb)

    for (const folder of DATA_FOLDERS) {
        const source = dataPath(folder)
        if (fs.existsSync(source)) fs.cpSync(source, path.join(target, folder), { recursive: true, force: true })
    }
}

export function hasDatabase(directory: string): boolean {
    return fs.existsSync(path.join(directory, DB_FILENAME))
}
