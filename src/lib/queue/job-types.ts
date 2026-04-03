/**
 * Job Queue Type Definitions
 * Zion Recruit - Background Job Queue System
 */

// ============================================
// JOB TYPES
// ============================================

export enum JobType {
  RESUME_PARSE = 'RESUME_PARSE',
  CANDIDATE_MATCH = 'CANDIDATE_MATCH',
  BATCH_SCREENING = 'BATCH_SCREENING',
  SEND_EMAIL = 'SEND_EMAIL',
  DISC_ANALYSIS = 'DISC_ANALYSIS',
  WEBHOOK_DISPATCH = 'WEBHOOK_DISPATCH',
}

export enum JobPriority {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW',
}

export enum JobStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  RETRY = 'RETRY',
}

// ============================================
// JOB INPUT TYPES
// ============================================

export interface ResumeParseInput {
  candidateId: string
  resumeUrl: string
  resumeText?: string
  options?: {
    extractSkills?: boolean
    extractExperience?: boolean
    extractEducation?: boolean
  }
}

export interface CandidateMatchInput {
  candidateId: string
  jobId: string
  options?: {
    includeDisc?: boolean
    includeSkills?: boolean
    includeExperience?: boolean
  }
}

export interface BatchScreeningInput {
  jobId: string
  candidateIds: string[]
  options?: {
    maxCandidates?: number
    minScore?: number
    excludeContacted?: boolean
  }
}

export interface SendEmailInput {
  to: string | string[]
  subject: string
  body: string
  html?: string
  options?: {
    cc?: string[]
    bcc?: string[]
    replyTo?: string
    attachments?: Array<{
      filename: string
      content: string | Buffer
      contentType?: string
    }>
    templateId?: string
    templateData?: Record<string, unknown>
  }
}

export interface DiscAnalysisInput {
  discTestId: string
  candidateId: string
  options?: {
    generateReport?: boolean
    compareWithJob?: boolean
    jobId?: string
  }
}

export interface WebhookDispatchInput {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  payload: Record<string, unknown>
  headers?: Record<string, string>
  options?: {
    retryOnFailure?: boolean
    timeout?: number
    signature?: string
  }
}

// ============================================
// JOB OUTPUT TYPES
// ============================================

export interface ResumeParseOutput {
  candidateId: string
  skills: string[]
  experience: Array<{
    title: string
    company: string
    startDate: string
    endDate?: string
    description?: string
  }>
  education: Array<{
    degree: string
    institution: string
    year: string
    field?: string
  }>
  summary: string
  confidence: number
}

export interface CandidateMatchOutput {
  candidateId: string
  jobId: string
  matchScore: number
  skillsScore: number
  experienceScore: number
  discScore?: number
  matchDetails: {
    matchedSkills: string[]
    missingSkills: string[]
    experienceMatch: boolean
    discFit?: boolean
  }
  recommendation: 'STRONG_MATCH' | 'GOOD_MATCH' | 'PARTIAL_MATCH' | 'NO_MATCH'
}

export interface BatchScreeningOutput {
  jobId: string
  totalCandidates: number
  screenedCandidates: number
  results: Array<{
    candidateId: string
    candidateName: string
    score: number
    recommendation: string
  }>
  topCandidates: string[]
  averageScore: number
}

export interface SendEmailOutput {
  messageId: string
  to: string[]
  sentAt: Date
  provider: string
}

export interface DiscAnalysisOutput {
  discTestId: string
  candidateId: string
  profile: {
    D: number
    I: number
    S: number
    C: number
  }
  primaryProfile: string
  secondaryProfile?: string
  profileCombo: string
  strengths: string[]
  weaknesses: string[]
  workStyle: string
  jobFitScore?: number
  jobFitDetails?: string
}

export interface WebhookDispatchOutput {
  url: string
  statusCode: number
  response: unknown
  duration: number
}

