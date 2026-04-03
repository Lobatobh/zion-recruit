/**
 * Job Processor Service - Zion Recruit
 * Background job processing service using the job queue
 * 
 * Port: 3005
 */

import { PrismaClient } from '@prisma/client'

// Configuration
const PORT = 3005
const POLL_INTERVAL = 1000 // 1 second
const CONCURRENCY = 3
const RETRY_BASE_DELAY = 5000 // 5 seconds
const MAX_RETRY_DELAY = 300000 // 5 minutes

// Initialize Prisma
const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

// Types
type JobStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'RETRY'
type JobPriority = 'HIGH' | 'NORMAL' | 'LOW'
type JobType = 'RESUME_PARSE' | 'CANDIDATE_MATCH' | 'BATCH_SCREENING' | 'SEND_EMAIL' | 'DISC_ANALYSIS' | 'WEBHOOK_DISPATCH'

interface Job {
  id: string
  type: JobType
  name: string
  input: string
  status: JobStatus
  priority: JobPriority
  attempts: number
  maxAttempts: number
  tenantId?: string
}

// Job processors map
const processors: Map<JobType, (input: unknown, context: ProcessorContext) => Promise<unknown>> = new Map()

interface ProcessorContext {
  jobId: string
  tenantId?: string
  updateProgress: (progress: number, message?: string) => Promise<void>
  checkCancelled: () => Promise<boolean>
  logger: {
    info: (msg: string, data?: unknown) => void
    warn: (msg: string, data?: unknown) => void
    error: (msg: string, data?: unknown) => void
  }
}

// Running jobs tracking
const runningJobs = new Map<string, boolean>()

// ============================================
// PROCESSORS
// ============================================

// Resume Parse Processor
processors.set('RESUME_PARSE', async (input: unknown, context: ProcessorContext) => {
  const { candidateId, resumeUrl, resumeText } = input as {
    candidateId: string
    resumeUrl?: string
    resumeText?: string
  }

  context.logger.info(`Parsing resume for candidate ${candidateId}`)
  await context.updateProgress(20, 'Fetching resume')

  // Get resume text
  let text = resumeText
  if (!text && resumeUrl) {
    const response = await fetch(resumeUrl)
    if (response.ok) {
      text = await response.text()
    }
  }

  if (!text) {
    throw new Error('No resume text available')
  }

  await context.updateProgress(50, 'Analyzing with AI')

  // Use AI to parse
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a resume parser. Extract skills, experience, and education. Return JSON only.',
        },
        {
          role: 'user',
          content: `Parse this resume and return JSON with: { skills: [], experience: [], education: [], summary: string, confidence: number }\n\n${text?.substring(0, 6000) || ''}`,
        },
      ],
      temperature: 0.1,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    await context.updateProgress(90, 'Saving results')

    // Update candidate
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        parsedSkills: JSON.stringify(result.skills || []),
        parsedExperience: JSON.stringify(result.experience || []),
        parsedEducation: JSON.stringify(result.education || []),
        aiSummary: result.summary || '',
        resumeText: text,
      },
    })

    await context.updateProgress(100, 'Complete')

    return {
      candidateId,
      ...result,
    }
  } catch (error) {
    context.logger.error('AI parsing failed', error)
    throw error
  }
})

// Candidate Match Processor
processors.set('CANDIDATE_MATCH', async (input: unknown, context: ProcessorContext) => {
  const { candidateId, jobId } = input as { candidateId: string; jobId: string }

  context.logger.info(`Matching candidate ${candidateId} to job ${jobId}`)
  await context.updateProgress(20, 'Fetching data')

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } })
  const job = await prisma.job.findUnique({ where: { id: jobId } })

  if (!candidate || !job) {
    throw new Error('Candidate or job not found')
  }

  await context.updateProgress(50, 'Calculating match')

  // Parse skills
  let candidateSkills: string[] = []
  let jobSkills: string[] = []

  try { candidateSkills = JSON.parse(candidate.parsedSkills || '[]') } catch {}
  try { jobSkills = JSON.parse(job.aiParsedSkills || '[]') } catch {}

  // Calculate match
  const matchedSkills = jobSkills.filter(js =>
    candidateSkills.some((cs: string) =>
      cs.toLowerCase().includes(js.toLowerCase()) ||
      js.toLowerCase().includes(cs.toLowerCase())
    )
  )

  const skillsScore = jobSkills.length > 0
    ? Math.round((matchedSkills.length / jobSkills.length) * 100)
    : 50

  const matchScore = skillsScore

  await context.updateProgress(90, 'Saving results')

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      matchScore,
      matchDetails: JSON.stringify({ matchedSkills, skillsScore }),
      skillsScore,
    },
  })

  await context.updateProgress(100, 'Complete')

  return {
    candidateId,
    jobId,
    matchScore,
    skillsScore,
    matchedSkills,
  }
})

