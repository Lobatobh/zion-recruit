/**
 * Audit Module - Export all audit-related functionality
 * Part of Zion Recruit Platform
 */

// Main service
export {
  logAudit,
  logAuditFromRequest,
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
  exportAuditLogsCsv,
  exportAuditLogsJson,
  extractIpAddress,
  extractUserAgent,
  AuditActions,
  AuditEntityTypes,
  type AuditAction,
  type AuditEntityType,
  type AuditLogEntry,
  type AuditLogWithUser,
} from './audit-service';

// Helpers
export {
  // Candidate
  logCandidateCreated,
  logCandidateUpdated,
  logCandidateDeleted,
  logCandidateStageChange,
  // Job
  logJobCreated,
  logJobUpdated,
  logJobDeleted,
  logJobPublished,
  logJobClosed,
  // User
  logUserLogin,
  logUserLogout,
  logUserUpdated,
  // API Key
  logApiKeyCreated,
  logApiKeyRevoked,
  // Agent
  logAgentRun,
  // Interview
  logInterviewScheduled,
  logInterviewCancelled,
  // DISC
  logDiscTestSent,
  // Message
  logMessageSent,
  // Export
  logDataExport,
  // Settings
  logSettingsChange,
  logPermissionChange,
  // Utility
  createDiff,
} from './audit-helpers';

// Middleware
export {
  withAudit,
  withAuditResponse,
  AuditLogger,
  createCrudAuditHandlers,
  CandidateAudit,
  JobAudit,
  UserAudit,
} from './audit-middleware';
