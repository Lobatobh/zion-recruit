/**
 * API Alerts API
 * Manage usage alerts and notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/credentials/alerts - List alerts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const alerts = await db.apiAlert.findMany({
      where: { tenantId },
      orderBy: [{ isResolved: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
