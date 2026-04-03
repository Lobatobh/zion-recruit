/**
 * Audit Service - Main logging service for tracking all actions in the system
 * Part of Zion Recruit Platform
 */

import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';

// Audit action types
export const AuditActions = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  AGENT_RUN: 'AGENT_RUN',
  CANDIDATE_STAGE_CHANGE: 'CANDIDATE_STAGE_CHANGE',
  JOB_PUBLISHED: 'JOB_PUBLISHED',
  JOB_CLOSED: 'JOB_CLOSED',
  INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
  INTERVIEW_CANCELLED: 'INTERVIEW_CANCELLED',
  DISC_TEST_SENT: 'DISC_TEST_SENT',
  MESSAGE_SENT: 'MESSAGE_SENT',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

// Entity types
export const AuditEntityTypes = {
  CANDIDATE: 'Candidate',
  JOB: 'Job',
  USER: 'User',
  TENANT: 'Tenant',
  API_CREDENTIAL: 'ApiCredential',
  AI_AGENT: 'AIAgent',
  AI_TASK: 'AITask',
  INTERVIEW: 'Interview',
  DISC_TEST: 'DISCTest',
  MESSAGE: 'Message',
  CONVERSATION: 'Conversation',
  PIPELINE_STAGE: 'PipelineStage',
  NOTIFICATION: 'Notification',
  SUBSCRIPTION: 'Subscription',
} as const;

export type AuditEntityType = typeof AuditEntityTypes[keyof typeof AuditEntityTypes];

// Sensitive fields that should be redacted
const SENSITIVE_FIELDS = [
  'password',
  'apiKey',
  'apiSecret',
  'projectKey',
  'accessToken',
  'refreshToken',
  'token',
  'secret',
  'credential',
];

// Interface for audit log entry
export interface AuditLogEntry {
  tenantId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Interface for audit log with user info (for display)
export interface AuditLogWithUser extends AuditLogEntry {
  id: string;
  createdAt: Date;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

// Redact sensitive data from an object
function redactSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH_REACHED]';
  
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, depth + 1));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = redactSensitiveData(value, depth + 1);
    }
  }
  return redacted;
}

// Extract IP address from request
export function extractIpAddress(request?: NextRequest): string | undefined {
  if (request) {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp;
    }
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) {
      return cfIp;
    }
  }
  return undefined;
}

// Extract user agent from request
export function extractUserAgent(request?: NextRequest): string | undefined {
  if (request) {
    return request.headers.get('user-agent') || undefined;
  }
  return undefined;
}

/**
 * Log an audit event
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    // Redact sensitive data from changes
    const redactedChanges = entry.changes
      ? JSON.stringify(redactSensitiveData(entry.changes))
      : null;

    const redactedMetadata = entry.metadata
      ? JSON.stringify(redactSensitiveData(entry.metadata))
      : null;

    await db.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changes: redactedChanges,
        metadata: redactedMetadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Log an audit event from a Next.js API route
 */
export async function logAuditFromRequest(
  request: NextRequest,
  entry: Omit<AuditLogEntry, 'ipAddress' | 'userAgent'>
): Promise<void> {
  await logAudit({
    ...entry,
    ipAddress: extractIpAddress(request),
    userAgent: extractUserAgent(request),
  });
}

/**
 * Get audit logs with pagination and filtering
 */
