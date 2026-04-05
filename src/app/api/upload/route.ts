/**
 * Upload API - Zion Recruit
 * POST /api/upload - Upload a file to S3-compatible storage
 *
 * Accepts multipart/form-data with:
 *   - file: File (required)
 *   - folder: 'resumes' | 'logos' | 'avatars' | 'documents' | 'attachments' (required)
 *   - isPublic: boolean (optional, default false)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper';
import { getStorageService } from '@/lib/storage/storage-service';
import { FOLDER_ALLOWED_MIME, FOLDER_MAX_SIZES, type AllowedFolder } from '@/lib/storage/types';
import path from 'path';

export const dynamic = 'force-dynamic';

const VALID_FOLDERS: string[] = Object.keys(FOLDER_ALLOWED_MIME);

const FOLDER_LABELS: Record<AllowedFolder, string> = {
  resumes: 'currículos',
  logos: 'logos',
  avatars: 'avatars',
  documents: 'documentos',
  attachments: 'anexos',
};

// POST /api/upload
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const storage = getStorageService();
    if (!storage.isConfigured()) {
      return NextResponse.json(
        { error: 'Serviço de armazenamento não configurado. Configure S3_BUCKET, S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string | null;
    const isPublic = formData.get('isPublic') === 'true' || formData.get('isPublic') === '1';

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    // Validate folder
    if (!folder || !VALID_FOLDERS.includes(folder)) {
      return NextResponse.json(
        { error: `Pasta inválida: "${folder}". Pastas permitidas: ${VALID_FOLDERS.join(', ')}.` },
        { status: 400 }
      );
    }

    const folderKey = folder as AllowedFolder;

    // Validate file size
    const maxSize = FOLDER_MAX_SIZES[folderKey];
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        { error: `Arquivo muito grande para ${FOLDER_LABELS[folderKey]}. Máximo: ${maxSizeMB}MB. Seu arquivo: ${fileSizeMB}MB.` },
        { status: 400 }
      );
    }

    // Validate file type
    const contentType = file.type || 'application/octet-stream';
    const allowedMimes = FOLDER_ALLOWED_MIME[folderKey];
    if (!allowedMimes.includes(contentType) && contentType !== 'application/octet-stream') {
      return NextResponse.json(
        { error: `Tipo de arquivo não permitido para ${FOLDER_LABELS[folderKey]}: ${contentType}` },
        { status: 400 }
      );
    }

    // Also validate by extension as a fallback
    const ext = path.extname(file.name || '').toLowerCase().replace('.', '');
    const allowedExts = allowedMimes
      .map(mime => {
        const map: Record<string, string> = {
          'application/pdf': 'pdf',
          'application/msword': 'doc',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
          'text/plain': 'txt',
          'text/csv': 'csv',
          'image/png': 'png',
          'image/jpeg': 'jpg',
          'image/gif': 'gif',
          'image/webp': 'webp',
          'image/svg+xml': 'svg',
          'application/json': 'json',
        };
        return map[mime] || '';
      })
      .filter(Boolean);

    if (ext && allowedExts.length > 0 && !allowedExts.includes(ext) && contentType === 'application/octet-stream') {
      return NextResponse.json(
        { error: `Extensão de arquivo não permitida para ${FOLDER_LABELS[folderKey]}: .${ext}` },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to storage
    const result = await storage.upload(buffer, file.name, {
      folder: folderKey,
      tenantId,
      contentType,
      isPublic,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao fazer upload do arquivo.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        key: result.key,
        url: result.url,
        fileName: result.fileName,
        size: result.size,
        contentType: result.contentType,
        isPublic,
        bucket: storage.getBucket(),
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
