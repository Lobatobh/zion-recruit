/**
 * Portal Token Verification API
 * Verifies token and returns candidate data with rich timeline per application
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// pt-BR status labels
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SOURCED: 'Fonte',
    APPLIED: 'Candidatado',
    SCREENING: 'Triagem',
    INTERVIEWING: 'Entrevista',
    DISC_TEST: 'Avaliação DISC',
    OFFERED: 'Proposta Enviada',
    HIRED: 'Contratado',
    REJECTED: 'Não Selecionado',
    WITHDRAWN: 'Desistiu',
    NO_RESPONSE: 'Sem Resposta',
  };
  return labels[status] || status;
}

function getInterviewStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SCHEDULED: 'Agendada',
    CONFIRMED: 'Confirmada',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada',
    NO_SHOW: 'Não Compareceu',
    RESCHEDULED: 'Remarcada',
  };
  return labels[status] || status;
}

function getDiscTestStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    SENT: 'Enviado',
    STARTED: 'Iniciado',
    COMPLETED: 'Concluído',
    EXPIRED: 'Expirado',
  };
  return labels[status] || status;
}

function getInterviewTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SCREENING: 'Triagem',
    TECHNICAL: 'Técnica',
    BEHAVIORAL: 'Comportamental',
    CULTURAL: 'Cultural',
    FINAL: 'Final',
    PHONE: 'Telefônica',
    VIDEO: 'Vídeo',
    ONSITE: 'Presencial',
  };
  return labels[type] || type;
}

interface TimelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  isCurrent: boolean;
  isCompleted: boolean;
  isPending: boolean;
}

interface StatusHistoryEvent {
  id: string;
  type: 'STAGE_CHANGE' | 'INTERVIEW' | 'DISC_TEST' | 'STATUS_CHANGE';
  title: string;
  description: string;
  date: string;
  metadata: Record<string, unknown>;
}

/**
 * Build rich timeline and status history for a given application/candidate.
 * Shared logic between applications API and verify API.
 */
