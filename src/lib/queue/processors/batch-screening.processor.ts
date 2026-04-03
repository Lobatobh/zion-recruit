/**
 * Batch Screening Processor
 * Zion Recruit - Background Job Queue System
 * 
 * Screens multiple candidates for a job in batch mode.
 */

import { db } from '@/lib/db'
import {
  JobProcessor,
  BatchScreeningInput,
  BatchScreeningOutput,
  JobProcessorContext,
  JobError,
} from '../job-types'

export const batchScreeningProcessor: JobProcessor<BatchScreeningInput, BatchScreeningOutput> = async (
  input: BatchScreeningInput,
  context: JobProcessorContext
): Promise<BatchScreeningOutput> => {
  const { jobId, candidateIds, options = {} } = input
  const { updateProgress, checkCancelled, logger } = context

  logger.info(`Starting batch screening for job ${jobId}`, {
    candidateCount: candidateIds.length,
  })

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  // Get job data
  const job = await db.job.findUnique({
    where: { id: jobId },
  })

  if (!job) {
    throw new JobError(`Job ${jobId} not found`, 'NOT_FOUND', false)
  }

  await updateProgress(10, 'Fetching candidates')

  // Get candidates
  let candidates = await db.candidate.findMany({
    where: {
      id: { in: candidateIds },
    },
  })

  // Apply filters
  if (options.excludeContacted) {
    candidates = candidates.filter(c => !c.contactedAt)
  }

  if (options.maxCandidates && candidates.length > options.maxCandidates) {
    candidates = candidates.slice(0, options.maxCandidates)
  }

  const totalCandidates = candidates.length
  const results: BatchScreeningOutput['results'] = []
  const topCandidates: string[] = []
  let totalScore = 0

  // Parse job skills once
  let jobSkills: string[] = []
  try {
    if (job.aiParsedSkills) {
      jobSkills = JSON.parse(job.aiParsedSkills)
    }
  } catch {
    logger.warn('Failed to parse job skills')
  }

  await updateProgress(20, 'Screening candidates')

  // Process each candidate
  for (let i = 0; i < candidates.length; i++) {
    // Check if cancelled
    if (await checkCancelled()) {
      throw new JobError('Job cancelled', 'CANCELLED', false)
    }

    const candidate = candidates[i]
    const progress = 20 + Math.round((i / candidates.length) * 70)

    await updateProgress(progress, `Screening candidate ${i + 1}/${totalCandidates}`)

    // Calculate quick score
    let candidateSkills: string[] = []
    try {
      if (candidate.parsedSkills) {
        candidateSkills = JSON.parse(candidate.parsedSkills)
      }
    } catch {
      // Ignore parse errors
    }

    // Skill matching
    const matchedSkills = jobSkills.filter(js =>
      candidateSkills.some(cs =>
        cs.toLowerCase().includes(js.toLowerCase()) ||
        js.toLowerCase().includes(cs.toLowerCase())
      )
    )

    const skillsScore = jobSkills.length > 0
      ? Math.round((matchedSkills.length / jobSkills.length) * 100)
      : 50

    // Use existing match score or calculate new one
    let score = candidate.matchScore || skillsScore

    // Apply minimum score filter
    if (options.minScore && score < options.minScore) {
      continue
    }

    // Determine recommendation
    let recommendation: string
    if (score >= 80) {
      recommendation = 'STRONG_MATCH'
    } else if (score >= 60) {
      recommendation = 'GOOD_MATCH'
    } else if (score >= 40) {
      recommendation = 'PARTIAL_MATCH'
    } else {
      recommendation = 'NO_MATCH'
    }

    results.push({
      candidateId: candidate.id,
      candidateName: candidate.name,
      score,
      recommendation,
    })

    totalScore += score
  }

  await updateProgress(95, 'Ranking results')

  // Sort by score and get top candidates
  results.sort((a, b) => b.score - a.score)

  // Get top 5 candidates
  const topResults = results.slice(0, 5)
  topResults.forEach(r => topCandidates.push(r.candidateId))

  const averageScore = results.length > 0 ? Math.round(totalScore / results.length) : 0

  await updateProgress(100, 'Batch screening complete')

  logger.info(`Batch screening completed`, {
    totalCandidates,
    screenedCandidates: results.length,
    averageScore,
    topCandidatesCount: topCandidates.length,
  })

  return {
    jobId,
    totalCandidates: candidateIds.length,
    screenedCandidates: results.length,
    results,
    topCandidates,
    averageScore,
  }
}