export async function getAuditLogs(params: {
  tenantId: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<{ logs: AuditLogWithUser[]; total: number }> {
  const {
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = params;

  const where: Record<string, unknown> = {
    tenantId,
  };

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  if (startDate || endDate) {
    const createdAtFilter: Record<string, Date> = {};
    if (startDate) createdAtFilter.gte = startDate;
    if (endDate) createdAtFilter.lte = endDate;
    where.createdAt = createdAtFilter;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map(log => ({
      id: log.id,
      tenantId: log.tenantId,
      userId: log.userId,
      action: log.action as AuditAction,
      entityType: log.entityType as AuditEntityType,
      entityId: log.entityId,
      changes: log.changes ? JSON.parse(log.changes) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      user: log.user,
    })),
    total,
  };
}

/**
 * Get audit log by ID
 */
export async function getAuditLogById(id: string, tenantId: string): Promise<AuditLogWithUser | null> {
  const log = await db.auditLog.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!log) return null;

  return {
    id: log.id,
    tenantId: log.tenantId,
    userId: log.userId,
    action: log.action as AuditAction,
    entityType: log.entityType as AuditEntityType,
    entityId: log.entityId,
    changes: log.changes ? JSON.parse(log.changes) : null,
    metadata: log.metadata ? JSON.parse(log.metadata) : null,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
    user: log.user,
  };
}

/**
 * Get audit statistics for a tenant
 */
export async function getAuditStats(params: {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  totalLogs: number;
  byAction: { action: string; count: number }[];
  byEntityType: { entityType: string; count: number }[];
  byUser: { userId: string | null; userName: string | null; count: number }[];
  recentActivity: { date: string; count: number }[];
}> {
  const { tenantId, startDate, endDate } = params;

  const where: Record<string, unknown> = { tenantId };
  if (startDate || endDate) {
    const createdAtFilter: Record<string, Date> = {};
    if (startDate) createdAtFilter.gte = startDate;
    if (endDate) createdAtFilter.lte = endDate;
    where.createdAt = createdAtFilter;
  }

  // Get total count
  const totalLogs = await db.auditLog.count({ where });

  // Get counts by action
  const byActionRaw = await db.auditLog.groupBy({
    by: ['action'],
    where,
    _count: true,
  });
  const byAction = byActionRaw.map(item => ({
    action: item.action,
    count: item._count,
  }));

  // Get counts by entity type
  const byEntityTypeRaw = await db.auditLog.groupBy({
    by: ['entityType'],
    where,
    _count: true,
  });
  const byEntityType = byEntityTypeRaw.map(item => ({
    entityType: item.entityType,
    count: item._count,
  }));

  // Get counts by user
  const byUserRaw = await db.$queryRaw<{ userId: string | null; userName: string | null; count: bigint }[]>`
    SELECT 
      al.userId,
      u.name as userName,
      COUNT(*) as count
    FROM audit_logs al
    LEFT JOIN users u ON al.userId = u.id
    WHERE al.tenantId = ${tenantId}
    ${startDate ? `AND al.createdAt >= datetime('${startDate.toISOString()}')` : ''}
    ${endDate ? `AND al.createdAt <= datetime('${endDate.toISOString()}')` : ''}
    GROUP BY al.userId, u.name
    ORDER BY count DESC
    LIMIT 10
  `;
  const byUser = byUserRaw.map(item => ({
    userId: item.userId,
    userName: item.userName,
    count: Number(item.count),
  }));

  // Get recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentActivityRaw = await db.$queryRaw<{ date: string; count: bigint }[]>`
    SELECT 
      date(createdAt) as date,
      COUNT(*) as count
    FROM audit_logs
    WHERE tenantId = ${tenantId}
    AND createdAt >= datetime('${sevenDaysAgo.toISOString()}')
    GROUP BY date(createdAt)
    ORDER BY date DESC
  `;
  const recentActivity = recentActivityRaw.map(item => ({
    date: item.date,
    count: Number(item.count),
  }));

  return {
    totalLogs,
    byAction,
    byEntityType,
    byUser,
    recentActivity,
  };
}

/**
 * Export audit logs as CSV
 */
export async function exportAuditLogsCsv(params: {
  tenantId: string;
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<string> {
  const { logs } = await getAuditLogs({
    ...params,
    limit: 10000, // Max export limit
  });

  const headers = [
    'ID',
    'Timestamp',
    'User',
    'Email',
    'Action',
    'Entity Type',
    'Entity ID',
    'IP Address',
    'Changes',
    'Metadata',
  ];

  const rows = logs.map(log => [
    log.id,
    log.createdAt.toISOString(),
    log.user?.name || 'System',
    log.user?.email || '',
    log.action,
    log.entityType,
    log.entityId || '',
    log.ipAddress || '',
    log.changes ? JSON.stringify(log.changes) : '',
    log.metadata ? JSON.stringify(log.metadata) : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Export audit logs as JSON
 */
export async function exportAuditLogsJson(params: {
  tenantId: string;
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<string> {
  const { logs } = await getAuditLogs({
    ...params,
    limit: 10000,
  });

  return JSON.stringify(logs, null, 2);
}

// Re-export helpers
export * from './audit-helpers';