function buildTimelineAndHistory(
  app: {
    id: string;
    pipelineStageId: string | null;
    tenantId: string;
    status: string;
    createdAt: Date;
    job: { title?: string | null } | null;
    interviews: Array<{
      id: string;
      title: string;
      type: string;
      status: string;
      scheduledAt: Date;
      completedAt: Date | null;
      interviewerName: string | null;
      duration: number;
      rating: number | null;
      recommendation: string | null;
    }>;
    discTests: Array<{
      id: string;
      status: string;
      sentAt: Date | null;
      startedAt: Date | null;
      completedAt: Date | null;
      primaryProfile: string | null;
      secondaryProfile: string | null;
      profileCombo: string | null;
      jobFitScore: number | null;
    }>;
    stageHistory: Array<{
      id: string;
      fromStageId: string | null;
      fromStageName: string | null;
      toStageId: string | null;
      toStageName: string | null;
      status: string;
      changedByName: string | null;
      note: string | null;
      isReverted: boolean;
      createdAt: Date;
    }>;
  },
  stagesByTenant: Record<string, Array<{
    id: string;
    tenantId: string;
    name: string;
    order: number;
    color: string;
    isDefault: boolean;
    isHired: boolean;
    isRejected: boolean;
  }>>
): { timeline: TimelineStage[]; statusHistory: StatusHistoryEvent[]; progress: number } {
  const stages = stagesByTenant[app.tenantId] || [];
  const currentStageIndex = stages.findIndex(s => s.id === app.pipelineStageId);

  // Build timeline stages
  const timeline: TimelineStage[] = stages.map((stage, index) => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    order: stage.order,
    isCurrent: stage.id === app.pipelineStageId,
    isCompleted: index < currentStageIndex,
    isPending: index > currentStageIndex,
  }));

  // Calculate progress percentage
  const totalStages = stages.length;
  const completedStages = currentStageIndex >= 0 ? currentStageIndex : 0;
  const progress = totalStages > 0
    ? Math.round((completedStages / totalStages) * 100)
    : 0;

  // Build status history events
  const statusHistory: StatusHistoryEvent[] = [];

  // 1. Initial application event
  statusHistory.push({
    id: `created-${app.id}`,
    type: 'STATUS_CHANGE',
    title: 'Candidatura Registrada',
    description: `Sua candidatura para ${app.job?.title || 'esta vaga'} foi registrada.`,
    date: app.createdAt.toISOString(),
    metadata: {
      status: app.status,
      statusLabel: getStatusLabel(app.status),
    },
  });

  // 2. Stage change events from CandidateStageHistory
  const stageHistory = app.stageHistory || [];
  for (const event of stageHistory) {
    if (event.isReverted) continue;

    const description = event.toStageName
      ? `Etapa alterada de ${event.fromStageName || 'Nenhuma'} para ${event.toStageName}`
      : `Status alterado para ${getStatusLabel(event.status)}`;

    statusHistory.push({
      id: event.id,
      type: 'STAGE_CHANGE',
      title: event.toStageName
        ? `Movido para: ${event.toStageName}`
        : `Status: ${getStatusLabel(event.status)}`,
      description,
      date: event.createdAt.toISOString(),
      metadata: {
        fromStageId: event.fromStageId,
        fromStageName: event.fromStageName,
        toStageId: event.toStageId,
        toStageName: event.toStageName,
        status: event.status,
        statusLabel: getStatusLabel(event.status),
        changedByName: event.changedByName,
        note: event.note,
      },
    });
  }

  // 3. Interview events
  for (const interview of app.interviews) {
    if (interview.status === 'COMPLETED') {
      statusHistory.push({
        id: `interview-completed-${interview.id}`,
        type: 'INTERVIEW',
        title: `Entrevista ${getInterviewTypeLabel(interview.type)} Concluída`,
        description: `A entrevista "${interview.title}" foi concluída${interview.completedAt ? ` em ${new Date(interview.completedAt).toLocaleDateString('pt-BR')}` : ''}.`,
        date: interview.completedAt?.toISOString() || interview.scheduledAt.toISOString(),
        metadata: {
          interviewId: interview.id,
          interviewType: interview.type,
          interviewTypeLabel: getInterviewTypeLabel(interview.type),
          interviewerName: interview.interviewerName,
          rating: interview.rating,
          recommendation: interview.recommendation,
          status: interview.status,
        },
      });
    } else {
      statusHistory.push({
        id: `interview-scheduled-${interview.id}`,
        type: 'INTERVIEW',
        title: `Entrevista ${getInterviewTypeLabel(interview.type)} Agendada`,
        description: `"${interview.title}" agendada para ${new Date(interview.scheduledAt).toLocaleDateString('pt-BR')} às ${new Date(interview.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
        date: interview.scheduledAt.toISOString(),
        metadata: {
          interviewId: interview.id,
          interviewType: interview.type,
          interviewTypeLabel: getInterviewTypeLabel(interview.type),
          scheduledAt: interview.scheduledAt.toISOString(),
          duration: interview.duration,
          interviewerName: interview.interviewerName,
          status: interview.status,
          statusLabel: getInterviewStatusLabel(interview.status),
        },
      });
    }
  }

  // 4. DISC test events
  const discTests = app.discTests || [];
  if (discTests.length > 0) {
    const latestDiscTest = discTests[0];
    if (latestDiscTest.completedAt) {
      statusHistory.push({
        id: `disc-completed-${latestDiscTest.id}`,
        type: 'DISC_TEST',
        title: 'Avaliação DISC Concluída',
        description: latestDiscTest.primaryProfile
          ? `Perfil DISC identificado: ${latestDiscTest.primaryProfile}${latestDiscTest.secondaryProfile ? ` / ${latestDiscTest.secondaryProfile}` : ''}.`
          : 'Sua avaliação DISC foi concluída com sucesso.',
        date: latestDiscTest.completedAt.toISOString(),
        metadata: {
          discTestId: latestDiscTest.id,
          status: latestDiscTest.status,
          statusLabel: getDiscTestStatusLabel(latestDiscTest.status),
          primaryProfile: latestDiscTest.primaryProfile,
          secondaryProfile: latestDiscTest.secondaryProfile,
          profileCombo: latestDiscTest.profileCombo,
          jobFitScore: latestDiscTest.jobFitScore,
        },
      });
    } else if (latestDiscTest.startedAt) {
      statusHistory.push({
        id: `disc-started-${latestDiscTest.id}`,
        type: 'DISC_TEST',
        title: 'Avaliação DISC Iniciada',
        description: 'Você iniciou a avaliação comportamental DISC.',
        date: latestDiscTest.startedAt.toISOString(),
        metadata: {
          discTestId: latestDiscTest.id,
          status: latestDiscTest.status,
          statusLabel: getDiscTestStatusLabel(latestDiscTest.status),
        },
      });
    } else if (latestDiscTest.sentAt) {
      statusHistory.push({
        id: `disc-sent-${latestDiscTest.id}`,
        type: 'DISC_TEST',
        title: 'Avaliação DISC Enviada',
        description: 'Um convite para a avaliação comportamental DISC foi enviado para você.',
        date: latestDiscTest.sentAt.toISOString(),
        metadata: {
          discTestId: latestDiscTest.id,
          status: latestDiscTest.status,
          statusLabel: getDiscTestStatusLabel(latestDiscTest.status),
        },
      });
    }
  }

  // Sort status history by date descending (newest first)
  statusHistory.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  return { timeline, statusHistory, progress };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token é obrigatório' },
        { status: 400 }
      );
    }

    // Find portal access by token
    const portalAccess = await db.candidatePortalAccess.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        candidate: {
          include: {
            job: {
              include: {
                tenant: true,
              },
            },
            pipelineStage: true,
            discTests: {
              where: {
                status: {
                  not: 'EXPIRED',
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!portalAccess) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Update last access time
    await db.candidatePortalAccess.update({
      where: { id: portalAccess.id },
      data: { lastAccessAt: new Date() },
    });

    const candidate = portalAccess.candidate;
    const job = candidate.job;
    const tenant = job?.tenant;

    if (!tenant) {
      return NextResponse.json(
        { error: 'Dados da empresa não encontrados' },
        { status: 404 }
      );
    }

    // Get all applications (candidates) for this email with full data for timeline
    const applications = await db.candidate.findMany({
      where: {
        email: candidate.email,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            type: true,
            workModel: true,
            tenant: {
              select: {
                name: true,
                logo: true,
              },
            },
          },
        },
        pipelineStage: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
          },
        },
        interviews: {
          where: {
            status: {
              in: ['SCHEDULED', 'CONFIRMED'],
            },
            scheduledAt: {
              gte: new Date(),
            },
          },
          orderBy: {
            scheduledAt: 'asc',
          },
          take: 5,
        },
        discTests: {
          where: {
            status: {
              not: 'EXPIRED',
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        // Include ALL non-cancelled interviews and stage history for timeline building
        stageHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch full interview data (non-cancelled) for timeline building per application
    const candidateIds = applications.map(a => a.id);
    const allInterviews = candidateIds.length > 0
      ? await db.interview.findMany({
          where: {
            candidateId: { in: candidateIds },
            status: { not: 'CANCELLED' },
          },
          orderBy: { scheduledAt: 'desc' },
        })
      : [];

    // Fetch full DISC test data (non-expired) for timeline building per application
    const allDiscTests = candidateIds.length > 0
      ? await db.dISCTest.findMany({
          where: {
            candidateId: { in: candidateIds },
            status: { not: 'EXPIRED' },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // Get all non-cancelled interviews for timeline (per application)
    const interviewMap = new Map<string, typeof allInterviews>();
    for (const interview of allInterviews) {
      const existing = interviewMap.get(interview.candidateId) || [];
      existing.push(interview);
      interviewMap.set(interview.candidateId, existing);
    }

    const discTestMap = new Map<string, typeof allDiscTests>();
    for (const test of allDiscTests) {
      const existing = discTestMap.get(test.candidateId) || [];
      existing.push(test);
      discTestMap.set(test.candidateId, existing);
    }

    // Collect all unique tenant IDs from applications
    const tenantIds = [...new Set(applications.map(a => a.tenantId))];

    // Get pipeline stages for all tenants
    const pipelineStages = await db.pipelineStage.findMany({
      where: {
        tenantId: {
          in: tenantIds,
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    // Map pipeline stages by tenant
    const stagesByTenant: Record<string, typeof pipelineStages> = {};
    for (const stage of pipelineStages) {
      if (!stagesByTenant[stage.tenantId]) {
        stagesByTenant[stage.tenantId] = [];
      }
      stagesByTenant[stage.tenantId].push(stage);
    }

    // Build formatted applications with timeline, statusHistory, and progress
    const formattedApplications = applications.map((app) => {
      const appInterviews = interviewMap.get(app.id) || [];
      const appDiscTests = discTestMap.get(app.id) || [];

      const { timeline, statusHistory, progress } = buildTimelineAndHistory(
        {
          id: app.id,
          pipelineStageId: app.pipelineStageId,
          tenantId: app.tenantId,
          status: app.status,
          createdAt: app.createdAt,
          job: app.job,
          interviews: appInterviews.map(i => ({
            id: i.id,
            title: i.title,
            type: i.type,
            status: i.status,
            scheduledAt: i.scheduledAt,
            completedAt: i.completedAt,
            interviewerName: i.interviewerName,
            duration: i.duration,
            rating: i.rating,
            recommendation: i.recommendation,
          })),
          discTests: appDiscTests.map(d => ({
            id: d.id,
            status: d.status,
            sentAt: d.sentAt,
            startedAt: d.startedAt,
            completedAt: d.completedAt,
            primaryProfile: d.primaryProfile,
            secondaryProfile: d.secondaryProfile,
            profileCombo: d.profileCombo,
            jobFitScore: d.jobFitScore,
          })),
          stageHistory: app.stageHistory,
        },
        stagesByTenant
      );

      return {
        id: app.id,
        job: app.job,
        status: app.status,
        statusLabel: getStatusLabel(app.status),
        pipelineStage: app.pipelineStage,
        matchScore: app.matchScore,
        appliedAt: app.createdAt,
        hasInterviews: app.interviews.length > 0,
        hasDiscTest: app.discTests.length > 0,
        // NEW: rich timeline data
        timeline,
        statusHistory,
        progress,
      };
    });

    // Get upcoming interviews
    const upcomingInterviews = await db.interview.findMany({
      where: {
        candidateId: candidate.id,
        status: {
          in: ['SCHEDULED', 'CONFIRMED'],
        },
        scheduledAt: {
          gte: new Date(),
        },
      },
      include: {
        job: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    // Get messages/conversations
    const conversations = await db.conversation.findMany({
      where: {
        candidateId: candidate.id,
        status: {
          not: 'ARCHIVED',
        },
      },
      include: {
        messages: {
          orderBy: {
            sentAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        linkedin: candidate.linkedin,
        github: candidate.github,
        portfolio: candidate.portfolio,
        resumeUrl: candidate.resumeUrl,
        city: candidate.city,
        state: candidate.state,
        country: candidate.country,
        photo: candidate.photo,
        status: candidate.status,
        statusLabel: getStatusLabel(candidate.status),
        createdAt: candidate.createdAt,
      },
      currentApplication: {
        id: candidate.id,
        job: {
          id: job?.id,
          title: job?.title,
          department: job?.department,
          location: job?.location,
          type: job?.type,
          workModel: job?.workModel,
        },
        status: candidate.status,
        statusLabel: getStatusLabel(candidate.status),
        pipelineStage: candidate.pipelineStage,
        matchScore: candidate.matchScore,
        appliedAt: candidate.createdAt,
      },
      applications: formattedApplications,
      upcomingInterviews: upcomingInterviews.map((interview) => ({
        id: interview.id,
        title: interview.title,
        type: interview.type,
        typeLabel: getInterviewTypeLabel(interview.type),
        scheduledAt: interview.scheduledAt,
        duration: interview.duration,
        timezone: interview.timezone,
        meetingUrl: interview.meetingUrl,
        meetingProvider: interview.meetingProvider,
        location: interview.location,
        status: interview.status,
        statusLabel: getInterviewStatusLabel(interview.status),
        interviewerName: interview.interviewerName,
        jobTitle: interview.job.title,
      })),
      discTest: candidate.discTests[0] ? {
        id: candidate.discTests[0].id,
        status: candidate.discTests[0].status,
        statusLabel: getDiscTestStatusLabel(candidate.discTests[0].status),
        completedAt: candidate.discTests[0].completedAt,
        primaryProfile: candidate.discTests[0].primaryProfile,
        secondaryProfile: candidate.discTests[0].secondaryProfile,
      } : null,
      conversations: conversations.map((conv) => ({
        id: conv.id,
        channel: conv.channel,
        status: conv.status,
        lastMessageAt: conv.lastMessageAt,
        lastMessagePreview: conv.lastMessagePreview,
        unreadCount: conv.unreadByCandidate ? conv.unreadCount : 0,
        messages: conv.messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          senderType: msg.senderType,
          senderName: msg.senderName,
          sentAt: msg.sentAt,
          isAiGenerated: msg.isAiGenerated,
        })),
      })),
      tenant: {
        id: tenant.id,
        name: tenant.name,
        logo: tenant.logo,
      },
    });
  } catch (error) {
    console.error('Portal verify error:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar token. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}