// Batch Screening Processor
processors.set('BATCH_SCREENING', async (input: unknown, context: ProcessorContext) => {
  const { jobId, candidateIds } = input as { jobId: string; candidateIds: string[] }

  context.logger.info(`Batch screening ${candidateIds.length} candidates for job ${jobId}`)
  await context.updateProgress(10, 'Fetching candidates')

  const candidates = await prisma.candidate.findMany({
    where: { id: { in: candidateIds } },
  })

  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) throw new Error('Job not found')

  let jobSkills: string[] = []
  try { jobSkills = JSON.parse(job.aiParsedSkills || '[]') } catch {}

  const results: Array<{ candidateId: string; score: number }> = []

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]
    const progress = 20 + Math.round((i / candidates.length) * 70)
    await context.updateProgress(progress, `Screening ${i + 1}/${candidates.length}`)

    let candidateSkills: string[] = []
    try { candidateSkills = JSON.parse(candidate.parsedSkills || '[]') } catch {}

    const matchedSkills = jobSkills.filter(js =>
      candidateSkills.some((cs: string) =>
        cs.toLowerCase().includes(js.toLowerCase())
      )
    )

    const score = jobSkills.length > 0
      ? Math.round((matchedSkills.length / jobSkills.length) * 100)
      : 50

    results.push({ candidateId: candidate.id, score })
  }

  results.sort((a, b) => b.score - a.score)

  await context.updateProgress(100, 'Complete')

  return {
    jobId,
    totalCandidates: candidateIds.length,
    screenedCandidates: results.length,
    results,
    topCandidates: results.slice(0, 5).map(r => r.candidateId),
  }
})

// Send Email Processor
processors.set('SEND_EMAIL', async (input: unknown, context: ProcessorContext) => {
  const { to, subject, body, html } = input as {
    to: string | string[]
    subject: string
    body: string
    html?: string
  }

  const recipients = Array.isArray(to) ? to : [to]
  context.logger.info(`Sending email to ${recipients.join(', ')}`)
  await context.updateProgress(30, 'Preparing email')

  // Check for email config
  const emailConfig = context.tenantId
    ? await prisma.apiCredential.findFirst({
        where: { tenantId: context.tenantId, provider: 'RESEND', isActive: true },
      })
    : null

  await context.updateProgress(60, 'Sending')

  let messageId = `simulated_${Date.now()}`
  let provider = 'simulated'

  if (emailConfig?.apiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${emailConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@zionrecruit.com',
          to: recipients,
          subject,
          html: html || body.replace(/\n/g, '<br>'),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        messageId = data.id
        provider = 'resend'
      }
    } catch (error) {
      context.logger.error('Email send failed', error)
    }
  }

  await context.updateProgress(100, 'Complete')

  return { messageId, to: recipients, provider, sentAt: new Date() }
})

// DISC Analysis Processor
processors.set('DISC_ANALYSIS', async (input: unknown, context: ProcessorContext) => {
  const { discTestId, candidateId } = input as { discTestId: string; candidateId: string }

  context.logger.info(`Analyzing DISC test ${discTestId}`)
  await context.updateProgress(20, 'Fetching test')

  const discTest = await prisma.dISCTest.findUnique({ where: { id: discTestId } })
  if (!discTest) throw new Error('DISC test not found')

  await context.updateProgress(50, 'Generating AI insights')

  // Generate AI analysis
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a DISC analyst. Return JSON with strengths[], weaknesses[], workStyle string.',
        },
        {
          role: 'user',
          content: `Analyze DISC profile: D=${discTest.profileD}, I=${discTest.profileI}, S=${discTest.profileS}, C=${discTest.profileC}`,
        },
      ],
      temperature: 0.7,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    await context.updateProgress(90, 'Saving')

    await prisma.dISCTest.update({
      where: { id: discTestId },
      data: {
        primaryProfile: discTest.profileD && discTest.profileD >= (discTest.profileI || 0) ? 'D' : 'I',
        aiStrengths: JSON.stringify(result.strengths || []),
        aiWeaknesses: JSON.stringify(result.weaknesses || []),
        aiWorkStyle: result.workStyle || '',
      },
    })

    await context.updateProgress(100, 'Complete')

    return {
      discTestId,
      candidateId,
      ...result,
    }
  } catch (error) {
    context.logger.error('DISC analysis failed', error)
    throw error
  }
})

// Webhook Dispatch Processor
processors.set('WEBHOOK_DISPATCH', async (input: unknown, context: ProcessorContext) => {
  const { url, method, payload, headers, options } = input as {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    payload: unknown
    headers?: Record<string, string>
    options?: { timeout?: number }
  }

  context.logger.info(`Dispatching webhook to ${url}`)
  await context.updateProgress(30, 'Sending request')

  const timeout = options?.timeout || 30000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: method !== 'GET' ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const responseText = await response.text()

    await context.updateProgress(100, 'Complete')

    return {
      url,
      statusCode: response.status,
      response: responseText,
      duration: 0,
    }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
})

// ============================================
// QUEUE PROCESSING
// ============================================

async function updateJobProgress(jobId: string, progress: number, message?: string): Promise<void> {
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      progress: Math.min(100, Math.max(0, progress)),
      progressMessage: message,
    },
  })
}

