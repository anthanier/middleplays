import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto'
import { env } from '@/configs/env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

// Derive key from secret
function deriveKey(secret: string, salt: string): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH)
}

/**
 * Encrypt credentials (email/password for game accounts)
 * Returns format: iv:authTag:encrypted
 */
export async function encryptCredentials(plaintext: string): Promise<string> {
  if (!plaintext || typeof plaintext !== 'string' || plaintext.trim().length === 0) {
    throw new Error('Plaintext cannot be empty')
  }
  
  const iv = randomBytes(IV_LENGTH)
  const key = deriveKey(env.CREDENTIAL_ENCRYPTION_KEY, env.CREDENTIAL_ENCRYPTION_SALT)
  
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Validate hex string
 */
function isValidHex(str: string): boolean {
  return /^[0-9a-f]+$/i.test(str)
}

/**
 * Decrypt credentials
 */
export async function decryptCredentials(encryptedData: string): Promise<string> {
  const parts = encryptedData.split(':')
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }

  const ivHex = parts[0]!
  const authTagHex = parts[1]!
  const encrypted = parts[2]!
  
  // Validate hex format
  if (!isValidHex(ivHex) || !isValidHex(authTagHex) || !isValidHex(encrypted)) {
    throw new Error('Invalid hex format in encrypted data')
  }
  
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const key = deriveKey(env.CREDENTIAL_ENCRYPTION_KEY, env.CREDENTIAL_ENCRYPTION_SALT)
  
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Hashes a token using SHA256. Used for storing tokens in the DB.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a secure token and its hash.
 * Returns the raw token (for the user) and the hashed token (for the DB).
 */
export async function generateTokenWithHash(
  tokenLength = 32
): Promise<{ token: string; hash: string }> {
  const token = randomBytes(tokenLength).toString('hex')
  const hash = hashToken(token)
  return { token, hash }
}

/**
 * Generate random ID (for transaction IDs, etc)
 */
export function generateId(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const randomValues = randomBytes(length)
  
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i]! % chars.length]
  }
  
  return result
}

/**
 * Hash password using Bun's built-in password hasher
 */
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: 65536, // 64 MB
    timeCost: 3,
  })
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash)
}