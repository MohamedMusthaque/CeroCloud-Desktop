import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// The app used to be called CeroCloud: move its data folder and database to the new names.
// Must run before importing ./database, which opens the database when it loads.
function migrateLegacyData() {
    const userData = app.getPath('userData')
    const legacyDir = path.join(
        path.dirname(userData),
        path.basename(userData).replace('NexoraCloud', 'CeroCloud').replace('nexoracloud', 'cerocloud')
    )

    try {
        if (legacyDir !== userData && fs.existsSync(legacyDir) && !fs.existsSync(userData)) {
            fs.renameSync(legacyDir, userData)
            console.log(`Data migrated from ${legacyDir} to ${userData}`)
        }

        const legacyDb = path.join(userData, 'cerocloud.db')
        const newDb = path.join(userData, 'nexoracloud.db')
        if (fs.existsSync(legacyDb) && !fs.existsSync(newDb)) {
            for (const suffix of ['', '-wal', '-shm']) {
                if (fs.existsSync(legacyDb + suffix)) fs.renameSync(legacyDb + suffix, newDb + suffix)
            }
            console.log('Database cerocloud.db renamed to nexoracloud.db')
        }
    } catch (error) {
        console.error('Error migrating CeroCloud data:', error)
    }
}

migrateLegacyData()
