/**
 * WhatsApp Types - Evolution API Integration
 * Zion Recruit - AI-Powered Recruitment SaaS
 */

// ============================================
// EVOLUTION API TYPES
// ============================================

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instance: string;
  webhookUrl?: string;
}

export interface EvolutionMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
      contextInfo?: {
        quotedMessage?: unknown;
      };
    };
  };
  messageTimestamp: number;
  status: string;
}

export interface EvolutionSendTextMessage {
  number: string;
  options?: {
    delay?: number;
    presence?: 'composing' | 'recording' | 'paused';
    quoted?: {
      key: {
        id: string;
        remoteJid: string;
      };
      message: unknown;
    };
  };
  textMessage: {
    text: string;
  };
}

export interface EvolutionSendMediaMessage {
  number: string;
  options?: {
    delay?: number;
    presence?: 'composing' | 'recording' | 'paused';
  };
  mediaMessage: {
    mediatype: 'image' | 'document' | 'video' | 'audio';
    media: string; // URL or base64
    caption?: string;
    fileName?: string;
  };
}

export interface EvolutionSendTemplateMessage {
  number: string;
  options?: {
    delay?: number;
  };
  templateMessage: {
    name: string;
    language: {
      code: string;
      policy: 'deterministic';
    };
    components: EvolutionTemplateComponent[];
  };
}

export interface EvolutionTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: EvolutionTemplateParameter[];
}

export interface EvolutionTemplateParameter {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename?: string;
  };
  video?: {
    link: string;
  };
}

export interface EvolutionWebhookEvent {
  event: string;
  instance: string;
  data: EvolutionWebhookData;
  destination?: string;
  date_time: string;
  sender: string;
  server_url: string;
  apikey: string;
}

export interface EvolutionWebhookData {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
      contextInfo?: {
        quotedMessage?: unknown;
      };
    };
    imageMessage?: {
      url: string;
      mimetype: string;
      caption?: string;
    };
    documentMessage?: {
      url: string;
      mimetype: string;
      fileName: string;
      caption?: string;
    };
    audioMessage?: {
      url: string;
      mimetype: string;
    };
    videoMessage?: {
      url: string;
      mimetype: string;
      caption?: string;
    };
    locationMessage?: {
      degreesLatitude: number;
      degreesLongitude: number;
      name?: string;
      address?: string;
    };
    contactMessage?: {
      displayName: string;
      vcard: string;
    };
  };
  messageTimestamp?: number;
  status?: string;
}

export interface EvolutionInstanceInfo {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
  };
  hash: string;
  webhook?: {
    webhook: string;
    webhook_by_events: boolean;
    events: string[];
  };
}

export interface EvolutionInstanceStatus {
  instance: string;
  status: 'open' | 'close' | 'connecting' | 'disconnected';
  qrCode?: string;
}

// ============================================
// WHATSAPP MESSAGE TYPES
// ============================================

export type WhatsAppMediaType = 'image' | 'document' | 'video' | 'audio';

export interface WhatsAppTextMessage {
  type: 'text';
  to: string;
  content: string;
}

export interface WhatsAppMediaMessage {
  type: 'media';
  to: string;
  mediaType: WhatsAppMediaType;
  mediaUrl: string;
  caption?: string;
  fileName?: string;
}

export interface WhatsAppTemplateMessage {
  type: 'template';
  to: string;
  templateName: string;
  languageCode: string;
  components: WhatsAppTemplateComponent[];
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplateParameter {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  mediaUrl?: string;
  fileName?: string;
}

export type WhatsAppMessage = WhatsAppTextMessage | WhatsAppMediaMessage | WhatsAppTemplateMessage;

// ============================================
// MESSAGE TRACKING TYPES
// ============================================

export interface MessageTrackingData {
  id: string;
  tenantId: string;
  candidateId?: string;
  conversationId?: string;
  externalId?: string;
  type: 'text' | 'media' | 'template';
  status: MessageTrackingStatus;
  phoneNumber: string;
  content: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export type MessageTrackingStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface DISCTestNotification {
  candidateId: string;
  candidateName: string;
  candidatePhone: string;
  jobTitle: string;
  companyName: string;
  testUrl: string;
  expiresIn: number; // hours
}

export interface InterviewReminder {
  candidateId: string;
  candidateName: string;
  candidatePhone: string;
  jobTitle: string;
  companyName: string;
  interviewDate: Date;
  interviewTime: string;
  interviewType: string;
  meetingUrl?: string;
  location?: string;
  interviewerName?: string;
  reminderHours: number; // hours before interview
}

export interface CandidateNotification {
  candidateId: string;
  candidateName: string;
  candidatePhone: string;
  jobTitle: string;
  companyName: string;
  type: 'status_update' | 'offer' | 'rejection' | 'welcome' | 'follow_up';
  customMessage?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// WEBHOOK TYPES
// ============================================

export interface WebhookIncomingMessage {
  messageId: string;
  phoneNumber: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact';
  mediaUrl?: string;
  mediaType?: string;
  caption?: string;
  fileName?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contact?: {
    name: string;
    phone?: string;
  };
  isFromMe: boolean;
  instance: string;
}

export interface WebhookMessageStatus {
  messageId: string;
  externalId: string;
  phoneNumber: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  errorMessage?: string;
}

export type WebhookEventType = 
  | 'MESSAGES_UPSERT'
  | 'MESSAGES_UPDATE'
  | 'SEND_MESSAGE'
  | 'CONNECTION_UPDATE'
  | 'QRCODE_UPDATED'
  | 'INSTANCE_DELETED';

// ============================================
// RESPONSE TYPES
// ============================================

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  externalId?: string;
  error?: string;
  timestamp: Date;
}

export interface WebhookProcessResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    candidateId?: string;
    conversationId?: string;
    messageId?: string;
  };
}

