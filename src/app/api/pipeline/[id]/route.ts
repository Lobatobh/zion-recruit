/**
 * Pipeline Stage API - Zion Recruit
 * Handles individual pipeline stage operations
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/pipeline/[id] - Get single stage with candidates
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const stage = await db.pipelineStage.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        candidates: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            linkedin: true,
            portfolio: true,
            photo: true,
            matchScore: true,
            status: true,
            createdAt: true,
            job: {
              select: {
                id: true,
                title: true,
                department: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { candidates: true },
        },
      },
    });

    if (!stage) {
      return NextResponse.json(
        { error: "Etapa não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ stage });
  } catch (error) {
    console.error("Error fetching stage:", error);
    return NextResponse.json(
      { error: "Erro ao carregar etapa" },
      { status: 500 }
    );
  }
}

// PUT /api/pipeline/[id] - Update stage
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, color, order } = body;

    // Verify stage belongs to organization
    const existingStage = await db.pipelineStage.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingStage) {
      return NextResponse.json(
        { error: "Etapa não encontrada" },
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existingStage.name) {
      const duplicateName = await db.pipelineStage.findFirst({
        where: {
          tenantId: session.user.tenantId,
          name: name.trim(),
          NOT: { id },
        },
      });

      if (duplicateName) {
        return NextResponse.json(
          { error: "Já existe uma etapa com este nome" },
          { status: 409 }
        );
      }
    }

    const updateData: {
      name?: string;
      color?: string;
      order?: number;
    } = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (color !== undefined) {
      updateData.color = color;
    }

    if (order !== undefined) {
      updateData.order = order;
    }

    const stage = await db.pipelineStage.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { candidates: true },
        },
      },
    });

    return NextResponse.json({ stage });
  } catch (error) {
    console.error("Error updating stage:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar etapa" },
      { status: 500 }
    );
  }
}

// DELETE /api/pipeline/[id] - Delete stage (move candidates to default stage)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify stage belongs to organization
    const stage = await db.pipelineStage.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        _count: {
          select: { candidates: true },
        },
      },
    });

    if (!stage) {
      return NextResponse.json(
        { error: "Etapa não encontrada" },
        { status: 404 }
      );
    }

    // Get the first stage (default) to move candidates to
    const firstStage = await db.pipelineStage.findFirst({
      where: {
        tenantId: session.user.tenantId,
        NOT: { id },
      },
      orderBy: { order: "asc" },
    });

    // If there are other stages, move candidates to the first one
    if (firstStage) {
      await db.candidate.updateMany({
        where: {
          pipelineStageId: id,
        },
        data: {
          pipelineStageId: firstStage.id,
        },
      });
    } else {
      // If this is the only stage, set pipelineStageId to null
      await db.candidate.updateMany({
        where: {
          pipelineStageId: id,
        },
        data: {
          pipelineStageId: null,
        },
      });
    }

    // Delete the stage
    await db.pipelineStage.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Etapa excluída com sucesso",
      movedCandidatesCount: stage._count.candidates,
    });
  } catch (error) {
    console.error("Error deleting stage:", error);
    return NextResponse.json(
      { error: "Erro ao excluir etapa" },
      { status: 500 }
    );
  }
}
