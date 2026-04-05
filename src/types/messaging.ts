/**
 * Messaging Types - Zion Recruit
 * Types for the omnichannel messaging system
 */

// ============================================
// ENUMS
// ============================================

export type ChannelType = 'CHAT' | 'EMAIL' | 'WHATSAPP' | 'SMS' | 'TELEGRAM';

export type ConversationStatus = 'ACTIVE' | 'PENDING' | 'SNOOZED' | 'CLOSED' | 'ARCHIVED';

export type SenderType = 'CANDIDATE' | 'RECRUITER' | 'AI' | 'SYSTEM';

export type ContentType = 'TEXT' | 'MARKDOWN' | 'HTML' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'LOCATION' | 'CONTACT';

export type MessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

// ============================================
// INTERFACES
// ============================================

export interface MessageChannel {
  id: string;
  tenantId: string;
  type: ChannelType;
  name: string;
  config?: string;
  isActive: boolean;
  instanceName?: string;
  instanceId?: string;
  webhookUrl?: string;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  tenantId: string;
  candidateId: string;
  jobId?: string;
  channelId?: string;
  channel: ChannelType;
  externalId?: string;
  status: ConversationStatus;
  aiMode: boolean;
  aiStage?: string;
  aiContext?: string;
  lastMessageAt: Date;
  lastMessagePreview?: string;
  unreadCount: number;
  unreadByCandidate: boolean;
  needsIntervention: boolean;
  interventionReason?: string;
  collectedData?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  candidate?: CandidateSummary;
  job?: JobSummary;
  messages?: Message[];
  interventions?: HumanIntervention[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderId?: string;
  senderName?: string;
  content: string;
  contentType: ContentType;
  mediaUrl?: string;
  mediaType?: string;
  channel: ChannelType;
  externalId?: string;
  status: MessageStatus;
  isAiGenerated: boolean;
  aiConfidence?: number;
  needsReview: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  metadata?: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

export interface HumanIntervention {
  id: string;
  conversationId: string;
  triggeredAt: Date;
  triggeredBy?: string;
  reason: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  createdAt: Date;
}

export interface MessageTemplate {
  id: string;
  tenantId: string;
  name: string;
  trigger: string;
  category: string;
  subject?: string;
  body: string;
  channel: ChannelType;
  variables?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SUMMARY TYPES (for lists)
// ============================================

export interface CandidateSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photo?: string;
}

export interface JobSummary {
  id: string;
  title: string;
  department?: string;
}

export interface ConversationWithDetails extends Conversation {
  candidate: CandidateSummary;
  job?: JobSummary;
  lastMessage?: Message;
  unreadCount: number;
  takenOverBy?: string | null;
  takenOverAt?: string | null;
  takenOverName?: string | null;
}

// ============================================
// API TYPES
// ============================================

export interface CreateConversationInput {
  candidateId: string;
  jobId?: string;
  channel?: ChannelType;
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
  contentType?: ContentType;
  mediaUrl?: string;
  mediaType?: string;
}

export interface UpdateConversationInput {
  status?: ConversationStatus;
  aiMode?: boolean;
  notes?: string;
}

export interface CreateTemplateInput {
  name: string;
  trigger: string;
  category: string;
  subject?: string;
  body: string;
  channel: ChannelType;
  variables?: string[];
}

export interface CreateChannelInput {
  type: ChannelType;
  name: string;
  config?: Record<string, unknown>;
  instanceName?: string;
  instanceId?: string;
}

// ============================================
// AI SCREENING STAGES
// ============================================

export const AI_STAGES = {
  WELCOME: 'welcome',
  INTRODUCTION: 'introduction',
  EXPERIENCE_CHECK: 'experience_check',
  AVAILABILITY_CHECK: 'availability_check',
  SALARY_CHECK: 'salary_check',
  SKILLS_CHECK: 'skills_check',
  MOTIVATION_CHECK: 'motivation_check',
  FIT_ANALYSIS: 'fit_analysis',
  SCHEDULING: 'scheduling',
  HANDOFF: 'handoff',
  CLOSED: 'closed',
} as const;

export type AIStage = typeof AI_STAGES[keyof typeof AI_STAGES];

// ============================================
// CHANNEL CONFIG
// ============================================

export const CHANNEL_CONFIG: Record<ChannelType, {
  name: string;
  icon: string;
  color: string;
  supportsMedia: boolean;
  supportsTyping: boolean;
}> = {
  CHAT: {
    name: 'Chat Interno',
    icon: 'MessageCircle',
    color: '#3B82F6',
    supportsMedia: true,
    supportsTyping: true,
  },
  EMAIL: {
    name: 'E-mail',
    icon: 'Mail',
    color: '#10B981',
    supportsMedia: true,
    supportsTyping: false,
  },
  WHATSAPP: {
    name: 'WhatsApp',
    icon: 'MessageSquare',
    color: '#25D366',
    supportsMedia: true,
    supportsTyping: true,
  },
  SMS: {
    name: 'SMS',
    icon: 'Smartphone',
    color: '#8B5CF6',
    supportsMedia: false,
    supportsTyping: false,
  },
  TELEGRAM: {
    name: 'Telegram',
    icon: 'Send',
    color: '#0088CC',
    supportsMedia: true,
    supportsTyping: true,
  },
};

// ============================================
// MESSAGE TEMPLATES
// ============================================

export const DEFAULT_TEMPLATES: Partial<MessageTemplate>[] = [
  {
    trigger: 'WELCOME',
    name: 'Mensagem de Boas-vindas',
    category: 'screening',
    body: `Olá, {candidateName}! 👋

Sou a assistente de recrutamento da {companyName} e estou muito feliz em entrar em contato sobre a vaga de {jobTitle}.

Recebi seu currículo e gostaria de conhecer melhor sua experiência. Tem alguns minutos para conversar?

Responderei suas dúvidas e farei algumas perguntas rápidas para entender melhor seu perfil.`,
    channel: 'CHAT',
  },
  {
    trigger: 'SCREENING_START',
    name: 'Início da Triagem',
    category: 'screening',
    body: `Perfeito! Vou fazer algumas perguntas rápidas para conhecer melhor seu perfil.

Por favor, responda da forma que preferir - não há respostas certas ou erradas! 😊`,
    channel: 'CHAT',
  },
  {
    trigger: 'SCHEDULE_INTERVIEW',
    name: 'Agendar Entrevista',
    category: 'scheduling',
    body: `Parabéns, {candidateName}! 🎉

Seu perfil se encaixa muito bem com o que buscamos para a vaga de {jobTitle}.

Gostaria de agendar uma conversa com nossa equipe de recrutamento? Por favor, me informe:
- Sua disponibilidade nos próximos dias
- Prefere reunião por vídeo ou presencial?

Nossos horários de atendimento são de segunda a sexta, das 9h às 18h.`,
    channel: 'CHAT',
  },
  {
    trigger: 'FOLLOW_UP',
    name: 'Follow-up',
    category: 'engagement',
    body: `Oi, {candidateName}! 

Passando para dar uma atualização sobre seu processo seletivo para a vaga de {jobTitle}.

{statusUpdate}

Tem alguma dúvida? Estou à disposição!`,
    channel: 'CHAT',
  },
  {
    trigger: 'REJECT',
    name: 'Feedback - Não Selecionado',
    category: 'feedback',
    body: `Olá, {candidateName}

Agradecemos seu interesse na vaga de {jobTitle} na {companyName}.

Após análise cuidadosa do seu perfil, decidimos seguir com outros candidatos cujo perfil mais se adequa às necessidades atuais da posição.

Isso não significa que você não tenha qualificações valiosas. Guardaremos seu currículo em nosso banco de talentos para oportunidades futuras.

Desejamos muito sucesso em sua jornada profissional! 🙏`,
    channel: 'CHAT',
  },
  {
    trigger: 'HANDOFF',
    name: 'Transferência para Humano',
    category: 'handoff',
    body: `Ótimo, {candidateName}! 

Vou transferir você para um de nossos recrutadores que poderá te ajudar melhor com isso. Aguarde um momento que logo alguém entrará em contato.

Enquanto isso, se tiver outras dúvidas, pode me perguntar! 😊`,
    channel: 'CHAT',
  },
];
