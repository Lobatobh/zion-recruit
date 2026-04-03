/**
 * Portal Token Verification API
 * Verifies token and returns candidate data
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
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
        { error: 'Invalid or expired token' },
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
    const tenant = job.tenant;

    // Get all applications (candidates) for this email
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
      },
      orderBy: {
        createdAt: 'desc',
      },
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
        createdAt: candidate.createdAt,
      },
      currentApplication: {
        id: candidate.id,
        job: {
          id: job.id,
          title: job.title,
          department: job.department,
          location: job.location,
          type: job.type,
          workModel: job.workModel,
        },
        status: candidate.status,
        pipelineStage: candidate.pipelineStage,
        matchScore: candidate.matchScore,
        appliedAt: candidate.createdAt,
      },
      applications: applications.map((app) => ({
        id: app.id,
        job: app.job,
        status: app.status,
        pipelineStage: app.pipelineStage,
        matchScore: app.matchScore,
        appliedAt: app.createdAt,
        hasInterviews: app.interviews.length > 0,
        hasDiscTest: app.discTests.length > 0,
      })),
      upcomingInterviews: upcomingInterviews.map((interview) => ({
        id: interview.id,
        title: interview.title,
        type: interview.type,
        scheduledAt: interview.scheduledAt,
        duration: interview.duration,
        timezone: interview.timezone,
        meetingUrl: interview.meetingUrl,
        meetingProvider: interview.meetingProvider,
        location: interview.location,
        status: interview.status,
        interviewerName: interview.interviewerName,
        jobTitle: interview.job.title,
      })),
      discTest: candidate.discTests[0] ? {
        id: candidate.discTests[0].id,
        status: candidate.discTests[0].status,
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
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}
