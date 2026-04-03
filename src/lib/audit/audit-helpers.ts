/**
 * Audit Helpers - Helper functions for common audit actions
 * Part of Zion Recruit Platform
 */

import { 
  logAudit, 
  logAuditFromRequest, 
  AuditActions, 
  AuditEntityTypes,
  type AuditAction,
  type AuditEntityType,
} from './audit-service';
import type { NextRequest } from 'next/server';

// ============================================
// CANDIDATE AUDIT HELPERS
// ============================================

export async function logCandidateCreated(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    jobId: string;
    jobTitle: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.CREATE,
    entityType: AuditEntityTypes.CANDIDATE,
    entityId: params.candidateId,
    metadata: {
      candidateName: params.candidateName,
      candidateEmail: params.candidateEmail,
      jobId: params.jobId,
      jobTitle: params.jobTitle,
    },
  });
}

export async function logCandidateUpdated(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    candidateId: string;
    candidateName: string;
    changes: Record<string, { old: unknown; new: unknown }>;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.UPDATE,
    entityType: AuditEntityTypes.CANDIDATE,
    entityId: params.candidateId,
    changes: params.changes,
    metadata: {
      candidateName: params.candidateName,
    },
  });
}

export async function logCandidateDeleted(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.DELETE,
    entityType: AuditEntityTypes.CANDIDATE,
    entityId: params.candidateId,
    metadata: {
      candidateName: params.candidateName,
      candidateEmail: params.candidateEmail,
    },
  });
}

export async function logCandidateStageChange(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    candidateId: string;
    candidateName: string;
    oldStage: string;
    newStage: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.CANDIDATE_STAGE_CHANGE,
    entityType: AuditEntityTypes.CANDIDATE,
    entityId: params.candidateId,
    changes: {
      pipelineStage: { old: params.oldStage, new: params.newStage },
    },
    metadata: {
      candidateName: params.candidateName,
    },
  });
}

// ============================================
// JOB AUDIT HELPERS
// ============================================

export async function logJobCreated(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    jobId: string;
    jobTitle: string;
    department?: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.CREATE,
    entityType: AuditEntityTypes.JOB,
    entityId: params.jobId,
    metadata: {
      jobTitle: params.jobTitle,
      department: params.department,
    },
  });
}

export async function logJobUpdated(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    jobId: string;
    jobTitle: string;
    changes: Record<string, { old: unknown; new: unknown }>;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.UPDATE,
    entityType: AuditEntityTypes.JOB,
    entityId: params.jobId,
    changes: params.changes,
    metadata: {
      jobTitle: params.jobTitle,
    },
  });
}

export async function logJobDeleted(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    jobId: string;
    jobTitle: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.DELETE,
    entityType: AuditEntityTypes.JOB,
    entityId: params.jobId,
    metadata: {
      jobTitle: params.jobTitle,
    },
  });
}

export async function logJobPublished(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    jobId: string;
    jobTitle: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.JOB_PUBLISHED,
    entityType: AuditEntityTypes.JOB,
    entityId: params.jobId,
    metadata: {
      jobTitle: params.jobTitle,
    },
  });
}

export async function logJobClosed(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    jobId: string;
    jobTitle: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.JOB_CLOSED,
    entityType: AuditEntityTypes.JOB,
    entityId: params.jobId,
    metadata: {
      jobTitle: params.jobTitle,
    },
  });
}

// ============================================
// USER AUDIT HELPERS
// ============================================

export async function logUserLogin(
  request: NextRequest,
  params: {
    tenantId: string;
    userId: string;
    userEmail: string;
    success: boolean;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.success ? params.userId : undefined,
    action: params.success ? AuditActions.LOGIN : AuditActions.LOGIN_FAILED,
    entityType: AuditEntityTypes.USER,
    entityId: params.userId,
    metadata: {
      userEmail: params.userEmail,
      success: params.success,
    },
  });
}

export async function logUserLogout(
  request: NextRequest,
  params: {
    tenantId: string;
    userId: string;
    userEmail: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.LOGOUT,
    entityType: AuditEntityTypes.USER,
    entityId: params.userId,
    metadata: {
      userEmail: params.userEmail,
    },
  });
}

export async function logUserUpdated(
  request: NextRequest,
  params: {
    tenantId: string;
    userId: string;
    userEmail: string;
    changes: Record<string, { old: unknown; new: unknown }>;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.UPDATE,
    entityType: AuditEntityTypes.USER,
    entityId: params.userId,
    changes: params.changes,
    metadata: {
      userEmail: params.userEmail,
    },
  });
}

// ============================================
// API CREDENTIAL AUDIT HELPERS
// ============================================

