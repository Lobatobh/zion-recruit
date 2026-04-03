/**
 * Audit Logs Export API - Export logs as CSV/JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportAuditLogsCsv, exportAuditLogsJson } from '@/lib/audit';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant ID from session
    const tenantId = (session.user as { tenantId?: string })?.tenantId || 'demo-tenant';
    
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const format = searchParams.get('format') || 'csv';
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Validate format
    if (format !== 'csv' && format !== 'json') {
      return NextResponse.json({ error: 'Invalid format. Use "csv" or "json"' }, { status: 400 });
    }

    // Generate export
    let content: string;
    let contentType: string;
    let filename: string;
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      content = await exportAuditLogsCsv({
        tenantId,
        userId,
        action,
        entityType,
        startDate,
        endDate,
      });
      contentType = 'text/csv';
      filename = `audit-logs-${timestamp}.csv`;
    } else {
      content = await exportAuditLogsJson({
        tenantId,
        userId,
        action,
        entityType,
        startDate,
        endDate,
      });
      contentType = 'application/json';
      filename = `audit-logs-${timestamp}.json`;
    }

    // Return as downloadable file
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': content.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}
