/**
 * Evolution API Service - WhatsApp Integration
 * Zion Recruit - AI-Powered Recruitment SaaS
 */

import { db } from '@/lib/db';
import {
  EvolutionConfig,
  EvolutionSendTextMessage,
  EvolutionSendMediaMessage,
  EvolutionSendTemplateMessage,
  EvolutionWebhookEvent,
  EvolutionInstanceStatus,
  SendMessageResult,
  WebhookProcessResult,
  WebhookIncomingMessage,
  DISCTestNotification,
  InterviewReminder,
  CandidateNotification,
  MessageTrackingStatus,
  WhatsAppError,
  EvolutionAPIError,
  CredentialNotFoundError,
  InstanceNotConnectedError,
  RECRUITMENT_TEMPLATES,
} from './types';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format phone number for Evolution API (remove non-digits and add country code)
 */
function formatPhoneNumber(phone: string, countryCode = '55'): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If already has country code, return as is
  if (digits.startsWith(countryCode) && digits.length >= 12) {
    return digits;
  }
  
  // Add country code
  return `${countryCode}${digits}`;
}

/**
 * Format date for display in Portuguese
 */
function formatDateForDisplay(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Format time for display
 */
function formatTimeForDisplay(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Replace template variables in message
 */
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

// ============================================
// EVOLUTION SERVICE CLASS
// ============================================

export class EvolutionService {
  private config: EvolutionConfig;
  private tenantId: string;

  private constructor(config: EvolutionConfig, tenantId: string) {
    this.config = config;
    this.tenantId = tenantId;
  }

  /**
   * Create Evolution service instance from stored credentials
   */
  static async create(tenantId: string): Promise<EvolutionService> {
    const credential = await db.apiCredential.findFirst({
      where: {
        tenantId,
        provider: 'EVOLUTION',
        isActive: true,
      },
    });

    if (!credential) {
      throw new CredentialNotFoundError(tenantId);
    }

    const config: EvolutionConfig = {
      baseUrl: credential.endpoint || process.env.EVOLUTION_API_URL || 'https://api.evolution-api.com',
      apiKey: credential.apiKey,
      instance: credential.apiSecret || 'default',
      webhookUrl: process.env.EVOLUTION_WEBHOOK_URL,
    };

    // Update last used timestamp
    await db.apiCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    });

    return new EvolutionService(config, tenantId);
  }

  /**
   * Make API request to Evolution API
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new EvolutionAPIError(
          errorData.message || `API request failed: ${response.status}`,
          endpoint,
          response.status,
          errorData
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof EvolutionAPIError) {
        throw error;
      }
      throw new EvolutionAPIError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        endpoint
      );
    }
  }

  /**
   * Check if instance is connected
   */
  async checkInstanceStatus(): Promise<EvolutionInstanceStatus> {
    try {
      const response = await this.request<{ instance: { name: string; status: string } }>(
        `/instance/connectionState/${this.config.instance}`
      );
      
      return {
        instance: this.config.instance,
        status: response.instance.status as EvolutionInstanceStatus['status'],
      };
    } catch {
      return {
        instance: this.config.instance,
        status: 'disconnected',
      };
    }
  }

  /**
   * Send text message
   */
  async sendTextMessage(
    to: string,
    message: string,
    options?: { delay?: number; quotedMessageId?: string }
  ): Promise<SendMessageResult> {
    const formattedNumber = formatPhoneNumber(to);
    
    const payload: EvolutionSendTextMessage = {
      number: formattedNumber,
      options: {
        delay: options?.delay || 1000,
        presence: 'composing',
      },
      textMessage: {
        text: message,
      },
    };

    // Add quoted message if provided
    if (options?.quotedMessageId) {
      payload.options!.quoted = {
        key: {
          id: options.quotedMessageId,
          remoteJid: `${formattedNumber}@s.whatsapp.net`,
        },
        message: {},
      };
    }

    const timestamp = new Date();

    try {
      const response = await this.request<{ key: { id: string }; messageTimestamp: number }>(
        `/message/sendText/${this.config.instance}`,
        'POST',
        payload
      );

      return {
        success: true,
        messageId: response.key.id,
        externalId: response.key.id,
        timestamp,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
      };
    }
  }

  /**
   * Send media message (image, document, video, audio)
   */
  async sendMediaMessage(
    to: string,
    mediaType: 'image' | 'document' | 'video' | 'audio',
    mediaUrl: string,
    caption?: string,
    fileName?: string
  ): Promise<SendMessageResult> {
    const formattedNumber = formatPhoneNumber(to);
    
    const payload: EvolutionSendMediaMessage = {
      number: formattedNumber,
      options: {
        delay: 1000,
      },
      mediaMessage: {
        mediatype: mediaType,
        media: mediaUrl,
        caption,
        fileName,
      },
    };

    const timestamp = new Date();

    try {
      const response = await this.request<{ key: { id: string }; messageTimestamp: number }>(
        `/message/sendMedia/${this.config.instance}`,
        'POST',
        payload
      );

      return {
        success: true,
        messageId: response.key.id,
        externalId: response.key.id,
        timestamp,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
      };
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components: EvolutionSendTemplateMessage['templateMessage']['components']
  ): Promise<SendMessageResult> {
    const formattedNumber = formatPhoneNumber(to);
    
    const payload: EvolutionSendTemplateMessage = {
      number: formattedNumber,
      options: {
        delay: 1000,
      },
      templateMessage: {
        name: templateName,
        language: {
          code: languageCode,
          policy: 'deterministic',
        },
        components,
      },
    };

    const timestamp = new Date();

    try {
      const response = await this.request<{ key: { id: string }; messageTimestamp: number }>(
        `/message/sendTemplate/${this.config.instance}`,
        'POST',
        payload
      );

      return {
        success: true,
        messageId: response.key.id,
        externalId: response.key.id,
        timestamp,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
      };
    }
  }

  // ============================================
  // TRACKING METHODS
  // ============================================

  /**
   * Track message in database
   */
  async trackMessage(
    data: {
      messageId: string;
      externalId?: string;
      candidateId?: string;
      conversationId?: string;
      phoneNumber: string;
      type: 'text' | 'media' | 'template';
      content: string;
      status?: MessageTrackingStatus;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    await db.message.create({
      data: {
        conversationId: data.conversationId || '',
        senderType: 'SYSTEM',
        content: data.content,
        contentType: data.type === 'text' ? 'TEXT' : data.type === 'media' ? 'IMAGE' : 'TEXT',
        channel: 'WHATSAPP',
        externalId: data.externalId || data.messageId,
        status: (data.status || 'SENT') as 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
        isAiGenerated: false,
        sentAt: new Date(),
      },
    });
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    externalId: string,
    status: MessageTrackingStatus,
    error?: string
  ): Promise<void> {
    await db.message.updateMany({
      where: {
        externalId,
        channel: 'WHATSAPP',
      },
      data: {
        status: status.toUpperCase() as 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
        ...(status === 'delivered' && { deliveredAt: new Date() }),
        ...(status === 'read' && { readAt: new Date() }),
        ...(error && { metadata: JSON.stringify({ error }) }),
      },
    });
  }

  // ============================================
  // RECRUITMENT SPECIFIC METHODS
  // ============================================

  /**
   * Send DISC test invitation
   */
  async sendDISCTestInvitation(notification: DISCTestNotification): Promise<SendMessageResult> {
    const message = replaceTemplateVariables(RECRUITMENT_TEMPLATES.DISC_TEST_INVITATION.body, {
      candidate_name: notification.candidateName,
      job_title: notification.jobTitle,
      company_name: notification.companyName,
      test_url: notification.testUrl,
      expires_in: notification.expiresIn.toString(),
    });

    const result = await this.sendTextMessage(notification.candidatePhone, message);

    // Update candidate DISC test sent timestamp
    if (result.success && notification.candidateId) {
      await db.candidate.update({
        where: { id: notification.candidateId },
        data: { discTestSentAt: new Date() },
      });

      // Update DISC test status
      await db.dISTest.updateMany({
        where: { candidateId: notification.candidateId },
        data: { 
          status: 'SENT',
          sentAt: new Date() 
        },
      });
    }

    return result;
  }

  /**
   * Send interview reminder
   */
  async sendInterviewReminder(reminder: InterviewReminder): Promise<SendMessageResult> {
    let meetingInfo = '';
    
    if (reminder.meetingUrl) {
      meetingInfo = `🔗 Link: ${reminder.meetingUrl}`;
    } else if (reminder.location) {
      meetingInfo = `📍 Local: ${reminder.location}`;
    }

    const message = replaceTemplateVariables(RECRUITMENT_TEMPLATES.INTERVIEW_REMINDER.body, {
      candidate_name: reminder.candidateName,
      job_title: reminder.jobTitle,
      company_name: reminder.companyName,
      interview_date: formatDateForDisplay(reminder.interviewDate),
      interview_time: formatTimeForDisplay(reminder.interviewDate),
      interview_location: reminder.location || 'A definir',
      meeting_link: meetingInfo,
      interviewer_name: reminder.interviewerName || 'Nossa equipe',
    });

    const result = await this.sendTextMessage(reminder.candidatePhone, message);

    // Update interview reminder sent timestamp
    if (result.success && reminder.candidateId) {
      await db.interview.updateMany({
        where: { 
          candidateId: reminder.candidateId,
          scheduledAt: reminder.interviewDate,
        },
        data: { 
          reminderSentAt: new Date(),
          reminderType: 'whatsapp',
        },
      });
    }

    return result;
  }

  /**
   * Send candidate notification
   */
  async sendCandidateNotification(notification: CandidateNotification): Promise<SendMessageResult> {
    let message: string;

    switch (notification.type) {
      case 'welcome':
        message = replaceTemplateVariables(RECRUITMENT_TEMPLATES.WELCOME_CANDIDATE.body, {
          candidate_name: notification.candidateName,
          job_title: notification.jobTitle,
          company_name: notification.companyName,
        });
        break;

      case 'offer':
        message = replaceTemplateVariables(RECRUITMENT_TEMPLATES.OFFER_LETTER.body, {
          candidate_name: notification.candidateName,
          job_title: notification.jobTitle,
          company_name: notification.companyName,
        });
        break;

      case 'rejection':
        message = replaceTemplateVariables(RECRUITMENT_TEMPLATES.REJECTION_NOTICE.body, {
          candidate_name: notification.candidateName,
          job_title: notification.jobTitle,
          company_name: notification.companyName,
        });
        break;

      case 'status_update':
      case 'follow_up':
      default:
        message = notification.customMessage || replaceTemplateVariables(
          RECRUITMENT_TEMPLATES.STATUS_UPDATE.body,
          {
            candidate_name: notification.candidateName,
            job_title: notification.jobTitle,
            status_message: 'Seu processo seletivo está em andamento.',
            additional_info: 'Em breve entraremos em contato com mais informações.',
          }
        );
    }

    return this.sendTextMessage(notification.candidatePhone, message);
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  /**
   * Process incoming webhook event
   */
  async processWebhook(event: EvolutionWebhookEvent): Promise<WebhookProcessResult> {
    try {
      switch (event.event) {
        case 'MESSAGES_UPSERT':
          return this.handleIncomingMessage(event);
        
        case 'MESSAGES_UPDATE':
          return this.handleMessageStatusUpdate(event);
        
        case 'CONNECTION_UPDATE':
          return this.handleConnectionUpdate(event);
        
        default:
          return {
            success: true,
            message: `Event type ${event.event} acknowledged but not processed`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error processing webhook',
      };
    }
  }

  /**
   * Handle incoming message webhook
   */
  private async handleIncomingMessage(event: EvolutionWebhookEvent): Promise<WebhookProcessResult> {
    const data = event.data;
    
    // Skip messages from us (outgoing)
    if (data.key.fromMe) {
      return { success: true, message: 'Outgoing message ignored' };
    }

    // Extract phone number from remoteJid (format: 5511999999999@s.whatsapp.net)
    const phoneNumber = data.key.remoteJid.split('@')[0];
    const messageContent = this.extractMessageContent(data);
    
    if (!messageContent) {
      return { success: true, message: 'No message content to process' };
    }

    // Find candidate by phone
    const candidate = await db.candidate.findFirst({
      where: {
        tenantId: this.tenantId,
        phone: {
          contains: phoneNumber.slice(-8), // Last 8 digits for matching
        },
      },
      include: {
        job: true,
      },
    });

    if (!candidate) {
      return {
        success: true,
        message: `No candidate found for phone: ${phoneNumber}`,
      };
    }

    // Find or create conversation
    let conversation = await db.conversation.findFirst({
      where: {
        tenantId: this.tenantId,
        candidateId: candidate.id,
        channel: 'WHATSAPP',
      },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          tenantId: this.tenantId,
          candidateId: candidate.id,
          jobId: candidate.jobId,
          channel: 'WHATSAPP',
          externalId: data.key.remoteJid,
          status: 'ACTIVE',
          aiMode: true,
          lastMessageAt: new Date(),
          lastMessagePreview: messageContent.text?.substring(0, 100),
        },
      });
    } else {
      // Update conversation
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: messageContent.text?.substring(0, 100),
          unreadCount: { increment: 1 },
          unreadByCandidate: true,
        },
      });
    }

    // Create message record
    const message = await db.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'CANDIDATE',
        senderId: candidate.id,
        senderName: candidate.name,
        content: messageContent.text || '[Media]',
        contentType: this.mapContentType(messageContent.type),
        mediaUrl: messageContent.mediaUrl,
        mediaType: messageContent.mediaType,
        channel: 'WHATSAPP',
        externalId: data.key.id,
        status: 'DELIVERED',
        isAiGenerated: false,
        sentAt: new Date(data.messageTimestamp ? data.messageTimestamp * 1000 : Date.now()),
      },
    });

    // Update candidate response status
    await db.candidate.update({
      where: { id: candidate.id },
      data: {
        respondedAt: new Date(),
        responseStatus: 'INTERESTED',
      },
    });

    return {
      success: true,
      data: {
        candidateId: candidate.id,
        conversationId: conversation.id,
        messageId: message.id,
      },
    };
  }

  /**
   * Handle message status update webhook
   */
  private async handleMessageStatusUpdate(event: EvolutionWebhookEvent): Promise<WebhookProcessResult> {
    const data = event.data;
    
    const statusMap: Record<string, MessageTrackingStatus> = {
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed',
    };

    const status = statusMap[data.status?.toLowerCase() || ''];
    
    if (!status) {
      return { success: true, message: `Unknown status: ${data.status}` };
    }

    await this.updateMessageStatus(data.key.id, status);

    return {
      success: true,
      message: `Message status updated to ${status}`,
    };
  }

  /**
   * Handle connection update webhook
   */
  private async handleConnectionUpdate(event: EvolutionWebhookEvent): Promise<WebhookProcessResult> {
    const status = event.data.status;

    // Update channel status in database
    await db.messageChannel.updateMany({
      where: {
        tenantId: this.tenantId,
        type: 'WHATSAPP',
      },
      data: {
        lastSyncAt: new Date(),
        config: JSON.stringify({ status }),
      },
    });

    return {
      success: true,
      message: `Connection status updated: ${status}`,
    };
  }

  /**
   * Extract message content from webhook data
   */
  private extractMessageContent(data: EvolutionWebhookEvent['data']): WebhookIncomingMessage | null {
    const msg = data.message;
    
    if (!msg) return null;

    const base: WebhookIncomingMessage = {
      messageId: data.key.id,
      phoneNumber: data.key.remoteJid.split('@')[0],
      message: '',
      timestamp: new Date(data.messageTimestamp ? data.messageTimestamp * 1000 : Date.now()),
      type: 'text',
      isFromMe: data.key.fromMe,
      instance: '',
    };

    if (msg.conversation) {
      return { ...base, type: 'text', message: msg.conversation };
    }

    if (msg.extendedTextMessage?.text) {
      return { ...base, type: 'text', message: msg.extendedTextMessage.text };
    }

    if (msg.imageMessage) {
      return {
        ...base,
        type: 'image',
        message: msg.imageMessage.caption || '',
        mediaUrl: msg.imageMessage.url,
        mediaType: msg.imageMessage.mimetype,
        caption: msg.imageMessage.caption,
      };
    }

    if (msg.documentMessage) {
      return {
        ...base,
        type: 'document',
        message: msg.documentMessage.caption || '',
        mediaUrl: msg.documentMessage.url,
        mediaType: msg.documentMessage.mimetype,
        fileName: msg.documentMessage.fileName,
        caption: msg.documentMessage.caption,
      };
    }

    if (msg.audioMessage) {
      return {
        ...base,
        type: 'audio',
        message: '[Audio]',
        mediaUrl: msg.audioMessage.url,
        mediaType: msg.audioMessage.mimetype,
      };
    }

    if (msg.videoMessage) {
      return {
        ...base,
        type: 'video',
        message: msg.videoMessage.caption || '',
        mediaUrl: msg.videoMessage.url,
        mediaType: msg.videoMessage.mimetype,
        caption: msg.videoMessage.caption,
      };
    }

    if (msg.locationMessage) {
      return {
        ...base,
        type: 'location',
        message: msg.locationMessage.name || msg.locationMessage.address || '',
        location: {
          latitude: msg.locationMessage.degreesLatitude,
          longitude: msg.locationMessage.degreesLongitude,
          name: msg.locationMessage.name,
          address: msg.locationMessage.address,
        },
      };
    }

    if (msg.contactMessage) {
      return {
        ...base,
        type: 'contact',
        message: msg.contactMessage.displayName,
        contact: {
          name: msg.contactMessage.displayName,
        },
      };
    }

    return null;
  }

  /**
   * Map webhook content type to database content type
   */
  private mapContentType(type: string): 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'LOCATION' | 'CONTACT' {
    const map: Record<string, 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'LOCATION' | 'CONTACT'> = {
      'text': 'TEXT',
      'image': 'IMAGE',
      'document': 'FILE',
      'audio': 'AUDIO',
      'video': 'VIDEO',
      'location': 'LOCATION',
      'contact': 'CONTACT',
    };
    return map[type] || 'TEXT';
  }

  // ============================================
  // INSTANCE MANAGEMENT
  // ============================================

  /**
   * Configure webhook for instance
   */
  async configureWebhook(webhookUrl: string): Promise<boolean> {
    try {
      await this.request(
        `/webhook/set/${this.config.instance}`,
        'POST',
        {
          webhook: webhookUrl,
          webhook_by_events: true,
          events: [
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'SEND_MESSAGE',
            'CONNECTION_UPDATE',
          ],
        }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get QR code for instance connection
   */
  async getQRCode(): Promise<{ qrCode: string } | null> {
    try {
      const response = await this.request<{ qrcode: { code: string } }>(
        `/instance/qrcode/${this.config.instance}`
      );
      return { qrCode: response.qrcode.code };
    } catch {
      return null;
    }
  }

  /**
   * Logout from instance
   */
  async logout(): Promise<boolean> {
    try {
      await this.request(`/instance/logout/${this.config.instance}`, 'DELETE');
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================
// UTILITY EXPORTS
// ============================================

export { formatPhoneNumber, formatDateForDisplay, formatTimeForDisplay };

/**
 * Get Evolution service for tenant
 */
export async function getEvolutionService(tenantId: string): Promise<EvolutionService> {
  return EvolutionService.create(tenantId);
}

/**
 * Send DISC test link to candidate
 */
export async function sendDISCTestLink(
  tenantId: string,
  candidateId: string,
  testUrl: string,
  expiresIn = 48
): Promise<SendMessageResult> {
  const service = await getEvolutionService(tenantId);
  
  const candidate = await db.candidate.findUnique({
    where: { id: candidateId },
    include: { job: true, tenant: true },
  });

  if (!candidate || !candidate.phone) {
    return {
      success: false,
      error: 'Candidate not found or has no phone number',
      timestamp: new Date(),
    };
  }

  return service.sendDISCTestInvitation({
    candidateId,
    candidateName: candidate.name,
    candidatePhone: candidate.phone,
    jobTitle: candidate.job?.title || 'Vaga',
    companyName: candidate.tenant?.name || 'Nossa empresa',
    testUrl,
    expiresIn,
  });
}

/**
 * Send interview reminder to candidate
 */
export async function sendInterviewReminderNotification(
  tenantId: string,
  interviewId: string,
  hoursBefore = 24
): Promise<SendMessageResult> {
  const service = await getEvolutionService(tenantId);
  
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    include: { 
      candidate: true, 
      job: true,
      tenant: true,
    },
  });

  if (!interview || !interview.candidate.phone) {
    return {
      success: false,
      error: 'Interview not found or candidate has no phone number',
      timestamp: new Date(),
    };
  }

  return service.sendInterviewReminder({
    candidateId: interview.candidateId,
    candidateName: interview.candidate.name,
    candidatePhone: interview.candidate.phone,
    jobTitle: interview.job.title,
    companyName: interview.tenant.name,
    interviewDate: interview.scheduledAt,
    interviewTime: formatTimeForDisplay(interview.scheduledAt),
    interviewType: interview.type.toLowerCase(),
    meetingUrl: interview.meetingUrl || undefined,
    location: interview.location || undefined,
    interviewerName: interview.interviewerName || undefined,
    reminderHours: hoursBefore,
  });
}

/**
 * Send notification to candidate
 */
export async function sendCandidateNotificationMessage(
  tenantId: string,
  candidateId: string,
  type: CandidateNotification['type'],
  customMessage?: string
): Promise<SendMessageResult> {
  const service = await getEvolutionService(tenantId);
  
  const candidate = await db.candidate.findUnique({
    where: { id: candidateId },
    include: { job: true, tenant: true },
  });

  if (!candidate || !candidate.phone) {
    return {
      success: false,
      error: 'Candidate not found or has no phone number',
      timestamp: new Date(),
    };
  }

  return service.sendCandidateNotification({
    candidateId,
    candidateName: candidate.name,
    candidatePhone: candidate.phone,
    jobTitle: candidate.job?.title || 'Vaga',
    companyName: candidate.tenant?.name || 'Nossa empresa',
    type,
    customMessage,
  });
}

/**
 * Process webhook event (entry point for webhook API)
 */
export async function processWebhookEvent(
  tenantId: string,
  event: EvolutionWebhookEvent
): Promise<WebhookProcessResult> {
  const service = await getEvolutionService(tenantId);
  return service.processWebhook(event);
}
