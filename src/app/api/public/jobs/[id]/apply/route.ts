import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Application schema
const applicationSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address"),
  phone: z.string().max(50).optional().nullable(),
  
  // Resume (either file upload or URL)
  resumeUrl: z.string().url("Invalid resume URL").optional().nullable(),
  
  // Professional links
  linkedin: z.string().url("Invalid LinkedIn URL").optional().nullable().or(z.literal("")),
  github: z.string().url("Invalid GitHub URL").optional().nullable().or(z.literal("")),
  portfolio: z.string().url("Invalid portfolio URL").optional().nullable().or(z.literal("")),
  
  // Cover letter/message
  coverLetter: z.string().max(5000).optional().nullable(),
  
  // Source tracking
  source: z.string().max(100).optional().nullable(),
  utmSource: z.string().max(100).optional().nullable(),
  utmMedium: z.string().max(100).optional().nullable(),
  utmCampaign: z.string().max(100).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
});

// POST /api/public/jobs/[id]/apply - Apply to a job
export async function POST(req: NextRequest, { params }: RouteParams) {
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
    const body = await req.json();

    // Validate input
    const validationResult = applicationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Find the job
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
        tenantId: true,
        title: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found or not accepting applications" },
        { status: 404 }
      );
    }

    // Check if candidate already applied with this email
    const existingCandidate = await db.candidate.findFirst({
      where: {
        email: data.email.toLowerCase(),
        jobId: job.id,
      },
    });

    if (existingCandidate) {
      return NextResponse.json(
        { error: "You have already applied to this position" },
        { status: 409 }
      );
    }

    // Build source tracking JSON
    const sourceData: Record<string, unknown> = {
      type: "public_application",
      appliedAt: new Date().toISOString(),
    };

    if (data.source) sourceData.source = data.source;
    if (data.utmSource) sourceData.utmSource = data.utmSource;
    if (data.utmMedium) sourceData.utmMedium = data.utmMedium;
    if (data.utmCampaign) sourceData.utmCampaign = data.utmCampaign;
    if (data.referrer) sourceData.referrer = data.referrer;

    // Get or create the default pipeline stage for applied candidates
    let defaultStage = await db.pipelineStage.findFirst({
      where: {
        tenantId: job.tenantId,
        isDefault: true,
      },
    });

    // If no default stage, create one
    if (!defaultStage) {
      defaultStage = await db.pipelineStage.create({
        data: {
          tenantId: job.tenantId,
          name: "Applied",
          order: 1,
          color: "#6B7280",
          isDefault: true,
        },
      });
    }

    // Create candidate
    const candidate = await db.candidate.create({
      data: {
        tenantId: job.tenantId,
        jobId: job.id,
        pipelineStageId: defaultStage.id,
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        linkedin: data.linkedin || null,
        github: data.github || null,
        portfolio: data.portfolio || null,
        resumeUrl: data.resumeUrl || null,
        status: "APPLIED",
        source: JSON.stringify(sourceData),
        sourceUrl: data.referrer || null,
      },
    });

    // Increment application count (async, don't wait)
    db.job.update({
      where: { id: job.id },
      data: { applicationsCount: { increment: 1 } },
    }).catch((err) => console.error("Failed to increment applications count:", err));

    const response = NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      candidateId: candidate.id,
    });

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    response.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());

    return response;
  } catch (error) {
    console.error("Error processing application:", error);
    return NextResponse.json(
      { error: "Failed to process application" },
      { status: 500 }
    );
  }
}
