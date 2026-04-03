/**
 * use-job-status Hook
 * Zion Recruit - Background Job Queue System
 * 
 * React hook for polling job status and progress.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// Types
export type JobStatus = 
  | 'PENDING' 
  | 'QUEUED' 
  | 'RUNNING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'RETRY'

export type JobPriority = 'HIGH' | 'NORMAL' | 'LOW'

export type JobType = 
  | 'RESUME_PARSE'
  | 'CANDIDATE_MATCH'
  | 'BATCH_SCREENING'
  | 'SEND_EMAIL'
  | 'DISC_ANALYSIS'
  | 'WEBHOOK_DISPATCH'

export interface Job {
  id: string
  type: JobType
  name: string
  description?: string
  status: JobStatus
  priority: JobPriority
  progress: number
  progressMessage?: string
  error?: string
  output?: unknown
  tenantId?: string
  relatedType?: string
  relatedId?: string
  runAt?: Date
  startedAt?: Date
  completedAt?: Date
  attempts: number
  maxAttempts: number
  duration?: number
  createdAt: Date
  updatedAt: Date
}

interface UseJobStatusOptions {
  pollInterval?: number
  onComplete?: (job: Job) => void
  onFailure?: (job: Job) => void
  onCancel?: (job: Job) => void
  autoStart?: boolean
}

interface UseJobStatusReturn {
  job: Job | null
  isLoading: boolean
  error: string | null
  isPolling: boolean
  startPolling: () => void
  stopPolling: () => void
  refetch: () => Promise<void>
  cancel: () => Promise<boolean>
  isProcessing: boolean
  isCompleted: boolean
  isFailed: boolean
  isCancelled: boolean
}

/**
 * Hook for tracking a single job's status
 */
