/**
 * Storage Module Types - Zion Recruit
 * S3-compatible object storage type definitions
 */

export type StorageProvider = 'aws' | 'cloudflare-r2' | 'minio';

export interface StorageConfig {
  /** Storage provider type */
  provider: StorageProvider;
  /** S3 bucket name */
  bucket: string;
  /** AWS region (default: 'auto' for R2) */
  region?: string;
  /** AWS/R2 access key ID */
  accessKeyId: string;
  /** AWS/R2 secret access key */
  secretAccessKey: string;
  /** Custom endpoint URL (required for R2/MinIO) */
  endpoint?: string;
  /** Public URL base for public files (e.g., CloudFront, R2 custom domain) */
  publicUrl?: string;
}

export interface UploadOptions {
  /** Storage folder prefix: 'resumes' | 'logos' | 'avatars' | 'documents' | 'attachments' */
  folder: AllowedFolder;
  /** Tenant ID for namespace isolation */
  tenantId: string;
  /** Custom filename (auto-generated UUID-based if not provided) */
  fileName?: string;
  /** MIME content type (auto-detected if not provided) */
  contentType?: string;
  /** Maximum file size in bytes (default: 10MB) */
  maxSizeBytes?: number;
  /** Whether the file should be publicly accessible (default: false) */
  isPublic?: boolean;
}

export type AllowedFolder = 'resumes' | 'logos' | 'avatars' | 'documents' | 'attachments';

export interface UploadResult {
  success: boolean;
  /** S3 object key (e.g., 'resumes/tenantId/uuid-filename.pdf') */
  key: string;
  /** Full URL to access the file (public or presigned) */
  url: string;
  /** Stored filename */
  fileName: string;
  /** File size in bytes */
  size: number;
  /** MIME content type */
  contentType: string;
  /** Error message if upload failed */
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  /** Error message if deletion failed */
  error?: string;
}

export interface PresignedUrlResult {
  success: boolean;
  /** Presigned URL for temporary access */
  url: string;
  /** Expiration time in seconds */
  expiresIn: number;
  /** Error message if URL generation failed */
  error?: string;
}

/** Map of MIME types to file extensions for common formats */
export const MIME_TYPE_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/json': 'json',
};

/** Allowed MIME types per folder */
export const FOLDER_ALLOWED_MIME: Record<AllowedFolder, string[]> = {
  resumes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
  ],
  logos: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  avatars: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/json',
  ],
  attachments: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/json',
  ],
};

/** Default max file sizes per folder (in bytes) */
export const FOLDER_MAX_SIZES: Record<AllowedFolder, number> = {
  resumes: 10 * 1024 * 1024,     // 10MB
  logos: 5 * 1024 * 1024,         // 5MB
  avatars: 2 * 1024 * 1024,       // 2MB
  documents: 10 * 1024 * 1024,    // 10MB
  attachments: 25 * 1024 * 1024,  // 25MB
};

/** Content-Disposition inline types (browsers display instead of download) */
export const INLINE_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
]);
