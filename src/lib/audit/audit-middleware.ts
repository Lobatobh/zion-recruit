/**
 * Audit Middleware - Express-like middleware for automatic API route logging
 * Part of Zion Recruit Platform
 */

import { 
  logAudit, 
  extractIpAddress, 
  extractUserAgent,
  AuditActions,
  AuditEntityTypes,
  type AuditAction,
  type AuditEntityType,
} from './audit-service';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// ============================================
// TYPES
// ============================================

interface AuditMiddlewareConfig {
  tenantId: string;
  userId?: string | null;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityIdParam?: string; // URL param name for entity ID
  extractEntityId?: (req: NextRequest) => string | undefined;
  skipCondition?: (req: NextRequest) => boolean;
  getMetadata?: (req: NextRequest, body?: unknown) => Record<string, unknown>;
}

interface WithAuditConfig {
  tenantId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// HIGHER-ORDER FUNCTION FOR ROUTE HANDLERS
// ============================================

/**
 * Wrap a route handler with automatic audit logging
 */
export function withAudit<T>(
  handler: (request: NextRequest) => Promise<T>,
  config: WithAuditConfig
): (request: NextRequest) => Promise<T> {
  return async (request: NextRequest) => {
    const result = await handler(request);
    
    // Log after successful execution
    await logAudit({
      tenantId: config.tenantId,
      userId: config.userId,
      action: config.action,
      entityType: config.entityType,
      entityId: config.entityId,
      metadata: config.metadata,
      ipAddress: extractIpAddress(request),
      userAgent: extractUserAgent(request),
    });
    
    return result;
  };
}

/**
 * Wrap a route handler with audit logging and response
 */
export function withAuditResponse(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: Omit<WithAuditConfig, 'entityId' | 'metadata'> & {
    extractEntityId?: (response: NextResponse, body: unknown) => string | undefined;
    extractMetadata?: (request: NextRequest, body: unknown) => Record<string, unknown>;
  }
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    let entityId: string | undefined;
    let metadata: Record<string, unknown> | undefined;
    let responseBody: unknown;
    
    try {
      const response = await handler(request);
      
      // Try to extract entity ID and metadata from response
      try {
        const clonedResponse = response.clone();
        responseBody = await clonedResponse.json();
        
        if (config.extractEntityId) {
          entityId = config.extractEntityId(response, responseBody);
        } else if (responseBody && typeof responseBody === 'object' && 'id' in responseBody) {
          entityId = (responseBody as Record<string, unknown>).id as string;
        }
        
        if (config.extractMetadata) {
          metadata = config.extractMetadata(request, responseBody);
        }
      } catch {
        // Response is not JSON or parsing failed, skip extraction
      }
      
      // Log after successful execution
      await logAudit({
        tenantId: config.tenantId,
        userId: config.userId,
        action: config.action,
        entityType: config.entityType,
        entityId,
        metadata,
        ipAddress: extractIpAddress(request),
        userAgent: extractUserAgent(request),
      });
      
      return response;
    } catch (error) {
      // Don't log on errors - the handler should handle its own error logging if needed
      throw error;
    }
  };
}

// ============================================
// AUDIT LOGGER CLASS
// ============================================

/**
 * Class-based audit logger for more complex scenarios
 */
export class AuditLogger {
  private tenantId: string;
  private userId?: string | null;
  private request: NextRequest;

  constructor(
    request: NextRequest,
    config: { tenantId: string; userId?: string | null }
  ) {
    this.tenantId = config.tenantId;
    this.userId = config.userId;
    this.request = request;
  }

  /**
   * Log a CREATE action
   */
  async logCreate(params: {
    entityType: AuditEntityType;
    entityId?: string;
    metadata?: Record<string, unknown>;
    changes?: Record<string, { old: unknown; new: unknown }>;
  }): Promise<void> {
    await this.log(AuditActions.CREATE, params);
  }

