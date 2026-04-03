/**
 * Job Queue Implementation
 * Zion Recruit - In-memory queue with SQLite persistence
 */

import { db } from '@/lib/db'
import {
  Job,
  JobType,
  JobStatus,
  JobPriority,
  JobInput,
  JobOutput,
  JobOptions,
  JobProcessor,
  JobProcessorContext,
  QueueEvent,
  QueueEventHandler,
  QueueStats,
  JobError,
  JobCancelledError,
} from './job-types'

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_CONFIG = {
  concurrency: 3,
  pollInterval: 1000, // 1 second
  retryDelay: 5000, // 5 seconds base delay
  maxRetryDelay: 300000, // 5 minutes max delay
  stalledCheckInterval: 30000, // 30 seconds
  stalledJobTimeout: 300000, // 5 minutes
  completedJobTTL: 86400000, // 24 hours
  failedJobTTL: 604800000, // 7 days
}

type QueueConfig = typeof DEFAULT_CONFIG

// ============================================
// JOB QUEUE CLASS
// ============================================

export class JobQueue {
  private config: QueueConfig
  private processors: Map<JobType, JobProcessor<unknown, unknown>> = new Map()
  private runningJobs: Map<string, AbortController> = new Map()
  private eventHandlers: Map<string, QueueEventHandler[]> = new Map()
  private isRunning: boolean = false
  private pollTimer?: NodeJS.Timeout
  private stalledCheckTimer?: NodeJS.Timeout

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ============================================
  // JOB MANAGEMENT
  // ============================================

