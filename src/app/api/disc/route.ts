/**
 * DISC Test API - Create/List Tests
 * Zion Recruit
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DISCStatus } from '@prisma/client';

// ============================================
// GET /api/disc - List DISC Tests
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId');
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status') as DISCStatus | null;

    const where: Record<string, unknown> = {};

    if (candidateId) where.candidateId = candidateId;
    if (tenantId) where.tenantId = tenantId;
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
    console.error('Error fetching DISC tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DISC tests' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/disc - Create DISC Test
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateId, tenantId } = body;

    if (!candidateId || !tenantId) {
      return NextResponse.json(
        { error: 'candidateId and tenantId are required' },
        { status: 400 }
      );
    }

    // Check if candidate exists
    const candidate = await db.candidate.findUnique({
      where: { id: candidateId },
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
    console.error('Error creating DISC test:', error);
    return NextResponse.json(
      { error: 'Failed to create DISC test' },
      { status: 500 }
    );
  }
}
