// Runs electron-builder for local builds (npm run build / build:win / build:mac / build:linux).
//
// electron-builder must delete the previous unpacked app (release/<platform>-unpacked) before packaging.
// On Windows that fails when another program keeps release/win-unpacked/resources/app.asar open:
// VS Code and other Electron apps open .asar files they come across (Electron treats them as folders),
// and OneDrive or a running copy of the app can hold them too. Then the build stops with
// "The process cannot access the file because it is being used by another process".
//
// This script clears the old unpacked folders first. If they are locked, it says so and packages into a
// fresh release-<date-time> folder instead, so the build still finishes. Extra arguments (--win, --mac,
// --linux …) are passed on to electron-builder. CI and semantic-release call electron-builder directly.
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const OUTPUT = 'release'
const args = process.argv.slice(2)

// The unpacked app folders electron-builder recreates on every build
function unpackedFolders(dir) {
    if (!existsSync(dir)) return []
    return readdirSync(dir, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && entry.name.endsWith('-unpacked'))
        .map(entry => join(dir, entry.name))
}

function tryClear(dir) {
    const locked = []
    for (const folder of unpackedFolders(dir)) {
        try {
            rmSync(folder, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 })
        } catch (error) {
            if (['EBUSY', 'EPERM', 'EACCES', 'ENOTEMPTY'].includes(error.code)) locked.push(folder)
            else throw error
        }
    }
    return locked
}

let output = OUTPUT
const locked = tryClear(OUTPUT)
if (locked.length > 0) {
    // Local date and time, e.g. release-20261106-182310
    const now = new Date()
    const two = (n) => String(n).padStart(2, '0')
    const stamp = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`
    output = `${OUTPUT}-${stamp}`
    console.warn([
        '',
        `  ! ${locked.join(', ')} is in use by another program, so it can't be replaced.`,
        '    Usually VS Code (it opens app.asar files it comes across), OneDrive, or the app itself still running.',
        '    To free it: close the app if it is running, then in VS Code run "Developer: Reload Window".',
        `    This build goes to ${output}/ instead.`,
        ''
    ].join('\n'))
}

const result = spawnSync('electron-builder', [...args, `-c.directories.output=${output}`], { stdio: 'inherit', shell: true })
if (result.status === 0 && output !== OUTPUT) console.log(`\n  Installer written to ${output}/\n`)
process.exit(result.status ?? 1)
