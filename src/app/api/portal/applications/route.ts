/**
 * Portal Applications API
 * GET: Get candidate's applications with rich timeline and stage history
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

// pt-BR interview status labels
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

// pt-BR DISC test status labels
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

// pt-BR interview type labels
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
  date: Date | string;
  metadata: Record<string, unknown>;
}

// GET - Retrieve candidate's applications with rich timeline
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-portal-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token é obrigatório' },
        { status: 401 }
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
        candidate: true,
      },
    });

    if (!portalAccess) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    const email = portalAccess.candidate.email;

    // Get all applications for this email
    const applications = await db.candidate.findMany({
      where: {
        email,
      },
      include: {
        job: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
          },
        },
        pipelineStage: true,
        interviews: {
          where: {
            status: {
              not: 'CANCELLED',
            },
          },
          orderBy: {
            scheduledAt: 'desc',
          },
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
        },
        notes: {
          where: {
            type: 'GENERAL',
            isPrivate: false,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
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

    // Collect all unique tenant IDs
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

    // Format applications with rich timeline
    const formattedApplications = await Promise.all(
      applications.map(async (app) => {
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

        // Build status history events from multiple sources
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

        // Format interviews
        const formattedInterviews = app.interviews.map((interview) => ({
          id: interview.id,
          title: interview.title,
          type: interview.type,
          typeLabel: getInterviewTypeLabel(interview.type),
          scheduledAt: interview.scheduledAt,
          duration: interview.duration,
          status: interview.status,
          statusLabel: getInterviewStatusLabel(interview.status),
          completedAt: interview.completedAt,
          interviewerName: interview.interviewerName,
          location: interview.location,
          meetingUrl: interview.meetingUrl,
          meetingProvider: interview.meetingProvider,
        }));

        // Format DISC test (latest only)
        const formattedDiscTest = discTests.length > 0 ? {
          id: discTests[0].id,
          status: discTests[0].status,
          statusLabel: getDiscTestStatusLabel(discTests[0].status),
          sentAt: discTests[0].sentAt,
          startedAt: discTests[0].startedAt,
          completedAt: discTests[0].completedAt,
          primaryProfile: discTests[0].primaryProfile,
          secondaryProfile: discTests[0].secondaryProfile,
          profileCombo: discTests[0].profileCombo,
          jobFitScore: discTests[0].jobFitScore,
        } : null;

        // Format notes
        const formattedNotes = app.notes.map((note) => ({
          id: note.id,
          content: note.content,
          createdAt: note.createdAt,
        }));

        return {
          id: app.id,
          status: app.status,
          statusLabel: getStatusLabel(app.status),
          appliedAt: app.createdAt,
          updatedAt: app.updatedAt,
          matchScore: app.matchScore,
          rating: app.rating,
          feedback: app.feedback,
          progress,
          job: {
            id: app.job?.id,
            title: app.job?.title,
            department: app.job?.department,
            location: app.job?.location,
            type: app.job?.type,
            workModel: app.job?.workModel,
            salaryMin: app.job?.salaryMin,
            salaryMax: app.job?.salaryMax,
            currency: app.job?.currency,
            company: app.job?.tenant,
          },
          currentStage: app.pipelineStage ? {
            id: app.pipelineStage.id,
            name: app.pipelineStage.name,
            color: app.pipelineStage.color,
          } : null,
          timeline,
          statusHistory,
          interviews: formattedInterviews,
          discTest: formattedDiscTest,
          notes: formattedNotes,
        };
      })
    );

    return NextResponse.json({
      success: true,
      applications: formattedApplications,
      total: formattedApplications.length,
    });
  } catch (error) {
    console.error('Portal applications error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar candidaturas. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}
