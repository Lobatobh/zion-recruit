/**
 * Pipeline API - Zion Recruit
 * Handles pipeline stages for kanban board
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireTenant, authErrorResponse } from "@/lib/auth-helper";
import { DEFAULT_STAGES } from "@/types/pipeline";

// GET /api/pipeline - Get all stages with candidates for organization
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const search = searchParams.get("search");
    const minScore = searchParams.get("minScore");

    // Get all pipeline stages for the organization
    let stages = await db.pipelineStage.findMany({
      where: {
        tenantId,
      },
      include: {
        _count: {
          select: { candidates: true },
        },
      },
      orderBy: { order: "asc" },
    });

    // Create default stages if none exist
    if (stages.length === 0) {
      const createdStages = await db.$transaction(
        DEFAULT_STAGES.map((stage) =>
          db.pipelineStage.create({
            data: {
              tenantId,
              name: stage.name,
              color: stage.color,
              order: stage.order,
            },
          })
        )
      );
      
      stages = createdStages.map((stage) => ({
        ...stage,
        _count: { candidates: 0 },
      }));
    }

    // Build candidate where clause
    const candidateWhere: {
      tenantId: string;
      jobId?: string;
      matchScore?: { gte: number };
      OR?: Array<{
        name?: { contains: string };
        email?: { contains: string };
      }>;
    } = {
      tenantId: effectiveTenantId,
    };

    if (jobId) {
      candidateWhere.jobId = jobId;
    }

    if (minScore) {
      candidateWhere.matchScore = { gte: parseInt(minScore) };
    }

    if (search) {
      candidateWhere.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Get candidates for each stage
    const stagesWithCandidates = await Promise.all(
      stages.map(async (stage) => {
        const candidates = await db.candidate.findMany({
          where: {
            ...candidateWhere,
            pipelineStageId: stage.id,
          },
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
            pipelineStageId: true,
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
          orderBy: { createdAt: "desc" },
        });

        return {
          ...stage,
          candidates,
        };
      })
    );

    // Also get candidates without a stage (null pipelineStageId)
    const unassignedCandidates = await db.candidate.findMany({
      where: {
        ...candidateWhere,
        pipelineStageId: null,
      },
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
        pipelineStageId: true,
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
      orderBy: { createdAt: "desc" },
    });

    // Add unassigned candidates to the first stage or create a virtual stage
    if (unassignedCandidates.length > 0 && stagesWithCandidates.length > 0) {
      stagesWithCandidates[0].candidates.push(...unassignedCandidates);
    }

    const totalCandidates = stagesWithCandidates.reduce(
      (acc, stage) => acc + stage.candidates.length,
      0
    );

    return NextResponse.json({
      stages: stagesWithCandidates,
      total: totalCandidates,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// POST /api/pipeline - Create new stage
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Nome da etapa é obrigatório" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingStage = await db.pipelineStage.findFirst({
      where: {
        tenantId,
        name: name.trim(),
      },
    });

    if (existingStage) {
      return NextResponse.json(
        { error: "Já existe uma etapa com este nome" },
        { status: 409 }
      );
    }

    // Get max order
    const maxOrderStage = await db.pipelineStage.findFirst({
      where: {
        tenantId,
      },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = (maxOrderStage?.order ?? -1) + 1;

    const stage = await db.pipelineStage.create({
      data: {
        tenantId,
        name: name.trim(),
        color: color || "#6B7280",
        order: nextOrder,
      },
      include: {
        _count: {
          select: { candidates: true },
        },
      },
    });

    return NextResponse.json({ stage }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
