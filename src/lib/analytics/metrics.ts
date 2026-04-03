/**
 * Analytics Metrics Library
 * Core metric calculation functions for Zion Recruit Analytics Dashboard
 */

import { db } from '@/lib/db';
import { CandidateStatus, TaskStatus, InterviewStatus } from '@prisma/client';

// Types for metrics
export interface TimeToHireMetrics {
  averageDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
  trend: number; // Percentage change from previous period
  byDepartment: { department: string; averageDays: number; count: number }[];
  byMonth: { month: string; averageDays: number; hires: number }[];
}

export interface PipelineConversionMetrics {
  stageName: string;
  stageOrder: number;
  candidatesCount: number;
  conversionRate: number;
  avgTimeInStage: number; // in days
  dropOffRate: number;
}

export interface SourceEffectivenessMetrics {
  source: string;
  applications: number;
  hires: number;
  conversionRate: number;
  avgTimeToHire: number;
  costPerHire: number;
}

export interface CostPerHireMetrics {
  totalCost: number;
  aiTokenCost: number;
  jobBoardCost: number;
  costPerHire: number;
  byMonth: { month: string; cost: number; hires: number }[];
}

export interface CandidatesPerJobMetrics {
  average: number;
  median: number;
  byJob: { jobId: string; jobTitle: string; candidates: number; hires: number }[];
  distribution: { range: string; count: number }[];
}

export interface InterviewSuccessMetrics {
  totalInterviews: number;
  completedRate: number;
  noShowRate: number;
  successRate: number; // Interviews leading to next stage
  avgRating: number;
  byType: { type: string; count: number; successRate: number; avgRating: number }[];
}

export interface DISCProfileDistribution {
  profile: string;
  count: number;
  percentage: number;
  avgJobFitScore: number;
}

export interface AgentPerformanceMetrics {
  agentId: string;
  agentType: string;
  agentName: string;
  totalRuns: number;
  successRate: number;
  avgDuration: number; // in ms
  totalTokensUsed: number;
  lastRunAt: Date | null;
  errorRate: number;
}

// Date range helper
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function getDefaultDateRange(days: number = 30): DateRange {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return { startDate, endDate };
}

/**
 * Calculate time-to-hire metrics
 * Time from candidate creation to being marked as HIRED
 */
export async function calculateTimeToHire(
  tenantId: string,
  dateRange?: DateRange
): Promise<TimeToHireMetrics> {
  const { startDate, endDate } = dateRange || getDefaultDateRange(90);

  // Get hired candidates with their creation date
  const hiredCandidates = await db.candidate.findMany({
    where: {
      tenantId,
      status: CandidateStatus.HIRED,
      updatedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      job: {
        select: { department: true },
      },
    },
  });

  // Calculate time to hire for each candidate
  const timesToHire = hiredCandidates.map((candidate) => {
    const created = new Date(candidate.createdAt);
    const hired = new Date(candidate.updatedAt);
    return {
      days: Math.floor((hired.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)),
      department: candidate.job.department || 'Unknown',
      hiredMonth: hired.toISOString().slice(0, 7),
    };
  });

  // Calculate statistics
  const sortedTimes = timesToHire.map((t) => t.days).sort((a, b) => a - b);
  const averageDays = sortedTimes.length > 0
    ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length
    : 0;
  const medianDays = sortedTimes.length > 0
    ? sortedTimes[Math.floor(sortedTimes.length / 2)]
    : 0;

  // Group by department
  const deptMap = new Map<string, { total: number; count: number }>();
  timesToHire.forEach((t) => {
    const existing = deptMap.get(t.department) || { total: 0, count: 0 };
    deptMap.set(t.department, {
      total: existing.total + t.days,
      count: existing.count + 1,
    });
  });

  const byDepartment = Array.from(deptMap.entries()).map(([department, data]) => ({
    department,
    averageDays: data.count > 0 ? Math.round(data.total / data.count) : 0,
    count: data.count,
  }));

  // Group by month
  const monthMap = new Map<string, { total: number; count: number }>();
  timesToHire.forEach((t) => {
    const existing = monthMap.get(t.hiredMonth) || { total: 0, count: 0 };
    monthMap.set(t.hiredMonth, {
      total: existing.total + t.days,
      count: existing.count + 1,
    });
  });

  const byMonth = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      averageDays: data.count > 0 ? Math.round(data.total / data.count) : 0,
      hires: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Calculate trend (compare with previous period)
  const previousPeriodStart = new Date(startDate);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const previousHired = await db.candidate.count({
    where: {
      tenantId,
      status: CandidateStatus.HIRED,
      updatedAt: {
        gte: previousPeriodStart,
        lt: startDate,
      },
    },
  });

  const currentHired = hiredCandidates.length;
  const trend = previousHired > 0
    ? ((currentHired - previousHired) / previousHired) * 100
    : 0;

  return {
    averageDays: Math.round(averageDays * 10) / 10,
    medianDays,
    minDays: sortedTimes[0] || 0,
    maxDays: sortedTimes[sortedTimes.length - 1] || 0,
    trend: Math.round(trend * 10) / 10,
    byDepartment,
    byMonth,
  };
}

