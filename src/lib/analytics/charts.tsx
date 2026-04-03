/**
 * Analytics Charts Library
 * Chart data formatting utilities for Recharts
 */

import {
  TimeToHireMetrics,
  PipelineConversionMetrics,
  SourceEffectivenessMetrics,
  CostPerHireMetrics,
  CandidatesPerJobMetrics,
  InterviewSuccessMetrics,
  DISCProfileDistribution,
  AgentPerformanceMetrics,
} from './metrics';

// Recharts-compatible types
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface LineChartDataPoint {
  date: string;
  [key: string]: string | number;
}

export interface FunnelDataPoint {
  name: string;
  value: number;
  fill?: string;
}

// Color palettes
export const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted))',
  
  // Extended palette for charts
  palette: [
    'hsl(220, 70%, 50%)',  // Blue
    'hsl(160, 60%, 45%)',  // Green
    'hsl(30, 80%, 55%)',   // Orange
    'hsl(280, 65%, 60%)',  // Purple
    'hsl(340, 82%, 52%)',  // Pink
    'hsl(180, 70%, 40%)',  // Cyan
    'hsl(45, 93%, 47%)',   // Yellow
    'hsl(0, 72%, 51%)',    // Red
  ],
  
  // DISC profile colors
  disc: {
    D: 'hsl(0, 72%, 51%)',     // Red - Dominance
    I: 'hsl(45, 93%, 47%)',    // Yellow - Influence
    S: 'hsl(160, 60%, 45%)',   // Green - Steadiness
    C: 'hsl(220, 70%, 50%)',   // Blue - Conscientiousness
  },
  
  // Status colors
  status: {
    success: 'hsl(160, 84%, 39%)',
    warning: 'hsl(45, 93%, 47%)',
    error: 'hsl(0, 84%, 60%)',
    info: 'hsl(220, 70%, 50%)',
  },
};

/**
 * Format time-to-hire data for line chart
 */
export function formatTimeToHireChart(
  metrics: TimeToHireMetrics
): LineChartDataPoint[] {
  return metrics.byMonth.map((item) => ({
    date: formatMonth(item.month),
    averageDays: item.averageDays,
    hires: item.hires,
  }));
}

/**
 * Format pipeline data for funnel chart
 */
export function formatPipelineFunnel(
  metrics: PipelineConversionMetrics[]
): FunnelDataPoint[] {
  return metrics
    .sort((a, b) => a.stageOrder - b.stageOrder)
    .map((stage, index) => ({
      name: stage.stageName,
      value: stage.candidatesCount,
      fill: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
      conversionRate: stage.conversionRate,
      dropOffRate: stage.dropOffRate,
    }));
}

/**
 * Format pipeline data for bar chart (conversion rates)
 */
export function formatPipelineBarChart(
  metrics: PipelineConversionMetrics[]
): ChartDataPoint[] {
  return metrics
    .sort((a, b) => a.stageOrder - b.stageOrder)
    .map((stage) => ({
      name: stage.stageName,
      conversion: stage.conversionRate,
      dropoff: stage.dropOffRate,
      candidates: stage.candidatesCount,
    }));
}

/**
 * Format source data for pie chart
 */
export function formatSourcePieChart(
  metrics: SourceEffectivenessMetrics[]
): ChartDataPoint[] {
  return metrics.slice(0, 8).map((item, index) => ({
    name: item.source,
    value: item.applications,
    hires: item.hires,
    conversionRate: item.conversionRate,
    fill: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
  }));
}

/**
 * Format source data for horizontal bar chart
 */
export function formatSourceBarChart(
  metrics: SourceEffectivenessMetrics[]
): ChartDataPoint[] {
  return metrics
    .sort((a, b) => b.applications - a.applications)
    .slice(0, 10)
    .map((item) => ({
      name: item.source,
      applications: item.applications,
      hires: item.hires,
      conversionRate: item.conversionRate,
    }));
}

/**
 * Format cost per hire data for line chart
 */
export function formatCostChart(
  metrics: CostPerHireMetrics
): LineChartDataPoint[] {
  return metrics.byMonth.map((item) => ({
    date: formatMonth(item.month),
    cost: item.cost,
    hires: item.hires,
  }));
}

/**
 * Format candidates per job distribution for bar chart
 */
export function formatCandidatesDistribution(
  metrics: CandidatesPerJobMetrics
): ChartDataPoint[] {
  return metrics.distribution.map((item) => ({
    name: item.range,
    count: item.count,
  }));
}

/**
 * Format interview success data for pie chart
 */
export function formatInterviewPieChart(
  metrics: InterviewSuccessMetrics
): ChartDataPoint[] {
  return [
    { name: 'Completed', value: metrics.completedRate, fill: CHART_COLORS.status.success },
    { name: 'No Show', value: metrics.noShowRate, fill: CHART_COLORS.status.error },
    { name: 'Other', value: 100 - metrics.completedRate - metrics.noShowRate, fill: CHART_COLORS.muted },
  ];
}

