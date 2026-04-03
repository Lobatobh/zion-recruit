/**
 * API Alert Single Item API
 * PATCH operations for resolving alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// PATCH /api/credentials/alerts/[id] - Update alert (resolve, mark as read)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const body = await request.json();

    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Verify alert exists and belongs to tenant
    const existing = await db.apiAlert.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: {
      isRead?: boolean;
      readAt?: Date;
      readBy?: string;
      isResolved?: boolean;
      resolvedAt?: Date;
      resolvedBy?: string;
    } = {};

    if (body.isRead !== undefined) {
      updateData.isRead = body.isRead;
      if (body.isRead) {
        updateData.readAt = new Date();
        updateData.readBy = session?.user?.id;
      }
    }

    if (body.isResolved !== undefined) {
      updateData.isResolved = body.isResolved;
      if (body.isResolved) {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = session?.user?.id;
      }
    }

    // Update alert
    const alert = await db.apiAlert.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
