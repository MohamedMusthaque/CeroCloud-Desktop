import { app, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

// NIC (national identity card) scans attached to suppliers and clients.
// Files live in userData/attachments/nic; records store only the generated file name.

// Only PDFs and images are accepted. The extension is a first filter; the file's own bytes decide (see detectFileType)
export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.heic', '.heif']
const MAX_BYTES = 10 * 1024 * 1024

// HEIC/HEIF photos (e.g. from phones) are ISO media files whose brand names the image codec
const HEIF_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']

// Identifies a PDF or image by its signature bytes and returns the extension to store it with, or null
export function detectFileType(head: Buffer): string | null {
    const ascii = (start: number, end: number) => head.subarray(start, end).toString('latin1')
    const startsWith = (...bytes: number[]) => bytes.every((b, i) => head[i] === b)

    if (ascii(0, 5) === '%PDF-') return '.pdf'
    if (startsWith(0xff, 0xd8, 0xff)) return '.jpg'
    if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return '.png'
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return '.webp'
    if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') return '.gif'
    if (ascii(0, 2) === 'BM' && head.length >= 26) return '.bmp'
    if (startsWith(0x49, 0x49, 0x2a, 0x00) || startsWith(0x4d, 0x4d, 0x00, 0x2a)) return '.tiff'
    if (ascii(4, 8) === 'ftyp' && HEIF_BRANDS.includes(ascii(8, 12))) return ascii(8, 12).startsWith('he') ? '.heic' : '.heif'
    return null
}

export class AttachmentError extends Error {
    constructor(public code: 'TYPE' | 'SIZE' | 'NOT_FOUND') {
        super(code)
    }
}

function nicDir(): string {
    const dir = path.join(app.getPath('userData'), 'attachments', 'nic')
    fs.mkdirSync(dir, { recursive: true })
    return dir
}

// Resolves a stored file name inside the NIC folder; rejects anything that could point elsewhere
function nicPath(filename: string): string {
    const name = path.basename(String(filename ?? ''))
    if (!name || name !== filename || !ALLOWED_EXTENSIONS.includes(path.extname(name).toLowerCase())) {
        throw new AttachmentError('NOT_FOUND')
    }
    return path.join(nicDir(), name)
}

async function readHead(filePath: string): Promise<Buffer> {
    const handle = await fs.promises.open(filePath, 'r')
    try {
        const head = Buffer.alloc(32)
        const { bytesRead } = await handle.read(head, 0, head.length, 0)
        return head.subarray(0, bytesRead)
    } finally {
        await handle.close()
    }
}

// Copies a picked PDF or image into the NIC folder under a new random name.
// The stored extension comes from the content, so a renamed file can't pass as an image or PDF.
export async function saveNicAttachment(sourcePath: string): Promise<string> {
    if (!ALLOWED_EXTENSIONS.includes(path.extname(String(sourcePath ?? '')).toLowerCase())) throw new AttachmentError('TYPE')
    const { size } = await fs.promises.stat(sourcePath)
    if (size > MAX_BYTES) throw new AttachmentError('SIZE')
    const ext = detectFileType(await readHead(sourcePath))
    if (!ext) throw new AttachmentError('TYPE')

    const filename = `nic_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`
    await fs.promises.copyFile(sourcePath, path.join(nicDir(), filename))
    return filename
}

// Opens the file in the system's default viewer
export async function openNicAttachment(filename: string): Promise<void> {
    const filePath = nicPath(filename)
    if (!fs.existsSync(filePath)) throw new AttachmentError('NOT_FOUND')
    const error = await shell.openPath(filePath)
    if (error) throw new Error(error)
}

export function deleteNicAttachment(filename: string | null | undefined): void {
    if (!filename) return
    try {
        fs.rmSync(nicPath(filename), { force: true })
    } catch {
        // An invalid or missing name has nothing to delete
    }
}

// Backups: read and write the raw bytes
export async function readNicAttachment(filename: string): Promise<Buffer> {
    return fs.promises.readFile(nicPath(filename))
}

export async function restoreNicAttachment(filename: string, data: Uint8Array): Promise<void> {
    await fs.promises.writeFile(nicPath(filename), Buffer.from(data))
}

// Removes files no record points to (forms closed without saving, replaced files after a restore, ...)
export function sweepNicAttachments(referenced: Set<string>): void {
    try {
        for (const name of fs.readdirSync(nicDir())) {
            if (!referenced.has(name)) fs.rmSync(path.join(nicDir(), name), { force: true })
        }
    } catch (error) {
        console.error('NIC attachment sweep failed:', error)
    }
}
