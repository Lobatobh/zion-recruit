/**
 * Jobs API - Cancel Job
 * POST /api/jobs/[id]/cancel - Cancel a running or pending job
 */

import { NextRequest, NextResponse } from 'next/server'
import { getQueue, JobError } from '@/lib/queue'
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth()
    const tenantId = requireTenant(user)
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const queue = getQueue()

    // Fetch job first to verify tenant ownership
    const existingJob = await queue.getJob(id)
    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Verify tenant ownership before cancel
    if (existingJob.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const job = await queue.cancelJob(id)

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
    if (error instanceof JobError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return authErrorResponse(error)
  }
}
