/**
 * Matching API - Zion Recruit
 * Calculate candidate-job compatibility
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { matchCandidate, matchAllCandidates, getTopCandidates } from "@/lib/agents/specialized/MatchingAgent";

// GET /api/matching - Get match score for candidate
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
    const top = searchParams.get("top");

    // Get top candidates
    if (top && jobId) {
      const limit = parseInt(top) || 5;
      const results = await getTopCandidates(tenantId, jobId, limit);
      return NextResponse.json({ candidates: results });
    }

    // Batch mode - match all candidates in a job
    if (batch && jobId) {
      const result = await matchAllCandidates(tenantId, jobId);
      return NextResponse.json(result);
    }

    // Single match mode
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

    // Calculate match
    const result = await matchCandidate(tenantId, candidateId, jobId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erro ao calcular matching" },
        { status: 500 }
      );
    }

    return NextResponse.json({ match: result.data });
  } catch (error) {
    console.error("Error calculating match:", error);
    return NextResponse.json(
      { error: "Erro ao calcular matching" },
      { status: 500 }
    );
  }
}

// POST /api/matching - Force recalculation
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
    const { candidateId, jobId, all } = body;

    // Match all candidates for a job
    if (all && jobId) {
      const result = await matchAllCandidates(tenantId, jobId);
      return NextResponse.json({
        message: `${result.success} candidatos processados`,
        ...result,
      });
    }

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

    // Calculate match
    const result = await matchCandidate(tenantId, candidateId, jobId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erro ao calcular matching" },
        { status: 500 }
      );
    }

    return NextResponse.json({ match: result.data });
  } catch (error) {
    console.error("Error calculating match:", error);
    return NextResponse.json(
      { error: "Erro ao calcular matching" },
      { status: 500 }
    );
  }
}
