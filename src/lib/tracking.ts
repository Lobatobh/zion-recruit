/**
 * Tracking Utility - Client Company Tracking System
 * Handles automatic event creation and notification generation.
 */

import { db } from '@/lib/db';
import { TrackingEventType } from '@prisma/client';
import ZAI from 'z-ai-web-dev-sdk';

// ============================================
// EVENT LABELS (pt-BR)
// ============================================

export const EVENT_LABELS: Record<TrackingEventType, string> = {
  [TrackingEventType.CANDIDATE_NEW]: 'Novo Candidato',
  [TrackingEventType.CANDIDATE_SCREENING]: 'Triagem de Candidato',
  [TrackingEventType.CANDIDATE_INTERVIEW]: 'Entrevista de Candidato',
  [TrackingEventType.CANDIDATE_OFFER]: 'Proposta Enviada',
  [TrackingEventType.CANDIDATE_HIRED]: 'Candidato Contratado',
  [TrackingEventType.CANDIDATE_REJECTED]: 'Candidato Reprovado',
  [TrackingEventType.CANDIDATE_WITHDRAWN]: 'Candidato Desistiu',
  [TrackingEventType.INTERVIEW_SCHEDULED]: 'Entrevista Agendada',
  [TrackingEventType.INTERVIEW_COMPLETED]: 'Entrevista Concluída',
  [TrackingEventType.INTERVIEW_CANCELLED]: 'Entrevista Cancelada',
  [TrackingEventType.INTERVIEW_NO_SHOW]: 'Candidato Faltou',
  [TrackingEventType.DISC_TEST_SENT]: 'Teste DISC Enviado',
  [TrackingEventType.DISC_TEST_COMPLETED]: 'Teste DISC Concluído',
  [TrackingEventType.DISC_PROFILE_READY]: 'Perfil DISC Pronto',
  [TrackingEventType.JOB_PUBLISHED]: 'Vaga Publicada',
  [TrackingEventType.JOB_CLOSED]: 'Vaga Encerrada',
  [TrackingEventType.JOB_PAUSED]: 'Vaga Pausada',
  [TrackingEventType.WEEKLY_SUMMARY]: 'Resumo Semanal',
  [TrackingEventType.MANUAL_UPDATE]: 'Atualização Manual',
};

interface TrackEventParams {
  tenantId: string;
  clientId: string;
  jobId?: string;
  candidateId?: string;
  type: TrackingEventType;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a TrackingEvent and auto-generates notifications if the client
 * has notifications enabled and the event type is in their notifyEvents list.
 */
export async function trackEvent(params: TrackEventParams) {
  const {
    tenantId,
    clientId,
    jobId,
    candidateId,
    type,
    title,
    description,
    metadata,
  } = params;

  const eventTitle = title || EVENT_LABELS[type] || type;

  // Create the tracking event
  const event = await db.trackingEvent.create({
    data: {
      tenantId,
      clientId,
      jobId: jobId || null,
      candidateId: candidateId || null,
      type,
      title: eventTitle,
      description: description || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  // Try to auto-generate notifications in a non-blocking way
  try {
    await autoGenerateNotifications(event);
  } catch (error) {
    console.error('[tracking] Falha ao gerar notificações automáticas:', error);
  }

  return event;
}

/**
 * Generates AI notification message for a tracking event.
 */
async function generateNotificationMessage(params: {
  event: {
    type: TrackingEventType;
    title: string;
    description?: string | null;
    metadata?: string | null;
  };
  client: {
    name: string;
    aiTone: string;
  };
  job?: { title: string } | null;
  candidate?: { name: string } | null;
}): Promise<string> {
  const { event, client, job, candidate } = params;

  try {
    const zai = await ZAI.create();

    const toneMap: Record<string, string> = {
      professional: 'profissional e objetivo',
      casual: 'casual e amigável',
      formal: 'formal e respeitoso',
    };
    const toneDescription = toneMap[client.aiTone] || toneMap.professional;

    const jobTitle = job?.title || 'N/A';
    const candidateName = candidate?.name || 'N/A';

    const eventDescription = event.description || event.title;

    const completion = await zai.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente de recrutamento profissional. Gere mensagens de atualização sobre o processo seletivo para a empresa contratante. Seja cordial mas ${toneDescription}. Responda em português brasileiro. A mensagem deve ser concisa (2-4 frases) e conter apenas o conteúdo da mensagem, sem títulos, marcadores ou formatação extra.`,
        },
        {
          role: 'user',
          content: `Gere uma mensagem de atualização sobre: ${eventDescription}. Empresa: ${client.name}. Vaga: ${jobTitle}. Candidato: ${candidateName}.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const message = completion.choices[0]?.message?.content;
    return message || `Atualização do processo seletivo: ${eventDescription}`;
  } catch (error) {
    console.error('[tracking] Falha ao gerar mensagem com IA:', error);
    return `Atualização do processo seletivo: ${event.title}`;
  }
}

/**
 * Auto-generates notifications for a tracking event based on client settings.
 */
async function autoGenerateNotifications(event: {
  id: string;
  tenantId: string;
  clientId: string;
  type: TrackingEventType;
  title: string;
  description?: string | null;
  metadata?: string | null;
  jobId?: string | null;
  candidateId?: string | null;
}) {
  // Fetch client with notification settings
  const client = await db.client.findUnique({
    where: { id: event.clientId },
    select: {
      notifyEmail: true,
      notifyWhatsapp: true,
      notifyFrequency: true,
      notifyEvents: true,
      aiTone: true,
      name: true,
    },
  });

  if (!client) return;

  // Check if any notification channel is enabled
  if (!client.notifyEmail && !client.notifyWhatsapp) return;

  // For non-immediate frequencies, don't auto-generate
  if (client.notifyFrequency !== 'IMMEDIATE') return;

  // Check if the event type is in the client's notification events list
  let notifyEvents: string[] = [];
  try {
    notifyEvents = JSON.parse(client.notifyEvents || '[]');
  } catch {
    notifyEvents = [];
  }

  if (notifyEvents.length > 0 && !notifyEvents.includes(event.type)) return;

  // Fetch job and candidate info
  const job = event.jobId
    ? await db.job.findUnique({
        where: { id: event.jobId },
        select: { title: true },
      })
    : null;

  const candidate = event.candidateId
    ? await db.candidate.findUnique({
        where: { id: event.candidateId },
        select: { name: true },
      })
    : null;

  // Generate AI message
  const message = await generateNotificationMessage({
    event,
    client,
    job,
    candidate,
  });

  // Determine channel
  let channel: 'EMAIL' | 'WHATSAPP' | 'BOTH' = 'EMAIL';
  if (client.notifyEmail && client.notifyWhatsapp) {
    channel = 'BOTH';
  } else if (client.notifyWhatsapp) {
    channel = 'WHATSAPP';
  }

  // Fetch active contacts
  const contacts = await db.clientContact.findMany({
    where: {
      clientId: event.clientId,
      isActive: true,
    },
  });

  if (contacts.length === 0) return;

  // Create notification for each active contact
  const notifData = contacts.map((contact) => ({
    tenantId: event.tenantId,
    clientId: event.clientId,
    eventId: event.id,
    contactId: contact.id,
    channel,
    status: 'PENDING' as const,
    message,
    subject: `Atualização - ${client.name}`,
    aiGenerated: true,
  }));

  await db.trackingNotification.createMany({ data: notifData });
}

/**
 * Get event label in pt-BR
 */
export function getEventLabel(type: TrackingEventType): string {
  return EVENT_LABELS[type] || type;
}
