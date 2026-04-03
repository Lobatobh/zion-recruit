/**
 * Email Service Types - Zion Recruit
 * Types for the Resend email service integration
 */

// ============================================
// ENUMS
// ============================================

export type EmailStatus = 
  | 'PENDING'
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'BOUNCED'
  | 'COMPLAINED'
  | 'FAILED';

export type EmailType = 
  | 'DISC_INVITATION'
  | 'INTERVIEW_CONFIRMATION'
  | 'INTERVIEW_REMINDER'
  | 'INTERVIEW_CANCELLATION'
  | 'INTERVIEW_RESCHEDULE'
  | 'CANDIDATE_STATUS_UPDATE'
  | 'JOB_OFFER'
  | 'REJECTION'
  | 'WELCOME'
  | 'FOLLOW_UP'
  | 'CUSTOM';

export type EmailPriority = 'low' | 'normal' | 'high';

// ============================================
// INTERFACES
// ============================================

/**
 * Email attachment interface
 */
export interface EmailAttachment {
  /** File name */
  filename: string;
  /** File content as base64 string or buffer */
  content?: string | Buffer;
  /** URL to fetch the file from */
  path?: string;
  /** MIME type of the attachment */
  contentType?: string;
  /** Content disposition */
  disposition?: 'attachment' | 'inline';
  /** Content ID for inline images */
  cid?: string;
}

/**
 * Email recipient interface
 */
export interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Base email options interface
 */
export interface BaseEmailOptions {
  /** Recipient email address(es) */
  to: string | EmailRecipient | Array<string | EmailRecipient>;
  /** CC recipients */
  cc?: string | EmailRecipient | Array<string | EmailRecipient>;
  /** BCC recipients */
  bcc?: string | EmailRecipient | Array<string | EmailRecipient>;
  /** Reply-to address */
  replyTo?: string | EmailRecipient;
  /** Email subject */
  subject: string;
  /** HTML content */
  html?: string;
  /** Plain text content */
  text?: string;
  /** Email attachments */
  attachments?: EmailAttachment[];
  /** Custom headers */
  headers?: Record<string, string>;
  /** Email tags for tracking */
  tags?: Array<{ name: string; value: string }>;
  /** Email priority */
  priority?: EmailPriority;
  /** Scheduled send time */
  scheduledAt?: Date;
}

/**
 * Send email options extending base options
 */
export interface SendEmailOptions extends BaseEmailOptions {
  /** From email address */
  from?: string | EmailRecipient;
  /** Email type for tracking */
  emailType?: EmailType;
  /** Tenant ID for tracking */
  tenantId?: string;
  /** Candidate ID for tracking */
  candidateId?: string;
  /** Job ID for tracking */
  jobId?: string;
  /** Interview ID for tracking */
  interviewId?: string;
  /** DISC test ID for tracking */
  discTestId?: string;
  /** Metadata for additional tracking */
  metadata?: Record<string, string>;
}

/**
 * Email template variable interface
 */
export interface EmailTemplateVariables {
  // Common variables
  candidateName: string;
  candidateEmail: string;
  companyName: string;
  companyLogo?: string;
  
  // Job related
  jobTitle?: string;
  jobDepartment?: string;
  jobLocation?: string;
  
  // Interview related
  interviewDate?: string;
  interviewTime?: string;
  interviewTimezone?: string;
  interviewDuration?: string;
  interviewType?: string;
  interviewerName?: string;
  interviewLocation?: string;
  meetingUrl?: string;
  meetingProvider?: string;
  
  // DISC test related
  discTestUrl?: string;
  discTestExpiresAt?: string;
  
  // Status update related
  previousStatus?: string;
  newStatus?: string;
  statusMessage?: string;
  
  // Custom content
  customMessage?: string;
  customFields?: Record<string, string>;
}

/**
 * DISC test invitation email options
 */
export interface DISCInvitationEmailOptions {
  tenantId: string;
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  discTestId: string;
  discTestUrl: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  expiresAt?: Date;
  from?: string | EmailRecipient;
}

/**
 * Interview confirmation email options
 */
export interface InterviewConfirmationEmailOptions {
  tenantId: string;
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  interviewId: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  interviewDate: Date;
  interviewDuration: number;
  interviewType: string;
  interviewerName?: string;
  meetingUrl?: string;
  meetingProvider?: string;
  interviewLocation?: string;
  timezone?: string;
  from?: string | EmailRecipient;
}

/**
 * Interview reminder email options
 */
export interface InterviewReminderEmailOptions extends InterviewConfirmationEmailOptions {
  reminderType: '24h' | '1h' | '15min';
}

/**
 * Interview cancellation email options
 */
export interface InterviewCancellationEmailOptions {
  tenantId: string;
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  interviewId: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  cancellationReason?: string;
  rescheduleUrl?: string;
  from?: string | EmailRecipient;
}

/**
 * Candidate status update email options
 */
export interface CandidateStatusUpdateEmailOptions {
  tenantId: string;
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  previousStatus: string;
  newStatus: string;
  statusMessage?: string;
  nextSteps?: string[];
  from?: string | EmailRecipient;
}

/**
 * Email template interface
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
}

/**
 * Email log interface for database tracking
 */
export interface EmailLog {
  id: string;
  tenantId: string;
  externalId?: string; // Resend email ID
  
  // Email details
  emailType: EmailType;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  
  // Status tracking
  status: EmailStatus;
  
  // Context
  candidateId?: string;
  jobId?: string;
  interviewId?: string;
  discTestId?: string;
  
  // Timestamps
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  failedAt?: Date;
  
  // Error tracking
  errorMessage?: string;
  errorCode?: string;
  
  // Metadata
  metadata?: Record<string, string>;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resend API response interface
 */
export interface ResendSendResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

/**
 * Resend API error response interface
 */
export interface ResendErrorResponse {
  statusCode: number;
  message: string;
  name: string;
}

/**
 * Email send result interface
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Email service configuration interface
 */
export interface EmailServiceConfig {
  /** Resend API key */
  apiKey: string;
  /** Default from email address */
  defaultFrom: string;
  /** Default from name */
  defaultFromName?: string;
  /** Default reply-to address */
  defaultReplyTo?: string;
  /** Webhook secret for status updates */
  webhookSecret?: string;
  /** Base URL for email templates */
  baseUrl?: string;
}

/**
 * Webhook event from Resend
 */
export interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.opened' | 'email.clicked' | 'email.bounced' | 'email.complained' | 'email.delivery_delayed';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject?: string;
    created_at: string;
    // For clicked events
    click?: {
      link: string;
      timestamp: string;
      user_agent: string;
    };
    // For opened events
    open?: {
      timestamp: string;
      user_agent: string;
    };
    // For bounced events
    bounce?: {
      type: 'hard' | 'soft';
      message: string;
    };
    // For complained events
    complaint?: {
      type: string;
      message: string;
    };
  };
}

/**
 * Template-based email options
 */
export interface TemplateEmailOptions {
  templateId: string;
  variables: EmailTemplateVariables;
  to: string | EmailRecipient | Array<string | EmailRecipient>;
  from?: string | EmailRecipient;
  cc?: string | EmailRecipient | Array<string | EmailRecipient>;
  bcc?: string | EmailRecipient | Array<string | EmailRecipient>;
  replyTo?: string | EmailRecipient;
  attachments?: EmailAttachment[];
  tenantId?: string;
  candidateId?: string;
  jobId?: string;
  emailType?: EmailType;
  metadata?: Record<string, string>;
}
