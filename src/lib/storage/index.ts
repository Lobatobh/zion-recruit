/**
 * Storage Service - Zion Recruit
 * Unified file storage with S3/R2 support and local disk fallback.
 *
 * Usage:
 *   import { uploadFile, deleteFile, getFileUrl, storageConfig } from '@/lib/storage';
 *   const result = await uploadFile({ file: buffer, filename: 'resume.pdf', mimeType: 'application/pdf', folder: 'resumes', tenantId: '...' });
 */

import path from 'path';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────

export type StorageProvider = 'local' | 's3' | 'r2';

export interface UploadOptions {
  /** File buffer */
  file: Buffer | Uint8Array | ArrayBuffer;
  /** Original filename */
  filename: string;
  /** MIME content type */
  mimeType: string;
  /** Storage folder: 'resumes' | 'logos' | 'avatars' | 'documents' | 'attachments' */
  folder?: string;
  /** Tenant ID for namespace isolation */
  tenantId: string;
  /** Optional entity reference ID */
  entityId?: string;
  /** Whether the file should be publicly accessible */
  isPublic?: boolean;
}

export interface UploadedFile {
  /** Storage key (e.g., 'resumes/tenantId/timestamp_random_filename.pdf') */
  key: string;
  /** URL to access the file */
  url: string;
  /** Original filename */
  filename: string;
  /** File size in bytes */
  size: number;
  /** MIME content type */
  mimeType: string;
  /** Storage provider used */
  provider: StorageProvider;
}

export interface StorageConfigInfo {
  provider: StorageProvider;
  isConfigured: boolean;
  publicUrl: string;
  bucket: string;
}

// ─── Provider Detection ───────────────────────────────────────────────

function getProvider(): StorageProvider {
  if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID) {
    return 'r2';
  }
  if (process.env.S3_ACCESS_KEY_ID || process.env.S3_SECRET_ACCESS_KEY) {
    return 's3';
  }
  return 'local';
}

// ─── Helpers ──────────────────────────────────────────────────────────

function getStoragePath(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
}

function generateKey(folder: string, tenantId: string, filename: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  const ext = path.extname(filename).toLowerCase();
  const baseName = path.basename(filename, ext)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 100);
  const sanitized = `${baseName}${ext}`;
  return `${folder}/${tenantId}/${timestamp}_${random}_${sanitized}`;
}

// ─── Upload ───────────────────────────────────────────────────────────

/**
 * Upload a file to storage.
 * Uses S3/R2 if credentials are configured, otherwise falls back to local disk.
 */
export async function uploadFile(options: UploadOptions): Promise<UploadedFile> {
  const provider = getProvider();
  const folder = options.folder || 'attachments';
  const key = generateKey(folder, options.tenantId, options.filename);
  const buffer = Buffer.from(
    options.file instanceof ArrayBuffer ? options.file : options.file
  );

  if (provider === 'local') {
    return uploadLocal(buffer, key, options);
  }

  return uploadS3(buffer, key, options, provider);
}

async function uploadLocal(
  buffer: Buffer,
  key: string,
  options: UploadOptions
): Promise<UploadedFile> {
  const fs = await import('fs/promises');
  const storagePath = getStoragePath();
  const fullPath = path.join(storagePath, key);

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);

  return {
    key,
    url: `/api/files/${key}`,
    filename: options.filename,
    size: buffer.length,
    mimeType: options.mimeType,
    provider: 'local',
  };
}

