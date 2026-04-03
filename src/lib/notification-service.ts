/**
 * Notification Service
 * Centralized service for creating and managing notifications
 */

import { db } from '@/lib/db';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from '@prisma/client';

// Types for creating notifications
interface CreateNotificationData {
  tenantId: string;
  userId?: string | null;
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  description?: string;
  actionUrl?: string;
  actionLabel?: string;
  entityType?: string;
  entityId?: string;
  isPinned?: boolean;
  expiresAt?: Date;
}

// Notification presets for common events
export const NotificationPresets = {
  // Candidate notifications
  candidateNew: (candidateName: string, candidateId: string, jobTitle: string) => ({
    type: NotificationType.CANDIDATE_NEW,
    category: NotificationCategory.CANDIDATES,
    priority: NotificationPriority.NORMAL,
    title: 'Novo Candidato',
    message: `${candidateName} se candidatou para ${jobTitle}`,
    entityType: 'candidate',
    entityId: candidateId,
    actionUrl: `/?view=candidates`,
    actionLabel: 'Ver Candidato',
  }),

  candidateStatusChange: (candidateName: string, candidateId: string, newStatus: string) => ({
    type: NotificationType.CANDIDATE_STATUS_CHANGE,
    category: NotificationCategory.CANDIDATES,
    priority: NotificationPriority.NORMAL,
    title: 'Status Atualizado',
    message: `${candidateName} foi movido para ${newStatus}`,
    entityType: 'candidate',
    entityId: candidateId,
    actionUrl: `/?view=pipeline`,
    actionLabel: 'Ver no Pipeline',
  }),

  candidateHired: (candidateName: string, candidateId: string, jobTitle: string) => ({
    type: NotificationType.CANDIDATE_HIRED,
    category: NotificationCategory.CANDIDATES,
    priority: NotificationPriority.HIGH,
    title: '🎉 Candidato Contratado!',
    message: `${candidateName} foi contratado para ${jobTitle}`,
    entityType: 'candidate',
    entityId: candidateId,
    actionUrl: `/?view=candidates`,
    actionLabel: 'Ver Candidato',
  }),

  candidateRejected: (candidateName: string, candidateId: string) => ({
    type: NotificationType.CANDIDATE_REJECTED,
    category: NotificationCategory.CANDIDATES,
    priority: NotificationPriority.LOW,
    title: 'Candidato Rejeitado',
    message: `${candidateName} foi rejeitado`,
    entityType: 'candidate',
    entityId: candidateId,
    actionUrl: `/?view=pipeline`,
    actionLabel: 'Ver no Pipeline',
  }),

  // Job notifications
  jobPublished: (jobTitle: string, jobId: string) => ({
    type: NotificationType.JOB_PUBLISHED,
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.NORMAL,
    title: 'Vaga Publicada',
    message: `A vaga "${jobTitle}" foi publicada com sucesso`,
    entityType: 'job',
    entityId: jobId,
    actionUrl: `/?view=jobs`,
    actionLabel: 'Ver Vaga',
  }),

  jobExpiring: (jobTitle: string, jobId: string, daysLeft: number) => ({
    type: NotificationType.JOB_EXPIRING,
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.HIGH,
    title: 'Vaga Expirando',
    message: `A vaga "${jobTitle}" expira em ${daysLeft} dias`,
    entityType: 'job',
    entityId: jobId,
    actionUrl: `/?view=jobs`,
    actionLabel: 'Ver Vaga',
  }),

  // AI Agent notifications
  aiTaskCompleted: (taskType: string, taskId: string) => ({
    type: NotificationType.AI_TASK_COMPLETED,
    category: NotificationCategory.AI_AGENTS,
    priority: NotificationPriority.NORMAL,
    title: 'Tarefa IA Concluída',
    message: `A tarefa de ${taskType} foi concluída com sucesso`,
    entityType: 'ai_task',
    entityId: taskId,
    actionUrl: `/?view=agents`,
    actionLabel: 'Ver Tarefa',
  }),

  aiTaskFailed: (taskType: string, taskId: string, errorMessage: string) => ({
    type: NotificationType.AI_TASK_FAILED,
    category: NotificationCategory.AI_AGENTS,
    priority: NotificationPriority.HIGH,
    title: '⚠️ Tarefa IA Falhou',
    message: `A tarefa de ${taskType} falhou: ${errorMessage}`,
    entityType: 'ai_task',
    entityId: taskId,
    actionUrl: `/?view=agents`,
    actionLabel: 'Ver Detalhes',
  }),

  aiSuggestion: (suggestion: string, entityType?: string, entityId?: string) => ({
    type: NotificationType.AI_SUGGESTION,
    category: NotificationCategory.AI_AGENTS,
    priority: NotificationPriority.NORMAL,
    title: '💡 Sugestão IA',
    message: suggestion,
    entityType,
    entityId,
  }),

  // Message notifications
  messageReceived: (senderName: string, conversationId: string, preview: string) => ({
    type: NotificationType.MESSAGE_RECEIVED,
    category: NotificationCategory.MESSAGES,
    priority: NotificationPriority.NORMAL,
    title: 'Nova Mensagem',
    message: `${senderName}: ${preview.slice(0, 50)}...`,
    entityType: 'conversation',
    entityId: conversationId,
    actionUrl: `/?view=messages`,
    actionLabel: 'Ver Mensagem',
  }),

  messageIntervention: (candidateName: string, conversationId: string, reason: string) => ({
    type: NotificationType.MESSAGE_INTERVENTION,
    category: NotificationCategory.MESSAGES,
    priority: NotificationPriority.HIGH,
    title: '🔴 Intervenção Necessária',
    message: `O candidato ${candidateName} precisa de atenção: ${reason}`,
    entityType: 'conversation',
    entityId: conversationId,
    actionUrl: `/?view=messages`,
    actionLabel: 'Responder',
  }),

  // Interview notifications
  interviewScheduled: (candidateName: string, interviewId: string, dateTime: string) => ({
    type: NotificationType.INTERVIEW_SCHEDULED,
    category: NotificationCategory.INTERVIEWS,
    priority: NotificationPriority.NORMAL,
    title: 'Entrevista Agendada',
    message: `Entrevista com ${candidateName} marcada para ${dateTime}`,
    entityType: 'interview',
    entityId: interviewId,
    actionUrl: `/?view=candidates`,
    actionLabel: 'Ver Detalhes',
  }),

  interviewReminder: (candidateName: string, interviewId: string, inMinutes: number) => ({
    type: NotificationType.INTERVIEW_REMINDER,
    category: NotificationCategory.INTERVIEWS,
    priority: NotificationPriority.URGENT,
    title: '⏰ Lembrete de Entrevista',
    message: `Entrevista com ${candidateName} em ${inMinutes} minutos`,
    entityType: 'interview',
    entityId: interviewId,
    actionUrl: `/?view=candidates`,
    actionLabel: 'Iniciar',
  }),

  interviewNoShow: (candidateName: string, interviewId: string) => ({
    type: NotificationType.INTERVIEW_NO_SHOW,
    category: NotificationCategory.INTERVIEWS,
    priority: NotificationPriority.HIGH,
    title: '🚫 Candidato Não Compareceu',
    message: `${candidateName} não compareceu à entrevista`,
    entityType: 'interview',
    entityId: interviewId,
    actionUrl: `/?view=candidates`,
    actionLabel: 'Ver Detalhes',
  }),

  // DISC notifications
  discTestCompleted: (candidateName: string, testId: string, profile: string) => ({
    type: NotificationType.DISC_TEST_COMPLETED,
    category: NotificationCategory.DISC,
    priority: NotificationPriority.NORMAL,
    title: 'Teste DISC Concluído',
    message: `${candidateName} completou o teste DISC. Perfil: ${profile}`,
    entityType: 'disc_test',
    entityId: testId,
    actionUrl: `/?view=disc`,
    actionLabel: 'Ver Resultado',
  }),

  // API notifications
  apiUsageAlert: (provider: string, percentage: number) => ({
    type: NotificationType.API_USAGE_ALERT,
    category: NotificationCategory.API,
    priority: NotificationPriority.HIGH,
    title: '⚠️ Alerta de Uso de API',
    message: `API ${provider} atingiu ${percentage}% do limite mensal`,
    actionUrl: `/?view=apis`,
    actionLabel: 'Ver Detalhes',
  }),

  apiLimitReached: (provider: string) => ({
    type: NotificationType.API_LIMIT_REACHED,
    category: NotificationCategory.API,
    priority: NotificationPriority.URGENT,
    title: '🚨 Limite de API Esgotado',
    message: `A API ${provider} atingiu o limite mensal. Os serviços podem ser interrompidos.`,
    actionUrl: `/?view=apis`,
    actionLabel: 'Ver Detalhes',
  }),

  // Team notifications
  teamInvite: (email: string, invitedBy: string) => ({
    type: NotificationType.TEAM_INVITE,
    category: NotificationCategory.TEAM,
    priority: NotificationPriority.NORMAL,
    title: 'Convite Enviado',
    message: `Convite enviado para ${email} por ${invitedBy}`,
    actionUrl: `/?view=settings`,
    actionLabel: 'Ver Equipe',
  }),

  teamJoined: (name: string, email: string) => ({
    type: NotificationType.TEAM_JOINED,
    category: NotificationCategory.TEAM,
    priority: NotificationPriority.NORMAL,
    title: 'Novo Membro',
    message: `${name} (${email}) entrou na equipe`,
    actionUrl: `/?view=settings`,
    actionLabel: 'Ver Equipe',
  }),

  // System notifications
  systemAlert: (title: string, message: string, priority: NotificationPriority = NotificationPriority.NORMAL) => ({
    type: NotificationType.SYSTEM_ALERT,
    category: NotificationCategory.SYSTEM,
    priority,
    title,
    message,
  }),
} as const;

