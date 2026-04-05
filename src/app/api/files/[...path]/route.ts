/**
 * File Serving API - Zion Recruit
 * GET /api/files/[...path] - Serve local files or redirect to S3/R2 public URL
 *
 * This route handles:
 * - Local disk files: reads from uploads/ directory and serves with correct MIME type
 * - S3/R2 files: redirects to the configured public URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLocalFile } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const key = pathSegments.join('/');

    if (!key) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // If using S3/R2 with a public URL, redirect to the public URL
    const publicUrl = process.env.R2_PUBLIC_URL || process.env.S3_PUBLIC_URL;
    const hasCloudCredentials =
      process.env.S3_ACCESS_KEY_ID ||
      process.env.R2_ACCESS_KEY_ID;

    if (publicUrl && hasCloudCredentials) {
      const redirectUrl = `${publicUrl.replace(/\/$/, '')}/${key}`;
      return NextResponse.redirect(redirectUrl);
    }

    // Serve local file
    const file = await getLocalFile(key);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return new NextResponse(file.buffer, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Length': file.buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Prevent MIME sniffing for security
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[Files API] Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to get file' },
      { status: 500 }
    );
  }
}
