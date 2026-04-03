/**
 * Portal Applications API
 * GET: Get candidate's applications with status timeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Retrieve candidate's applications
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-portal-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
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
        { error: 'Invalid or expired token' },
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get pipeline stages for timeline
    const tenantIds = [...new Set(applications.map(a => a.tenantId))];
    
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

    // Format applications with timeline
    const formattedApplications = applications.map((app) => {
      const stages = stagesByTenant[app.tenantId] || [];
      const currentStageIndex = stages.findIndex(s => s.id === app.pipelineStageId);
      
      // Build timeline
      const timeline = stages.map((stage, index) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        order: stage.order,
        isCurrent: stage.id === app.pipelineStageId,
        isCompleted: index < currentStageIndex,
        isPending: index > currentStageIndex,
      }));

      // Get status history (simplified - in real app, track status changes)
      const statusHistory = [
        {
          status: 'APPLIED',
          date: app.createdAt,
          label: 'Candidatura enviada',
        },
      ];

      if (app.status !== 'APPLIED' && app.status !== 'SOURCED') {
        statusHistory.push({
          status: app.status,
          date: app.updatedAt,
          label: getStatusLabel(app.status),
        });
      }

      return {
        id: app.id,
        status: app.status,
        statusLabel: getStatusLabel(app.status),
        appliedAt: app.createdAt,
        updatedAt: app.updatedAt,
        matchScore: app.matchScore,
        rating: app.rating,
        feedback: app.feedback,
        job: {
          id: app.job.id,
          title: app.job.title,
          department: app.job.department,
          location: app.job.location,
          type: app.job.type,
          workModel: app.job.workModel,
          salaryMin: app.job.salaryMin,
          salaryMax: app.job.salaryMax,
          currency: app.job.currency,
          company: app.job.tenant,
        },
        currentStage: app.pipelineStage ? {
          id: app.pipelineStage.id,
          name: app.pipelineStage.name,
          color: app.pipelineStage.color,
        } : null,
        timeline,
        statusHistory,
        interviews: app.interviews.map((interview) => ({
          id: interview.id,
          title: interview.title,
          type: interview.type,
          scheduledAt: interview.scheduledAt,
          duration: interview.duration,
          status: interview.status,
          completedAt: interview.completedAt,
        })),
        discTest: app.discTests[0] ? {
          id: app.discTests[0].id,
          status: app.discTests[0].status,
          completedAt: app.discTests[0].completedAt,
          primaryProfile: app.discTests[0].primaryProfile,
        } : null,
        notes: app.notes.map((note) => ({
          id: note.id,
          content: note.content,
          createdAt: note.createdAt,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      applications: formattedApplications,
      total: formattedApplications.length,
    });
  } catch (error) {
    console.error('Portal applications error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve applications' },
      { status: 500 }
    );
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SOURCED: 'Sourced',
    APPLIED: 'Applied',
    SCREENING: 'In Screening',
    INTERVIEWING: 'Interviewing',
    DISC_TEST: 'Assessment',
    OFFERED: 'Offer Extended',
    HIRED: 'Hired',
    REJECTED: 'Not Selected',
    WITHDRAWN: 'Withdrawn',
    NO_RESPONSE: 'No Response',
  };
  return labels[status] || status;
}