/**
 * Create a notification
 */
export async function createNotification(
  data: CreateNotificationData
) {
  try {
    const notification = await db.notification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId || null,
        type: data.type,
        category: data.category,
        priority: data.priority || NotificationPriority.NORMAL,
        title: data.title,
        message: data.message,
        description: data.description,
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        entityType: data.entityType,
        entityId: data.entityId,
        isPinned: data.isPinned || false,
        expiresAt: data.expiresAt,
      },
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notification from preset
 */
export async function createNotificationFromPreset(
  preset: ReturnType<typeof NotificationPresets[keyof typeof NotificationPresets]>,
  tenantId: string,
  userId?: string | null
) {
  return createNotification({
    tenantId,
    userId,
    ...preset,
  });
}

/**
 * Notify all members of a tenant
 */
export async function notifyAllMembers(
  tenantId: string,
  data: Omit<CreateNotificationData, 'tenantId' | 'userId'>
) {
  // Create notification without userId (broadcast to all)
  return createNotification({
    ...data,
    tenantId,
    userId: null,
  });
}

/**
 * Notify specific user
 */
export async function notifyUser(
  tenantId: string,
  userId: string,
  data: Omit<CreateNotificationData, 'tenantId' | 'userId'>
) {
  return createNotification({
    ...data,
    tenantId,
    userId,
  });
}

/**
 * Clean up expired notifications
 */
export async function cleanupExpiredNotifications(tenantId: string) {
  const result = await db.notification.deleteMany({
    where: {
      tenantId,
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
