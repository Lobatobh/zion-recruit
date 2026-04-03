/**
 * Notification Stats API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { NotificationCategory, NotificationPriority } from '@prisma/client';

// GET /api/notifications/stats - Get notification statistics
export async function GET(request: NextRequest) {
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

    // Check if notification model exists and is accessible
    // Use type assertion to check if the property exists
    type DbWithNotification = typeof db & { notification?: {
      count: (args: { where: Record<string, unknown> }) => Promise<number>;
    }};

    const dbWithNotification = db as DbWithNotification;

    if (!dbWithNotification.notification) {
      // Return empty stats if model isn't available yet
      return NextResponse.json({
        total: 0,
        unread: 0,
        recent: 0,
        urgent: 0,
        byCategory: Object.fromEntries(
          Object.values(NotificationCategory).map(c => [c, 0])
        ),
        byPriority: Object.fromEntries(
          Object.values(NotificationPriority).map(p => [p, 0])
        ),
      });
    }

    const notification = dbWithNotification.notification;

    // Base where clause for user's notifications
    const baseWhere = {
      tenantId,
      isArchived: false,
      OR: [
        { userId: userId || undefined },
        { userId: null },
      ],
    } as const;

    // Get counts by different criteria
    const [
      total,
      unread,
      byCategory,
      byPriority,
      recentCount,
      urgentCount,
    ] = await Promise.all([
      // Total notifications
      notification.count({ where: baseWhere }),

      // Unread count
      notification.count({
        where: { ...baseWhere, isRead: false },
      }),

      // Count by category
      Promise.all(
        Object.values(NotificationCategory).map(async (cat) => ({
          category: cat,
          count: await notification.count({
            where: { ...baseWhere, category: cat },
          }),
        }))
      ),

      // Count by priority
      Promise.all(
        Object.values(NotificationPriority).map(async (pri) => ({
          priority: pri,
          count: await notification.count({
            where: { ...baseWhere, priority: pri, isRead: false },
          }),
        }))
      ),

      // Recent (last 24 hours)
      notification.count({
        where: {
          ...baseWhere,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Urgent unread
      notification.count({
        where: {
          ...baseWhere,
          isRead: false,
          priority: 'URGENT',
        },
      }),
    ]);

    // Convert arrays to objects
    const categoryStats = Object.fromEntries(
      byCategory.map((c) => [c.category, c.count])
    );

    const priorityStats = Object.fromEntries(
      byPriority.map((p) => [p.priority, p.count])
    );

    return NextResponse.json({
      total,
      unread,
      recent: recentCount,
      urgent: urgentCount,
      byCategory: categoryStats,
      byPriority: priorityStats,
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return NextResponse.json({ error: 'Failed to fetch notification stats' }, { status: 500 });
  }
}
