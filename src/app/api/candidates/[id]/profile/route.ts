import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/candidates/[id]/profile - Get complete candidate profile
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get candidate with all relations
    const candidate = await db.candidate.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            city: true,
            state: true,
          },
        },
        pipelineStage: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
          },
        },
        notes: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        discTests: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!candidate) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 })
    }

    // Parse JSON fields safely
    let parsedSkills = []
    let parsedExperience = []
    let parsedEducation = []
    let parsedLanguages = []
    let matchDetails = null

    try {
      parsedSkills = candidate.parsedSkills ? JSON.parse(candidate.parsedSkills) : []
    } catch (e) {
      parsedSkills = []
    }

    try {
      parsedExperience = candidate.parsedExperience ? JSON.parse(candidate.parsedExperience) : []
    } catch (e) {
      parsedExperience = []
    }

    try {
      parsedEducation = candidate.parsedEducation ? JSON.parse(candidate.parsedEducation) : []
    } catch (e) {
      parsedEducation = []
    }

    // Extract languages from tags field
    try {
      if (candidate.tags) {
        const tags = JSON.parse(candidate.tags)
        if (tags?.languages) {
          parsedLanguages = tags.languages
        }
      }
    } catch (e) {
      parsedLanguages = []
    }

    try {
      matchDetails = candidate.matchDetails ? JSON.parse(candidate.matchDetails) : null
    } catch (e) {
      matchDetails = null
    }

    // Get DISC test if exists
    const discTest = candidate.discTests[0]
    const formattedDiscTest = discTest ? {
      id: discTest.id,
      status: discTest.status,
      profileD: discTest.profileD,
      profileI: discTest.profileI,
      profileS: discTest.profileS,
      profileC: discTest.profileC,
      primaryProfile: discTest.primaryProfile,
      secondaryProfile: discTest.secondaryProfile,
      profileCombo: discTest.profileCombo,
      aiAnalysis: discTest.aiAnalysis,
      aiStrengths: discTest.aiStrengths,
      aiWeaknesses: discTest.aiWeaknesses,
      aiWorkStyle: discTest.aiWorkStyle,
      jobFitScore: discTest.jobFitScore,
      jobFitDetails: discTest.jobFitDetails,
      completedAt: discTest.completedAt?.toISOString(),
    } : null

    // Build complete profile
    const profile = {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      linkedin: candidate.linkedin,
      portfolio: candidate.portfolio,
      photo: candidate.photo,
      status: candidate.status,
      source: candidate.source,
      matchScore: candidate.matchScore,
      matchDetails: matchDetails ? {
        skillsScore: matchDetails.skillsScore || 0,
        experienceScore: matchDetails.experienceScore || 0,
        educationScore: matchDetails.educationScore || 0,
        overallScore: matchDetails.overallScore || candidate.matchScore || 0,
        strengths: matchDetails.strengths || [],
        gaps: matchDetails.gaps || [],
        recommendations: matchDetails.recommendations || [],
      } : null,
      aiSummary: candidate.aiSummary,
      resumeUrl: candidate.resumeUrl,
      resumeText: candidate.resumeText,
      parsedSkills,
      parsedExperience: parsedExperience.map((exp: any, idx: number) => ({
        id: `exp-${idx}`,
        company: exp.company || '',
        title: exp.title || '',
        startDate: exp.startDate,
        endDate: exp.endDate,
        current: exp.current,
        description: exp.description,
        location: exp.location,
      })),
      parsedEducation: parsedEducation.map((edu: any, idx: number) => ({
        id: `edu-${idx}`,
        institution: edu.institution || '',
        degree: edu.degree || '',
        field: edu.field,
        startDate: edu.startDate,
        endDate: edu.endDate,
        gpa: edu.gpa,
      })),
      parsedLanguages,
      discTest: formattedDiscTest,
      job: candidate.job,
      pipelineStage: candidate.pipelineStage,
      createdAt: candidate.createdAt.toISOString(),
      updatedAt: candidate.updatedAt.toISOString(),
      notes: candidate.notes.map(n => ({
        id: n.id,
        content: n.content,
        type: n.type,
        isPrivate: n.isPrivate,
        createdAt: n.createdAt.toISOString(),
        member: null, // Notes don't have member relation in current schema
      })),
      activities: [], // No activity tracking in current schema
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching candidate profile:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar perfil do candidato' },
      { status: 500 }
    )
  }
}
