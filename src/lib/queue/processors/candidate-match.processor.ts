/**
 * Candidate Match Processor
 * Zion Recruit - Background Job Queue System
 * 
 * Matches a candidate to a job and calculates fit scores.
 */

import { db } from '@/lib/db'
import {
  JobProcessor,
  CandidateMatchInput,
  CandidateMatchOutput,
  JobProcessorContext,
  JobError,
} from '../job-types'

export const candidateMatchProcessor: JobProcessor<CandidateMatchInput, CandidateMatchOutput> = async (
  input: CandidateMatchInput,
  context: JobProcessorContext
): Promise<CandidateMatchOutput> => {
  const { candidateId, jobId, options = {} } = input
  const { updateProgress, checkCancelled, logger } = context

  logger.info(`Starting candidate match: ${candidateId} -> ${jobId}`)

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  await updateProgress(10, 'Fetching candidate and job data')

  // Fetch candidate and job data
  const candidate = await db.candidate.findUnique({
    where: { id: candidateId },
  })

  if (!candidate) {
    throw new JobError(`Candidate ${candidateId} not found`, 'NOT_FOUND', false)
  }

  const job = await db.job.findUnique({
    where: { id: jobId },
  })

  if (!job) {
    throw new JobError(`Job ${jobId} not found`, 'NOT_FOUND', false)
  }

  await updateProgress(30, 'Analyzing candidate profile')

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  // Parse candidate skills
  let candidateSkills: string[] = []
  try {
    if (candidate.parsedSkills) {
      candidateSkills = JSON.parse(candidate.parsedSkills)
    }
  } catch {
    logger.warn('Failed to parse candidate skills')
  }

  // Parse job requirements
  let jobSkills: string[] = []
  try {
    if (job.aiParsedSkills) {
      jobSkills = JSON.parse(job.aiParsedSkills)
    }
  } catch {
    logger.warn('Failed to parse job skills')
  }

  await updateProgress(50, 'Calculating match scores')

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  // Calculate skill match score
  const skillsMatch: string[] = []
  const skillsMissing: string[] = []
  
  for (const skill of jobSkills) {
    const hasSkill = candidateSkills.some(cs => 
      cs.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(cs.toLowerCase())
    )
    if (hasSkill) {
      skillsMatch.push(skill)
    } else {
      skillsMissing.push(skill)
    }
  }

  const skillsScore = jobSkills.length > 0 
    ? Math.round((skillsMatch.length / jobSkills.length) * 100)
    : 50

  // Calculate experience score (simplified)
  let experienceScore = 50
  let experienceMatch = true
  
  if (job.aiParsedSeniority) {
    const seniority = job.aiParsedSeniority.toLowerCase()
    // Check candidate experience level
    let parsedExp: Array<{ title: string }> = []
    try {
      if (candidate.parsedExperience) {
        parsedExp = JSON.parse(candidate.parsedExperience)
      }
    } catch {
      // Ignore parse errors
    }

    const yearsOfExp = parsedExp.length * 2 // Rough estimate
    
    if (seniority.includes('senior') || seniority.includes('lead')) {
      experienceScore = yearsOfExp >= 5 ? 90 : yearsOfExp >= 3 ? 70 : 40
      experienceMatch = yearsOfExp >= 3
    } else if (seniority.includes('junior') || seniority.includes('entry')) {
      experienceScore = yearsOfExp <= 3 ? 90 : 70
      experienceMatch = true
    } else if (seniority.includes('mid') || seniority.includes('pleno')) {
      experienceScore = yearsOfExp >= 2 ? 85 : 60
      experienceMatch = yearsOfExp >= 2
    }
  }

  // Calculate DISC fit if available
  let discScore: number | undefined
  let discFit: boolean | undefined

  if (options.includeDisc && job.discProfileRequired) {
    await updateProgress(70, 'Analyzing DISC fit')

    const discTest = await db.dISCTest.findFirst({
      where: {
        candidateId,
        status: 'COMPLETED',
      },
    })

    if (discTest && discTest.primaryProfile) {
      const requiredProfiles = job.discProfileRequired.split(',').map(p => p.trim().toUpperCase())
      const candidateProfile = discTest.primaryProfile.toUpperCase()
      
      discFit = requiredProfiles.some(rp => 
        candidateProfile.includes(rp) || rp.includes(candidateProfile)
      )
      discScore = discFit ? 90 : 50
    }
  }

  await updateProgress(85, 'Calculating final scores')

  // Calculate overall match score
  let matchScore = Math.round((skillsScore * 0.5) + (experienceScore * 0.3))
  
  if (discScore !== undefined) {
    matchScore = Math.round((matchScore * 0.7) + (discScore * 0.3))
  }

  // Determine recommendation
  let recommendation: 'STRONG_MATCH' | 'GOOD_MATCH' | 'PARTIAL_MATCH' | 'NO_MATCH'
  if (matchScore >= 80) {
    recommendation = 'STRONG_MATCH'
  } else if (matchScore >= 60) {
    recommendation = 'GOOD_MATCH'
  } else if (matchScore >= 40) {
    recommendation = 'PARTIAL_MATCH'
  } else {
    recommendation = 'NO_MATCH'
  }

  await updateProgress(95, 'Saving match results')

  // Update candidate with match data
  await db.candidate.update({
    where: { id: candidateId },
    data: {
      matchScore,
      matchDetails: JSON.stringify({
        skillsMatch,
        skillsMissing,
        skillsScore,
        experienceScore,
        discScore,
        recommendation,
      }),
      skillsScore,
      experienceScore,
      updatedAt: new Date(),
    },
  })

  await updateProgress(100, 'Match analysis complete')

  logger.info(`Candidate match completed`, {
    matchScore,
    skillsScore,
    experienceScore,
    recommendation,
  })

  return {
    candidateId,
    jobId,
    matchScore,
    skillsScore,
    experienceScore,
    discScore,
    matchDetails: {
      matchedSkills: skillsMatch,
      missingSkills: skillsMissing,
      experienceMatch,
      discFit,
    },
    recommendation,
  }
}