export function useJobStatus(
  jobId: string | null,
  options: UseJobStatusOptions = {}
): UseJobStatusReturn {
  const {
    pollInterval = 2000,
    onComplete,
    onFailure,
    onCancel,
    autoStart = true,
  } = options

  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(autoStart)

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const onCompleteRef = useRef(onComplete)
  const onFailureRef = useRef(onFailure)
  const onCancelRef = useRef(onCancel)

  // Update refs
  useEffect(() => {
    onCompleteRef.current = onComplete
    onFailureRef.current = onFailure
    onCancelRef.current = onCancel
  }, [onComplete, onFailure, onCancel])

  // Fetch job status
  const fetchJob = useCallback(async () => {
    if (!jobId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/jobs/${jobId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch job: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.job) {
        const fetchedJob = data.job as Job
        setJob(fetchedJob)
        return fetchedJob
      } else {
        throw new Error(data.error || 'Failed to fetch job')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  // Cancel job
  const cancel = useCallback(async (): Promise<boolean> => {
    if (!jobId) return false

    try {
      const response = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel job')
      }

      const data = await response.json()
      
      if (data.success && data.job) {
        setJob(data.job)
        return true
      }
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job')
      return false
    }
  }, [jobId])

  // Start polling
  const startPolling = useCallback(() => {
    setIsPolling(true)
  }, [])

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  // Refetch
  const refetch = useCallback(async () => {
    await fetchJob()
  }, [fetchJob])

  // Check if job is in a terminal state
  const isTerminalState = useCallback((status: JobStatus) => {
    return ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)
  }, [])

  // Polling effect
  useEffect(() => {
    if (!jobId || !isPolling) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      return
    }

    // Initial fetch
    fetchJob().then(fetchedJob => {
      if (fetchedJob && isTerminalState(fetchedJob.status)) {
        setIsPolling(false)
      }
    })

    // Set up polling
    pollIntervalRef.current = setInterval(async () => {
      const fetchedJob = await fetchJob()

      if (fetchedJob) {
        // Handle callbacks
        if (fetchedJob.status === 'COMPLETED' && onCompleteRef.current) {
          onCompleteRef.current(fetchedJob)
        } else if (fetchedJob.status === 'FAILED' && onFailureRef.current) {
          onFailureRef.current(fetchedJob)
        } else if (fetchedJob.status === 'CANCELLED' && onCancelRef.current) {
          onCancelRef.current(fetchedJob)
        }

        // Stop polling if terminal state
        if (isTerminalState(fetchedJob.status)) {
          setIsPolling(false)
        }
      }
    }, pollInterval)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [jobId, isPolling, pollInterval, fetchJob, isTerminalState])

  // Computed values
  const isProcessing = job ? ['PENDING', 'QUEUED', 'RUNNING', 'RETRY'].includes(job.status) : false
  const isCompleted = job?.status === 'COMPLETED'
  const isFailed = job?.status === 'FAILED'
  const isCancelled = job?.status === 'CANCELLED'

  return {
    job,
    isLoading,
    error,
    isPolling,
    startPolling,
    stopPolling,
    refetch,
    cancel,
    isProcessing,
    isCompleted,
    isFailed,
    isCancelled,
  }
}

/**
 * Hook for tracking multiple jobs
 */
interface UseJobsOptions {
  status?: JobStatus | JobStatus[]
  type?: JobType | JobType[]
  tenantId?: string
  relatedType?: string
  relatedId?: string
  limit?: number
  pollInterval?: number
  autoRefresh?: boolean
}

interface UseJobsReturn {
  jobs: Job[]
  stats: QueueStats | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface QueueStats {
  pending: number
  queued: number
  running: number
  completed: number
  failed: number
  cancelled: number
  retry: number
  total: number
  averageWaitTime: number
  averageProcessTime: number
}

export function useJobs(options: UseJobsOptions = {}): UseJobsReturn {
  const {
    status,
    type,
    tenantId,
    relatedType,
    relatedId,
    limit = 50,
    pollInterval = 5000,
    autoRefresh = false,
  } = options

  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (status) {
        params.set('status', Array.isArray(status) ? status.join(',') : status)
      }
      if (type) {
        params.set('type', Array.isArray(type) ? type.join(',') : type)
      }
      if (tenantId) params.set('tenantId', tenantId)
      if (relatedType) params.set('relatedType', relatedType)
      if (relatedId) params.set('relatedId', relatedId)
      params.set('limit', limit.toString())

      const response = await fetch(`/api/jobs?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setJobs(data.jobs)
        setStats(data.stats)
      } else {
        throw new Error(data.error || 'Failed to fetch jobs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [status, type, tenantId, relatedType, relatedId, limit])

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchJobs()

    if (autoRefresh) {
      const interval = setInterval(fetchJobs, pollInterval)
      return () => clearInterval(interval)
    }
  }, [fetchJobs, autoRefresh, pollInterval])

  return {
    jobs,
    stats,
    isLoading,
    error,
    refetch: fetchJobs,
  }
}

/**
 * Hook for creating a job and tracking its status
 */
interface UseCreateJobReturn {
  createJob: (type: JobType, input: unknown, options?: CreateJobOptions) => Promise<Job | null>
  job: Job | null
  isLoading: boolean
  error: string | null
  isProcessing: boolean
  isCompleted: boolean
  isFailed: boolean
  cancel: () => Promise<boolean>
}

interface CreateJobOptions {
  priority?: JobPriority
  tenantId?: string
  relatedType?: string
  relatedId?: string
  description?: string
  runAt?: Date
}

export function useCreateJob(): UseCreateJobReturn {
  const [jobId, setJobId] = useState<string | null>(null)
  
  const {
    job,
    isLoading: isStatusLoading,
    error: statusError,
    isProcessing,
    isCompleted,
    isFailed,
    cancel,
    startPolling,
  } = useJobStatus(jobId, {
    autoStart: false,
  })

  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const createJob = useCallback(async (
    type: JobType,
    input: unknown,
    options: CreateJobOptions = {}
  ): Promise<Job | null> => {
    setIsCreating(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          input,
          options: {
            priority: options.priority,
            tenantId: options.tenantId,
            relatedType: options.relatedType,
            relatedId: options.relatedId,
            description: options.description,
            runAt: options.runAt?.toISOString(),
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create job')
      }

      const data = await response.json()
      
      if (data.success && data.job) {
        setJobId(data.job.id)
        startPolling()
        return data.job
      }

      throw new Error('Invalid response from server')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create job')
      return null
    } finally {
      setIsCreating(false)
    }
  }, [startPolling])

  return {
    createJob,
    job,
    isLoading: isCreating || isStatusLoading,
    error: createError || statusError,
    isProcessing,
    isCompleted,
    isFailed,
    cancel,
  }
}

export default useJobStatus
