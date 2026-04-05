/**
 * DISC Test Submit API
 * Calculate results and generate AI analysis
 * Zion Recruit
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DISCStatus } from '@prisma/client';
import { authErrorResponse } from '@/lib/auth-helper';
import { 
  calculateDISCResult, 
  calculateGraphScores, 
  validateAnswers,
  type DISCAnswer 
} from '@/lib/disc/calculator';
import { analyzeDISCResult } from '@/lib/agents/specialized/DISCAnalyzerAgent';

// ============================================
// POST /api/disc/[id]/submit - Submit Test
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { answers, token } = body;

    // Get test
    const test = await db.dISTest.findUnique({
      where: { id },
      include: {
        candidate: {
          include: {
            job: true,
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: 'DISC test not found' },
        { status: 404 }
      );
    }

    if (test.status === DISCStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Test already completed' },
        { status: 400 }
      );
    }

    // Verify test token for candidate portal security
    if (test.token && test.token !== token) {
      return NextResponse.json(
        { error: 'Token de acesso inválido' },
        { status: 403 }
      );
    }

    // Verify test has not expired (check expiresAt or sentAt + 7 days)
    if (test.expiresAt && new Date() > test.expiresAt) {
      return NextResponse.json(
        { error: 'Teste expirado. Solicite um novo link.' },
        { status: 410 }
      );
    }
    if (!test.expiresAt && test.sentAt) {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (new Date().getTime() - test.sentAt.getTime() > sevenDaysMs) {
        return NextResponse.json(
          { error: 'Teste expirado. Solicite um novo link.' },
          { status: 410 }
        );
      }
    }

    // Validate answers
    const validation = validateAnswers(answers as DISCAnswer[]);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Missing answers', missing: validation.missing },
        { status: 400 }
      );
    }

    // Save all answers
    for (const answer of answers as DISCAnswer[]) {
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

    // Calculate DISC scores
    const result = calculateDISCResult(answers as DISCAnswer[]);
    const { graphI, graphII, graphIII } = calculateGraphScores(answers as DISCAnswer[]);

    // Update test with calculated scores
    const updatedTest = await db.dISTest.update({
      where: { id },
      data: {
        status: DISCStatus.COMPLETED,
        completedAt: new Date(),
        profileD: result.percentageScores.D,
        profileI: result.percentageScores.I,
        profileS: result.percentageScores.S,
        profileC: result.percentageScores.C,
        primaryProfile: result.primaryProfile,
        secondaryProfile: result.secondaryProfile,
        profileCombo: result.profileCombo,
        graphI: JSON.stringify(graphI),
        graphII: JSON.stringify(graphII),
        graphIII: JSON.stringify(graphIII),
      },
    });

    // Update candidate completion time
    await db.candidate.update({
      where: { id: test.candidateId },
      data: {
        discTestCompletedAt: new Date(),
      },
    });

    // Get job profile requirements for fit calculation
    let jobProfileRequirements: { D: number; I: number; S: number; C: number } | undefined;
    if (test.candidate.job?.discProfileRequired) {
      try {
        jobProfileRequirements = JSON.parse(test.candidate.job.discProfileRequired);
      } catch {
        // Invalid JSON
      }
    }

    // Trigger AI analysis (async, don't wait for it)
    analyzeDISCResult(
      test.tenantId,
      id,
      test.candidate.job?.title || null,
      jobProfileRequirements
    ).catch(err => {
      console.error('Error in DISC AI analysis:', err);
    });

    return NextResponse.json({
      success: true,
      test: updatedTest,
      result: {
        scores: result.percentageScores,
        primaryProfile: result.primaryProfile,
        secondaryProfile: result.secondaryProfile,
        profileCombo: result.profileCombo,
        intensityLevels: result.intensityLevels,
      },
    });
  } catch (error) {
    console.error('Error submitting DISC test:', error);
    return authErrorResponse(error);
  }
}
