/**
 * Storage Service - Zion Recruit
 * S3-compatible object storage service (AWS S3, Cloudflare R2, MinIO, Supabase Storage)
 *
 * Usage:
 *   import { getStorageService } from '@/lib/storage/storage-service';
 *   const storage = getStorageService();
 *   const result = await storage.upload(fileBuffer, { folder: 'resumes', tenantId: '...' });
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import type {
  StorageConfig,
  StorageProvider,
  UploadOptions,
  UploadResult,
  DeleteResult,
  PresignedUrlResult,
  AllowedFolder,
  FOLDER_ALLOWED_MIME,
  FOLDER_MAX_SIZES,
} from './types';

// Re-import for usage (TypeScript module augmentation pattern)
import { MIME_TYPE_MAP } from './types';

const DEFAULT_PRESIGN_EXPIRES = 3600; // 1 hour

/**
 * StorageService - handles all S3-compatible storage operations
 */
export class StorageService {
  private client: S3Client;
  private config: StorageConfig;
  private initialized: boolean = false;

  constructor(config: StorageConfig) {
    this.config = config;

    const clientConfig: Parameters<typeof S3Client.prototype.constructor>[0] = {
      region: config.region || 'auto',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    // Custom endpoint for R2 / MinIO
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      // R2 and MinIO typically use path-style addressing
      clientConfig.forcePathStyle = config.provider !== 'aws';
    }

    this.client = new S3Client(clientConfig);

    // Validate configuration
    if (!config.bucket) {
      console.warn('[StorageService] Warning: S3_BUCKET is not configured. File uploads will fail.');
    } else if (!config.accessKeyId || !config.secretAccessKey) {
      console.warn('[StorageService] Warning: S3 credentials are not configured. File uploads will fail.');
    } else {
      this.initialized = true;
    }
  }

  /**
   * Check if storage service is properly configured
   */
  isConfigured(): boolean {
    return this.initialized;
  }

  /**
   * Get the bucket name
   */
  getBucket(): string {
    return this.config.bucket;
  }

  /**
   * Upload a file to storage
   * Key pattern: {folder}/{tenantId}/{uuid}-{originalName}
   */
  async upload(
    buffer: Buffer | Uint8Array | ArrayBuffer,
    originalFileName: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    if (!this.initialized) {
      return {
        success: false,
        key: '',
        url: '',
        fileName: originalFileName,
        size: 0,
        contentType: options.contentType || 'application/octet-stream',
        error: 'Storage service is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.',
      };
    }

    try {
      // Determine content type
      const ext = path.extname(originalFileName).toLowerCase().replace('.', '');
      const detectedContentType = this.detectContentType(originalFileName, options.contentType);
      const contentType = detectedContentType || 'application/octet-stream';

      // Generate unique filename
      const uuid = crypto.randomUUID();
      const sanitizedName = this.sanitizeFileName(originalFileName);
      const fileName = options.fileName || `${uuid}-${sanitizedName}`;

      // Build S3 key: folder/tenantId/filename
      const key = `${options.folder}/${options.tenantId}/${fileName}`;

      // Upload to S3
      const bodyBuffer = buffer instanceof ArrayBuffer
        ? Buffer.from(buffer)
        : buffer;

      await this.client.send(new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: bodyBuffer,
        ContentType: contentType,
        // Set appropriate cache control
        CacheControl: options.isPublic ? 'public, max-age=31536000, immutable' : 'private, max-age=86400',
        // Set content disposition for downloads
        ContentDisposition: `inline; filename="${encodeURIComponent(sanitizedName)}"`,
        Metadata: {
          'tenant-id': options.tenantId,
          'original-name': sanitizedName,
          'folder': options.folder,
        },
      }));

      // Generate URL
      const url = options.isPublic && this.config.publicUrl
        ? `${this.config.publicUrl.replace(/\/$/, '')}/${key}`
        : await this.getPresignedUrl(key);

