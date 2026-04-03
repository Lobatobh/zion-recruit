/**
 * Candidate Report API - Zion Recruit
 * Generates comprehensive candidate reports
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCandidateReport } from "@/lib/agents/specialized/ReportAgent";

// Helper to get effective tenant ID
async function getEffectiveTenantId(session: { user?: { id?: string; tenantId?: string | null } }): Promise<string | null> {
  if (session?.user?.tenantId) {
    const tenant = await db.tenant.findUnique({ where: { id: session.user.tenantId } });
    if (tenant) return tenant.id;
  }

  if (session?.user?.id) {
    const membership = await db.tenantMember.findFirst({
      where: { userId: session.user.id },
    });
    if (membership) return membership.tenantId;
  }

  const firstTenant = await db.tenant.findFirst();
  return firstTenant?.id || null;
}

// GET /api/candidates/[id]/report - Get existing report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const effectiveTenantId = await getEffectiveTenantId(session);

    if (!effectiveTenantId) {
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const { id: candidateId } = await params;

    // Get candidate with DISC test
    const candidate = await db.candidate.findFirst({
      where: {
        id: candidateId,
        tenantId: effectiveTenantId,
      },
      include: {
        job: true,
        discTests: {
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 1,
        },
        notes: {
          where: { type: "AI_INSIGHT" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidato não encontrado" }, { status: 404 });
    }

    // Get job DISC requirements
    const job = await db.job.findUnique({
      where: { id: candidate.jobId },
    });

    // Build report data
    const report = {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        location: {
          city: candidate.city,
          state: candidate.state,
          country: candidate.country,
        },
        matchScore: candidate.matchScore,
        skills: candidate.parsedSkills ? JSON.parse(candidate.parsedSkills) : [],
        experience: candidate.parsedExperience,
        status: candidate.status,
      },
      job: {
        id: job?.id,
        title: job?.title,
        department: job?.department,
        location: {
          city: job?.city,
          state: job?.state,
          country: job?.country,
          remote: job?.remote,
        },
        discRequirements: job?.discProfileRequired ? JSON.parse(job.discProfileRequired) : null,
        discIdealCombo: job?.discIdealCombo,
      },
      disc: candidate.discTests[0] ? {
        D: candidate.discTests[0].profileD,
        I: candidate.discTests[0].profileI,
        S: candidate.discTests[0].profileS,
        C: candidate.discTests[0].profileC,
        primary: candidate.discTests[0].primaryProfile,
        secondary: candidate.discTests[0].secondaryProfile,
        combo: candidate.discTests[0].profileCombo,
        analysis: candidate.discTests[0].aiAnalysis ? JSON.parse(candidate.discTests[0].aiAnalysis) : null,
        completedAt: candidate.discTests[0].completedAt,
      } : null,
      lastReport: candidate.notes[0] ? {
        content: candidate.notes[0].content,
        createdAt: candidate.notes[0].createdAt,
      } : null,
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Error fetching candidate report:", error);
    return NextResponse.json({ error: "Erro ao buscar relatório" }, { status: 500 });
  }
}

// POST /api/candidates/[id]/report - Generate new report
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const effectiveTenantId = await getEffectiveTenantId(session);

    if (!effectiveTenantId) {
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const { id: candidateId } = await params;

    // Get candidate
    const candidate = await db.candidate.findFirst({
      where: {
        id: candidateId,
        tenantId: effectiveTenantId,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidato não encontrado" }, { status: 404 });
    }

    // Generate report
    const result = await generateCandidateReport(
      effectiveTenantId,
      candidateId,
      candidate.jobId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Falha ao gerar relatório" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      report: result.data,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error("Error generating candidate report:", error);
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 });
  }
}
