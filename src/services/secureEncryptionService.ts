/**
 * Encryption service for NexoraCloud
 * 
 * Uses:
 * - PBKDF2 for key derivation (KDF) - native Web Crypto API
 * - AES-256-GCM for authenticated encryption
 * - A unique random salt per backup
 * - A unique random IV (nonce) per operation
 */

import { t } from '@/i18n'

interface EncryptedData {
    version: number
    salt: string  // Base64
    iv: string    // Base64
    ciphertext: string  // Base64
    authTag: string  // Base64
}

// Helper to convert a large Uint8Array to Base64 without the spread operator
function arrayToBase64(array: Uint8Array): string {
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.subarray(i, Math.min(i + chunkSize, array.length))
        binary += String.fromCharCode.apply(null, Array.from(chunk))
    }
    return btoa(binary)
}

// Helper to convert Base64 to a Uint8Array
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
     * Encrypts data with a password using PBKDF2 + AES-256-GCM
     */
    async encrypt(plaintext: string, password: string): Promise<string> {
        try {
            // 1. Generate a random salt (16 bytes)
            const salt = crypto.getRandomValues(new Uint8Array(16))

            // 2. Convert the password to an importable format
            const encoder = new TextEncoder()
            const passwordData = encoder.encode(password)

            // 3. Import the password as the base key
            const baseKey = await crypto.subtle.importKey(
                'raw',
                passwordData,
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            )

            // 4. Derive the key with PBKDF2 (600,000 iterations = very secure)
            const cryptoKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt as BufferSource,
                    iterations: 600000,  // OWASP recommends at least 600k as of 2024
                    hash: 'SHA-256'
                },
                baseKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt']
            )

            // 5. Generate a random IV (12 bytes for GCM)
            const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array

            // 6. Encrypt with AES-256-GCM
            const data = encoder.encode(plaintext)

            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    iv: iv as any,
                    tagLength: 128  // 16-byte authTag
                },
                cryptoKey,
                data
            )

            // 7. Split ciphertext and authTag
            const ciphertextArray = new Uint8Array(ciphertext)
            const actualCiphertext = ciphertextArray.slice(0, -16)
            const authTag = ciphertextArray.slice(-16)

            // 8. Build an object with every component (using the helper for large arrays)
            const encrypted: EncryptedData = {
                version: 1,
                salt: arrayToBase64(salt),
                iv: arrayToBase64(iv),
                ciphertext: arrayToBase64(actualCiphertext),
                authTag: arrayToBase64(authTag)
            }

            // 9. Return as JSON
            return JSON.stringify(encrypted)
        } catch (error) {
            console.error('Encryption error:', error)
            throw new Error(t('encryption.encryptError'))
        }
    },

    /**
     * Decrypts data using the password
     */
    async decrypt(encryptedData: string, password: string): Promise<string> {
        try {
            // 1. Parse the encrypted data
            const encrypted: EncryptedData = JSON.parse(encryptedData)

            // 2. Validate the version
            if (encrypted.version !== 1) {
                throw new Error(t('encryption.unsupportedVersion'))
            }

            // 3. Decode from Base64 (using the helper)
            const salt = base64ToArray(encrypted.salt)
            const iv = base64ToArray(encrypted.iv)
            const ciphertext = base64ToArray(encrypted.ciphertext)
            const authTag = base64ToArray(encrypted.authTag)

            // 4. Convert the password
            const encoder = new TextEncoder()
            const passwordData = encoder.encode(password)

            // 5. Import the password as the base key
            const baseKey = await crypto.subtle.importKey(
                'raw',
                passwordData,
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            )

            // 6. Derive the key with PBKDF2 (same parameters)
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

            // 7. Combine ciphertext + authTag
            const combined = new Uint8Array(ciphertext.length + authTag.length)
            combined.set(ciphertext)
            combined.set(authTag, ciphertext.length)

            // 8. Decrypt with AES-256-GCM
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
            // Authentication error = wrong password
            if (error instanceof DOMException && error.name === 'OperationError') {
                throw new Error(t('encryption.wrongPassword'))
            }
            throw new Error(t('encryption.decryptError'))
        }
    },

    /**
     * Checks that a string has the encrypted-data format
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
