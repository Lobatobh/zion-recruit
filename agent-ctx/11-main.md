---
## Task ID: 11 - main
### Work Task
Create a S3-compatible storage service for file uploads (resumes, logos, documents).

### Work Summary

Created a comprehensive S3-compatible file storage system for Zion Recruit supporting AWS S3, Cloudflare R2, MinIO, and Supabase Storage.

**Files Created (4):**
- `src/lib/storage/types.ts` — Type definitions, MIME maps, per-folder allowed types and max sizes
- `src/lib/storage/storage-service.ts` — S3 client wrapper with upload, presigned URLs, delete, download, fileExists, getFileInfo, createFromEnv, singleton pattern
- `src/app/api/upload/route.ts` — POST /api/upload: multipart/form-data upload with auth, tenant, folder validation, MIME/size checks
- `src/app/api/upload/[key]/route.ts` — GET (presigned URL) and DELETE with tenant ownership verification via key pattern

**Files Modified (3):**
- `src/app/api/candidates/upload-resume/route.ts` — Now uploads to S3 after text extraction, returns fileKey/fileUrl/fileStored, backward compatible
- `.env.example` — Added 7 S3_* environment variables
- `docker-compose.yml` — Added 7 S3_* env vars to app service

**Packages Installed:**
- @aws-sdk/client-s3@3.1024.0
- @aws-sdk/s3-request-presigner@3.1024.0

**Key Design Decisions:**
- Graceful degradation: storage operations return errors when not configured, resume upload falls back to text-only
- Tenant isolation: all file keys include tenantId, API routes verify ownership
- Per-folder validation: different MIME types and size limits per folder
- Presigned URLs for private files, direct URLs for public files (logos, avatars)
