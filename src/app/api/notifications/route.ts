/**
 * Notifications API
 * CRUD operations for system notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper';
import { NotificationType, NotificationCategory, NotificationPriority } from '@prisma/client';

// GET /api/notifications - List notifications
export async function GET(request: NextRequest) {
  try {
    const { user, session } = await requireAuth();
    const tenantId = requireTenant(user);
    const userId = user.id;

    // Check if notification model exists in db
    if (!('notification' in db)) {
      // Return empty list if model isn't available yet (during hot reload)
      return NextResponse.json({
        notifications: [],
        total: 0,
        unreadCount: 0,
        hasMore: false,
      });
    }

    const { searchParams } = new URL(request.url);
    const isRead = searchParams.get('isRead');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: {
      tenantId: string;
      isRead?: boolean;
      isArchived: boolean;
      category?: NotificationCategory;
      priority?: NotificationPriority;
      OR: Array<{ userId: string | null | undefined }>;
    } = {
      tenantId,
      isArchived: false,
      // Get notifications for this user OR for all users (userId is null)
      OR: [
        { userId: userId || undefined },
        { userId: null },
      ],
    };

    if (isRead !== null && isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    if (category && Object.values(NotificationCategory).includes(category as NotificationCategory)) {
      where.category = category as NotificationCategory;
    }

    if (priority && Object.values(NotificationPriority).includes(priority as NotificationPriority)) {
      where.priority = priority as NotificationPriority;
    }

    // Get notifications
    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: {
          tenantId,
          isRead: false,
          isArchived: false,
          OR: [
            { userId: userId || undefined },
            { userId: null },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      notifications,
      total,
      unreadCount,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// POST /api/notifications - Create notification
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    // Check if notification model exists in db
    if (!('notification' in db)) {
      return NextResponse.json({ error: 'Notification model not available' }, { status: 503 });
    }

    const body = await request.json();
    const {
      userId,
      type,
      category,
      priority = 'NORMAL',
      title,
      message,
      description,
      actionUrl,
      actionLabel,
      entityType,
      entityId,
      isPinned = false,
      expiresAt,
    } = body;

    // Validate required fields
    if (!type || !category || !title || !message) {
      return NextResponse.json(
        { error: 'Type, category, title, and message are required' },
        { status: 400 }
      );
    }

    // Validate enums
    if (!Object.values(NotificationType).includes(type)) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    if (!Object.values(NotificationCategory).includes(category)) {
      return NextResponse.json({ error: 'Invalid notification category' }, { status: 400 });
    }

    if (priority && !Object.values(NotificationPriority).includes(priority)) {
      return NextResponse.json({ error: 'Invalid notification priority' }, { status: 400 });
    }

    // Create notification
    const notification = await db.notification.create({
      data: {
        tenantId,
        userId: userId || null,
        type,
        category,
        priority,
        title,
        message,
        description,
        actionUrl,
        actionLabel,
        entityType,
        entityId,
        isPinned,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