/**
 * Calculate pipeline conversion rates
 */
export async function calculatePipelineConversion(
  tenantId: string,
  dateRange?: DateRange
): Promise<PipelineConversionMetrics[]> {
  const { startDate, endDate } = dateRange || getDefaultDateRange(30);

  // Get pipeline stages for tenant
  const stages = await db.pipelineStage.findMany({
    where: { tenantId },
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { candidates: true },
      },
    },
  });

  // Get candidates with their current stage
  const candidates = await db.candidate.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      pipelineStageId: true,
      createdAt: true,
      updatedAt: true,
      status: true,
    },
  });

  // Calculate metrics for each stage
  const metrics: PipelineConversionMetrics[] = stages.map((stage, index) => {
    const candidatesInStage = candidates.filter(
      (c) => c.pipelineStageId === stage.id
    );
    
    const candidatesPassedStage = candidates.filter((c) => {
      const currentStage = stages.find((s) => s.id === c.pipelineStageId);
      return currentStage && currentStage.order > stage.order;
    });

    const conversionRate = candidatesInStage.length > 0
      ? (candidatesPassedStage.length / candidatesInStage.length) * 100
      : 0;

    // Calculate average time in stage (simplified - would need stage history for accurate calculation)
    const avgTimeInStage = 2; // Placeholder - would need stage transition tracking

    return {
      stageName: stage.name,
      stageOrder: stage.order,
      candidatesCount: stage._count.candidates,
      conversionRate: Math.round(conversionRate * 10) / 10,
      avgTimeInStage,
      dropOffRate: Math.round((100 - conversionRate) * 10) / 10,
    };
  });

  return metrics;
}

/**
 * Calculate source effectiveness metrics
 */
