/**
 * Webhook Event Types for Zion Recruit
 * 
 * Each event type represents a specific action that can trigger webhooks
 */

// Event categories
export const EventCategory = {
  CANDIDATE: 'candidate',
  JOB: 'job',
  INTERVIEW: 'interview',
  DISC: 'disc',
  MESSAGE: 'message',
  TASK: 'task',
} as const;

// All available event types
export const WebhookEventType = {
  // Candidate events
  CANDIDATE_CREATED: 'candidate.created',
  CANDIDATE_UPDATED: 'candidate.updated',
  CANDIDATE_HIRED: 'candidate.hired',
  CANDIDATE_REJECTED: 'candidate.rejected',
  
  // Job events
  JOB_CREATED: 'job.created',
  JOB_UPDATED: 'job.updated',
  JOB_CLOSED: 'job.closed',
  
  // Interview events
  INTERVIEW_SCHEDULED: 'interview.scheduled',
  INTERVIEW_COMPLETED: 'interview.completed',
  INTERVIEW_CANCELLED: 'interview.cancelled',
  
  // DISC events
  DISC_COMPLETED: 'disc.completed',
  
  // Message events
  MESSAGE_RECEIVED: 'message.received',
  
  // Task events
  TASK_COMPLETED: 'task.completed',
  TASK_FAILED: 'task.failed',
} as const;

export type WebhookEventTypeValue = typeof WebhookEventType[keyof typeof WebhookEventType];

// Event type metadata for UI
export const EventTypeInfo: Record<WebhookEventTypeValue, {
  label: string;
  description: string;
  category: typeof EventCategory[keyof typeof EventCategory];
}> = {
  // Candidate events
  [WebhookEventType.CANDIDATE_CREATED]: {
    label: 'Candidate Created',
    description: 'Triggered when a new candidate is added to the system',
    category: EventCategory.CANDIDATE,
  },
  [WebhookEventType.CANDIDATE_UPDATED]: {
    label: 'Candidate Updated',
    description: 'Triggered when candidate information is updated',
    category: EventCategory.CANDIDATE,
  },
  [WebhookEventType.CANDIDATE_HIRED]: {
    label: 'Candidate Hired',
    description: 'Triggered when a candidate is marked as hired',
    category: EventCategory.CANDIDATE,
  },
  [WebhookEventType.CANDIDATE_REJECTED]: {
    label: 'Candidate Rejected',
    description: 'Triggered when a candidate is rejected',
    category: EventCategory.CANDIDATE,
  },
  
  // Job events
  [WebhookEventType.JOB_CREATED]: {
    label: 'Job Created',
    description: 'Triggered when a new job position is created',
    category: EventCategory.JOB,
  },
  [WebhookEventType.JOB_UPDATED]: {
    label: 'Job Updated',
    description: 'Triggered when a job position is updated',
    category: EventCategory.JOB,
  },
  [WebhookEventType.JOB_CLOSED]: {
    label: 'Job Closed',
    description: 'Triggered when a job position is closed',
    category: EventCategory.JOB,
  },
  
  // Interview events
  [WebhookEventType.INTERVIEW_SCHEDULED]: {
    label: 'Interview Scheduled',
    description: 'Triggered when an interview is scheduled',
    category: EventCategory.INTERVIEW,
  },
  [WebhookEventType.INTERVIEW_COMPLETED]: {
    label: 'Interview Completed',
    description: 'Triggered when an interview is completed',
    category: EventCategory.INTERVIEW,
  },
  [WebhookEventType.INTERVIEW_CANCELLED]: {
    label: 'Interview Cancelled',
    description: 'Triggered when an interview is cancelled',
    category: EventCategory.INTERVIEW,
  },
  
  // DISC events
  [WebhookEventType.DISC_COMPLETED]: {
    label: 'DISC Completed',
    description: 'Triggered when a DISC assessment is completed',
    category: EventCategory.DISC,
  },
  
  // Message events
  [WebhookEventType.MESSAGE_RECEIVED]: {
    label: 'Message Received',
    description: 'Triggered when a new message is received from a candidate',
    category: EventCategory.MESSAGE,
  },
  
  // Task events
  [WebhookEventType.TASK_COMPLETED]: {
    label: 'Task Completed',
    description: 'Triggered when an AI task completes successfully',
    category: EventCategory.TASK,
  },
  [WebhookEventType.TASK_FAILED]: {
    label: 'Task Failed',
    description: 'Triggered when an AI task fails',
    category: EventCategory.TASK,
  },
};

// Get all event types as array
export function getAllEventTypes(): WebhookEventTypeValue[] {
  return Object.values(WebhookEventType);
}

// Get event types by category
export function getEventTypesByCategory(category: typeof EventCategory[keyof typeof EventCategory]): WebhookEventTypeValue[] {
  return getAllEventTypes().filter(eventType => EventTypeInfo[eventType].category === category);
}

// Get events grouped by category for UI
export function getEventsGroupedByCategory(): Record<string, WebhookEventTypeValue[]> {
  return {
    [EventCategory.CANDIDATE]: getEventTypesByCategory(EventCategory.CANDIDATE),
    [EventCategory.JOB]: getEventTypesByCategory(EventCategory.JOB),
    [EventCategory.INTERVIEW]: getEventTypesByCategory(EventCategory.INTERVIEW),
    [EventCategory.DISC]: getEventTypesByCategory(EventCategory.DISC),
    [EventCategory.MESSAGE]: getEventTypesByCategory(EventCategory.MESSAGE),
    [EventCategory.TASK]: getEventTypesByCategory(EventCategory.TASK),
  };
}

// Webhook payload interface
export interface WebhookPayload {
  id: string;           // Unique event ID
  type: WebhookEventTypeValue;
  timestamp: string;    // ISO 8601 timestamp
  data: Record<string, unknown>;
  tenantId: string;
}

// Candidate event data
export interface CandidateEventData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  jobId: string;
  jobTitle: string;
  status: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  matchScore?: number;
}

// Job event data
export interface JobEventData {
  id: string;
  title: string;
  department?: string;
  location?: string;
  type: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

// Interview event data
export interface InterviewEventData {
  id: string;
  title: string;
  type: string;
  scheduledAt: string;
  duration: number;
  status: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  meetingUrl?: string;
  location?: string;
  interviewerName?: string;
}

// DISC event data
export interface DISCEventData {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  primaryProfile: string;
  secondaryProfile?: string;
  profileCombo?: string;
  profileD: number;
  profileI: number;
  profileS: number;
  profileC: number;
  aiSummary?: string;
  jobFitScore?: number;
}

// Message event data
export interface MessageEventData {
  id: string;
  conversationId: string;
  candidateId: string;
  candidateName: string;
  content: string;
  channel: string;
  sentAt: string;
}

// Task event data
export interface TaskEventData {
  id: string;
  type: string;
  status: string;
  agentId: string;
  agentName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  duration?: number;
  tokensUsed?: number;
  candidateId?: string;
  jobId?: string;
}

// Build webhook payload
export function buildWebhookPayload(
  type: WebhookEventTypeValue,
  data: Record<string, unknown>,
  tenantId: string
): WebhookPayload {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date().toISOString(),
    data,
    tenantId,
  };
}
