import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// La app se llamaba CeroCloud: mover su carpeta de datos y su base de datos a los nombres nuevos.
// Debe ejecutarse antes de importar ./database, que abre la base de datos al cargarse.
function migrateLegacyData() {
    const userData = app.getPath('userData')
    const legacyDir = path.join(
        path.dirname(userData),
        path.basename(userData).replace('NexoraCloud', 'CeroCloud').replace('nexoracloud', 'cerocloud')
    )

    try {
        if (legacyDir !== userData && fs.existsSync(legacyDir) && !fs.existsSync(userData)) {
            fs.renameSync(legacyDir, userData)
            console.log(`📦 Datos migrados de ${legacyDir} a ${userData}`)
        }

        const legacyDb = path.join(userData, 'cerocloud.db')
        const newDb = path.join(userData, 'nexoracloud.db')
        if (fs.existsSync(legacyDb) && !fs.existsSync(newDb)) {
            for (const suffix of ['', '-wal', '-shm']) {
                if (fs.existsSync(legacyDb + suffix)) fs.renameSync(legacyDb + suffix, newDb + suffix)
            }
            console.log('📦 Base de datos cerocloud.db renombrada a nexoracloud.db')
        }
    } catch (error) {
        console.error('❌ Error migrando datos de CeroCloud:', error)
    }
}

migrateLegacyData()