  /**
   * Log an UPDATE action
   */
  async logUpdate(params: {
    entityType: AuditEntityType;
    entityId?: string;
    metadata?: Record<string, unknown>;
    changes?: Record<string, { old: unknown; new: unknown }>;
  }): Promise<void> {
    await this.log(AuditActions.UPDATE, params);
  }

  /**
   * Log a DELETE action
   */
  async logDelete(params: {
    entityType: AuditEntityType;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log(AuditActions.DELETE, params);
  }

  /**
   * Log an EXPORT action
   */
  async logExport(params: {
    entityType: AuditEntityType;
    format: 'csv' | 'json';
    recordCount: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log(AuditActions.EXPORT, {
      entityType: params.entityType,
      metadata: {
        format: params.format,
        recordCount: params.recordCount,
        ...params.metadata,
      },
    });
  }

  /**
   * Generic log method
   */
  async log(
    action: AuditAction,
    params: {
      entityType: AuditEntityType;
      entityId?: string;
      metadata?: Record<string, unknown>;
      changes?: Record<string, { old: unknown; new: unknown }>;
    }
  ): Promise<void> {
    await logAudit({
      tenantId: this.tenantId,
      userId: this.userId,
      action,
      entityType: params.entityType,
      entityId: params.entityId,
      changes: params.changes,
      metadata: params.metadata,
      ipAddress: extractIpAddress(this.request),
      userAgent: extractUserAgent(this.request),
    });
  }
}

// ============================================
// AUTOMATIC CRUD LOGGING
// ============================================

/**
 * Automatically log CRUD operations for an entity
 */
export function createCrudAuditHandlers(
  entityType: AuditEntityType,
  getTenantId: (id: string, request: NextRequest) => Promise<string>,
  getUserId: (request: NextRequest) => string | undefined | null
) {
  return {
    logCreated: async (
      request: NextRequest,
      entityId: string,
      metadata?: Record<string, unknown>
    ) => {
      const tenantId = await getTenantId(entityId, request);
      await logAudit({
        tenantId,
        userId: getUserId(request),
        action: AuditActions.CREATE,
        entityType,
        entityId,
        metadata,
        ipAddress: extractIpAddress(request),
        userAgent: extractUserAgent(request),
      });
    },

    logUpdated: async (
      request: NextRequest,
      entityId: string,
      changes: Record<string, { old: unknown; new: unknown }>,
      metadata?: Record<string, unknown>
    ) => {
      const tenantId = await getTenantId(entityId, request);
      await logAudit({
        tenantId,
        userId: getUserId(request),
        action: AuditActions.UPDATE,
        entityType,
        entityId,
        changes,
        metadata,
        ipAddress: extractIpAddress(request),
        userAgent: extractUserAgent(request),
      });
    },

    logDeleted: async (
      request: NextRequest,
      entityId: string,
      metadata?: Record<string, unknown>
    ) => {
      const tenantId = await getTenantId(entityId, request);
      await logAudit({
        tenantId,
        userId: getUserId(request),
        action: AuditActions.DELETE,
        entityType,
        entityId,
        metadata,
        ipAddress: extractIpAddress(request),
        userAgent: extractUserAgent(request),
      });
    },
  };
}

// ============================================
// ENTITY-SPECIFIC HELPERS
// ============================================

export const CandidateAudit = createCrudAuditHandlers(
  AuditEntityTypes.CANDIDATE,
  async (id, _request) => {
    // In a real app, fetch tenantId from database
    // For now, we assume it's passed in the request
    return 'demo-tenant'; // This would be replaced with actual logic
  },
  (request) => {
    // Extract user ID from session or headers
    const userId = request.headers.get('x-user-id');
    return userId;
  }
);

export const JobAudit = createCrudAuditHandlers(
  AuditEntityTypes.JOB,
  async (id, _request) => {
    return 'demo-tenant';
  },
  (request) => {
    const userId = request.headers.get('x-user-id');
    return userId;
  }
);

export const UserAudit = createCrudAuditHandlers(
  AuditEntityTypes.USER,
  async (id, _request) => {
    return 'demo-tenant';
  },
  (request) => {
    const userId = request.headers.get('x-user-id');
    return userId;
  }
);
