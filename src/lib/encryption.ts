/**
 * AES-256-GCM Encryption Library for Zion Recruit
 * 
 * Provides secure encryption/decryption for API credentials and sensitive data.
 * Uses AES-256-GCM (Galois/Counter Mode) for authenticated encryption.
 * 
 * Format: iv:authTag:encrypted (all hex-encoded)
 */

import * as crypto from 'crypto';

// Configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32;
const ITERATIONS = 100000; // PBKDF2 iterations

// Singleton for encryption key
let cachedKey: Buffer | null = null;

/**
 * Get or derive the encryption key from environment variable
 * Falls back to generating a default key with warning (for development only)
 */
function getEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const encryptionKeyEnv = process.env.ENCRYPTION_KEY;

  if (encryptionKeyEnv) {
    // If the key is already a 32-byte hex string, use it directly
    if (encryptionKeyEnv.length === 64 && /^[0-9a-fA-F]+$/.test(encryptionKeyEnv)) {
      cachedKey = Buffer.from(encryptionKeyEnv, 'hex');
      return cachedKey;
    }

    // If it's a passphrase, derive a key using PBKDF2
    const salt = crypto.createHash('sha256').update('zion-recruit-encryption-salt').digest();
    cachedKey = crypto.pbkdf2Sync(encryptionKeyEnv, salt, ITERATIONS, KEY_LENGTH, 'sha256');
    return cachedKey;
  }

  // DEVELOPMENT ONLY: Generate a deterministic key based on machine info
  // This should NEVER be used in production
  console.warn(
    '\x1b[33m%s\x1b[0m',
    '⚠️  WARNING: ENCRYPTION_KEY not set in environment. Using generated key (NOT SECURE FOR PRODUCTION!)'
  );
  console.warn(
    '\x1b[33m%s\x1b[0m',
    '   Set ENCRYPTION_KEY in your .env file for production use.'
  );
  console.warn(
    '\x1b[33m%s\x1b[0m',
    '   Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );

  // Generate a deterministic key for development (still unique per machine)
  const machineId = `${process.cwd()}-${Date.now()}`;
  const devSalt = crypto.createHash('sha256').update('zion-dev-salt').digest();
  cachedKey = crypto.pbkdf2Sync(machineId, devSalt, ITERATIONS, KEY_LENGTH, 'sha256');
  
  return cachedKey;
}

/**
 * Generate a secure random IV (Initialization Vector)
 */
function generateIV(): Buffer {
  return crypto.randomBytes(IV_LENGTH);
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * 
 * @param text - The plaintext to encrypt
 * @returns The encrypted string in format: iv:authTag:encrypted
 * @throws Error if encryption fails
 */
export function encrypt(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input: text must be a non-empty string');
  }

  try {
    const key = getEncryptionKey();
    const iv = generateIV();
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });

    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Return in format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Encryption failed: ${message}`);
  }
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * 
 * @param encrypted - The encrypted string in format: iv:authTag:encrypted
 * @returns The decrypted plaintext
 * @throws Error if decryption fails or authentication tag is invalid
 */
export function decrypt(encrypted: string): string {
  if (!encrypted || typeof encrypted !== 'string') {
    throw new Error('Invalid input: encrypted must be a non-empty string');
  }

  try {
    // Handle legacy format (base64 encoded with 'enc:' prefix)
    if (encrypted.startsWith('enc:')) {
      console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: Decrypting legacy encoded credential. Please migrate to AES-256-GCM encryption.');
      const base64Part = encrypted.slice(4);
      return Buffer.from(base64Part, 'base64').toString('utf8');
    }

    // Parse the encrypted string
    const parts = encrypted.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format. Expected: iv:authTag:encrypted');
    }

    const [ivHex, authTagHex, encryptedData] = parts;

    // Validate hex strings
    if (!/^[0-9a-fA-F]+$/.test(ivHex) || !/^[0-9a-fA-F]+$/.test(authTagHex) || !/^[0-9a-fA-F]+$/.test(encryptedData)) {
      throw new Error('Invalid encrypted data: not valid hex encoding');
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`);
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });

    // Set the authentication tag for verification
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Check if it's a legacy format that might have been double-encoded
    if (encrypted.startsWith('enc:')) {
      // Already handled above
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide more specific error messages
    if (message.includes('Unsupported state') || message.includes('unable to decrypt')) {
      throw new Error('Decryption failed: Authentication tag verification failed. Data may have been tampered with or key is incorrect.');
    }
    
    throw new Error(`Decryption failed: ${message}`);
  }
}

