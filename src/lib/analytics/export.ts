/**
 * Analytics Export Library
 * Export analytics data to CSV and PDF formats
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

// Types
export interface ExportOptions {
  format: 'csv' | 'json';
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  tenantId: string;
}

export interface ExportData {
  timeToHire?: TimeToHireMetrics;
  pipeline?: PipelineConversionMetrics[];
  sources?: SourceEffectivenessMetrics[];
  costPerHire?: CostPerHireMetrics;
  candidatesPerJob?: CandidatesPerJobMetrics;
  interviews?: InterviewSuccessMetrics;
  discDistribution?: DISCProfileDistribution[];
  agentPerformance?: AgentPerformanceMetrics[];
}

/**
 * Convert data to CSV format
 */
export function toCSV(data: Record<string, unknown>[], headers: string[]): string {
  const csvHeaders = headers.join(',');
  const csvRows = data.map((row) =>
    headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Export time-to-hire metrics to CSV
 */
export function exportTimeToHireCSV(metrics: TimeToHireMetrics): string {
  const headers = ['month', 'average_days', 'hires'];
  const data = metrics.byMonth.map((item) => ({
    month: item.month,
    average_days: item.averageDays,
    hires: item.hires,
  }));
  
  // Add summary row
  const summary = {
    month: 'AVERAGE',
    average_days: metrics.averageDays,
    hires: metrics.byMonth.reduce((sum, m) => sum + m.hires, 0),
  };
  
  return toCSV([...data, summary], headers);
}

/**
 * Export pipeline metrics to CSV
 */
export function exportPipelineCSV(metrics: PipelineConversionMetrics[]): string {
  const headers = ['stage_name', 'stage_order', 'candidates_count', 'conversion_rate', 'drop_off_rate'];
  const data = metrics.map((item) => ({
    stage_name: item.stageName,
    stage_order: item.stageOrder,
    candidates_count: item.candidatesCount,
    conversion_rate: item.conversionRate,
    drop_off_rate: item.dropOffRate,
  }));
  
  return toCSV(data, headers);
}

/**
 * Export source effectiveness to CSV
 */
export function exportSourcesCSV(metrics: SourceEffectivenessMetrics[]): string {
  const headers = ['source', 'applications', 'hires', 'conversion_rate', 'avg_time_to_hire'];
  const data = metrics.map((item) => ({
    source: item.source,
    applications: item.applications,
    hires: item.hires,
    conversion_rate: item.conversionRate,
    avg_time_to_hire: item.avgTimeToHire,
  }));
  
  return toCSV(data, headers);
}

/**
 * Export cost per hire to CSV
 */
export function exportCostPerHireCSV(metrics: CostPerHireMetrics): string {
  const headers = ['metric', 'value'];
  const data = [
    { metric: 'Total Cost', value: metrics.totalCost },
    { metric: 'AI Token Cost', value: metrics.aiTokenCost },
    { metric: 'Job Board Cost', value: metrics.jobBoardCost },
    { metric: 'Cost Per Hire', value: metrics.costPerHire },
  ];
  
  const monthlyHeaders = ['month', 'cost', 'hires'];
  const monthlyData = metrics.byMonth.map((item) => ({
    month: item.month,
    cost: item.cost,
    hires: item.hires,
  }));
  
  return toCSV(data, headers) + '\n\n' + toCSV(monthlyData, monthlyHeaders);
}

/**
 * Export candidates per job to CSV
 */
export function exportCandidatesPerJobCSV(metrics: CandidatesPerJobMetrics): string {
  const headers = ['job_title', 'candidates', 'hires'];
  const data = metrics.byJob.map((item) => ({
    job_title: item.jobTitle,
    candidates: item.candidates,
    hires: item.hires,
  }));
  
  const summaryHeaders = ['metric', 'value'];
  const summary = [
    { metric: 'Average Candidates', value: metrics.average },
    { metric: 'Median Candidates', value: metrics.median },
  ];
  
  return toCSV(summary, summaryHeaders) + '\n\n' + toCSV(data, headers);
}

/**
 * Export interview metrics to CSV
 */
export function exportInterviewsCSV(metrics: InterviewSuccessMetrics): string {
  const summaryHeaders = ['metric', 'value'];
  const summary = [
    { metric: 'Total Interviews', value: metrics.totalInterviews },
    { metric: 'Completed Rate', value: `${metrics.completedRate}%` },
    { metric: 'No Show Rate', value: `${metrics.noShowRate}%` },
    { metric: 'Success Rate', value: `${metrics.successRate}%` },
    { metric: 'Average Rating', value: metrics.avgRating },
  ];
  
  const typeHeaders = ['interview_type', 'count', 'success_rate', 'avg_rating'];
  const typeData = metrics.byType.map((item) => ({
    interview_type: item.type,
    count: item.count,
    success_rate: `${item.successRate}%`,
    avg_rating: item.avgRating,
  }));
  
  return toCSV(summary, summaryHeaders) + '\n\n' + toCSV(typeData, typeHeaders);
}

/**
 * Export DISC distribution to CSV
 */
export function exportDISCCSV(metrics: DISCProfileDistribution[]): string {
  const headers = ['profile', 'count', 'percentage', 'avg_job_fit_score'];
  const data = metrics.map((item) => ({
    profile: item.profile,
    count: item.count,
    percentage: `${item.percentage}%`,
    avg_job_fit_score: item.avgJobFitScore,
  }));
  
  return toCSV(data, headers);
}

/**
 * Export agent performance to CSV
 */
export function exportAgentPerformanceCSV(metrics: AgentPerformanceMetrics[]): string {
  const headers = [
    'agent_name',
    'agent_type',
    'total_runs',
    'success_rate',
    'error_rate',
    'avg_duration_ms',
    'total_tokens_used',
  ];
  const data = metrics.map((item) => ({
    agent_name: item.agentName,
    agent_type: item.agentType,
    total_runs: item.totalRuns,
    success_rate: `${item.successRate}%`,
    error_rate: `${item.errorRate}%`,
    avg_duration_ms: item.avgDuration,
    total_tokens_used: item.totalTokensUsed,
  }));
  
  return toCSV(data, headers);
}

/**
 * Export all analytics data to a single CSV
 */
export function exportAllCSV(data: ExportData): string {
  const sections: string[] = [];
  
  if (data.timeToHire) {
    sections.push('=== TIME TO HIRE ===\n' + exportTimeToHireCSV(data.timeToHire));
  }
  
  if (data.pipeline && data.pipeline.length > 0) {
    sections.push('\n=== PIPELINE CONVERSION ===\n' + exportPipelineCSV(data.pipeline));
  }
  
  if (data.sources && data.sources.length > 0) {
    sections.push('\n=== SOURCE EFFECTIVENESS ===\n' + exportSourcesCSV(data.sources));
  }
  
  if (data.costPerHire) {
    sections.push('\n=== COST PER HIRE ===\n' + exportCostPerHireCSV(data.costPerHire));
  }
  
  if (data.candidatesPerJob) {
    sections.push('\n=== CANDIDATES PER JOB ===\n' + exportCandidatesPerJobCSV(data.candidatesPerJob));
  }
  
  if (data.interviews) {
    sections.push('\n=== INTERVIEW METRICS ===\n' + exportInterviewsCSV(data.interviews));
  }
  
  if (data.discDistribution && data.discDistribution.length > 0) {
    sections.push('\n=== DISC DISTRIBUTION ===\n' + exportDISCCSV(data.discDistribution));
  }
  
  if (data.agentPerformance && data.agentPerformance.length > 0) {
    sections.push('\n=== AGENT PERFORMANCE ===\n' + exportAgentPerformanceCSV(data.agentPerformance));
  }
  
  return sections.join('\n');
}

/**
 * Export all analytics data to JSON
 */
export function exportAllJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(prefix: string, format: 'csv' | 'json'): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `zion-recruit-${prefix}-${timestamp}.${format}`;
}

/**
 * Create downloadable blob
 */
export function createDownloadBlob(content: string, format: 'csv' | 'json'): Blob {
  const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
  return new Blob([content], { type: mimeType });
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, filename: string, format: 'csv' | 'json'): void {
  const blob = createDownloadBlob(content, format);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export overview metrics summary to CSV
 */
export function exportOverviewCSV(overview: {
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
}): string {
  const headers = ['metric', 'value', 'trend'];
  const data = [
    { metric: 'Total Candidates', value: overview.totalCandidates, trend: `${overview.candidateTrend}%` },
    { metric: 'Total Jobs', value: overview.totalJobs, trend: '' },
    { metric: 'Active Jobs', value: overview.activeJobs, trend: '' },
    { metric: 'Total Hired', value: overview.totalHired, trend: `${overview.hireTrend}%` },
    { metric: 'Total Interviews', value: overview.totalInterviews, trend: '' },
    { metric: 'Pending Interviews', value: overview.pendingInterviews, trend: '' },
    { metric: 'Active AI Agents', value: overview.activeAgents, trend: '' },
    { metric: 'Total AI Tasks', value: overview.totalTasks, trend: '' },
    { metric: 'Completed AI Tasks', value: overview.completedTasks, trend: '' },
    { metric: 'Task Success Rate', value: `${overview.taskSuccessRate}%`, trend: '' },
  ];
  
  return toCSV(data, headers);
}

/**
 * Format date for export headers
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return `${format(startDate)}_to_${format(endDate)}`;
}

/**
 * Add export metadata header
 */
export function addExportMetadata(content: string, tenantId: string, dateRange: { startDate: Date; endDate: Date }): string {
  const header = [
    '# Zion Recruit Analytics Export',
    `# Tenant: ${tenantId}`,
    `# Period: ${formatDateRange(dateRange.startDate, dateRange.endDate)}`,
    `# Generated: ${new Date().toISOString()}`,
    '#',
    '',
  ].join('\n');
  
  return header + content;
}
