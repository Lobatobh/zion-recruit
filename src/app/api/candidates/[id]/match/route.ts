/**
 * Match Score API - Zion Recruit
 * Calculate and retrieve match scores for candidates
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateMatchScore, getJobRequirements, getMatchScoreColor, getMatchScoreLabel } from "@/lib/matching-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/candidates/[id]/match - Get current match score
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get candidate
    const candidate = await db.candidate.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            requirements: true,
            description: true,
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    // Parse existing match details
    let matchDetails = null;
    if (candidate.matchDetails) {
      try {
        matchDetails = JSON.parse(candidate.matchDetails);
      } catch {
        // Invalid JSON
      }
    }

    return NextResponse.json({
      candidateId: candidate.id,
      candidateName: candidate.name,
      jobId: candidate.jobId,
      jobTitle: candidate.job.title,
      matchScore: candidate.matchScore,
      matchDetails,
      colorClass: candidate.matchScore ? getMatchScoreColor(candidate.matchScore) : null,
      label: candidate.matchScore ? getMatchScoreLabel(candidate.matchScore) : null,
    });
  } catch (error) {
    console.error("Error fetching match score:", error);
    return NextResponse.json(
      { error: "Erro ao buscar pontuação" },
      { status: 500 }
    );
  }
}

// POST /api/candidates/[id]/match - Recalculate match score
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get candidate with parsed data
    const candidate = await db.candidate.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    // Check if candidate has parsed data
    if (!candidate.parsedSkills && !candidate.resumeText) {
      return NextResponse.json(
        { error: "Candidato não possui dados de currículo processados" },
        { status: 400 }
      );
    }

    // Get job requirements
    const jobRequirements = await getJobRequirements(candidate.jobId);
    
    if (!jobRequirements) {
      return NextResponse.json(
        { error: "Vaga não encontrada" },
        { status: 404 }
      );
    }

    // Parse candidate profile
    let skills: string[] = [];
    let experience: Array<{ company?: string; title?: string; years?: number }> = [];
    let education: Array<{ institution?: string; degree: string; year?: string }> = [];
    let languages: string[] = [];

    if (candidate.parsedSkills) {
      try {
        skills = JSON.parse(candidate.parsedSkills);
      } catch {
        // Invalid JSON
      }
    }

    if (candidate.parsedExperience) {
      try {
        experience = JSON.parse(candidate.parsedExperience);
      } catch {
        // Invalid JSON
      }
    }

    if (candidate.parsedEducation) {
      try {
        education = JSON.parse(candidate.parsedEducation);
      } catch {
        // Invalid JSON
      }
    }

    // Extract languages from tags field
    try {
      if (candidate.tags) {
        const tags = JSON.parse(candidate.tags);
        if (tags?.languages) {
          languages = tags.languages;
        }
      }
    } catch {
      // Invalid JSON
    }

    // Calculate match score
    const matchResult = await calculateMatchScore(
      {
        skills,
        experience,
        education,
        languages,
        summary: candidate.aiSummary || undefined,
      },
      jobRequirements,
      session.user.tenantId,
      true // use cache
    );

    // Update candidate with new match score
    const updatedCandidate = await db.candidate.update({
      where: { id },
      data: {
        matchScore: matchResult.overallScore,
        matchDetails: JSON.stringify({
          skillsScore: matchResult.skillsScore,
          experienceScore: matchResult.experienceScore,
          educationScore: matchResult.educationScore,
          reasons: matchResult.reasons,
          strengths: matchResult.strengths,
          gaps: matchResult.gaps,
          recalculatedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      cached: matchResult.cached,
      previousScore: candidate.matchScore,
      matchScore: {
        overallScore: matchResult.overallScore,
        skillsScore: matchResult.skillsScore,
        experienceScore: matchResult.experienceScore,
        educationScore: matchResult.educationScore,
        reasons: matchResult.reasons,
        strengths: matchResult.strengths,
        gaps: matchResult.gaps,
        colorClass: getMatchScoreColor(matchResult.overallScore),
        label: getMatchScoreLabel(matchResult.overallScore),
      },
      candidate: {
        id: updatedCandidate.id,
        name: updatedCandidate.name,
        matchScore: updatedCandidate.matchScore,
      },
    });
  } catch (error) {
    console.error("Error recalculating match score:", error);
    return NextResponse.json(
      { error: "Erro ao recalcular pontuação" },
      { status: 500 }
    );
  }
}