export async function calculateSourceEffectiveness(
  tenantId: string,
  dateRange?: DateRange
): Promise<SourceEffectivenessMetrics[]> {
  const { startDate, endDate } = dateRange || getDefaultDateRange(90);

  // Get candidates grouped by source
  const candidates = await db.candidate.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      source: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Group by source
  const sourceMap = new Map<string, {
    applications: number;
    hires: number;
    totalDaysToHire: number;
  }>();

  candidates.forEach((candidate) => {
    const source = candidate.source || 'Unknown';
    const existing = sourceMap.get(source) || {
      applications: 0,
      hires: 0,
      totalDaysToHire: 0,
    };

    existing.applications++;
    if (candidate.status === CandidateStatus.HIRED) {
      existing.hires++;
      const daysToHire = Math.floor(
        (new Date(candidate.updatedAt).getTime() - new Date(candidate.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
      );
      existing.totalDaysToHire += daysToHire;
    }

    sourceMap.set(source, existing);
  });

  // Calculate metrics for each source
  const metrics: SourceEffectivenessMetrics[] = Array.from(sourceMap.entries()).map(
    ([source, data]) => ({
      source,
      applications: data.applications,
      hires: data.hires,
      conversionRate:
        data.applications > 0
          ? Math.round((data.hires / data.applications) * 1000) / 10
          : 0,
      avgTimeToHire:
        data.hires > 0
          ? Math.round(data.totalDaysToHire / data.hires)
          : 0,
      costPerHire: 0, // Would need cost tracking data
    })
  );

  // Sort by applications descending
  return metrics.sort((a, b) => b.applications - a.applications);
}

/**
 * Calculate cost per hire metrics
 */
export async function calculateCostPerHire(
  tenantId: string,
  dateRange?: DateRange
): Promise<CostPerHireMetrics> {
  const { startDate, endDate } = dateRange || getDefaultDateRange(30);

  // Get API usage costs
  const usageLogs = await db.apiUsageLog.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      costCents: true,
      createdAt: true,
    },
  });

  const aiTokenCost = usageLogs.reduce((sum, log) => sum + log.costCents, 0) / 100;

  // Get number of hires
  const hires = await db.candidate.count({
    where: {
      tenantId,
      status: CandidateStatus.HIRED,
      updatedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Placeholder for job board costs (would need integration data)
  const jobBoardCost = 0;

  const totalCost = aiTokenCost + jobBoardCost;
  const costPerHire = hires > 0 ? totalCost / hires : 0;

  // Group by month
  const monthMap = new Map<string, { cost: number; hires: number }>();
  
  usageLogs.forEach((log) => {
    const month = log.createdAt.toISOString().slice(0, 7);
    const existing = monthMap.get(month) || { cost: 0, hires: 0 };
    existing.cost += log.costCents / 100;
    monthMap.set(month, existing);
  });

  // Add hires count per month
  const hiresByMonth = await db.candidate.groupBy({
    by: ['updatedAt'],
    where: {
      tenantId,
      status: CandidateStatus.HIRED,
      updatedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: true,
  });

  const byMonth = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      cost: Math.round(data.cost * 100) / 100,
      hires: data.hires,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    aiTokenCost: Math.round(aiTokenCost * 100) / 100,
    jobBoardCost: Math.round(jobBoardCost * 100) / 100,
    costPerHire: Math.round(costPerHire * 100) / 100,
    byMonth,
  };
}

/**
 * Calculate candidates per job metrics
 */
export async function calculateCandidatesPerJob(
  tenantId: string,
  dateRange?: DateRange
): Promise<CandidatesPerJobMetrics> {
  const { startDate, endDate } = dateRange || getDefaultDateRange(30);

  // Get jobs with candidate counts
  const jobs = await db.job.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      title: true,
      _count: {
        select: { candidates: true },
      },
      candidates: {
        where: { status: CandidateStatus.HIRED },
        select: { id: true },
      },
    },
  });

  const candidateCounts = jobs.map((job) => job._count.candidates);
  
  const average =
    candidateCounts.length > 0
      ? candidateCounts.reduce((a, b) => a + b, 0) / candidateCounts.length
      : 0;

  const sortedCounts = [...candidateCounts].sort((a, b) => a - b);
  const median =
    sortedCounts.length > 0
      ? sortedCounts[Math.floor(sortedCounts.length / 2)]
      : 0;

  const byJob = jobs.map((job) => ({
    jobId: job.id,
    jobTitle: job.title,
    candidates: job._count.candidates,
    hires: job.candidates.length,
  }));

  // Create distribution ranges
  const ranges = [
    { min: 0, max: 5, label: '0-5' },
    { min: 6, max: 10, label: '6-10' },
    { min: 11, max: 25, label: '11-25' },
    { min: 26, max: 50, label: '26-50' },
    { min: 51, max: Infinity, label: '51+' },
  ];

  const distribution = ranges.map((range) => ({
    range: range.label,
    count: candidateCounts.filter((c) => c >= range.min && c <= range.max).length,
  }));

  return {
    average: Math.round(average * 10) / 10,
    median,
    byJob: byJob.sort((a, b) => b.candidates - a.candidates),
    distribution,
  };
}

/**
 * Calculate interview success metrics
 */
