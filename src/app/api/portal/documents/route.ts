/**
 * Portal Documents API
 * GET: Get candidate documents
 * POST: Upload new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// In-memory document storage (in production, use cloud storage like S3)
// This is a simplified implementation
const documentStore: Map<string, DocumentRecord> = new Map();

interface DocumentRecord {
  id: string;
  candidateId: string;
  name: string;
  type: string;
  category: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

// GET - Retrieve candidate documents
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-portal-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 401 }
      );
    }

    // Find portal access by token
    const portalAccess = await db.candidatePortalAccess.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        candidate: true,
      },
    });

    if (!portalAccess) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const candidate = portalAccess.candidate;

    // Get existing documents from candidate record
    const documents = [];

    // Add resume if exists
    if (candidate.resumeUrl) {
      documents.push({
        id: `resume-${candidate.id}`,
        name: 'Resume/CV',
        type: 'resume',
        category: 'Resume',
        url: candidate.resumeUrl,
        uploadedAt: candidate.updatedAt,
      });
    }

    // Add portfolio if exists
    if (candidate.portfolio) {
      documents.push({
        id: `portfolio-${candidate.id}`,
        name: 'Portfolio',
        type: 'link',
        category: 'Portfolio',
        url: candidate.portfolio,
        uploadedAt: candidate.updatedAt,
      });
    }

    // Add LinkedIn if exists
    if (candidate.linkedin) {
      documents.push({
        id: `linkedin-${candidate.id}`,
        name: 'LinkedIn Profile',
        type: 'link',
        category: 'LinkedIn',
        url: candidate.linkedin,
        uploadedAt: candidate.updatedAt,
      });
    }

    // Add GitHub if exists
    if (candidate.github) {
      documents.push({
        id: `github-${candidate.id}`,
        name: 'GitHub Profile',
        type: 'link',
        category: 'GitHub',
        url: candidate.github,
        uploadedAt: candidate.updatedAt,
      });
    }

    // Get additional documents from in-memory store
    const additionalDocs = Array.from(documentStore.values())
      .filter(doc => doc.candidateId === candidate.id)
      .map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        category: doc.category,
        size: doc.size,
        url: doc.url,
        uploadedAt: doc.uploadedAt,
      }));

    documents.push(...additionalDocs);

    return NextResponse.json({
      success: true,
      documents,
      total: documents.length,
      allowedTypes: [
        { type: 'resume', label: 'Resume/CV', extensions: ['.pdf', '.doc', '.docx'] },
        { type: 'certificate', label: 'Certificate', extensions: ['.pdf', '.jpg', '.png'] },
        { type: 'portfolio', label: 'Portfolio Link', extensions: ['url'] },
        { type: 'other', label: 'Other Document', extensions: ['.pdf', '.jpg', '.png', '.doc', '.docx'] },
      ],
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
  } catch (error) {
    console.error('Portal documents error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
}

// POST - Upload document
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-portal-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 401 }
      );
    }

    // Find portal access by token
    const portalAccess = await db.candidatePortalAccess.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        candidate: true,
      },
    });

    if (!portalAccess) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, name, url, content, category } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: 'Document type and name are required' },
        { status: 400 }
      );
    }

    const candidate = portalAccess.candidate;

    // Handle different document types
    if (type === 'resume' || type === 'resumeUrl') {
      // Update candidate's resume URL
      const updated = await db.candidate.update({
        where: { id: candidate.id },
        data: { resumeUrl: url },
      });

      return NextResponse.json({
        success: true,
        document: {
          id: `resume-${candidate.id}`,
          name: 'Resume/CV',
          type: 'resume',
          category: 'Resume',
          url: updated.resumeUrl,
          uploadedAt: new Date(),
        },
        message: 'Resume updated successfully',
      });
    }

    if (type === 'linkedin') {
      const updated = await db.candidate.update({
        where: { id: candidate.id },
        data: { linkedin: url },
      });

      return NextResponse.json({
        success: true,
        document: {
          id: `linkedin-${candidate.id}`,
          name: 'LinkedIn Profile',
          type: 'link',
          category: 'LinkedIn',
          url: updated.linkedin,
          uploadedAt: new Date(),
        },
        message: 'LinkedIn profile updated successfully',
      });
    }

    if (type === 'github') {
      const updated = await db.candidate.update({
        where: { id: candidate.id },
        data: { github: url },
      });

      return NextResponse.json({
        success: true,
        document: {
          id: `github-${candidate.id}`,
          name: 'GitHub Profile',
          type: 'link',
          category: 'GitHub',
          url: updated.github,
          uploadedAt: new Date(),
        },
        message: 'GitHub profile updated successfully',
      });
    }

    if (type === 'portfolio') {
      const updated = await db.candidate.update({
        where: { id: candidate.id },
        data: { portfolio: url },
      });

      return NextResponse.json({
        success: true,
        document: {
          id: `portfolio-${candidate.id}`,
          name: 'Portfolio',
          type: 'link',
          category: 'Portfolio',
          url: updated.portfolio,
          uploadedAt: new Date(),
        },
        message: 'Portfolio updated successfully',
      });
    }

    // For other document types, store in memory (in production, use cloud storage)
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const documentRecord: DocumentRecord = {
      id: docId,
      candidateId: candidate.id,
      name,
      type,
      category: category || 'Other',
      size: content ? content.length : 0,
      url: url || '',
      uploadedAt: new Date(),
    };

    documentStore.set(docId, documentRecord);

    return NextResponse.json({
      success: true,
      document: {
        id: documentRecord.id,
        name: documentRecord.name,
        type: documentRecord.type,
        category: documentRecord.category,
        size: documentRecord.size,
        url: documentRecord.url,
        uploadedAt: documentRecord.uploadedAt,
      },
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    console.error('Portal document upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// DELETE - Remove document
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('x-portal-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 401 }
      );
    }

    // Find portal access by token
    const portalAccess = await db.candidatePortalAccess.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        candidate: true,
      },
    });

    if (!portalAccess) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const candidate = portalAccess.candidate;

    // Handle predefined documents
    if (documentId.startsWith('resume-')) {
      await db.candidate.update({
        where: { id: candidate.id },
        data: { resumeUrl: null },
      });
      return NextResponse.json({ success: true, message: 'Resume removed' });
    }

    if (documentId.startsWith('linkedin-')) {
      await db.candidate.update({
        where: { id: candidate.id },
        data: { linkedin: null },
      });
      return NextResponse.json({ success: true, message: 'LinkedIn profile removed' });
    }

    if (documentId.startsWith('github-')) {
      await db.candidate.update({
        where: { id: candidate.id },
        data: { github: null },
      });
      return NextResponse.json({ success: true, message: 'GitHub profile removed' });
    }

    if (documentId.startsWith('portfolio-')) {
      await db.candidate.update({
        where: { id: candidate.id },
        data: { portfolio: null },
      });
      return NextResponse.json({ success: true, message: 'Portfolio removed' });
    }

    // Handle additional documents
    if (documentStore.has(documentId)) {
      const doc = documentStore.get(documentId);
      if (doc?.candidateId === candidate.id) {
        documentStore.delete(documentId);
        return NextResponse.json({ success: true, message: 'Document removed' });
      }
    }

    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Portal document delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