/**
 * Format interview by type for bar chart
 */
export function formatInterviewTypeChart(
  metrics: InterviewSuccessMetrics
): ChartDataPoint[] {
  return metrics.byType.map((item, index) => ({
    name: formatInterviewType(item.type),
    count: item.count,
    successRate: item.successRate,
    avgRating: item.avgRating,
    fill: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
  }));
}

/**
 * Format DISC distribution for pie/bar chart
 */
export function formatDISCDistribution(
  metrics: DISCProfileDistribution[]
): ChartDataPoint[] {
  return metrics.map((item) => {
    // Get primary letter for color
    const primaryLetter = item.profile.charAt(0).toUpperCase();
    return {
      name: item.profile,
      value: item.count,
      percentage: item.percentage,
      avgJobFitScore: item.avgJobFitScore,
      fill: CHART_COLORS.disc[primaryLetter as keyof typeof CHART_COLORS.disc] || CHART_COLORS.primary,
    };
  });
}

/**
 * Format agent performance for bar chart
 */
export function formatAgentPerformanceChart(
  metrics: AgentPerformanceMetrics[]
): ChartDataPoint[] {
  return metrics.map((item, index) => ({
    name: item.agentName || item.agentType,
    totalRuns: item.totalRuns,
    successRate: item.successRate,
    errorRate: item.errorRate,
    avgDuration: item.avgDuration,
    fill: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
  }));
}

/**
 * Format agent token usage for bar chart
 */
export function formatAgentTokensChart(
  metrics: AgentPerformanceMetrics[]
): ChartDataPoint[] {
  return metrics
    .sort((a, b) => b.totalTokensUsed - a.totalTokensUsed)
    .slice(0, 8)
    .map((item, index) => ({
      name: item.agentName || item.agentType,
      tokens: item.totalTokensUsed,
      fill: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
    }));
}

/**
 * Format overview metrics for cards
 */
export function formatOverviewCards(metrics: {
  totalCandidates: number;
  candidateTrend: number;
  totalJobs: number;
  activeJobs: number;
  totalHired: number;
  hireTrend: number;
  totalInterviews: number;
  pendingInterviews: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  taskSuccessRate: number;
}) {
  return [
    {
      title: 'Total Candidates',
      value: metrics.totalCandidates,
      trend: metrics.candidateTrend,
      description: 'vs. previous period',
    },
    {
      title: 'Active Jobs',
      value: metrics.activeJobs,
      subValue: `${metrics.totalJobs} total`,
      description: 'Published positions',
    },
    {
      title: 'Hires This Period',
      value: metrics.totalHired,
      trend: metrics.hireTrend,
      description: 'vs. previous period',
    },
    {
      title: 'Interviews Scheduled',
      value: metrics.pendingInterviews,
      subValue: `${metrics.totalInterviews} this period`,
      description: 'Pending interviews',
    },
    {
      title: 'AI Tasks',
      value: metrics.completedTasks,
      subValue: `${metrics.taskSuccessRate}% success`,
      description: `of ${metrics.totalTasks} total`,
    },
    {
      title: 'Active AI Agents',
      value: metrics.activeAgents,
      description: 'Enabled and running',
    },
  ];
}

/**
 * Helper to format month string (YYYY-MM) to readable format
 */
export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

/**
 * Helper to format interview type enum to readable string
 */
export function formatInterviewType(type: string): string {
  const typeMap: Record<string, string> = {
    SCREENING: 'Screening',
    TECHNICAL: 'Technical',
    BEHAVIORAL: 'Behavioral',
    CULTURAL: 'Cultural Fit',
    FINAL: 'Final',
    PHONE: 'Phone',
    VIDEO: 'Video',
    ONSITE: 'On-site',
  };
  return typeMap[type] || type;
}

/**
 * Helper to format agent type enum to readable string
 */
export function formatAgentType(type: string): string {
  const typeMap: Record<string, string> = {
    JOB_PARSER: 'Job Parser',
    SOURCING: 'Sourcing',
    SCREENING: 'Screening',
    CONTACT: 'Contact',
    SCHEDULER: 'Scheduler',
    DISC_ANALYZER: 'DISC Analyzer',
    MATCHING: 'Matching',
    REPORT: 'Report',
    ORCHESTRATOR: 'Orchestrator',
  };
  return typeMap[type] || type;
}

/**
 * Calculate percentage change
 */
export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Format number with K/M suffix for large numbers
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Get gradient definitions for charts
 */
export function getChartGradients(): React.ReactNode[] {
  return CHART_COLORS.palette.map((color, index) => (
    <linearGradient
      key={`gradient-${index}`}
      id={`color-${index}`}
      x1="0"
      y1="0"
      x2="0"
      y2="1"
    >
      <stop offset="5%" stopColor={color} stopOpacity={0.8} />
      <stop offset="95%" stopColor={color} stopOpacity={0.2} />
    </linearGradient>
  ));
}
