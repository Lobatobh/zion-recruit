/**
 * API Alerts API
 * Manage usage alerts and notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper';

// GET /api/credentials/alerts - List alerts
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const alerts = await db.apiAlert.findMany({
      where: { tenantId },
      orderBy: [{ isResolved: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    return authErrorResponse(error);
  }
}
