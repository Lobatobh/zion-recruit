/**
 * DISC Analysis Processor
 * Zion Recruit - Background Job Queue System
 * 
 * Analyzes DISC test results and generates insights.
 */

import { db } from '@/lib/db'
import {
  JobProcessor,
  DiscAnalysisInput,
  DiscAnalysisOutput,
  JobProcessorContext,
  JobError,
} from '../job-types'

export const discAnalysisProcessor: JobProcessor<DiscAnalysisInput, DiscAnalysisOutput> = async (
  input: DiscAnalysisInput,
  context: JobProcessorContext
): Promise<DiscAnalysisOutput> => {
  const { discTestId, candidateId, options = {} } = input
  const { updateProgress, checkCancelled, logger } = context

  logger.info(`Starting DISC analysis for test ${discTestId}`)

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  await updateProgress(10, 'Fetching DISC test data')

  // Get DISC test
  const discTest = await db.dISCTest.findUnique({
    where: { id: discTestId },
  })

  if (!discTest) {
    throw new JobError(`DISC test ${discTestId} not found`, 'NOT_FOUND', false)
  }

  if (discTest.status !== 'COMPLETED') {
    throw new JobError(`DISC test ${discTestId} is not completed`, 'INVALID_STATE', false)
  }

  await updateProgress(30, 'Analyzing DISC profile')

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  // Get DISC profile scores
  const profile = {
    D: discTest.profileD || 0,
    I: discTest.profileI || 0,
    S: discTest.profileS || 0,
    C: discTest.profileC || 0,
  }

  // Determine primary and secondary profiles
  const sortedProfiles = Object.entries(profile)
    .sort(([, a], [, b]) => b - a)
  
  const primaryProfile = sortedProfiles[0]?.[0] || 'D'
  const secondaryProfile = sortedProfiles[1]?.[0]
  const profileCombo = secondaryProfile 
    ? `${primaryProfile}${secondaryProfile}`
    : primaryProfile

  await updateProgress(50, 'Generating AI insights')

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  // Generate AI analysis if not already present
  let strengths: string[]
  let weaknesses: string[]
  let workStyle: string

  if (discTest.aiStrengths && discTest.aiWeaknesses && discTest.aiWorkStyle) {
    try {
      strengths = JSON.parse(discTest.aiStrengths)
      weaknesses = JSON.parse(discTest.aiWeaknesses)
      workStyle = discTest.aiWorkStyle
    } catch {
      strengths = []
      weaknesses = []
      workStyle = ''
    }
  } else {
    // Generate with AI
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const prompt = `Analyze this DISC profile:
D (Dominance): ${profile.D}
I (Influence): ${profile.I}
S (Steadiness): ${profile.S}
C (Compliance): ${profile.C}

Primary Profile: ${primaryProfile}
${secondaryProfile ? `Secondary Profile: ${secondaryProfile}` : ''}

Return a JSON object with:
{
  "strengths": ["strength1", "strength2", ...] (5 strengths),
  "weaknesses": ["weakness1", "weakness2", ...] (3-4 areas for improvement),
  "workStyle": "A paragraph describing their ideal work environment and style"
}

Return ONLY the JSON object.`

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a DISC profile analyst. Provide insightful, balanced analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      })

      const responseText = completion.choices[0]?.message?.content || ''
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        strengths = parsed.strengths || []
        weaknesses = parsed.weaknesses || []
        workStyle = parsed.workStyle || ''
      } else {
        throw new Error('Failed to parse AI response')
      }
    } catch (error) {
      logger.error('AI analysis failed, using defaults', error)
      
      // Default values based on profile
      strengths = ['Determined', 'Results-oriented', 'Direct communication']
      weaknesses = ['May need patience', 'Could improve listening']
      workStyle = 'This candidate thrives in dynamic, goal-oriented environments.'
    }
  }

  await updateProgress(70, 'Calculating job fit')

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  // Calculate job fit if requested
  let jobFitScore: number | undefined
  let jobFitDetails: string | undefined

  if (options.compareWithJob && options.jobId) {
    const job = await db.job.findUnique({
      where: { id: options.jobId },
    })

    if (job?.discProfileRequired) {
      const requiredProfiles = job.discProfileRequired.split(',').map(p => p.trim().toUpperCase())
      const candidateProfile = primaryProfile.toUpperCase()

      const matches = requiredProfiles.some(rp =>
        candidateProfile.includes(rp) || rp.includes(candidateProfile)
      )

      jobFitScore = matches ? 85 : 50

      if (matches) {
        jobFitDetails = `Candidate's ${primaryProfile} profile matches the required ${job.discProfileRequired} profile for this role.`
      } else {
        jobFitDetails = `Candidate's ${primaryProfile} profile differs from the preferred ${job.discProfileRequired} profile for this role.`
      }

      // Update DISC test with job fit info
      await db.dISCTest.update({
        where: { id: discTestId },
        data: {
          jobFitScore,
          jobFitDetails,
        },
      })
    }
  }

  await updateProgress(90, 'Saving analysis')

  // Update DISC test with analysis if not already saved
  if (!discTest.aiStrengths) {
    await db.dISCTest.update({
      where: { id: discTestId },
      data: {
        primaryProfile,
        secondaryProfile,
        profileCombo,
        aiStrengths: JSON.stringify(strengths),
        aiWeaknesses: JSON.stringify(weaknesses),
        aiWorkStyle: workStyle,
      },
    })
  }

  await updateProgress(100, 'DISC analysis complete')

  logger.info(`DISC analysis completed`, {
    primaryProfile,
    profileCombo,
    jobFitScore,
  })

  return {
    discTestId,
    candidateId,
    profile,
    primaryProfile,
    secondaryProfile,
    profileCombo,
    strengths,
    weaknesses,
    workStyle,
    jobFitScore,
    jobFitDetails,
  }
}
