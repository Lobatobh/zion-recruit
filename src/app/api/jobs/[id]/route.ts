/**
 * Jobs API - Get Job Status
 * GET /api/jobs/[id] - Get job status and details
 */

import { NextRequest, NextResponse } from 'next/server'
import { getQueue } from '@/lib/queue'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const queue = getQueue()
    const job = await queue.getJob(id)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        name: job.name,
        description: job.description,
        input: job.input,
        output: job.output,
        error: job.error,
        status: job.status,
        priority: job.priority,
        progress: job.progress,
        progressMessage: job.progressMessage,
        tenantId: job.tenantId,
        createdBy: job.createdBy,
        relatedType: job.relatedType,
        relatedId: job.relatedId,
        runAt: job.runAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        lastAttemptAt: job.lastAttemptAt,
        nextRetryAt: job.nextRetryAt,
        duration: job.duration,
        result: job.result,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch job' },
      { status: 500 }
    )
  }
}
