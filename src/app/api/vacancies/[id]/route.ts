/**
 * Vacancy Detail API - Zion Recruit
 * GET /api/vacancies/[id] - Get single vacancy
 * PUT /api/vacancies/[id] - Update vacancy
 * DELETE /api/vacancies/[id] - Delete vacancy
 * PATCH /api/vacancies/[id]/bulk-status - Bulk status change
 */

import { NextRequest, NextResponse } from "next/server";

// GET /api/vacancies/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    const { db } = await import("@/lib/db");

    const job = await db.job.findUnique({
      where: { id },
      include: {
        _count: {
          select: { candidates: true },
        },
        candidates: {
          select: {
            status: true,
            pipelineStage: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
    }

    // Group candidates by pipeline stage for mini pipeline
    const pipelineGroups: Record<string, { name: string; color: string; count: number }> = {};
    for (const candidate of job.candidates) {
      const stageName = candidate.pipelineStage?.name || "Sem etapa";
      const stageColor = candidate.pipelineStage?.color || "#6B7280";
      const stageId = candidate.pipelineStage?.id || "__none__";
      if (!pipelineGroups[stageId]) {
        pipelineGroups[stageId] = { name: stageName, color: stageColor, count: 0 };
      }
      pipelineGroups[stageId].count++;
    }
    const pipeline = Object.values(pipelineGroups);

    return NextResponse.json({
      job: {
        id: job.id,
        tenantId: job.tenantId,
        title: job.title,
        slug: job.slug,
        department: job.department,
        location: job.location,
        city: job.city,
        state: job.state,
        type: job.type,
        contractType: job.contractType,
        workModel: job.workModel,
        remote: job.remote,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryType: job.salaryType,
        currency: job.currency,
        description: job.description,
        requirements: job.requirements,
        benefits: job.benefits,
        status: job.status,
        publishedAt: job.publishedAt,
        expiresAt: job.expiresAt,
        isPublic: job.isPublic,
        publicSlug: job.publicSlug,
        viewsCount: job.viewsCount,
        applicationsCount: job.applicationsCount,
        aiSummary: job.aiSummary,
        aiParsedSkills: job.aiParsedSkills,
        aiParsedKeywords: job.aiParsedKeywords,
        aiParsedSeniority: job.aiParsedSeniority,
        discProfileRequired: job.discProfileRequired,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        candidatesCount: job._count.candidates,
        pipeline,
      },
    });
  } catch (error) {
    console.error("Error fetching vacancy:", error);
    return NextResponse.json(
      { error: "Erro ao buscar vaga" },
      { status: 500 }
    );
  }
}

// PUT /api/vacancies/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    const { db } = await import("@/lib/db");
    const body = await request.json();

    // Check if job exists
    const existing = await db.job.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
    }

    // Build update data
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = body.title;
    if (body.department !== undefined) data.department = body.department || null;
    if (body.location !== undefined) data.location = body.location || null;
    if (body.type !== undefined) data.type = body.type;
    if (body.contractType !== undefined) data.contractType = body.contractType;
    if (body.workModel !== undefined) data.workModel = body.workModel;
    if (body.remote !== undefined) data.remote = body.remote;
    if (body.salaryMin !== undefined) data.salaryMin = body.salaryMin ? parseInt(body.salaryMin) : null;
    if (body.salaryMax !== undefined) data.salaryMax = body.salaryMax ? parseInt(body.salaryMax) : null;
    if (body.salaryType !== undefined) data.salaryType = body.salaryType;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.description !== undefined) data.description = body.description;
    if (body.requirements !== undefined) data.requirements = body.requirements;
    if (body.benefits !== undefined) data.benefits = body.benefits || null;

    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === "PUBLISHED" && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    if (body.expiresAt !== undefined) {
      data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }

    if (body.isPublic !== undefined) {
      data.isPublic = body.isPublic;
      if (body.isPublic && !existing.publicSlug) {
        data.publicSlug = `${existing.slug}-${Date.now().toString(36)}`;
      }
    }

    const job = await db.job.update({
      where: { id },
      data,
    });

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Error updating vacancy:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar vaga" },
      { status: 500 }
    );
  }
}

// DELETE /api/vacancies/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    const { db } = await import("@/lib/db");

    const existing = await db.job.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
    }

    await db.job.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vacancy:", error);
    return NextResponse.json(
      { error: "Erro ao excluir vaga" },
      { status: 500 }
    );
  }
}

// PATCH /api/vacancies/[id] - for partial updates (status toggle)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}
