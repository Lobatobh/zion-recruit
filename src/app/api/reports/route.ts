/**
 * Reports API - Zion Recruit
 * Generate and manage candidate reports
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCandidateReport, generateBatchReports } from "@/lib/agents/specialized/ReportAgent";

// GET /api/reports - Get report for a candidate
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Get tenant - either from session or first available (demo mode)
    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "Organização não encontrada" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get("candidateId");
    const jobId = searchParams.get("jobId");
    const batch = searchParams.get("batch") === "true";

    // Batch mode - generate reports for all candidates in a job
    if (batch && jobId) {
      const result = await generateBatchReports(tenantId, jobId);
      return NextResponse.json(result);
    }

    // Single report mode
    if (!candidateId || !jobId) {
      return NextResponse.json(
        { error: "candidateId e jobId são obrigatórios" },
        { status: 400 }
      );
    }

    // Verify candidate belongs to tenant
    const candidate = await db.candidate.findFirst({
      where: {
        id: candidateId,
        jobId,
        tenantId,
      },
      include: {
        job: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    // Generate report
    const result = await generateCandidateReport(tenantId, candidateId, jobId, {
      includeComparison: true,
      includeDISC: true,
      includeGeographic: true,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erro ao gerar relatório" },
        { status: 500 }
      );
    }

    // Log task for analytics
    const reportAgent = await db.aIAgent.findFirst({
      where: { tenantId, type: "REPORT" },
      select: { id: true },
    });

    if (reportAgent) {
      await db.aITask.create({
        data: {
          tenantId,
          agentId: reportAgent.id,
          type: "REPORT_GENERATION",
          status: "COMPLETED",
          input: JSON.stringify({ candidateId, jobId }),
          output: JSON.stringify({ reportGenerated: true }),
          tokensUsed: result.tokensUsed,
          candidateId,
          jobId,
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ report: result.data });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatório" },
      { status: 500 }
    );
  }
}

// POST /api/reports - Generate report with custom options
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Get tenant - either from session or first available (demo mode)
    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "Organização não encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { candidateId, jobId, includeComparison, includeDISC, includeGeographic } = body;

    if (!candidateId || !jobId) {
      return NextResponse.json(
        { error: "candidateId e jobId são obrigatórios" },
        { status: 400 }
      );
    }

    // Verify candidate belongs to tenant
    const candidate = await db.candidate.findFirst({
      where: {
        id: candidateId,
        jobId,
        tenantId,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    // Generate report with custom options
    const result = await generateCandidateReport(tenantId, candidateId, jobId, {
      includeComparison: includeComparison ?? true,
      includeDISC: includeDISC ?? true,
      includeGeographic: includeGeographic ?? true,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erro ao gerar relatório" },
        { status: 500 }
      );
    }

    return NextResponse.json({ report: result.data });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatório" },
      { status: 500 }
    );
  }
}
