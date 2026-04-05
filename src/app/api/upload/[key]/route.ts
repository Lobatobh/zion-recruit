/**
 * Upload [key] API - Zion Recruit
 * GET  /api/upload/[key]  - Get a presigned download URL for a file
 * DELETE /api/upload/[key] - Delete a file from storage
 *
 * The key must contain the tenantId for security (pattern: {folder}/{tenantId}/...)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper';
import { getStorageService } from '@/lib/storage/storage-service';

export const dynamic = 'force-dynamic';

// GET /api/upload/[key] - Get presigned download URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);
    const { key } = await params;

    if (!key) {
      return NextResponse.json(
        { error: 'Chave do arquivo não informada.' },
        { status: 400 }
      );
    }

    // Verify tenant ownership: key must contain the tenantId
    // Expected pattern: {folder}/{tenantId}/{filename}
    const keyParts = key.split('/');
    if (keyParts.length < 2 || keyParts[1] !== tenantId) {
      return NextResponse.json(
        { error: 'Acesso negado. O arquivo não pertence à sua organização.' },
        { status: 403 }
      );
    }

    const storage = getStorageService();
    if (!storage.isConfigured()) {
      return NextResponse.json(
        { error: 'Serviço de armazenamento não configurado.' },
        { status: 503 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600', 10);

    // Get presigned URL
    const result = await storage.getPresignedUrlResult(key, expiresIn);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao gerar URL de download.' },
        { status: 500 }
      );
    }

    // Also get file info if possible
    const fileInfo = await storage.getFileInfo(key);

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        expiresIn: result.expiresIn,
        key,
        size: fileInfo?.size,
        contentType: fileInfo?.contentType,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// DELETE /api/upload/[key] - Delete a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);
    const { key } = await params;

    if (!key) {
      return NextResponse.json(
        { error: 'Chave do arquivo não informada.' },
        { status: 400 }
      );
    }

    // Verify tenant ownership: key must contain the tenantId
    const keyParts = key.split('/');
    if (keyParts.length < 2 || keyParts[1] !== tenantId) {
      return NextResponse.json(
        { error: 'Acesso negado. O arquivo não pertence à sua organização.' },
        { status: 403 }
      );
    }

    const storage = getStorageService();
    if (!storage.isConfigured()) {
      return NextResponse.json(
        { error: 'Serviço de armazenamento não configurado.' },
        { status: 503 }
      );
    }

    const result = await storage.deleteFile(key);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao excluir arquivo.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Arquivo excluído com sucesso.',
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