export async function calculateInterviewSuccess(
  tenantId: string,
  dateRange?: DateRange
): Promise<InterviewSuccessMetrics> {
  const { startDate, endDate } = dateRange || getDefaultDateRange(30);

  // Get interviews
  const interviews = await db.interview.findMany({
    where: {
      tenantId,
      scheduledAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      type: true,
      status: true,
      rating: true,
      recommendation: true,
    },
  });

  const totalInterviews = interviews.length;
  const completedInterviews = interviews.filter(
    (i) => i.status === InterviewStatus.COMPLETED
  );
  const noShowInterviews = interviews.filter(
    (i) => i.status === InterviewStatus.NO_SHOW
  );
  const successfulInterviews = completedInterviews.filter(
    (i) => i.recommendation === 'hire'
  );

  const ratingsWithValue = completedInterviews
    .map((i) => i.rating)
    .filter((r): r is number => r !== null);

  const avgRating =
    ratingsWithValue.length > 0
      ? ratingsWithValue.reduce((a, b) => a + b, 0) / ratingsWithValue.length
      : 0;

  // Group by type
  const typeMap = new Map<string, {
    count: number;
    successful: number;
    totalRating: number;
    ratingCount: number;
  }>();

  interviews.forEach((interview) => {
    const type = interview.type;
    const existing = typeMap.get(type) || {
      count: 0,
      successful: 0,
      totalRating: 0,
      ratingCount: 0,
    };

    existing.count++;
    if (interview.recommendation === 'hire') {
      existing.successful++;
    }
    if (interview.rating !== null) {
      existing.totalRating += interview.rating;
      existing.ratingCount++;
    }

    typeMap.set(type, existing);
  });

  const byType = Array.from(typeMap.entries()).map(([type, data]) => ({
    type,
    count: data.count,
    successRate:
      data.count > 0
        ? Math.round((data.successful / data.count) * 1000) / 10
        : 0,
    avgRating:
      data.ratingCount > 0
        ? Math.round((data.totalRating / data.ratingCount) * 10) / 10
        : 0,
  }));

  return {
    totalInterviews,
    completedRate:
      totalInterviews > 0
        ? Math.round((completedInterviews.length / totalInterviews) * 1000) / 10
        : 0,
    noShowRate:
      totalInterviews > 0
        ? Math.round((noShowInterviews.length / totalInterviews) * 1000) / 10
        : 0,
    successRate:
      completedInterviews.length > 0
        ? Math.round((successfulInterviews.length / completedInterviews.length) * 1000) / 10
        : 0,
    avgRating: Math.round(avgRating * 10) / 10,
    byType,
  };
}

/**
 * Calculate DISC profile distribution
 */
export async function calculateDISCDistribution(
  tenantId: string,
  dateRange?: DateRange
): Promise<DISCProfileDistribution[]> {
  const { startDate, endDate } = dateRange || getDefaultDateRange(90);

  // Get completed DISC tests
  const discTests = await db.dISTest.findMany({
    where: {
      tenantId,
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      primaryProfile: true,
      profileCombo: true,
      jobFitScore: true,
    },
  });

  // Count profiles
  const profileMap = new Map<string, { count: number; totalFitScore: number }>();

  discTests.forEach((test) => {
    const profile = test.profileCombo || test.primaryProfile || 'Unknown';
    const existing = profileMap.get(profile) || { count: 0, totalFitScore: 0 };
    existing.count++;
    if (test.jobFitScore) {
      existing.totalFitScore += test.jobFitScore;
    }
    profileMap.set(profile, existing);
  });

  const total = discTests.length;

  const distribution: DISCProfileDistribution[] = Array.from(profileMap.entries()).map(
    ([profile, data]) => ({
      profile,
      count: data.count,
      percentage: total > 0 ? Math.round((data.count / total) * 1000) / 10 : 0,
      avgJobFitScore:
        data.count > 0
          ? Math.round((data.totalFitScore / data.count) * 10) / 10
          : 0,
    })
  );

  return distribution.sort((a, b) => b.count - a.count);
}

/**
 * Calculate AI agent performance metrics
 */
