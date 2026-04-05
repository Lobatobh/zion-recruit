/**
 * DISC Test API - Create/List Tests
 * Zion Recruit
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DISCStatus } from '@prisma/client';
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper';

// ============================================
// GET /api/disc - List DISC Tests
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId');
    const status = searchParams.get('status') as DISCStatus | null;

    const where: Record<string, unknown> = { tenantId };

    if (candidateId) where.candidateId = candidateId;
    if (status) where.status = status;

    const tests = await db.dISCTest.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photo: true,
            city: true,
            state: true,
            job: {
              select: {
                id: true,
                title: true,
                city: true,
                state: true,
                discProfileRequired: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tests });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// ============================================
// POST /api/disc - Create DISC Test
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const body = await request.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json(
        { error: 'candidateId is required' },
        { status: 400 }
      );
    }

    // Check if candidate exists and belongs to tenant
    const candidate = await db.candidate.findFirst({
      where: { id: candidateId, tenantId },
      include: { job: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Check if test already exists for this candidate
    const existingTest = await db.dISCTest.findUnique({
      where: { candidateId },
    });

    if (existingTest) {
      return NextResponse.json(
        { error: 'DISC test already exists for this candidate', test: existingTest },
        { status: 400 }
      );
    }

    // Create new DISC test
    const test = await db.dISCTest.create({
      data: {
        tenantId,
        candidateId,
        status: DISCStatus.PENDING,
      },
    });

    // Update candidate status
    await db.candidate.update({
      where: { id: candidateId },
      data: {
        discTestSentAt: new Date(),
      },
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
