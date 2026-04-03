/**
 * Jobs API - Create Job
 * POST /api/jobs - Create a new background job
 */

import { NextRequest, NextResponse } from 'next/server'
import { getQueue, JobType, JobPriority, JobStatus } from '@/lib/queue'

interface CreateJobRequest {
  type: JobType
  name?: string
  input: unknown
  options?: {
    priority?: JobPriority
    runAt?: string
    maxAttempts?: number
    tenantId?: string
    createdBy?: string
    relatedType?: string
    relatedId?: string
    description?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateJobRequest = await request.json()

    // Validate required fields
    if (!body.type) {
      return NextResponse.json(
        { error: 'Job type is required' },
        { status: 400 }
      )
    }

    if (!Object.values(JobType).includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid job type. Valid types: ${Object.values(JobType).join(', ')}` },
        { status: 400 }
      )
    }

    if (!body.input) {
      return NextResponse.json(
        { error: 'Job input is required' },
        { status: 400 }
      )
    }

    const queue = getQueue()

    // Generate job name if not provided
    const jobName = body.name || generateJobName(body.type, body.input as Record<string, unknown>)

    // Create job
    const job = await queue.createJob(
      body.type,
      jobName,
      body.input as Record<string, unknown>,
      {
        priority: body.options?.priority || JobPriority.NORMAL,
        runAt: body.options?.runAt ? new Date(body.options.runAt) : undefined,
        maxAttempts: body.options?.maxAttempts,
        tenantId: body.options?.tenantId,
        createdBy: body.options?.createdBy,
        relatedType: body.options?.relatedType,
        relatedId: body.options?.relatedId,
        description: body.options?.description,
      }
    )

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        name: job.name,
        status: job.status,
        priority: job.priority,
        createdAt: job.createdAt,
        runAt: job.runAt,
      },
    })
  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const tenantId = searchParams.get('tenantId')
    const relatedType = searchParams.get('relatedType')
    const relatedId = searchParams.get('relatedId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const queue = getQueue()

    const jobs = await queue.getJobs({
      status: status ? status.split(',') as JobStatus[] : undefined,
      type: type ? type.split(',') as JobType[] : undefined,
      tenantId: tenantId || undefined,
      relatedType: relatedType || undefined,
      relatedId: relatedId || undefined,
      limit,
      offset,
    })

    const stats = await queue.getStats()

    return NextResponse.json({
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        type: job.type,
        name: job.name,
        description: job.description,
        status: job.status,
        priority: job.priority,
        progress: job.progress,
        progressMessage: job.progressMessage,
        error: job.error,
        tenantId: job.tenantId,
        relatedType: job.relatedType,
        relatedId: job.relatedId,
        runAt: job.runAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        duration: job.duration,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
      stats,
      pagination: {
        limit,
        offset,
        total: jobs.length,
      },
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

/**
 * Generate a default job name based on type
 */
function generateJobName(type: JobType, input: Record<string, unknown>): string {
  switch (type) {
    case JobType.RESUME_PARSE:
      return `Parse resume for candidate ${input.candidateId || 'unknown'}`
    case JobType.CANDIDATE_MATCH:
      return `Match candidate ${input.candidateId || 'unknown'} to job ${input.jobId || 'unknown'}`
    case JobType.BATCH_SCREENING:
      return `Batch screening for job ${input.jobId || 'unknown'}`
    case JobType.SEND_EMAIL:
      return `Send email to ${Array.isArray(input.to) ? input.to.join(', ') : input.to || 'unknown'}`
    case JobType.DISC_ANALYSIS:
      return `Analyze DISC test ${input.discTestId || 'unknown'}`
    case JobType.WEBHOOK_DISPATCH:
      return `Dispatch webhook to ${input.url || 'unknown'}`
    default:
      return `${type} job`
  }
}
