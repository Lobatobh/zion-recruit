/**
 * DISC Test API - Get/Update Test
 * Zion Recruit
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DISCStatus } from '@prisma/client';
import { DISC_QUESTIONS } from '@/lib/disc/questions';

// ============================================
// GET /api/disc/[id] - Get DISC Test
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const test = await db.dISTest.findUnique({
      where: { id },
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
    console.error('Error fetching DISC test:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DISC test' },
      { status: 500 }
    );
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
    const { id } = await params;
    const body = await request.json();
    const { status, answers } = body;

    const test = await db.dISTest.findUnique({
      where: { id },
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
    console.error('Error updating DISC test:', error);
    return NextResponse.json(
      { error: 'Failed to update DISC test' },
      { status: 500 }
    );
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
    const { id } = await params;

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
    console.error('Error deleting DISC test:', error);
    return NextResponse.json(
      { error: 'Failed to delete DISC test' },
      { status: 500 }
    );
  }
}