async function uploadS3(
  buffer: Buffer,
  key: string,
  options: UploadOptions,
  provider: StorageProvider
): Promise<UploadedFile> {
  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    const accountId = process.env.R2_ACCOUNT_ID || '';
    const accessKey =
      process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || '';
    const secretKey =
      process.env.R2_SECRET_ACCESS_KEY ||
      process.env.S3_SECRET_ACCESS_KEY ||
      '';
    const bucket =
      process.env.R2_BUCKET_NAME ||
      process.env.S3_BUCKET ||
      'zion-recruit';
    const publicUrl =
      process.env.R2_PUBLIC_URL || process.env.S3_PUBLIC_URL || '';
    const region = process.env.R2_REGION || process.env.S3_REGION || 'auto';

    const endpoint = accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : process.env.S3_ENDPOINT || undefined;

    const client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      ...(process.env.S3_FORCE_PATH_STYLE === 'true' && {
        forcePathStyle: true,
      }),
    });

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: options.mimeType,
        CacheControl: options.isPublic
          ? 'public, max-age=31536000, immutable'
          : 'private, max-age=86400',
        Metadata: {
          'tenant-id': options.tenantId,
          'original-name': options.filename,
        },
      })
    );

    const url = publicUrl
      ? `${publicUrl.replace(/\/$/, '')}/${key}`
      : key;

    return {
      key,
      url,
      filename: options.filename,
      size: buffer.length,
      mimeType: options.mimeType,
      provider,
    };
  } catch (error) {
    console.warn(
      '[Storage] S3 upload failed, falling back to local storage:',
      error instanceof Error ? error.message : error
    );
    return uploadLocal(buffer, key, options);
  }
}

// ─── Delete ───────────────────────────────────────────────────────────

/**
 * Delete a file from storage.
 */
export async function deleteFile(
  key: string,
  provider?: StorageProvider
): Promise<void> {
  const actualProvider = provider || getProvider();

  if (actualProvider === 'local') {
    const fs = await import('fs/promises');
    const fullPath = path.join(getStoragePath(), key);
    try {
      await fs.unlink(fullPath);
    } catch {
      // File may not exist — ignore
    }
    return;
  }

  try {
    const { S3Client, DeleteObjectCommand } = await import(
      '@aws-sdk/client-s3'
    );

    const accountId = process.env.R2_ACCOUNT_ID || '';
    const accessKey =
      process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || '';
    const secretKey =
      process.env.R2_SECRET_ACCESS_KEY ||
      process.env.S3_SECRET_ACCESS_KEY ||
      '';
    const bucket =
      process.env.R2_BUCKET_NAME ||
      process.env.S3_BUCKET ||
      'zion-recruit';
    const region = process.env.R2_REGION || process.env.S3_REGION || 'auto';
    const endpoint = accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : process.env.S3_ENDPOINT || undefined;

    const client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.error('[Storage] Failed to delete file from S3:', error);
  }
}

// ─── URL Helpers ──────────────────────────────────────────────────────

/**
 * Get public URL for a file.
 */
export function getFileUrl(key: string): string {
  const provider = getProvider();
  const publicUrl =
    process.env.R2_PUBLIC_URL || process.env.S3_PUBLIC_URL || '';

  if (provider !== 'local' && publicUrl) {
    return `${publicUrl.replace(/\/$/, '')}/${key}`;
  }

  return `/api/files/${key}`;
}

// ─── Local File Reading ──────────────────────────────────────────────

/**
 * Read a local file (for serving through API).
 */
export async function getLocalFile(
  key: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const fs = await import('fs/promises');
  const fullPath = path.join(getStoragePath(), key);

  try {
    const buffer = await fs.readFile(fullPath);
    const ext = path.extname(key).toLowerCase();

    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
    };

    return {
      buffer,
      mimeType: mimeMap[ext] || 'application/octet-stream',
    };
  } catch {
    return null;
  }
}

// ─── Storage Config ───────────────────────────────────────────────────

/**
 * Storage configuration info (useful for UI status indicators).
 */
export const storageConfig: StorageConfigInfo = {
  get provider(): StorageProvider {
    return getProvider();
  },
  get isConfigured(): boolean {
    return !!(
      process.env.S3_ACCESS_KEY_ID ||
      process.env.R2_ACCESS_KEY_ID
    );
  },
  get publicUrl(): string {
    return process.env.R2_PUBLIC_URL || process.env.S3_PUBLIC_URL || '';
  },
  get bucket(): string {
    return (
      process.env.R2_BUCKET_NAME ||
      process.env.S3_BUCKET ||
      ''
    );
  },
};
