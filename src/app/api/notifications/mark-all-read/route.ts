/**
 * Mark All Notifications as Read API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { NotificationCategory } from '@prisma/client';

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    let tenantId = session?.user?.tenantId;
    const userId = session?.user?.id;

    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { category } = body;

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId,
      isRead: false,
      isArchived: false,
      OR: [
        { userId: userId || undefined },
        { userId: null },
      ],
    };

    if (category && Object.values(NotificationCategory).includes(category as NotificationCategory)) {
      where.category = category as NotificationCategory;
    }

    // Update all unread notifications
    const result = await db.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
        readBy: userId,
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} notificações marcadas como lidas`,
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
  }
}
