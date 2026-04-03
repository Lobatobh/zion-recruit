/**
 * Job DISC Analysis API - Zion Recruit
 * Analyzes a job and generates DISC profile suggestion
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJob } from "@/lib/agents/specialized/JobParserAgent";

// POST /api/jobs/[id]/analyze-disc
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const tenantId = session.user.tenantId;
    const { id: jobId } = await params;

    // Get job (tenant-scoped)
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        tenantId,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Vaga não encontrada" },
        { status: 404 }
      );
    }

    // Parse job with AI (this updates the job in the DB via parseJob → db.job.update)
    const result = await parseJob(
      tenantId,
      job.id,
      job.title,
      job.description,
      job.requirements
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Falha ao analisar vaga" },
        { status: 500 }
      );
    }

    // Get updated job with only real Prisma fields
    const updatedJob = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        discProfileRequired: true,
        aiParsedSkills: true,
        aiParsedKeywords: true,
        aiParsedSeniority: true,
        aiSummary: true,
      },
    });

    return NextResponse.json({
      success: true,
      job: updatedJob,
      analysis: result.data,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error("Error analyzing job DISC:", error);
    const message = error instanceof Error ? error.message : "Erro ao analisar vaga";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
