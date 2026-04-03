/**
 * Candidate Stage API - Zion Recruit
 * Handles moving candidates between pipeline stages
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/candidates/[id]/stage - Move candidate to different stage
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { id: candidateId } = await params;
    const body = await request.json();
    const { stageId } = body;

    if (!stageId) {
      return NextResponse.json(
        { error: "ID da etapa é obrigatório" },
        { status: 400 }
      );
    }

    // Verify candidate belongs to organization
    const candidate = await db.candidate.findFirst({
      where: {
        id: candidateId,
        tenantId: session.user.tenantId,
      },
      include: {
        pipelineStage: true,
        job: {
          select: { title: true },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    // Verify new stage belongs to organization
    const newStage = await db.pipelineStage.findFirst({
      where: {
        id: stageId,
        tenantId: session.user.tenantId,
      },
    });

    if (!newStage) {
      return NextResponse.json(
        { error: "Etapa não encontrada" },
        { status: 404 }
      );
    }

    const previousStageId = candidate.pipelineStageId;
    const previousStageName = candidate.pipelineStage?.name || "Sem etapa";

    // Update candidate's stage
    const updatedCandidate = await db.candidate.update({
      where: { id: candidateId },
      data: {
        pipelineStageId: stageId,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
        pipelineStage: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({
      candidate: updatedCandidate,
      previousStageId,
      newStageId: stageId,
    });
  } catch (error) {
    console.error("Error moving candidate:", error);
    return NextResponse.json(
      { error: "Erro ao mover candidato" },
      { status: 500 }
    );
  }
}
