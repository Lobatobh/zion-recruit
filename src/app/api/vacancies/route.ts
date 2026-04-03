/**
 * Vacancies API - Zion Recruit
 * GET /api/vacancies - List vacancies with KPI stats, pagination, sorting
 * POST /api/vacancies - Create new vacancy
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/vacancies
export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get tenant
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const tenantId = session.user.tenantId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const type = searchParams.get("type");
    const limit = searchParams.get("limit");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(limit || searchParams.get("pageSize") || "20", 10);
    const sortField = searchParams.get("sortField") || "createdAt";
    const sortDir = searchParams.get("sortDir") || "desc";

    // Validate sort field
    const validSortFields = ["title", "createdAt", "updatedAt", "status", "type"];
    const safeSortField = validSortFields.includes(sortField) ? sortField : "createdAt";

    // Build where clause with tenant isolation
    const where: Record<string, unknown> = { tenantId };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (department) {
      where.department = department;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { department: { contains: search } },
        { location: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Get total count for this tenant
    const total = await db.job.count({ where });

    // Get filtered jobs with candidate count
    const jobs = await db.job.findMany({
      where,
      include: {
        _count: {
          select: { candidates: true },
        },
      },
      orderBy: { [safeSortField]: sortDir === "asc" ? "asc" : "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Get KPI stats scoped to tenant
    const tenantWhere = { tenantId };
    const [
      totalJobs,
      publishedJobs,
      draftJobs,
      closedJobs,
      totalCandidates,
    ] = await Promise.all([
      db.job.count({ where: tenantWhere }),
      db.job.count({ where: { ...tenantWhere, status: "PUBLISHED" } }),
      db.job.count({ where: { ...tenantWhere, status: "DRAFT" } }),
      db.job.count({ where: { ...tenantWhere, status: "CLOSED" } }),
      db.candidate.count({ where: tenantWhere }),
    ]);

    // Calculate average candidates per job (manual - Prisma doesn't support relation count aggregation)
    const allJobsWithCount = await db.job.findMany({
      where: tenantWhere,
      select: {
        id: true,
        _count: { select: { candidates: true } },
      },
    });
    const avgCandidatesPerJob = allJobsWithCount.length > 0
      ? Math.round(
          allJobsWithCount.reduce((sum, j) => sum + j._count.candidates, 0) /
            allJobsWithCount.length
        )
      : 0;

    // Get unique departments for filter dropdown (scoped to tenant)
    const departmentsRaw = await db.job.findMany({
      select: { department: true },
      where: { ...tenantWhere, department: { not: null } },
      distinct: ["department"],
    });
    const departments = departmentsRaw
      .map((d) => d.department)
      .filter((d): d is string => d !== null)
      .sort();

    return NextResponse.json({
      jobs: jobs.map((job) => ({
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
        aiParsedSeniority: job.aiParsedSeniority,
        discProfileRequired: job.discProfileRequired,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        candidatesCount: job._count.candidates,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      stats: {
        totalJobs,
        publishedJobs,
        draftJobs,
        closedJobs,
        totalCandidates,
        avgCandidatesPerJob,
      },
      filters: {
        departments,
      },
    });
  } catch (error) {
    console.error("Error fetching vacancies:", error);
    return NextResponse.json(
      { error: "Erro ao buscar vagas" },
      { status: 500 }
    );
  }
}

// POST /api/vacancies
export async function POST(request: NextRequest) {
  try {
    // Authenticate user and get tenant
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const tenantId = session.user.tenantId;

    const body = await request.json();

    const {
      title,
      department,
      location,
      type = "FULL_TIME",
      contractType = "CLT",
      workModel = "REMOTE",
      remote = false,
      salaryMin,
      salaryMax,
      salaryType = "MONTHLY",
      currency = "BRL",
      description,
      requirements,
      benefits,
      status = "DRAFT",
    } = body;

    if (!title || !description || !requirements) {
      return NextResponse.json(
        { error: "Título, descrição e requisitos são obrigatórios" },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check unique slug within tenant
    const existingSlug = await db.job.findFirst({
      where: { slug, tenantId },
    });

    const finalSlug = existingSlug ? `${slug}-${Date.now().toString(36)}` : slug;

    const job = await db.job.create({
      data: {
        tenantId,
        title,
        slug: finalSlug,
        department: department || null,
        location: location || null,
        type,
        contractType,
        workModel,
        remote,
        salaryMin: salaryMin ? (typeof salaryMin === "number" ? salaryMin : parseInt(salaryMin)) : null,
        salaryMax: salaryMax ? (typeof salaryMax === "number" ? salaryMax : parseInt(salaryMax)) : null,
        salaryType,
        currency,
        description,
        requirements,
        benefits: benefits || null,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("Error creating vacancy:", error);
    return NextResponse.json(
      { error: "Erro ao criar vaga" },
      { status: 500 }
    );
  }
}
