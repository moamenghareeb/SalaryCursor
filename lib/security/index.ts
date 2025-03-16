import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';

/**
 * Security utilities for SalaryCursor application
 * Implements secure data handling, encryption, and sanitization
 */

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input - The user input to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Replace potentially dangerous characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;');
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param data - Data to encrypt
 * @param key - Encryption key (from environment variables)
 * @returns Encrypted data as base64 string with IV
 */
export function encryptData(data: string, key = process.env.ENCRYPTION_KEY): string {
  try {
    if (!key) {
      throw new Error('Encryption key not provided');
    }
    
    // Create a buffer from the encryption key
    const keyBuffer = crypto
      .createHash('sha256')
      .update(String(key))
      .digest('base64')
      .substring(0, 32);
    
    // Create initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Return IV + Auth Tag + Encrypted data
    return Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]).toString('base64');
  } catch (error) {
    // Log encryption error to Sentry
    Sentry.captureException(error, {
      tags: { type: 'encryption_error' }
    });
    
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data encrypted with encryptData function
 * @param encryptedData - Encrypted data (base64 string with IV and auth tag)
 * @param key - Encryption key (from environment variables)
 * @returns Decrypted data
 */
export function decryptData(encryptedData: string, key = process.env.ENCRYPTION_KEY): string {
  try {
    if (!key) {
      throw new Error('Encryption key not provided');
    }
    
    // Create a buffer from the encryption key
    const keyBuffer = crypto
      .createHash('sha256')
      .update(String(key))
      .digest('base64')
      .substring(0, 32);
    
    // Convert from base64 to buffer
    const data = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, auth tag and encrypted data
    const iv = data.subarray(0, 16);
    const authTag = data.subarray(16, 32);
    const encryptedText = data.subarray(32);
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedText.toString('base64'), 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Log decryption error to Sentry
    Sentry.captureException(error, {
      tags: { type: 'decryption_error' }
    });
    
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure random token
 * @param length - Length of the token (default: 32)
 * @returns Secure random token
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate CSRF token
 * @param requestToken - Token from the request
 * @param sessionToken - Token from the session
 * @returns Boolean indicating if tokens match
 */
export function validateCsrfToken(requestToken: string, sessionToken: string): boolean {
  if (!requestToken || !sessionToken) {
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(requestToken),
    Buffer.from(sessionToken)
  );
}

/**
 * Create a secure hash of a string (e.g., for password storage)
 * @param input - String to hash
 * @param salt - Salt to use (generated if not provided)
 * @returns Object containing hash and salt
 */
export function createSecureHash(input: string, salt?: string): { hash: string; salt: string } {
  // Generate salt if not provided
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  
  // Create hash
  const hash = crypto.pbkdf2Sync(input, useSalt, 10000, 64, 'sha512').toString('hex');
  
  return { hash, salt: useSalt };
}

/**
 * Verify a string against a stored hash
 * @param input - String to verify
 * @param storedHash - Stored hash
 * @param salt - Salt used to create the hash
 * @returns Boolean indicating if the string matches
 */
export function verifyHash(input: string, storedHash: string, salt: string): boolean {
  const { hash } = createSecureHash(input, salt);
  return hash === storedHash;
}
