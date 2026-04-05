/**
 * DISC Test API - Get/Update Test
 * Zion Recruit
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DISCStatus } from '@prisma/client';
import { DISC_QUESTIONS } from '@/lib/disc/questions';
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper';

// ============================================
// GET /api/disc/[id] - Get DISC Test
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);
    const { id } = await params;

    const test = await db.dISTest.findFirst({
      where: { id, tenantId },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            job: {
              select: {
                id: true,
                title: true,
                discProfileRequired: true,
              },
            },
          },
        },
        answers: {
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: 'DISC test not found' },
        { status: 404 }
      );
    }

    // Include questions for pending/started tests
    const response = {
      ...test,
      questions: test.status === 'COMPLETED' ? null : DISC_QUESTIONS,
    };

    return NextResponse.json({ test: response });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// ============================================
// PUT /api/disc/[id] - Update DISC Test
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);
    const { id } = await params;
    const body = await request.json();
    const { status, answers } = body;

    // Verify test belongs to tenant
    const test = await db.dISTest.findFirst({
      where: { id, tenantId },
    });

    if (!test) {
      return NextResponse.json(
        { error: 'DISC test not found' },
        { status: 404 }
      );
    }

    // Update status
    if (status) {
      const updateData: {
        status: DISCStatus;
        startedAt?: Date;
        sentAt?: Date;
      } = { status: status as DISCStatus };

      if (status === DISCStatus.STARTED && !test.startedAt) {
        updateData.startedAt = new Date();
      }
      if (status === DISCStatus.SENT && !test.sentAt) {
        updateData.sentAt = new Date();
      }

      const updatedTest = await db.dISTest.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ test: updatedTest });
    }

    // Save answers progressively (for auto-save feature)
    if (answers && Array.isArray(answers)) {
      for (const answer of answers) {
        await db.dISCAnswer.upsert({
          where: {
            testId_questionNumber: {
              testId: id,
              questionNumber: answer.questionNumber,
            },
          },
          update: {
            mostOption: answer.mostOption,
            leastOption: answer.leastOption,
          },
          create: {
            testId: id,
            questionNumber: answer.questionNumber,
            mostOption: answer.mostOption,
            leastOption: answer.leastOption,
          },
        });
      }

      return NextResponse.json({ success: true, saved: answers.length });
    }

    return NextResponse.json({ test });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// ============================================
// DELETE /api/disc/[id] - Delete DISC Test
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);
    const { id } = await params;

    // Verify test belongs to tenant
    const test = await db.dISTest.findFirst({
      where: { id, tenantId },
    });

    if (!test) {
      return NextResponse.json(
        { error: 'DISC test not found' },
        { status: 404 }
      );
    }

    // Delete answers first (cascade should handle this, but being explicit)
    await db.dISCAnswer.deleteMany({
      where: { testId: id },
    });

    // Delete test
    await db.dISTest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
