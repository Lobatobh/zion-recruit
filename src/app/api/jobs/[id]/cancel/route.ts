/**
 * Jobs API - Cancel Job
 * POST /api/jobs/[id]/cancel - Cancel a running or pending job
 */

import { NextRequest, NextResponse } from 'next/server'
import { getQueue, JobError } from '@/lib/queue'

export async function POST(
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
    const job = await queue.cancelJob(id)

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
        status: job.status,
        cancelledAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Error cancelling job:', error)
    
    if (error instanceof JobError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel job' },
      { status: 500 }
    )
  }
}
