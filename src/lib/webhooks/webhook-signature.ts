/**
 * Webhook Signature Utilities
 * 
 * HMAC-SHA256 signature generation and verification for secure webhook delivery
 */

import crypto from 'crypto';
import { encrypt, decrypt } from '@/lib/encryption';

// Signature header name
export const SIGNATURE_HEADER = 'X-Zion-Signature-256';
export const TIMESTAMP_HEADER = 'X-Zion-Timestamp';
export const EVENT_ID_HEADER = 'X-Zion-Event-ID';
export const EVENT_TYPE_HEADER = 'X-Zion-Event-Type';

// Signature version
const SIGNATURE_VERSION = 'v1';

// Tolerance for timestamp validation (5 minutes)
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Generate a new webhook secret
 * Returns a cryptographically secure random string
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt a webhook secret for storage
 */
export function encryptSecret(secret: string): string {
  return encrypt(secret);
}

/**
 * Decrypt a webhook secret from storage
 */
export function decryptSecret(encryptedSecret: string): string {
  return decrypt(encryptedSecret);
}

/**
 * Generate HMAC-SHA256 signature for a payload
 * 
 * @param payload - The JSON payload to sign
 * @param secret - The webhook secret (decrypted)
 * @param timestamp - Unix timestamp in seconds
 * @returns The signature string
 */
export function generateSignature(
  payload: string,
  secret: string,
  timestamp: number
): string {
  // Create the signed content: timestamp.payload
  const signedContent = `${timestamp}.${payload}`;
  
  // Generate HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedContent);
  const signature = hmac.digest('hex');
  
  // Return with version prefix
  return `${SIGNATURE_VERSION}=${signature}`;
}

/**
 * Verify a webhook signature
 * 
 * @param payload - The raw payload string
 * @param signature - The signature from the header
 * @param secret - The webhook secret (decrypted)
 * @param timestamp - Unix timestamp in seconds
 * @returns Whether the signature is valid
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number
): { valid: boolean; error?: string } {
  // Check signature format
  if (!signature.startsWith(`${SIGNATURE_VERSION}=`)) {
    return { valid: false, error: 'Invalid signature format' };
  }
  
  // Check timestamp tolerance (replay attack protection)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const timestampDiff = Math.abs(currentTimestamp - timestamp);
  
  if (timestampDiff * 1000 > TIMESTAMP_TOLERANCE_MS) {
    return { valid: false, error: 'Timestamp outside tolerance window' };
  }
  
  // Generate expected signature
  const expectedSignature = generateSignature(payload, secret, timestamp);
  
  // Use timing-safe comparison
  try {
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const providedBuffer = Buffer.from(signature, 'utf8');
    
    if (expectedBuffer.length !== providedBuffer.length) {
      return { valid: false, error: 'Signature length mismatch' };
    }
    
    const valid = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    
    if (!valid) {
      return { valid: false, error: 'Signature mismatch' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Signature comparison error' };
  }
}

/**
 * Create signature headers for a webhook request
 */
export function createSignatureHeaders(
  payload: string,
  secret: string,
  eventId: string,
  eventType: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature(payload, secret, timestamp);
  
  return {
    [SIGNATURE_HEADER]: signature,
    [TIMESTAMP_HEADER]: timestamp.toString(),
    [EVENT_ID_HEADER]: eventId,
    [EVENT_TYPE_HEADER]: eventType,
    'Content-Type': 'application/json',
    'User-Agent': 'Zion-Recruit-Webhooks/1.0',
  };
}

/**
 * Verify webhook request headers (for external systems receiving our webhooks)
 */
export function verifyWebhookHeaders(
  payload: string,
  headers: Record<string, string>,
  secret: string
): { valid: boolean; error?: string; eventId?: string; eventType?: string } {
  const signature = headers[SIGNATURE_HEADER] || headers['x-zion-signature-256'];
  const timestampStr = headers[TIMESTAMP_HEADER] || headers['x-zion-timestamp'];
  const eventId = headers[EVENT_ID_HEADER] || headers['x-zion-event-id'];
  const eventType = headers[EVENT_TYPE_HEADER] || headers['x-zion-event-type'];
  
  if (!signature) {
    return { valid: false, error: 'Missing signature header' };
  }
  
  if (!timestampStr) {
    return { valid: false, error: 'Missing timestamp header' };
  }
  
  const timestamp = parseInt(timestampStr, 10);
  
  if (isNaN(timestamp)) {
    return { valid: false, error: 'Invalid timestamp' };
  }
  
  const result = verifySignature(payload, signature, secret, timestamp);
  
  if (!result.valid) {
    return result;
  }
  
  return { valid: true, eventId, eventType };
}

/**
 * Generate a test signature for webhook testing
 */
export function generateTestSignature(
  payload: object,
  secret: string
): { signature: string; timestamp: number; headers: Record<string, string> } {
  const payloadStr = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature(payloadStr, secret, timestamp);
  
  return {
    signature,
    timestamp,
    headers: {
      [SIGNATURE_HEADER]: signature,
      [TIMESTAMP_HEADER]: timestamp.toString(),
      'Content-Type': 'application/json',
    },
  };
}
