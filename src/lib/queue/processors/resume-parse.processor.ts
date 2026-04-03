/**
 * Resume Parse Processor
 * Zion Recruit - Background Job Queue System
 * 
 * Parses candidate resumes and extracts structured information.
 */

import { db } from '@/lib/db'
import {
  JobProcessor,
  ResumeParseInput,
  ResumeParseOutput,
  JobProcessorContext,
  JobError,
} from '../job-types'

export const resumeParseProcessor: JobProcessor<ResumeParseInput, ResumeParseOutput> = async (
  input: ResumeParseInput,
  context: JobProcessorContext
): Promise<ResumeParseOutput> => {
  const { candidateId, resumeUrl, resumeText, options = {} } = input
  const { updateProgress, checkCancelled, logger } = context

  logger.info(`Starting resume parse for candidate ${candidateId}`)

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  await updateProgress(10, 'Fetching resume content')

  // Get resume text - either provided or fetch from URL
  let text = resumeText
  if (!text && resumeUrl) {
    try {
      const response = await fetch(resumeUrl)
      if (!response.ok) {
        throw new JobError(`Failed to fetch resume from URL: ${response.status}`, 'FETCH_ERROR', true)
      }
      text = await response.text()
    } catch (error) {
      logger.error('Failed to fetch resume', error)
      throw new JobError(`Failed to fetch resume: ${error}`, 'FETCH_ERROR', true)
    }
  }

  if (!text) {
    throw new JobError('No resume text available', 'NO_CONTENT', false)
  }

  await updateProgress(30, 'Analyzing resume structure')

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  // Use AI to parse resume
  let parsedData: Omit<ResumeParseOutput, 'candidateId'>

  try {
    // Dynamic import to avoid issues with ESM
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    await updateProgress(50, 'Extracting information with AI')

    const prompt = `You are a resume parser. Extract structured information from the following resume text.
Return a JSON object with the following structure:
{
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null if current",
      "description": "Brief description"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "year": "YYYY",
      "field": "Field of Study"
    }
  ],
  "summary": "A 2-3 sentence professional summary",
  "confidence": 0.85
}

Resume text:
${text.substring(0, 8000)}

Return ONLY the JSON object, no other text.`

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a precise resume parser that extracts structured data and returns valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new JobError('Failed to parse AI response as JSON', 'PARSE_ERROR', true)
    }

    parsedData = JSON.parse(jsonMatch[0])

    // Validate required fields
    if (!parsedData.skills) parsedData.skills = []
    if (!parsedData.experience) parsedData.experience = []
    if (!parsedData.education) parsedData.education = []
    if (!parsedData.summary) parsedData.summary = ''
    if (!parsedData.confidence) parsedData.confidence = 0.5

  } catch (error) {
    logger.error('AI parsing failed', error)
    
    // Fallback: return empty structured data
    parsedData = {
      skills: [],
      experience: [],
      education: [],
      summary: '',
      confidence: 0,
    }
  }

  await updateProgress(80, 'Saving parsed data')

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  // Update candidate with parsed data
  try {
    await db.candidate.update({
      where: { id: candidateId },
      data: {
        parsedSkills: JSON.stringify(parsedData.skills),
        parsedExperience: JSON.stringify(parsedData.experience),
        parsedEducation: JSON.stringify(parsedData.education),
        aiSummary: parsedData.summary,
        resumeText: text,
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    logger.error('Failed to update candidate', error)
    throw new JobError(`Failed to save parsed data: ${error}`, 'DB_ERROR', true)
  }

  await updateProgress(100, 'Resume parsed successfully')

  logger.info(`Resume parse completed for candidate ${candidateId}`, {
    skillsCount: parsedData.skills.length,
    experienceCount: parsedData.experience.length,
    confidence: parsedData.confidence,
  })

  return {
    candidateId,
    skills: parsedData.skills,
    experience: parsedData.experience,
    education: parsedData.education,
    summary: parsedData.summary,
    confidence: parsedData.confidence,
  }
}