async function isJobCancelled(jobId: string): Promise<boolean> {
  const job = await prisma.backgroundJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  })
  return job?.status === 'CANCELLED'
}

async function getNextJobs(limit: number): Promise<Job[]> {
  const now = new Date()

  const jobs = await prisma.backgroundJob.findMany({
    where: {
      status: { in: ['PENDING', 'QUEUED', 'RETRY'] },
      OR: [
        { runAt: null },
        { runAt: { lte: now } },
      ],
    },
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'asc' },
    ],
    take: limit,
  })

  return jobs as Job[]
}

async function processJob(job: Job): Promise<void> {
  const processor = processors.get(job.type)
  if (!processor) {
    console.log(`[JobProcessor] No processor for type ${job.type}`)
    return
  }

  // Check if already running
  if (runningJobs.has(job.id)) {
    return
  }

  runningJobs.set(job.id, true)
  const startTime = Date.now()

  try {
    // Mark as running
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        lastAttemptAt: new Date(),
        attempts: { increment: 1 },
      },
    })

    console.log(`[JobProcessor] Processing job ${job.id} (${job.type})`)

    // Create context
    const context: ProcessorContext = {
      jobId: job.id,
      tenantId: job.tenantId || undefined,
      updateProgress: (progress, message) => updateJobProgress(job.id, progress, message),
      checkCancelled: () => isJobCancelled(job.id),
      logger: {
        info: (msg, data) => console.log(`[Job:${job.id}] ${msg}`, data || ''),
        warn: (msg, data) => console.warn(`[Job:${job.id}] ${msg}`, data || ''),
        error: (msg, data) => console.error(`[Job:${job.id}] ${msg}`, data || ''),
      },
    }

    // Parse input
    const input = JSON.parse(job.input)

    // Execute processor
    const output = await processor(input, context)

    // Check cancelled
    if (await isJobCancelled(job.id)) {
      console.log(`[JobProcessor] Job ${job.id} was cancelled`)
      return
    }

    // Mark as completed
    const duration = Date.now() - startTime
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        output: JSON.stringify(output),
        progress: 100,
        duration,
      },
    })

    console.log(`[JobProcessor] Job ${job.id} completed in ${duration}ms`)

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error(`[JobProcessor] Job ${job.id} failed:`, errorMessage)

    // Check if should retry
    const attempts = job.attempts + 1
    if (attempts < job.maxAttempts) {
      const delay = Math.min(RETRY_BASE_DELAY * Math.pow(2, attempts - 1), MAX_RETRY_DELAY)
      const nextRetryAt = new Date(Date.now() + delay)

      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: 'RETRY',
          error: errorMessage,
          nextRetryAt,
          duration,
        },
      })

      console.log(`[JobProcessor] Job ${job.id} scheduled for retry at ${nextRetryAt}`)
    } else {
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: errorMessage,
          completedAt: new Date(),
          duration,
        },
      })
    }
  } finally {
    runningJobs.delete(job.id)
  }
}

async function processJobs(): Promise<void> {
  const availableSlots = CONCURRENCY - runningJobs.size
  if (availableSlots <= 0) return

  const jobs = await getNextJobs(availableSlots)

  for (const job of jobs) {
    processJob(job).catch(err => {
      console.error(`[JobProcessor] Error processing job ${job.id}:`, err)
    })
  }
}

// ============================================
// HTTP SERVER (for health checks)
// ============================================

async function startServer(): Promise<void> {
  const { createServer } = await import('http')

  const server = createServer(async (req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        status: 'healthy',
        runningJobs: runningJobs.size,
        timestamp: new Date().toISOString(),
      }))
      return
    }

    if (req.url === '/stats') {
      const stats = await prisma.backgroundJob.groupBy({
        by: ['status'],
        _count: true,
      })

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        status: 'ok',
        runningJobs: runningJobs.size,
        stats: stats.reduce((acc, s) => {
          acc[s.status] = s._count
          return acc
        }, {} as Record<string, number>),
      }))
      return
    }

    res.writeHead(404)
    res.end('Not found')
  })

  server.listen(PORT, () => {
    console.log(`[JobProcessor] Server running on port ${PORT}`)
    console.log(`[JobProcessor] Health check: http://localhost:${PORT}/health`)
  })
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  console.log('========================================')
  console.log('Job Processor Service - Zion Recruit')
  console.log('========================================')
  console.log(`Port: ${PORT}`)
  console.log(`Concurrency: ${CONCURRENCY}`)
  console.log(`Poll Interval: ${POLL_INTERVAL}ms`)
  console.log('========================================')

  // Start HTTP server
  await startServer()

  // Start processing loop
  console.log('[JobProcessor] Starting job processing...')

  // Initial process
  processJobs().catch(console.error)

  // Set up polling
  setInterval(() => {
    processJobs().catch(console.error)
  }, POLL_INTERVAL)

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[JobProcessor] Shutting down...')
    
    // Wait for running jobs
    while (runningJobs.size > 0) {
      console.log(`[JobProcessor] Waiting for ${runningJobs.size} jobs...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    await prisma.$disconnect()
    process.exit(0)
  })
}

main().catch(console.error)
