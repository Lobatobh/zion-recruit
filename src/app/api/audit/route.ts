/**
 * Audit Logs API - GET logs with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, getAuditLogById } from '@/lib/audit';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant ID from session (using email to look up membership)
    const tenantId = (session.user as { tenantId?: string })?.tenantId || 'demo-tenant';
    
    const { searchParams } = new URL(request.url);
    
    // Check if requesting a single log
    const logId = searchParams.get('id');
    if (logId) {
      const log = await getAuditLogById(logId, tenantId);
      if (!log) {
        return NextResponse.json({ error: 'Log not found' }, { status: 404 });
      }
      return NextResponse.json({ log });
    }

    // Parse filter parameters
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Validate dates if provided
    if (startDateStr && isNaN(startDate!.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
    }
    if (endDateStr && isNaN(endDate!.getTime())) {
      return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
    }

    const result = await getAuditLogs({
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page,
      limit,
    });

    return NextResponse.json({
      logs: result.logs,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
