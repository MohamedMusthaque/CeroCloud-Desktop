/**
 * Servicio de cifrado profesional para CeroCloud
 * 
 * Usa:
 * - PBKDF2 para derivación de clave (KDF) - Web Crypto API nativa
 * - AES-256-GCM para cifrado autenticado
 * - Salt aleatorio único por backup
 * - IV (Nonce) aleatorio único por operación
 */

import { t } from '@/i18n'

interface EncryptedData {
    version: number
    salt: string  // Base64
    iv: string    // Base64
    ciphertext: string  // Base64
    authTag: string  // Base64
}

// Helper para convertir Uint8Array grande a Base64 sin spread operator
function arrayToBase64(array: Uint8Array): string {
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.subarray(i, Math.min(i + chunkSize, array.length))
        binary += String.fromCharCode.apply(null, Array.from(chunk))
    }
    return btoa(binary)
}

// Helper para convertir Base64 a Uint8Array
function base64ToArray(base64: string): Uint8Array {
    const binary = atob(base64)
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i)
    }
    return array
}

export const secureEncryptionService = {
    /**
     * Cifra datos con una contraseña usando PBKDF2 + AES-256-GCM
     */
    async encrypt(plaintext: string, password: string): Promise<string> {
        try {
            // 1. Generar salt aleatorio (16 bytes)
            const salt = crypto.getRandomValues(new Uint8Array(16))

            // 2. Convertir contraseña a formato para importar
            const encoder = new TextEncoder()
            const passwordData = encoder.encode(password)

            // 3. Importar contraseña como clave base
            const baseKey = await crypto.subtle.importKey(
                'raw',
                passwordData,
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            )

            // 4. Derivar clave con PBKDF2 (600,000 iteraciones = muy seguro)
            const cryptoKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt as BufferSource,
                    iterations: 600000,  // OWASP recomienda mínimo 600k para 2024
                    hash: 'SHA-256'
                },
                baseKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt']
            )

            // 5. Generar IV aleatorio (12 bytes para GCM)
            const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array

            // 6. Cifrar con AES-256-GCM
            const data = encoder.encode(plaintext)

            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    iv: iv as any,
                    tagLength: 128  // 16 bytes de authTag
                },
                cryptoKey,
                data
            )

            // 7. Separar ciphertext y authTag
            const ciphertextArray = new Uint8Array(ciphertext)
            const actualCiphertext = ciphertextArray.slice(0, -16)
            const authTag = ciphertextArray.slice(-16)

            // 8. Crear objeto con todos los componentes (usando helper para arrays grandes)
            const encrypted: EncryptedData = {
                version: 1,
                salt: arrayToBase64(salt),
                iv: arrayToBase64(iv),
                ciphertext: arrayToBase64(actualCiphertext),
                authTag: arrayToBase64(authTag)
            }

            // 9. Retornar como JSON
            return JSON.stringify(encrypted)
        } catch (error) {
            console.error('Encryption error:', error)
            throw new Error(t('encryption.encryptError'))
        }
    },

    /**
     * Descifra datos usando la contraseña
     */
    async decrypt(encryptedData: string, password: string): Promise<string> {
        try {
            // 1. Parsear datos cifrados
            const encrypted: EncryptedData = JSON.parse(encryptedData)

            // 2. Validar versión
            if (encrypted.version !== 1) {
                throw new Error(t('encryption.unsupportedVersion'))
            }

            // 3. Decodificar de Base64 (usando helper)
            const salt = base64ToArray(encrypted.salt)
            const iv = base64ToArray(encrypted.iv)
            const ciphertext = base64ToArray(encrypted.ciphertext)
            const authTag = base64ToArray(encrypted.authTag)

            // 4. Convertir contraseña
            const encoder = new TextEncoder()
            const passwordData = encoder.encode(password)

            // 5. Importar contraseña como clave base
            const baseKey = await crypto.subtle.importKey(
                'raw',
                passwordData,
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            )

            // 6. Derivar clave con PBKDF2 (mismos parámetros)
            const cryptoKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt as BufferSource,
                    iterations: 600000,
                    hash: 'SHA-256'
                },
                baseKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            )

            // 7. Combinar ciphertext + authTag
            const combined = new Uint8Array(ciphertext.length + authTag.length)
            combined.set(ciphertext)
            combined.set(authTag, ciphertext.length)

            // 8. Descifrar con AES-256-GCM
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv as BufferSource,
                    tagLength: 128
                },
                cryptoKey,
                combined
            )

            // 9. Convertir a string
            const decoder = new TextDecoder()
            return decoder.decode(decrypted)
        } catch (error) {
            console.error('Decryption error:', error)
            // Error de autenticación = contraseña incorrecta
            if (error instanceof DOMException && error.name === 'OperationError') {
                throw new Error(t('encryption.wrongPassword'))
            }
            throw new Error(t('encryption.decryptError'))
        }
    },

    /**
     * Valida que una cadena tenga el formato de datos cifrados
     */
    isEncrypted(data: string): boolean {
        try {
            const parsed = JSON.parse(data)
            return parsed.version && parsed.salt && parsed.iv && parsed.ciphertext && parsed.authTag
        } catch {
            return false
        }
    }
}