// ============================================
// TEMPLATE DEFINITIONS
// ============================================

export interface WhatsAppTemplate {
  name: string;
  language: string;
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY' | 'TRANSACTIONAL';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  components: WhatsAppTemplateComponentDefinition[];
}

export interface WhatsAppTemplateComponentDefinition {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  text?: string;
  buttons?: WhatsAppTemplateButton[];
}

export interface WhatsAppTemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'CALL';
  text: string;
  url?: string;
  phoneNumber?: string;
}

// ============================================
// PREDEFINED TEMPLATES FOR RECRUITMENT
// ============================================

export const RECRUITMENT_TEMPLATES = {
  DISC_TEST_INVITATION: {
    name: 'disc_test_invitation',
    language: 'pt_BR',
    category: 'UTILITY' as const,
    body: `Olá {{candidate_name}}! 

Você foi convidado(a) para realizar o teste de perfil comportamental DISC para a vaga de {{job_title}} na {{company_name}}.

Acesse o link abaixo para realizar o teste:
{{test_url}}

O link expira em {{expires_in}} horas.

Dúvidas? Responda esta mensagem!`,
  },

  INTERVIEW_REMINDER: {
    name: 'interview_reminder',
    language: 'pt_BR',
    category: 'UTILITY' as const,
    body: `Olá {{candidate_name}}! 

Lembrete: Sua entrevista para a vaga de {{job_title}} está marcada para:

📅 {{interview_date}}
⏰ {{interview_time}}
📍 {{interview_location}}
{{meeting_link}}

{{interviewer_name}} irá conduzir a entrevista.

Confirmar presença? Responda SIM ou NÃO.`,
  },

  WELCOME_CANDIDATE: {
    name: 'welcome_candidate',
    language: 'pt_BR',
    category: 'TRANSACTIONAL' as const,
    body: `Olá {{candidate_name}}! 👋

Bem-vindo(a) ao processo seletivo da {{company_name}} para a vaga de {{job_title}}!

Estamos muito felizes em ter você conosco. Nossa equipe irá acompanhar sua candidatura e entrará em contato em breve.

Fique à vontade para tirar dúvidas respondendo esta mensagem!`,
  },

  STATUS_UPDATE: {
    name: 'status_update',
    language: 'pt_BR',
    category: 'TRANSACTIONAL' as const,
    body: `Olá {{candidate_name}}!

Temos uma atualização sobre seu processo seletivo para a vaga de {{job_title}}:

{{status_message}}

{{additional_info}}

Dúvidas? Responda esta mensagem!`,
  },

  INTERVIEW_CONFIRMED: {
    name: 'interview_confirmed',
    language: 'pt_BR',
    category: 'TRANSACTIONAL' as const,
    body: `Olá {{candidate_name}}! ✅

Sua entrevista está confirmada!

📅 Data: {{interview_date}}
⏰ Horário: {{interview_time}}
{{meeting_info}}

Adicione ao seu calendário e não se esqueça!

Até lá! 🙌`,
  },

  OFFER_LETTER: {
    name: 'offer_letter',
    language: 'pt_BR',
    category: 'TRANSACTIONAL' as const,
    body: `Olá {{candidate_name}}! 🎉

PARABÉNS! Você foi aprovado(a) no processo seletivo da {{company_name}} para a vaga de {{job_title}}!

Estamos muito felizes em ter você em nossa equipe. Em breve, nossa equipe de RH entrará em contato com os detalhes da proposta.

Seja bem-vindo(a)! 🙌`,
  },

  REJECTION_NOTICE: {
    name: 'rejection_notice',
    language: 'pt_BR',
    category: 'TRANSACTIONAL' as const,
    body: `Olá {{candidate_name}}

Agradecemos seu interesse na vaga de {{job_title}} na {{company_name}}.

Após análise cuidadosa, decidimos seguir com outros candidatos para esta posição. Isso não diminui suas qualificações - guardaremos seu contato para oportunidades futuras.

Desejamos sucesso em sua jornada! 🙏`,
  },
} as const;

// ============================================
// ERROR TYPES
// ============================================

export class WhatsAppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'WhatsAppError';
  }
}

export class EvolutionAPIError extends WhatsAppError {
  constructor(
    message: string,
    public endpoint: string,
    statusCode?: number,
    details?: unknown
  ) {
    super(message, 'EVOLUTION_API_ERROR', statusCode, details);
    this.name = 'EvolutionAPIError';
  }
}

export class CredentialNotFoundError extends WhatsAppError {
  constructor(tenantId: string) {
    super(
      `Evolution API credentials not found for tenant: ${tenantId}`,
      'CREDENTIAL_NOT_FOUND'
    );
    this.name = 'CredentialNotFoundError';
  }
}

export class InstanceNotConnectedError extends WhatsAppError {
  constructor(instance: string) {
    super(
      `WhatsApp instance ${instance} is not connected`,
      'INSTANCE_NOT_CONNECTED'
    );
    this.name = 'InstanceNotConnectedError';
  }
}

export class InvalidPhoneNumberError extends WhatsAppError {
  constructor(phone: string) {
    super(
      `Invalid phone number format: ${phone}`,
      'INVALID_PHONE_NUMBER'
    );
    this.name = 'InvalidPhoneNumberError';
  }
}
