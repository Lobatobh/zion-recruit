import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rate-limit";

// GET /api/public/jobs - List public jobs with filters
export async function GET(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(req, "PUBLIC");
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: rateLimitResult.error },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
        }
      }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const location = searchParams.get("location");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      isPublic: true,
      status: "PUBLISHED",
    };

    if (department) {
      where.department = { equals: department, mode: "insensitive" };
    }

    if (location) {
      where.OR = [
        { location: { contains: location, mode: "insensitive" } },
        { city: { contains: location, mode: "insensitive" } },
        { state: { contains: location, mode: "insensitive" } },
        { country: { contains: location, mode: "insensitive" } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      const searchCondition = {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { department: { contains: search, mode: "insensitive" } },
          { aiParsedSkills: { contains: search, mode: "insensitive" } },
        ],
      };
      
      // Combine with existing where clause
      if (where.OR) {
        where.AND = [
          { OR: where.OR as Record<string, unknown>[] },
          searchCondition,
        ];
        delete where.OR;
      } else {
        Object.assign(where, searchCondition);
      }
    }

    // Get jobs with pagination
    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        select: {
          id: true,
          title: true,
          publicSlug: true,
          department: true,
          location: true,
          city: true,
          state: true,
          country: true,
          type: true,
          workModel: true,
          remote: true,
          salaryMin: true,
          salaryMax: true,
          currency: true,
          salaryType: true,
          description: true,
          benefits: true,
          aiParsedSkills: true,
          aiParsedSeniority: true,
          viewsCount: true,
          applicationsCount: true,
          publishedAt: true,
          expiresAt: true,
          createdAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
      }),
      db.job.count({ where }),
    ]);

    // Get unique departments and locations for filters
    const [departments, locations] = await Promise.all([
      db.job.findMany({
        where: { isPublic: true, status: "PUBLISHED", department: { not: null } },
        select: { department: true },
        distinct: ["department"],
      }),
      db.job.findMany({
        where: { isPublic: true, status: "PUBLISHED" },
        select: { city: true, state: true, country: true },
      }),
    ]);

    const response = NextResponse.json({
      jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        departments: departments.map((d) => d.department).filter(Boolean) as string[],
        locations: [...new Set(locations.map((l) => l.city || l.state || l.country).filter(Boolean))] as string[],
      },
    });

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    response.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());

    return response;
  } catch (error) {
    console.error("Error fetching public jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
