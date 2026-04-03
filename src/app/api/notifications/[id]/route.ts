/**
 * Single Notification API
 * GET, PATCH, DELETE operations for a single notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/notifications/[id] - Get single notification
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    const notification = await db.notification.findFirst({
      where: { id, tenantId },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 });
  }
}

// PATCH /api/notifications/[id] - Update notification (mark as read, archive, pin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const userId = session?.user?.id;

    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    // Verify notification exists
    const existing = await db.notification.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const body = await request.json();
    const { isRead, isArchived, isPinned } = body;

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (isRead !== undefined) {
      updateData.isRead = isRead;
      if (isRead) {
        updateData.readAt = new Date();
        updateData.readBy = userId;
      }
    }

    if (isArchived !== undefined) {
      updateData.isArchived = isArchived;
      if (isArchived) {
        updateData.archivedAt = new Date();
        updateData.archivedBy = userId;
      }
    }

    if (isPinned !== undefined) {
      updateData.isPinned = isPinned;
    }

    // Update notification
    const notification = await db.notification.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    // Verify notification exists
    const existing = await db.notification.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Delete notification
    await db.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
