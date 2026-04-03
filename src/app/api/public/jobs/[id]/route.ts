import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/public/jobs/[id] - Get job details by ID or publicSlug
export async function GET(req: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;

    // Try to find by ID or publicSlug
    const job = await db.job.findFirst({
      where: {
        OR: [
          { id },
          { publicSlug: id },
        ],
        isPublic: true,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        publicSlug: true,
        department: true,
        description: true,
        requirements: true,
        benefits: true,
        location: true,
        city: true,
        state: true,
        country: true,
        type: true,
        contractType: true,
        workModel: true,
        remote: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        salaryType: true,
        aiParsedSkills: true,
        aiParsedKeywords: true,
        aiParsedSeniority: true,
        aiSummary: true,
        discProfileRequired: true,
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
            slug: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Increment views count (async, don't wait)
    db.job.update({
      where: { id: job.id },
      data: { viewsCount: { increment: 1 } },
    }).catch((err) => console.error("Failed to increment views:", err));

    const response = NextResponse.json({ job });

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    response.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());

    return response;
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}
