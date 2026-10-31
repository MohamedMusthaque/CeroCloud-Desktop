import { app } from 'electron'
import path from 'path'
import fs from 'fs'

const LOG_FILENAME = 'app-errors.log'

// Helper to get the log path safely
// (app.getPath could fail if called before app.ready, though that is rare for modules imported later)
const getLogPath = () => {
    try {
        return path.join(app.getPath('userData'), LOG_FILENAME)
    } catch {
        return path.join(process.cwd(), LOG_FILENAME) // Fallback
    }
}

export const logger = {
    error: (context: string, error: unknown) => {
        const timestamp = new Date().toISOString()
        const errorMessage = error instanceof Error ? error.stack || error.message : String(error)

        const logLine = `[${timestamp}] [ERROR] [${context}] ${errorMessage}\n` +
            `--------------------------------------------------------------------------------\n`

        // Always print to the console for development
        console.error(`[${context}]`, error)

        try {
            fs.appendFileSync(getLogPath(), logLine, 'utf-8')
        } catch (writeErr) {
            console.error('❌ FALLÓ ESCRITURA DE LOG:', writeErr)
        }
    },

    info: (context: string, message: string) => {
        const timestamp = new Date().toISOString()
        const logLine = `[${timestamp}] [INFO] [${context}] ${message}\n`

        console.log(`[${context}] ${message}`)

        try {
            fs.appendFileSync(getLogPath(), logLine, 'utf-8')
        } catch (writeErr) {
            console.error('❌ FALLÓ ESCRITURA DE LOG:', writeErr)
        }
    },

    // Clear old logs when the file gets too large (> 5MB)
    rotate: () => {
        try {
            const logPath = getLogPath()
            if (fs.existsSync(logPath)) {
                const stats = fs.statSync(logPath)
                if (stats.size > 5 * 1024 * 1024) { // 5MB
                    const backupPath = logPath + '.old'
                    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
                    fs.renameSync(logPath, backupPath)
                    logger.info('Logger', 'Log rotado por tamaño excesivo')
                }
            }
        } catch (e) {
            console.error('Error rotando logs:', e)
        }
    }
}
