/**
 * Candidates API - Zion Recruit
 * Handles candidate creation and listing
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseResume } from "@/lib/resume-parser";
import { calculateMatchScore, getJobRequirements } from "@/lib/matching-service";

interface CreateCandidateBody {
  jobId?: string | null;
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  portfolio?: string;
  resumeText?: string;
  resumeBase64?: string;
  source?: string;
  skipParsing?: boolean;
}

// GET /api/candidates - List candidates for organization
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const minScore = searchParams.get("minScore");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: session.user.tenantId,
    };

    if (jobId) {
      where.jobId = jobId;
    }

    if (status) {
      const statusValues = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statusValues.length === 1) {
        where.status = statusValues[0];
      } else if (statusValues.length > 1) {
        where.status = { in: statusValues };
      }
    }

    if (minScore) {
      where.matchScore = { gte: parseInt(minScore) };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Validate sort fields
    const validSortFields = ["createdAt", "updatedAt", "name", "matchScore", "status"];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

    const [candidates, total] = await Promise.all([
      db.candidate.findMany({
        where,
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
          _count: {
            select: {
              notes: true,
            },
          },
        },
        orderBy: { [safeSortBy]: safeSortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.candidate.count({ where }),
    ]);

    return NextResponse.json({
      candidates,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return NextResponse.json(
      { error: "Erro ao buscar candidatos" },
      { status: 500 }
    );
  }
}

// POST /api/candidates - Create new candidate with resume parsing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body: CreateCandidateBody = await request.json();
    const { 
      jobId, 
      name: providedName,
      email: providedEmail,
      phone: providedPhone,
      linkedin,
      portfolio,
      resumeText,
      resumeBase64,
      source,
      skipParsing 
    } = body;

    // Verify job exists and belongs to organization (if provided)
    let job = null;
    if (jobId) {
      job = await db.job.findFirst({
        where: {
          id: jobId,
          tenantId: session.user.tenantId,
        },
      });

      if (!job) {
        return NextResponse.json(
          { error: "Vaga não encontrada" },
          { status: 404 }
        );
      }
    }

    // Get default pipeline stage (first stage)
    const defaultStage = await db.pipelineStage.findFirst({
      where: {
        tenantId: session.user.tenantId,
      },
      orderBy: { order: "asc" },
    });

    // Prepare resume text
    let textContent = resumeText || "";
    
    if (resumeBase64 && !resumeText) {
      try {
        textContent = Buffer.from(resumeBase64, "base64").toString("utf-8");
      } catch {
        // If decoding fails, leave empty
      }
    }

    // Initialize candidate data
    let candidateData: Record<string, unknown> = {
      name: providedName || "",
      email: providedEmail || "",
      phone: providedPhone || null,
      linkedin: linkedin || null,
      portfolio: portfolio || null,
      resumeText: textContent || null,
      parsedSkills: null,
      parsedExperience: null,
      parsedEducation: null,
      aiSummary: null,
      matchScore: null,
      matchDetails: null,
    };

    let parsingResult = null;
    let matchResult = null;

    // Parse resume if text provided and not skipped
    if (textContent && !skipParsing) {
      const parseResult = await parseResume(
        textContent,
        session.user.tenantId
      );

      if (parseResult.success && parseResult.data) {
        parsingResult = parseResult.data;
        
        // Override with parsed data if not provided
        candidateData.name = providedName || parsingResult.name || "";
        candidateData.email = providedEmail || parsingResult.email || "";
        candidateData.phone = providedPhone || parsingResult.phone || null;
        candidateData.parsedSkills = JSON.stringify(parsingResult.skills);
        candidateData.parsedExperience = JSON.stringify(parsingResult.experience);
        candidateData.parsedEducation = JSON.stringify(parsingResult.education);
        if (parsingResult.languages?.length) {
          candidateData.tags = JSON.stringify({ languages: parsingResult.languages });
        }
        candidateData.aiSummary = parsingResult.summary || null;

        // Calculate match score (only if job is associated)
        let jobRequirements = null;
        if (jobId) {
          jobRequirements = await getJobRequirements(jobId);
        }
        
        if (jobRequirements) {
          matchResult = await calculateMatchScore(
            {
              skills: parsingResult.skills,
              experience: parsingResult.experience,
              education: parsingResult.education,
              summary: parsingResult.summary,
            },
            jobRequirements,
            session.user.tenantId
          );

          candidateData.matchScore = matchResult.overallScore;
          candidateData.matchDetails = JSON.stringify({
            skillsScore: matchResult.skillsScore,
            experienceScore: matchResult.experienceScore,
            educationScore: matchResult.educationScore,
            reasons: matchResult.reasons,
            strengths: matchResult.strengths,
            gaps: matchResult.gaps,
          });
        }
      }
    }

    // Validate required fields
    if (!candidateData.name || !candidateData.email) {
      return NextResponse.json(
        { error: "Nome e email são obrigatórios" },
        { status: 400 }
      );
    }

    // Check for duplicate candidate (same email for same job, only if job is specified)
    if (jobId) {
      const existingCandidate = await db.candidate.findFirst({
        where: {
          tenantId: session.user.tenantId,
          jobId,
          email: candidateData.email,
        },
      });

      if (existingCandidate) {
        return NextResponse.json(
          { error: "Candidato já existe para esta vaga" },
          { status: 409 }
        );
      }
    }

    // Create candidate
    const candidate = await db.candidate.create({
      data: {
        tenantId: session.user.tenantId,
        jobId: jobId || null,
        pipelineStageId: defaultStage?.id || null,
        name: candidateData.name,
        email: candidateData.email,
        phone: candidateData.phone,
        linkedin: candidateData.linkedin,
        portfolio: candidateData.portfolio,
        resumeText: candidateData.resumeText,
        parsedSkills: candidateData.parsedSkills,
        parsedExperience: candidateData.parsedExperience,
        parsedEducation: candidateData.parsedEducation,
        aiSummary: candidateData.aiSummary,
        matchScore: candidateData.matchScore,
        matchDetails: candidateData.matchDetails,
        tags: candidateData.tags || null,
        source: source || null,
        status: "APPLIED",
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
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
      candidate,
      parsing: parsingResult ? {
        success: true,
        cached: parsingResult.parsingConfidence,
      } : null,
      matching: matchResult ? {
        overallScore: matchResult.overallScore,
        cached: matchResult.cached,
      } : null,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating candidate:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Erro ao criar candidato", details: message },
      { status: 500 }
    );
  }
}