// ============================================
// JOB DEFINITION
// ============================================

export type JobInput = 
  | ResumeParseInput 
  | CandidateMatchInput 
  | BatchScreeningInput 
  | SendEmailInput 
  | DiscAnalysisInput 
  | WebhookDispatchInput

export type JobOutput = 
  | ResumeParseOutput 
  | CandidateMatchOutput 
  | BatchScreeningOutput 
  | SendEmailOutput 
  | DiscAnalysisOutput 
  | WebhookDispatchOutput

export interface JobOptions {
  priority?: JobPriority
  runAt?: Date
  maxAttempts?: number
  tenantId?: string
  createdBy?: string
  relatedType?: string
  relatedId?: string
  description?: string
}

export interface Job<TInput = JobInput, TOutput = JobOutput> {
  id: string
  type: JobType
  name: string
  description?: string
  input: TInput
  output?: TOutput
  error?: string
  
  priority: JobPriority
  status: JobStatus
  progress: number
  progressMessage?: string
  
  tenantId?: string
  createdBy?: string
  relatedType?: string
  relatedId?: string
  
  runAt?: Date
  startedAt?: Date
  completedAt?: Date
  
  attempts: number
  maxAttempts: number
  lastAttemptAt?: Date
  nextRetryAt?: Date
  
  duration?: number
  result?: string
  
  createdAt: Date
  updatedAt: Date
}

// ============================================
// PROCESSOR TYPES
// ============================================

export interface JobProcessorContext {
  jobId: string
  jobType: JobType
  tenantId?: string
  updateProgress: (progress: number, message?: string) => Promise<void>
  checkCancelled: () => Promise<boolean>
  logger: {
    info: (message: string, data?: unknown) => void
    warn: (message: string, data?: unknown) => void
    error: (message: string, data?: unknown) => void
  }
}

export type JobProcessor<TInput, TOutput> = (
  input: TInput,
  context: JobProcessorContext
) => Promise<TOutput>

export interface ProcessorDefinition {
  type: JobType
  processor: JobProcessor<unknown, unknown>
  concurrency?: number
  timeout?: number
}

// ============================================
// QUEUE EVENTS
// ============================================

export type QueueEventType = 
  | 'job:created'
  | 'job:started'
  | 'job:progress'
  | 'job:completed'
  | 'job:failed'
  | 'job:cancelled'
  | 'job:retry'

export interface QueueEvent {
  type: QueueEventType
  job: Job
  timestamp: Date
  data?: unknown
}

export type QueueEventHandler = (event: QueueEvent) => void | Promise<void>

// ============================================
// QUEUE STATISTICS
// ============================================

export interface QueueStats {
  pending: number
  queued: number
  running: number
  completed: number
  failed: number
  cancelled: number
  retry: number
  total: number
  
  byType: Record<JobType, {
    pending: number
    running: number
    completed: number
    failed: number
  }>
  
  byPriority: Record<JobPriority, {
    pending: number
    running: number
  }>
  
  averageWaitTime: number
  averageProcessTime: number
}

// ============================================
// ERROR TYPES
// ============================================

export class JobError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'JobError'
  }
}

export class JobCancelledError extends JobError {
  constructor(jobId: string) {
    super(`Job ${jobId} was cancelled`, 'JOB_CANCELLED', false)
    this.name = 'JobCancelledError'
  }
}

export class JobTimeoutError extends JobError {
  constructor(jobId: string, timeout: number) {
    super(
      `Job ${jobId} timed out after ${timeout}ms`,
      'JOB_TIMEOUT',
      true
    )
    this.name = 'JobTimeoutError'
  }
}

export class JobRetryExhaustedError extends JobError {
  constructor(jobId: string, attempts: number) {
    super(
      `Job ${jobId} exhausted all ${attempts} retry attempts`,
      'RETRY_EXHAUSTED',
      false
    )
    this.name = 'JobRetryExhaustedError'
  }
}
