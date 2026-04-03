/**
 * Portal Interviews API
 * GET: Get scheduled interviews
 * POST: Confirm or reschedule interview
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Retrieve candidate's interviews
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

    // Get all candidate IDs for this email
    const candidates = await db.candidate.findMany({
      where: { email },
      select: { id: true },
    });

    const candidateIds = candidates.map(c => c.id);

    // Get all interviews
    const interviews = await db.interview.findMany({
      where: {
        candidateId: {
          in: candidateIds,
        },
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
        candidate: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    });

    // Group by status
    const upcomingInterviews = interviews.filter(
      (i) => ['SCHEDULED', 'CONFIRMED'].includes(i.status) && new Date(i.scheduledAt) >= new Date()
    );

    const pastInterviews = interviews.filter(
      (i) => ['COMPLETED', 'NO_SHOW'].includes(i.status) || new Date(i.scheduledAt) < new Date()
    );

    const cancelledInterviews = interviews.filter(
      (i) => i.status === 'CANCELLED'
    );

    return NextResponse.json({
      success: true,
      interviews: {
        upcoming: upcomingInterviews.map(formatInterview),
        past: pastInterviews.map(formatInterview),
        cancelled: cancelledInterviews.map(formatInterview),
      },
      total: interviews.length,
    });
  } catch (error) {
    console.error('Portal interviews error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve interviews' },
      { status: 500 }
    );
  }
}

// POST - Confirm or request reschedule
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { interviewId, action, rescheduleReason, proposedTimes } = body;

    if (!interviewId || !action) {
      return NextResponse.json(
        { error: 'Interview ID and action are required' },
        { status: 400 }
      );
    }

    // Find the interview
    const interview = await db.interview.findFirst({
      where: {
        id: interviewId,
        candidateId: portalAccess.candidateId,
      },
      include: {
        job: {
          include: {
            tenant: true,
          },
        },
        candidate: true,
      },
    });

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    let updatedInterview;

    switch (action) {
      case 'confirm':
        updatedInterview = await db.interview.update({
          where: { id: interviewId },
          data: {
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            updatedAt: new Date(),
          },
        });
        break;

      case 'reschedule':
        // Create a note about reschedule request
        await db.note.create({
          data: {
            candidateId: portalAccess.candidateId,
            content: `Candidate requested reschedule. Reason: ${rescheduleReason || 'Not specified'}. Proposed times: ${proposedTimes ? JSON.stringify(proposedTimes) : 'None provided'}`,
            type: 'INTERVIEW',
            isPrivate: false,
          },
        });

        updatedInterview = await db.interview.update({
          where: { id: interviewId },
          data: {
            status: 'RESCHEDULED',
            updatedAt: new Date(),
          },
        });
        break;

      case 'cancel':
        await db.note.create({
          data: {
            candidateId: portalAccess.candidateId,
            content: `Candidate cancelled interview. Reason: ${rescheduleReason || 'Not specified'}`,
            type: 'INTERVIEW',
            isPrivate: false,
          },
        });

        updatedInterview = await db.interview.update({
          where: { id: interviewId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: rescheduleReason || 'Cancelled by candidate',
            updatedAt: new Date(),
          },
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      interview: formatInterview(updatedInterview),
      message: `Interview ${action}ed successfully`,
    });
  } catch (error) {
    console.error('Portal interview action error:', error);
    return NextResponse.json(
      { error: 'Failed to process interview action' },
      { status: 500 }
    );
  }
}

function formatInterview(interview: any) {
  return {
    id: interview.id,
    title: interview.title,
    type: interview.type,
    typeLabel: getInterviewTypeLabel(interview.type),
    description: interview.description,
    scheduledAt: interview.scheduledAt,
    duration: interview.duration,
    durationLabel: `${interview.duration} minutes`,
    timezone: interview.timezone,
    location: interview.location,
    meetingUrl: interview.meetingUrl,
    meetingProvider: interview.meetingProvider,
    status: interview.status,
    statusLabel: getStatusLabel(interview.status),
    confirmedAt: interview.confirmedAt,
    completedAt: interview.completedAt,
    cancelledAt: interview.cancelledAt,
    cancelReason: interview.cancelReason,
    interviewerName: interview.interviewerName,
    rating: interview.rating,
    job: interview.job ? {
      id: interview.job.id,
      title: interview.job.title,
      department: interview.job.department,
    } : null,
  };
}

function getInterviewTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SCREENING: 'Screening',
    TECHNICAL: 'Technical',
    BEHAVIORAL: 'Behavioral',
    CULTURAL: 'Cultural Fit',
    FINAL: 'Final',
    PHONE: 'Phone Call',
    VIDEO: 'Video Call',
    ONSITE: 'On-site',
  };
  return labels[type] || type;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    CONFIRMED: 'Confirmed',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    NO_SHOW: 'No Show',
    RESCHEDULED: 'Reschedule Requested',
  };
  return labels[status] || status;
}
