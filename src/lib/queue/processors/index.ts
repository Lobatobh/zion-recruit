/**
 * Job Processors - Index
 * Zion Recruit - Background Job Queue System
 * 
 * Registers all job processors with the queue.
 */

import { JobQueue } from '../job-queue'
import { JobType } from '../job-types'

// Import processors
import { resumeParseProcessor } from './resume-parse.processor'
import { candidateMatchProcessor } from './candidate-match.processor'
import { batchScreeningProcessor } from './batch-screening.processor'
import { sendEmailProcessor } from './send-email.processor'
import { discAnalysisProcessor } from './disc-analysis.processor'
import { webhookDispatchProcessor } from './webhook-dispatch.processor'

/**
 * Register all processors with the queue
 */
export function registerProcessors(queue: JobQueue): void {
  queue.registerProcessor(JobType.RESUME_PARSE, resumeParseProcessor)
  queue.registerProcessor(JobType.CANDIDATE_MATCH, candidateMatchProcessor)
  queue.registerProcessor(JobType.BATCH_SCREENING, batchScreeningProcessor)
  queue.registerProcessor(JobType.SEND_EMAIL, sendEmailProcessor)
  queue.registerProcessor(JobType.DISC_ANALYSIS, discAnalysisProcessor)
  queue.registerProcessor(JobType.WEBHOOK_DISPATCH, webhookDispatchProcessor)

  console.log('[Processors] All processors registered')
}

// Re-export processors for individual use
export {
  resumeParseProcessor,
  candidateMatchProcessor,
  batchScreeningProcessor,
  sendEmailProcessor,
  discAnalysisProcessor,
  webhookDispatchProcessor,
}
