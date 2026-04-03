/**
 * Client Summary API - Zion Recruit
 * Generates a comprehensive recruitment summary for a client company.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { EVENT_LABELS } from '@/lib/tracking';
import { CandidateStatus, InterviewStatus, DISCStatus, JobStatus } from '@prisma/client';

// GET /api/clients/[id]/summary - Generate recruitment summary
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: clientId } = await params;

    // Verify client belongs to tenant
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        name: true,
        logo: true,
        industry: true,
        createdAt: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    // ==========================================
    // Fetch all data in parallel
    // ==========================================

    const [
      jobs,
      candidates,
      interviews,
      discTests,
      recentEvents,
      jobStatusCounts,
      candidateStatusCounts,
      interviewStatusCounts,
      discStatusCounts,
    ] = await Promise.all([
      // All jobs for this client
      db.job.findMany({
        where: {
          clientId,
          tenantId: session.user.tenantId,
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // All candidates for client's jobs
      db.candidate.findMany({
        where: {
          job: { clientId, tenantId: session.user.tenantId },
          tenantId: session.user.tenantId,
        },
        select: {
          id: true,
          name: true,
          status: true,
          jobId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // All interviews for client's jobs
      db.interview.findMany({
        where: {
          job: { clientId, tenantId: session.user.tenantId },
          tenantId: session.user.tenantId,
        },
        select: {
          id: true,
          status: true,
          scheduledAt: true,
          title: true,
          candidate: { select: { name: true } },
          job: { select: { title: true } },
        },
        orderBy: { scheduledAt: 'desc' },
      }),

      // All DISC tests for client's job candidates
      db.dISCTest.findMany({
        where: {
          candidate: {
            job: { clientId, tenantId: session.user.tenantId },
            tenantId: session.user.tenantId,
          },
        },
        select: {
          id: true,
          status: true,
          candidate: { select: { name: true } },
          completedAt: true,
        },
      }),

      // Recent 10 events
      db.trackingEvent.findMany({
        where: { clientId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          job: { select: { title: true } },
          candidate: { select: { name: true } },
        },
      }),

      // Job status counts
      db.job.groupBy({
        by: ['status'],
        where: {
          clientId,
          tenantId: session.user.tenantId,
        },
        _count: { status: true },
      }),

      // Candidate status counts
      db.candidate.groupBy({
        by: ['status'],
        where: {
          job: { clientId, tenantId: session.user.tenantId },
          tenantId: session.user.tenantId,
        },
        _count: { status: true },
      }),

      // Interview status counts
      db.interview.groupBy({
        by: ['status'],
        where: {
          job: { clientId, tenantId: session.user.tenantId },
          tenantId: session.user.tenantId,
        },
        _count: { status: true },
      }),

      // DISC status counts
      db.dISCTest.groupBy({
        by: ['status'],
        where: {
          candidate: {
            job: { clientId, tenantId: session.user.tenantId },
            tenantId: session.user.tenantId,
          },
        },
        _count: { status: true },
      }),
    ]);

    // ==========================================
    // Build summary maps
    // ==========================================

    const jobStatusMap: Record<string, number> = {};
    for (const j of jobStatusCounts) jobStatusMap[j.status] = j._count.status;

    const candidateStatusMap: Record<string, number> = {};
    for (const c of candidateStatusCounts) candidateStatusMap[c.status] = c._count.status;

    const interviewStatusMap: Record<string, number> = {};
    for (const i of interviewStatusCounts) interviewStatusMap[i.status] = i._count.status;

    const discStatusMap: Record<string, number> = {};
    for (const d of discStatusCounts) discStatusMap[d.status] = d._count.status;

    // ==========================================
    // Compute stats
    // ==========================================

    const totalJobs = jobs.length;
    const activeJobs = jobStatusMap[JobStatus.PUBLISHED] || 0;
    const closedJobs = jobStatusMap[JobStatus.CLOSED] || 0;
    const pausedJobs = jobStatusMap[JobStatus.PAUSED] || 0;
    const draftJobs = jobStatusMap[JobStatus.DRAFT] || 0;

    const totalCandidates = candidates.length;
    const hiredCandidates = candidateStatusMap[CandidateStatus.HIRED] || 0;
    const rejectedCandidates = candidateStatusMap[CandidateStatus.REJECTED] || 0;
    const interviewingCandidates = candidateStatusMap[CandidateStatus.INTERVIEWING] || 0;
    const screeningCandidates = candidateStatusMap[CandidateStatus.SCREENING] || 0;
    const offeredCandidates = candidateStatusMap[CandidateStatus.OFFERED] || 0;
    const withdrawnCandidates = candidateStatusMap[CandidateStatus.WITHDRAWN] || 0;

    const totalInterviews = interviews.length;
    const scheduledInterviews = interviewStatusMap[InterviewStatus.SCHEDULED] || 0;
    const completedInterviews = interviewStatusMap[InterviewStatus.COMPLETED] || 0;
    const cancelledInterviews = interviewStatusMap[InterviewStatus.CANCELLED] || 0;
    const noShowInterviews = interviewStatusMap[InterviewStatus.NO_SHOW] || 0;

    // Upcoming interviews (scheduled in the future)
    const now = new Date();
    const upcomingInterviews = interviews.filter(
      (i) => i.scheduledAt > now && (i.status === InterviewStatus.SCHEDULED || i.status === InterviewStatus.CONFIRMED)
    );

    const totalDiscTests = discTests.length;
    const completedDiscTests = discStatusMap[DISCStatus.COMPLETED] || 0;
    const pendingDiscTests = discStatusMap[DISCStatus.PENDING] || 0;
    const sentDiscTests = discStatusMap[DISCStatus.SENT] || 0;
    const startedDiscTests = discStatusMap[DISCStatus.STARTED] || 0;

    // Enrich recent events with labels
    const enrichedEvents = recentEvents.map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      label: EVENT_LABELS[event.type] || event.type,
      description: event.description,
      createdAt: event.createdAt,
      jobTitle: event.job?.title || null,
      candidateName: event.candidate?.name || null,
    }));

    // ==========================================
    // Build response
    // ==========================================

    const summary = {
      client: {
        id: client.id,
        name: client.name,
        logo: client.logo,
        industry: client.industry,
        clientSince: client.createdAt,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        closed: closedJobs,
        paused: pausedJobs,
        draft: draftJobs,
        list: jobs.slice(0, 10),
      },
      candidates: {
        total: totalCandidates,
        hired: hiredCandidates,
        rejected: rejectedCandidates,
        interviewing: interviewingCandidates,
        screening: screeningCandidates,
        offered: offeredCandidates,
        withdrawn: withdrawnCandidates,
        byStatus: candidateStatusMap,
      },
      interviews: {
        total: totalInterviews,
        scheduled: scheduledInterviews,
        completed: completedInterviews,
        cancelled: cancelledInterviews,
        noShow: noShowInterviews,
        upcoming: upcomingInterviews.slice(0, 10).map((i) => ({
          id: i.id,
          title: i.title,
          scheduledAt: i.scheduledAt,
          candidateName: i.candidate?.name || null,
          jobTitle: i.job?.title || null,
          status: i.status,
        })),
      },
      discTests: {
        total: totalDiscTests,
        completed: completedDiscTests,
        pending: pendingDiscTests,
        sent: sentDiscTests,
        started: startedDiscTests,
      },
      recentEvents: enrichedEvents,
    };

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Erro ao gerar resumo:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar resumo do cliente' },
      { status: 500 }
    );
  }
}