export async function calculateAgentPerformance(
  tenantId: string,
  dateRange?: DateRange
): Promise<AgentPerformanceMetrics[]> {
  const { startDate, endDate } = dateRange || getDefaultDateRange(30);

  // Get AI agents with their tasks
  const agents = await db.aIAgent.findMany({
    where: { tenantId },
    include: {
      tasks: {
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          status: true,
          duration: true,
          tokensUsed: true,
          createdAt: true,
        },
      },
    },
  });

  const metrics: AgentPerformanceMetrics[] = agents.map((agent) => {
    const totalRuns = agent.tasks.length;
    const successfulRuns = agent.tasks.filter(
      (t) => t.status === TaskStatus.COMPLETED
    ).length;
    const failedRuns = agent.tasks.filter(
      (t) => t.status === TaskStatus.FAILED
    ).length;

    const durationsWithValue = agent.tasks
      .map((t) => t.duration)
      .filter((d): d is number => d !== null);

    const avgDuration =
      durationsWithValue.length > 0
        ? durationsWithValue.reduce((a, b) => a + b, 0) / durationsWithValue.length
        : 0;

    const totalTokensUsed = agent.tasks.reduce(
      (sum, t) => sum + (t.tokensUsed || 0),
      0
    );

    const lastRunAt =
      agent.tasks.length > 0
        ? agent.tasks.reduce((latest, t) =>
            new Date(t.createdAt) > new Date(latest.createdAt) ? t : latest
          ).createdAt
        : null;

    return {
      agentId: agent.id,
      agentType: agent.type,
      agentName: agent.name,
      totalRuns,
      successRate:
        totalRuns > 0
          ? Math.round((successfulRuns / totalRuns) * 1000) / 10
          : 0,
      avgDuration: Math.round(avgDuration),
      totalTokensUsed,
      lastRunAt,
      errorRate:
        totalRuns > 0
          ? Math.round((failedRuns / totalRuns) * 1000) / 10
          : 0,
    };
  });

  return metrics.sort((a, b) => b.totalRuns - a.totalRuns);
}

/**
 * Get overview metrics (high-level dashboard data)
 */
export async function getOverviewMetrics(
  tenantId: string,
  dateRange?: DateRange
) {
  const { startDate, endDate } = dateRange || getDefaultDateRange(30);

  const previousPeriodStart = new Date(startDate);
  previousPeriodStart.setDate(
    previousPeriodStart.getDate() - (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Parallel queries for efficiency
  const [
    totalCandidates,
    previousCandidates,
    totalJobs,
    activeJobs,
    totalHired,
    previousHired,
    totalInterviews,
    pendingInterviews,
    activeAgents,
    totalTasks,
    completedTasks,
  ] = await Promise.all([
    // Total candidates in period
    db.candidate.count({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    // Previous period candidates
    db.candidate.count({
      where: {
        tenantId,
        createdAt: { gte: previousPeriodStart, lt: startDate },
      },
    }),
    // Total jobs
    db.job.count({ where: { tenantId } }),
    // Active jobs
    db.job.count({
      where: { tenantId, status: 'PUBLISHED' },
    }),
    // Total hired in period
    db.candidate.count({
      where: {
        tenantId,
        status: CandidateStatus.HIRED,
        updatedAt: { gte: startDate, lte: endDate },
      },
    }),
    // Previous period hired
    db.candidate.count({
      where: {
        tenantId,
        status: CandidateStatus.HIRED,
        updatedAt: { gte: previousPeriodStart, lt: startDate },
      },
    }),
    // Total interviews in period
    db.interview.count({
      where: {
        tenantId,
        scheduledAt: { gte: startDate, lte: endDate },
      },
    }),
    // Pending interviews
    db.interview.count({
      where: {
        tenantId,
        status: InterviewStatus.SCHEDULED,
        scheduledAt: { gte: new Date() },
      },
    }),
    // Active AI agents
    db.aIAgent.count({
      where: { tenantId, enabled: true },
    }),
    // Total AI tasks in period
    db.aITask.count({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    // Completed AI tasks
    db.aITask.count({
      where: {
        tenantId,
        status: TaskStatus.COMPLETED,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  // Calculate trends
  const candidateTrend =
    previousCandidates > 0
      ? ((totalCandidates - previousCandidates) / previousCandidates) * 100
      : 0;

  const hireTrend =
    previousHired > 0
      ? ((totalHired - previousHired) / previousHired) * 100
      : 0;

  return {
    totalCandidates,
    candidateTrend: Math.round(candidateTrend * 10) / 10,
    totalJobs,
    activeJobs,
    totalHired,
    hireTrend: Math.round(hireTrend * 10) / 10,
    totalInterviews,
    pendingInterviews,
    activeAgents,
    totalTasks,
    completedTasks,
    taskSuccessRate:
      totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 1000) / 10
        : 0,
  };
}