  /**
   * Create a new job
   */
  async createJob(
    type: JobType,
    name: string,
    input: unknown,
    options: JobOptions = {}
  ): Promise<Job> {
    const jobData = {
      type,
      name,
      description: options.description,
      input: JSON.stringify(input),
      priority: options.priority || JobPriority.NORMAL,
      status: options.runAt ? JobStatus.PENDING : JobStatus.QUEUED,
      runAt: options.runAt,
      maxAttempts: options.maxAttempts || 3,
      tenantId: options.tenantId,
      createdBy: options.createdBy,
      relatedType: options.relatedType,
      relatedId: options.relatedId,
      progress: 0,
      attempts: 0,
    }

    const dbJob = await db.backgroundJob.create({
      data: jobData,
    })

    const job = this.dbJobToJob(dbJob)

    await this.emitEvent({
      type: 'job:created',
      job,
      timestamp: new Date(),
    })

    return job
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const dbJob = await db.backgroundJob.findUnique({
      where: { id: jobId },
    })

    if (!dbJob) return null

    return this.dbJobToJob(dbJob)
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<Job | null> {
    const job = await this.getJob(jobId)
    if (!job) return null

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      throw new JobError(
        `Cannot cancel job in ${job.status} state`,
        'INVALID_STATE'
      )
    }

    // If running, abort it
    const abortController = this.runningJobs.get(jobId)
    if (abortController) {
      abortController.abort()
    }

    const dbJob = await db.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.CANCELLED,
        updatedAt: new Date(),
      },
    })

    const updatedJob = this.dbJobToJob(dbJob)

    await this.emitEvent({
      type: 'job:cancelled',
      job: updatedJob,
      timestamp: new Date(),
    })

    return updatedJob
  }

  /**
   * Get jobs by various filters
   */
  async getJobs(filters: {
    status?: JobStatus | JobStatus[]
    type?: JobType | JobType[]
    tenantId?: string
    relatedType?: string
    relatedId?: string
    limit?: number
    offset?: number
  } = {}): Promise<Job[]> {
    const where: Record<string, unknown> = {}

    if (filters.status) {
      where.status = Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status
    }

    if (filters.type) {
      where.type = Array.isArray(filters.type)
        ? { in: filters.type }
        : filters.type
    }

    if (filters.tenantId) where.tenantId = filters.tenantId
    if (filters.relatedType) where.relatedType = filters.relatedType
    if (filters.relatedId) where.relatedId = filters.relatedId

    const dbJobs = await db.backgroundJob.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'asc' },
      ],
      take: filters.limit || 50,
      skip: filters.offset || 0,
    })

    return dbJobs.map(this.dbJobToJob)
  }

  /**
   * Update job progress
   */
  async updateProgress(
    jobId: string,
    progress: number,
    message?: string
  ): Promise<void> {
    await db.backgroundJob.update({
      where: { id: jobId },
      data: {
        progress: Math.min(100, Math.max(0, progress)),
        progressMessage: message,
        updatedAt: new Date(),
      },
    })
  }

  // ============================================
  // QUEUE OPERATIONS
  // ============================================

  /**
   * Start processing jobs
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    console.log('[JobQueue] Starting job processor...')

    // Start polling for jobs
    this.pollTimer = setInterval(() => {
      this.processNextJobs()
    }, this.config.pollInterval)

    // Start stalled job check
    this.stalledCheckTimer = setInterval(() => {
      this.checkStalledJobs()
    }, this.config.stalledCheckInterval)

    // Initial processing
    this.processNextJobs()
  }

  /**
   * Stop processing jobs
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.isRunning = false
    console.log('[JobQueue] Stopping job processor...')

    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = undefined
    }

    if (this.stalledCheckTimer) {
      clearInterval(this.stalledCheckTimer)
      this.stalledCheckTimer = undefined
    }

    // Wait for running jobs to complete
    while (this.runningJobs.size > 0) {
      console.log(`[JobQueue] Waiting for ${this.runningJobs.size} jobs to complete...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('[JobQueue] Job processor stopped')
  }

  /**
   * Register a job processor
   */
  registerProcessor<TInput, TOutput>(
    type: JobType,
    processor: JobProcessor<TInput, TOutput>
  ): void {
    this.processors.set(type, processor as JobProcessor<unknown, unknown>)
    console.log(`[JobQueue] Registered processor for ${type}`)
  }

  // ============================================
  // INTERNAL METHODS
  // ============================================

  private async processNextJobs(): Promise<void> {
    if (!this.isRunning) return

    // Check how many jobs we can process
    const availableSlots = this.config.concurrency - this.runningJobs.size
    if (availableSlots <= 0) return

    // Get next jobs to process
    const jobs = await this.getNextJobs(availableSlots)

    for (const job of jobs) {
      this.processJob(job).catch(error => {
        console.error(`[JobQueue] Error processing job ${job.id}:`, error)
      })
    }
  }

  private async getNextJobs(limit: number): Promise<Job[]> {
    const now = new Date()

    // Get pending/queued jobs that are ready to run
    const dbJobs = await db.backgroundJob.findMany({
      where: {
        status: { in: [JobStatus.PENDING, JobStatus.QUEUED, JobStatus.RETRY] },
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

    return dbJobs.map(this.dbJobToJob)
  }

  private async processJob(job: Job): Promise<void> {
    const processor = this.processors.get(job.type)
    if (!processor) {
      console.warn(`[JobQueue] No processor registered for job type ${job.type}`)
      return
    }

    // Check if job was cancelled before we started
    const currentJob = await this.getJob(job.id)
    if (!currentJob || currentJob.status === JobStatus.CANCELLED) {
      return
    }

    // Mark job as running
    const abortController = new AbortController()
    this.runningJobs.set(job.id, abortController)

    const startTime = Date.now()

    try {
      // Update job status to running
      await db.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.RUNNING,
          startedAt: new Date(),
          lastAttemptAt: new Date(),
          attempts: { increment: 1 },
          updatedAt: new Date(),
        },
      })

      const updatedJob = await this.getJob(job.id)
      if (!updatedJob) throw new Error('Job not found after update')

      await this.emitEvent({
        type: 'job:started',
        job: updatedJob,
        timestamp: new Date(),
      })

      // Create processor context
      const context: JobProcessorContext = {
        jobId: job.id,
        jobType: job.type,
        tenantId: job.tenantId || undefined,
        updateProgress: async (progress, message) => {
          await this.updateProgress(job.id, progress, message)
        },
        checkCancelled: async () => {
          const j = await this.getJob(job.id)
          return j?.status === JobStatus.CANCELLED
        },
        logger: {
          info: (msg, data) => console.log(`[Job:${job.id}] ${msg}`, data || ''),
          warn: (msg, data) => console.warn(`[Job:${job.id}] ${msg}`, data || ''),
          error: (msg, data) => console.error(`[Job:${job.id}] ${msg}`, data || ''),
        },
      }

      // Parse input
      const input = JSON.parse(job.input as unknown as string)

      // Execute processor
      const output = await processor(input, context)

      // Check if cancelled during processing
      if (abortController.signal.aborted) {
        throw new JobCancelledError(job.id)
      }

      // Mark job as completed
      const duration = Date.now() - startTime
      await db.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
          output: JSON.stringify(output),
          progress: 100,
          duration,
          updatedAt: new Date(),
        },
      })

      const completedJob = await this.getJob(job.id)
      if (completedJob) {
        await this.emitEvent({
          type: 'job:completed',
          job: completedJob,
          timestamp: new Date(),
          data: output,
        })
      }

      console.log(`[JobQueue] Job ${job.id} completed in ${duration}ms`)

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isRetryable = error instanceof JobError ? error.retryable : true

      console.error(`[JobQueue] Job ${job.id} failed:`, errorMessage)

      // Check if cancelled
      if (error instanceof JobCancelledError || abortController.signal.aborted) {
        await db.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.CANCELLED,
            error: errorMessage,
            duration,
            updatedAt: new Date(),
          },
        })
        return
      }

      // Check if we should retry
      const currentAttempts = job.attempts + 1
      if (isRetryable && currentAttempts < job.maxAttempts) {
        // Calculate retry delay with exponential backoff
        const baseDelay = this.config.retryDelay
        const delay = Math.min(
          baseDelay * Math.pow(2, currentAttempts - 1),
          this.config.maxRetryDelay
        )
        const nextRetryAt = new Date(Date.now() + delay)

        await db.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.RETRY,
            error: errorMessage,
            nextRetryAt,
            duration,
            updatedAt: new Date(),
          },
        })

        const retryJob = await this.getJob(job.id)
        if (retryJob) {
          await this.emitEvent({
            type: 'job:retry',
            job: retryJob,
            timestamp: new Date(),
            data: { attempt: currentAttempts, nextRetryAt },
          })
        }
      } else {
        // Mark as failed
        await db.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.FAILED,
            error: errorMessage,
            completedAt: new Date(),
            duration,
            updatedAt: new Date(),
          },
        })

        const failedJob = await this.getJob(job.id)
        if (failedJob) {
          await this.emitEvent({
            type: 'job:failed',
            job: failedJob,
            timestamp: new Date(),
            data: { error: errorMessage },
          })
        }
      }
    } finally {
      this.runningJobs.delete(job.id)
    }
  }

  private async checkStalledJobs(): Promise<void> {
    const stalledThreshold = new Date(
      Date.now() - this.config.stalledJobTimeout
    )

    const stalledJobs = await db.backgroundJob.findMany({
      where: {
        status: JobStatus.RUNNING,
        lastAttemptAt: { lt: stalledThreshold },
      },
    })

    for (const job of stalledJobs) {
      console.warn(`[JobQueue] Detected stalled job ${job.id}`)

      // Reset to retry state
      await db.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.RETRY,
          error: 'Job stalled - exceeded timeout',
          updatedAt: new Date(),
        },
      })
    }
  }

  // ============================================
  // EVENTS
  // ============================================

  on(event: string, handler: QueueEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index > -1) handlers.splice(index, 1)
      }
    }
  }

  private async emitEvent(event: QueueEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) || []
    for (const handler of handlers) {
      try {
        await handler(event)
      } catch (error) {
        console.error(`[JobQueue] Error in event handler for ${event.type}:`, error)
      }
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStats(): Promise<QueueStats> {
    const jobs = await db.backgroundJob.findMany({
      select: {
        type: true,
        status: true,
        priority: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        duration: true,
      },
    })

    const stats: QueueStats = {
      pending: 0,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      retry: 0,
      total: jobs.length,
      byType: {} as Record<JobType, { pending: number; running: number; completed: number; failed: number }>,
      byPriority: {} as Record<JobPriority, { pending: number; running: number }>,
      averageWaitTime: 0,
      averageProcessTime: 0,
    }

    // Initialize byType and byPriority
    Object.values(JobType).forEach(type => {
      stats.byType[type] = { pending: 0, running: 0, completed: 0, failed: 0 }
    })
    Object.values(JobPriority).forEach(priority => {
      stats.byPriority[priority] = { pending: 0, running: 0 }
    })

    let totalWaitTime = 0
    let totalProcessTime = 0
    let waitCount = 0
    let processCount = 0

    for (const job of jobs) {
      // Status counts
      switch (job.status) {
        case 'PENDING':
          stats.pending++
          stats.byType[job.type as JobType].pending++
          stats.byPriority[job.priority as JobPriority].pending++
          break
        case 'QUEUED':
          stats.queued++
          stats.byType[job.type as JobType].pending++
          stats.byPriority[job.priority as JobPriority].pending++
          break
        case 'RUNNING':
          stats.running++
          stats.byType[job.type as JobType].running++
          stats.byPriority[job.priority as JobPriority].running++
          break
        case 'COMPLETED':
          stats.completed++
          stats.byType[job.type as JobType].completed++
          break
        case 'FAILED':
          stats.failed++
          stats.byType[job.type as JobType].failed++
          break
        case 'CANCELLED':
          stats.cancelled++
          break
        case 'RETRY':
          stats.retry++
          break
      }

      // Calculate average times
      if (job.startedAt && job.createdAt) {
        const waitTime = job.startedAt.getTime() - job.createdAt.getTime()
        totalWaitTime += waitTime
        waitCount++
      }

      if (job.duration) {
        totalProcessTime += job.duration
        processCount++
      }
    }

    stats.averageWaitTime = waitCount > 0 ? totalWaitTime / waitCount : 0
    stats.averageProcessTime = processCount > 0 ? totalProcessTime / processCount : 0

    return stats
  }

  // ============================================
  // UTILITIES
  // ============================================

  private dbJobToJob(dbJob: Record<string, unknown>): Job {
    return {
      id: dbJob.id as string,
      type: dbJob.type as JobType,
      name: dbJob.name as string,
      description: dbJob.description as string | undefined,
      input: JSON.parse(dbJob.input as string) as JobInput,
      output: dbJob.output ? JSON.parse(dbJob.output as string) as JobOutput : undefined,
      error: dbJob.error as string | undefined,
      priority: dbJob.priority as JobPriority,
      status: dbJob.status as JobStatus,
      progress: dbJob.progress as number,
      progressMessage: dbJob.progressMessage as string | undefined,
      tenantId: dbJob.tenantId as string | undefined,
      createdBy: dbJob.createdBy as string | undefined,
      relatedType: dbJob.relatedType as string | undefined,
      relatedId: dbJob.relatedId as string | undefined,
      runAt: dbJob.runAt as Date | undefined,
      startedAt: dbJob.startedAt as Date | undefined,
      completedAt: dbJob.completedAt as Date | undefined,
      attempts: dbJob.attempts as number,
      maxAttempts: dbJob.maxAttempts as number,
      lastAttemptAt: dbJob.lastAttemptAt as Date | undefined,
      nextRetryAt: dbJob.nextRetryAt as Date | undefined,
      duration: dbJob.duration as number | undefined,
      result: dbJob.result as string | undefined,
      createdAt: dbJob.createdAt as Date,
      updatedAt: dbJob.updatedAt as Date,
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanup(): Promise<{ completed: number; failed: number }> {
    const completedThreshold = new Date(Date.now() - this.config.completedJobTTL)
    const failedThreshold = new Date(Date.now() - this.config.failedJobTTL)

    const deletedCompleted = await db.backgroundJob.deleteMany({
      where: {
        status: JobStatus.COMPLETED,
        completedAt: { lt: completedThreshold },
      },
    })

    const deletedFailed = await db.backgroundJob.deleteMany({
      where: {
        status: JobStatus.FAILED,
        completedAt: { lt: failedThreshold },
      },
    })

    console.log(`[JobQueue] Cleaned up ${deletedCompleted.count} completed and ${deletedFailed.count} failed jobs`)

    return {
      completed: deletedCompleted.count,
      failed: deletedFailed.count,
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let queueInstance: JobQueue | null = null

export function getQueue(): JobQueue {
  if (!queueInstance) {
    queueInstance = new JobQueue()
  }
  return queueInstance
}

export function initializeQueue(config?: Partial<QueueConfig>): JobQueue {
  if (queueInstance) {
    console.warn('[JobQueue] Queue already initialized')
    return queueInstance
  }
  queueInstance = new JobQueue(config)
  return queueInstance
}
