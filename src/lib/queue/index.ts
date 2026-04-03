/**
 * Job Queue Manager
 * Zion Recruit - Background Job Queue System
 * 
 * Main entry point for the job queue system.
 */

import {
  JobQueue,
  getQueue,
  initializeQueue,
} from './job-queue'

import {
  JobType,
  JobPriority,
  JobStatus,
  type Job,
  type JobInput,
  type JobOutput,
  type JobOptions,
  type ResumeParseInput,
  type ResumeParseOutput,
  type CandidateMatchInput,
  type CandidateMatchOutput,
  type BatchScreeningInput,
  type BatchScreeningOutput,
  type SendEmailInput,
  type SendEmailOutput,
  type DiscAnalysisInput,
  type DiscAnalysisOutput,
  type WebhookDispatchInput,
  type WebhookDispatchOutput,
  type QueueStats,
  type QueueEventHandler,
  type JobError,
  JobCancelledError,
  JobTimeoutError,
  JobRetryExhaustedError,
} from './job-types'

// Export types
export * from './job-types'
export { JobQueue, getQueue, initializeQueue }

// ============================================
// CONVENIENCE METHODS
// ============================================

/**
 * Quick method to create a resume parse job
 */
export async function createResumeParseJob(
  input: ResumeParseInput,
  options: JobOptions = {}
): Promise<Job> {
  const queue = getQueue()
  return queue.createJob(
    JobType.RESUME_PARSE,
    `Parse resume for candidate ${input.candidateId}`,
    input,
    { ...options, relatedType: 'candidate', relatedId: input.candidateId }
  )
}

/**
 * Quick method to create a candidate match job
 */
export async function createCandidateMatchJob(
  input: CandidateMatchInput,
  options: JobOptions = {}
): Promise<Job> {
  const queue = getQueue()
  return queue.createJob(
    JobType.CANDIDATE_MATCH,
    `Match candidate ${input.candidateId} to job ${input.jobId}`,
    input,
    {
      ...options,
      relatedType: 'candidate',
      relatedId: input.candidateId,
      priority: options.priority || JobPriority.HIGH,
    }
  )
}

/**
 * Quick method to create a batch screening job
 */
export async function createBatchScreeningJob(
  input: BatchScreeningInput,
  options: JobOptions = {}
): Promise<Job> {
  const queue = getQueue()
  return queue.createJob(
    JobType.BATCH_SCREENING,
    `Batch screening for job ${input.jobId}`,
    input,
    { ...options, relatedType: 'job', relatedId: input.jobId }
  )
}

/**
 * Quick method to create an email job
 */
export async function createEmailJob(
  input: SendEmailInput,
  options: JobOptions = {}
): Promise<Job> {
  const queue = getQueue()
  const to = Array.isArray(input.to) ? input.to.join(', ') : input.to
  return queue.createJob(
    JobType.SEND_EMAIL,
    `Send email to ${to}: ${input.subject}`,
    input,
    { ...options, priority: options.priority || JobPriority.HIGH }
  )
}

/**
 * Quick method to create a DISC analysis job
 */
export async function createDiscAnalysisJob(
  input: DiscAnalysisInput,
  options: JobOptions = {}
): Promise<Job> {
  const queue = getQueue()
  return queue.createJob(
    JobType.DISC_ANALYSIS,
    `Analyze DISC test ${input.discTestId}`,
    input,
    {
      ...options,
      relatedType: 'disc_test',
      relatedId: input.discTestId,
      priority: options.priority || JobPriority.HIGH,
    }
  )
}

/**
 * Quick method to create a webhook dispatch job
 */
export async function createWebhookJob(
  input: WebhookDispatchInput,
  options: JobOptions = {}
): Promise<Job> {
  const queue = getQueue()
  return queue.createJob(
    JobType.WEBHOOK_DISPATCH,
    `Dispatch webhook to ${input.url}`,
    input,
    { ...options, priority: options.priority || JobPriority.NORMAL }
  )
}

// ============================================
// JOB STATUS HELPERS
// ============================================

/**
 * Wait for a job to complete
 */
export async function waitForJob(
  jobId: string,
  options: {
    timeout?: number
    pollInterval?: number
  } = {}
): Promise<Job> {
  const queue = getQueue()
  const timeout = options.timeout || 300000 // 5 minutes default
  const pollInterval = options.pollInterval || 1000 // 1 second default

  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const job = await queue.getJob(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    if (
      job.status === JobStatus.COMPLETED ||
      job.status === JobStatus.FAILED ||
      job.status === JobStatus.CANCELLED
    ) {
      return job
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  throw new Error(`Timeout waiting for job ${jobId}`)
}

/**
 * Get jobs for a specific entity
 */
export async function getJobsForEntity(
  relatedType: string,
  relatedId: string,
  options: {
    status?: JobStatus | JobStatus[]
    limit?: number
  } = {}
): Promise<Job[]> {
  const queue = getQueue()
  return queue.getJobs({
    relatedType,
    relatedId,
    status: options.status,
    limit: options.limit || 10,
  })
}

/**
 * Check if a job is still processing
 */
export function isJobProcessing(job: Job | null): boolean {
  if (!job) return false
  return [
    JobStatus.PENDING,
    JobStatus.QUEUED,
    JobStatus.RUNNING,
    JobStatus.RETRY,
  ].includes(job.status)
}

/**
 * Check if a job succeeded
 */
export function isJobCompleted(job: Job | null): boolean {
  return job?.status === JobStatus.COMPLETED
}

/**
 * Check if a job failed
 */
export function isJobFailed(job: Job | null): boolean {
  return job?.status === JobStatus.FAILED
}

// ============================================
// QUEUE INITIALIZATION
// ============================================

/**
 * Initialize and start the job queue with all processors
 */
export async function initializeJobQueue(): Promise<JobQueue> {
  const queue = initializeQueue({
    concurrency: 3,
    pollInterval: 1000,
  })

  // Import and register processors dynamically to avoid circular deps
  const { registerProcessors } = await import('./processors')
  registerProcessors(queue)

  // Start processing
  queue.start()

  console.log('[JobQueueManager] Job queue initialized and started')

  return queue
}
