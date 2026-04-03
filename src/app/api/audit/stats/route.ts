/**
 * Audit Stats API - Get audit statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuditStats } from '@/lib/audit';
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
    
    // Parse date range
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Validate dates if provided
    if (startDateStr && isNaN(startDate!.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
    }
    if (endDateStr && isNaN(endDate!.getTime())) {
      return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
    }

    const stats = await getAuditStats({
      tenantId,
      startDate,
      endDate,
    });

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit statistics' },
      { status: 500 }
    );
  }
}
