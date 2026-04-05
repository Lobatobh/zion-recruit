/**
 * Matching API - Zion Recruit
 * Calculate candidate-job compatibility
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireTenant, authErrorResponse } from "@/lib/auth-helper";
import { matchCandidate, matchAllCandidates, getTopCandidates } from "@/lib/agents/specialized/MatchingAgent";

// GET /api/matching - Get match score for candidate
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

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
    return authErrorResponse(error);
  }
}

// POST /api/matching - Force recalculation
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

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
    return authErrorResponse(error);
  }
}