/**
 * Create a SHA-256 hash of a string
 * Useful for creating non-reversible hashes (e.g., for comparison purposes)
 * 
 * @param text - The text to hash
 * @returns The SHA-256 hash as hex string
 */
export function hash(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input: text must be a non-empty string');
  }

  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Create an HMAC-SHA256 hash with a secret
 * Useful for verifying integrity with a known secret
 * 
 * @param text - The text to hash
 * @param secret - The secret key for HMAC
 * @returns The HMAC-SHA256 hash as hex string
 */
export function hmacHash(text: string, secret: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input: text must be a non-empty string');
  }
  if (!secret || typeof secret !== 'string') {
    throw new Error('Invalid input: secret must be a non-empty string');
  }

  return crypto.createHmac('sha256', secret).update(text, 'utf8').digest('hex');
}

/**
 * Generate a secure random token
 * Useful for API keys, session tokens, etc.
 * 
 * @param bytes - Number of bytes (default: 32 for 256 bits)
 * @returns Random token as hex string
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a secure random string (URL-safe base64)
 * 
 * @param bytes - Number of bytes (default: 32)
 * @returns Random string in URL-safe base64 format
 */
export function generateSecureString(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Constant-time comparison to prevent timing attacks
 * Useful for comparing API keys or tokens
 * 
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings are equal, false otherwise
 */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/**
 * Check if a value is encrypted with AES-256-GCM (new format)
 * 
 * @param value - The value to check
 * @returns True if the value appears to be AES-256-GCM encrypted
 */
export function isAESEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // Check for legacy format
  if (value.startsWith('enc:')) {
    return false;
  }

  // Check for AES-256-GCM format: iv:authTag:encrypted
  const parts = value.split(':');
  if (parts.length !== 3) {
    return false;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  // Validate hex strings and lengths
  const isValidHex = (str: string) => /^[0-9a-fA-F]+$/.test(str);
  
  return (
    isValidHex(ivHex) &&
    isValidHex(authTagHex) &&
    isValidHex(encryptedHex) &&
    ivHex.length === IV_LENGTH * 2 && // 16 bytes = 32 hex chars
    authTagHex.length === AUTH_TAG_LENGTH * 2 // 16 bytes = 32 hex chars
  );
}

/**
 * Generate a new encryption key suitable for production use
 * Run this to create a secure key for your .env file
 * 
 * @returns A 32-byte (64 hex character) encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Clear the cached encryption key (useful for testing or key rotation)
 */
export function clearCachedKey(): void {
  cachedKey = null;
}

/**
 * Check if the encryption key is properly configured
 * 
 * @returns Object with status and message
 */
export function checkEncryptionStatus(): { isConfigured: boolean; message: string } {
  const hasEnvKey = !!process.env.ENCRYPTION_KEY;
  
  if (hasEnvKey) {
    return {
      isConfigured: true,
      message: 'Encryption key is properly configured from environment variable.'
    };
  }
  
  return {
    isConfigured: false,
    message: 'WARNING: ENCRYPTION_KEY not set. Using development fallback (NOT SECURE FOR PRODUCTION!). Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  };
}

// Export types for external use
export type EncryptionResult = {
  encrypted: string;
  iv: string;
  authTag: string;
};

export type DecryptionResult = {
  decrypted: string;
  verified: boolean;
};