export async function logApiKeyCreated(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    credentialId: string;
    provider: string;
    name: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.API_KEY_CREATED,
    entityType: AuditEntityTypes.API_CREDENTIAL,
    entityId: params.credentialId,
    metadata: {
      provider: params.provider,
      name: params.name,
    },
  });
}

export async function logApiKeyRevoked(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    credentialId: string;
    provider: string;
    name: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.API_KEY_REVOKED,
    entityType: AuditEntityTypes.API_CREDENTIAL,
    entityId: params.credentialId,
    metadata: {
      provider: params.provider,
      name: params.name,
    },
  });
}

// ============================================
// AI AGENT AUDIT HELPERS
// ============================================

export async function logAgentRun(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    agentId: string;
    agentName: string;
    agentType: string;
    taskId?: string;
    success: boolean;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.AGENT_RUN,
    entityType: AuditEntityTypes.AI_AGENT,
    entityId: params.agentId,
    metadata: {
      agentName: params.agentName,
      agentType: params.agentType,
      taskId: params.taskId,
      success: params.success,
    },
  });
}

// ============================================
// INTERVIEW AUDIT HELPERS
// ============================================

export async function logInterviewScheduled(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    interviewId: string;
    candidateId: string;
    candidateName: string;
    scheduledAt: Date;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.INTERVIEW_SCHEDULED,
    entityType: AuditEntityTypes.INTERVIEW,
    entityId: params.interviewId,
    metadata: {
      candidateId: params.candidateId,
      candidateName: params.candidateName,
      scheduledAt: params.scheduledAt.toISOString(),
    },
  });
}

export async function logInterviewCancelled(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    interviewId: string;
    candidateId: string;
    candidateName: string;
    reason?: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.INTERVIEW_CANCELLED,
    entityType: AuditEntityTypes.INTERVIEW,
    entityId: params.interviewId,
    metadata: {
      candidateId: params.candidateId,
      candidateName: params.candidateName,
      reason: params.reason,
    },
  });
}

// ============================================
// DISC TEST AUDIT HELPERS
// ============================================

export async function logDiscTestSent(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    testId: string;
    candidateId: string;
    candidateName: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.DISC_TEST_SENT,
    entityType: AuditEntityTypes.DISC_TEST,
    entityId: params.testId,
    metadata: {
      candidateId: params.candidateId,
      candidateName: params.candidateName,
    },
  });
}

// ============================================
// MESSAGE AUDIT HELPERS
// ============================================

export async function logMessageSent(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    messageId: string;
    conversationId: string;
    channel: string;
    candidateId?: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.MESSAGE_SENT,
    entityType: AuditEntityTypes.MESSAGE,
    entityId: params.messageId,
    metadata: {
      conversationId: params.conversationId,
      channel: params.channel,
      candidateId: params.candidateId,
    },
  });
}

// ============================================
// EXPORT AUDIT HELPERS
// ============================================

export async function logDataExport(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    exportType: string;
    entityType: string;
    format: 'csv' | 'json';
    recordCount: number;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.EXPORT,
    entityType: params.entityType as AuditEntityType,
    metadata: {
      exportType: params.exportType,
      format: params.format,
      recordCount: params.recordCount,
    },
  });
}

// ============================================
// SETTINGS AUDIT HELPERS
// ============================================

export async function logSettingsChange(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    settingType: string;
    changes: Record<string, { old: unknown; new: unknown }>;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.SETTINGS_CHANGE,
    entityType: AuditEntityTypes.TENANT,
    changes: params.changes,
    metadata: {
      settingType: params.settingType,
    },
  });
}

export async function logPermissionChange(
  request: NextRequest,
  params: {
    tenantId: string;
    userId?: string | null;
    targetUserId: string;
    targetUserEmail: string;
    oldRole: string;
    newRole: string;
  }
) {
  await logAuditFromRequest(request, {
    tenantId: params.tenantId,
    userId: params.userId,
    action: AuditActions.PERMISSION_CHANGE,
    entityType: AuditEntityTypes.USER,
    entityId: params.targetUserId,
    changes: {
      role: { old: params.oldRole, new: params.newRole },
    },
    metadata: {
      targetUserEmail: params.targetUserEmail,
    },
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create a diff between two objects for audit logging
 */
export function createDiff<T extends Record<string, unknown>>(
  oldObj: Partial<T>,
  newObj: Partial<T>,
  keysToTrack?: (keyof T)[]
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  
  const allKeys = keysToTrack 
    ? keysToTrack as string[]
    : [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])];
  
  for (const key of allKeys) {
    const oldValue = oldObj[key as keyof T];
    const newValue = newObj[key as keyof T];
    
    // Only include changed values
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = {
        old: oldValue,
        new: newValue,
      };
    }
  }
  
  return changes;
}