      return {
        success: true,
        key,
        url,
        fileName,
        size: bodyBuffer.byteLength,
        contentType,
      };
    } catch (error) {
      console.error('[StorageService] Upload error:', error);
      return {
        success: false,
        key: '',
        url: '',
        fileName: originalFileName,
        size: 0,
        contentType: options.contentType || 'application/octet-stream',
        error: error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo.',
      };
    }
  }

  /**
   * Generate a presigned URL for temporary access to a private file
   */
  async getPresignedUrl(
    key: string,
    expiresIn: number = DEFAULT_PRESIGN_EXPIRES
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error('Storage service is not configured.');
    }

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Generate a presigned URL result (with success/error wrapper)
   */
  async getPresignedUrlResult(
    key: string,
    expiresIn: number = DEFAULT_PRESIGN_EXPIRES
  ): Promise<PresignedUrlResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          url: '',
          expiresIn: 0,
          error: 'Storage service is not configured.',
        };
      }

      const url = await this.getPresignedUrl(key, expiresIn);
      return {
        success: true,
        url,
        expiresIn,
      };
    } catch (error) {
      console.error('[StorageService] Presigned URL error:', error);
      return {
        success: false,
        url: '',
        expiresIn: 0,
        error: error instanceof Error ? error.message : 'Erro ao gerar URL de acesso.',
      };
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<DeleteResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Storage service is not configured.',
      };
    }

    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }));

      return { success: true };
    } catch (error) {
      console.error('[StorageService] Delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao excluir arquivo.',
      };
    }
  }

  /**
   * Check if a file exists in storage
   */
  async fileExists(key: string): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata (size, content type, etc.)
   */
  async getFileInfo(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
  } | null> {
    if (!this.initialized) return null;

    try {
      const response = await this.client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }));

      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Download a file from storage
   */
  async download(key: string): Promise<Buffer | null> {
    if (!this.initialized) return null;

    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }));

      if (!response.Body) return null;

      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (error) {
      console.error('[StorageService] Download error:', error);
      return null;
    }
  }

  /**
   * Get the public URL for a file (if publicUrl is configured)
   */
  getPublicUrl(key: string): string | null {
    if (!this.config.publicUrl) return null;
    return `${this.config.publicUrl.replace(/\/$/, '')}/${key}`;
  }

  /**
   * Create a storage service from environment variables
   */
  static createFromEnv(): StorageService {
    const provider = (process.env.S3_PROVIDER || 'aws') as StorageProvider;

    return new StorageService({
      provider,
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'auto',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      endpoint: process.env.S3_ENDPOINT || undefined,
      publicUrl: process.env.S3_PUBLIC_URL || undefined,
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────

  /**
   * Detect content type from file name and/or provided type
   */
  private detectContentType(fileName: string, providedContentType?: string): string {
    if (providedContentType && providedContentType !== 'application/octet-stream') {
      return providedContentType;
    }

    const ext = path.extname(fileName).toLowerCase().replace('.', '');

    // Find MIME type from extension
    for (const [mime, extension] of Object.entries(MIME_TYPE_MAP)) {
      if (extension === ext) return mime;
    }

    // Fallback: use the File object type if available
    if (providedContentType) return providedContentType;

    return 'application/octet-stream';
  }

  /**
   * Sanitize filename: remove special chars, limit length
   */
  private sanitizeFileName(fileName: string): string {
    // Get base name without extension
    const baseName = path.basename(fileName, path.extname(fileName));
    const ext = path.extname(fileName).toLowerCase();

    // Sanitize base name: keep alphanumeric, dash, underscore, dot, space
    const sanitized = baseName
      .normalize('NFD') // Normalize unicode
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-zA-Z0-9._\-\s]/g, '') // Keep safe chars
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/-+/g, '-') // Collapse multiple dashes
      .trim();

    // Limit length to 100 chars for the base name
    const limitedBase = sanitized.slice(0, 100);
    return `${limitedBase}${ext}`;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

let _storageService: StorageService | null = null;

/**
 * Get the singleton StorageService instance
 * Creates from env vars on first call
 */
export function getStorageService(): StorageService {
  if (!_storageService) {
    _storageService = StorageService.createFromEnv();
  }
  return _storageService;
}

/**
 * Reset the singleton (useful for testing or config changes)
 */
export function resetStorageService(): void {
  _storageService = null;
}
