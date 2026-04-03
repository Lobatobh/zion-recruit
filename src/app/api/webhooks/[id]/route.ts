/**
 * Webhook by ID API Route
 * 
 * GET    /api/webhooks/[id] - Get webhook details
 * PUT    /api/webhooks/[id] - Update webhook
 * DELETE /api/webhooks/[id] - Delete webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  getWebhook,
  updateWebhook,
  deleteWebhook,
  regenerateSecret,
  validateWebhookInput,
  WebhookEventTypeValue,
} from '@/lib/webhooks';

// GET /api/webhooks/[id] - Get webhook
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user and tenant
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });
    
    if (!user || user.memberships.length === 0) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 404 }
      );
    }
    
    const tenantId = user.memberships[0].tenantId;
    const { id } = await params;
    
    const webhook = await getWebhook(id, tenantId);
    
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ webhook });
  } catch (error) {
    console.error('Error fetching webhook:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook' },
      { status: 500 }
    );
  }
}

// PUT /api/webhooks/[id] - Update webhook
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user and tenant
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });
    
    if (!user || user.memberships.length === 0) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 404 }
      );
    }
    
    const tenantId = user.memberships[0].tenantId;
    const { id } = await params;
    
    // Parse request body
    const body = await request.json();
    const { name, url, events, isActive, regenerateSecret: shouldRegenerate } = body;
    
    // Handle secret regeneration
    if (shouldRegenerate) {
      const result = await regenerateSecret(id, tenantId);
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        secret: result.secret,
        message: 'Secret regenerated successfully. Update your endpoint with the new secret!',
      });
    }
    
    // Build update input
    const input: {
      name?: string;
      url?: string;
      events?: WebhookEventTypeValue[];
      isActive?: boolean;
    } = {};
    
    if (name !== undefined) input.name = name;
    if (url !== undefined) input.url = url;
    if (events !== undefined) input.events = events as WebhookEventTypeValue[];
    if (isActive !== undefined) input.isActive = isActive;
    
    // Validate input
    const validation = validateWebhookInput(input);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    // Update webhook
    const result = await updateWebhook(id, tenantId, input);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      webhook: result.webhook,
      message: 'Webhook updated successfully',
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks/[id] - Delete webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user and tenant
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });
    
    if (!user || user.memberships.length === 0) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 404 }
      );
    }
    
    const tenantId = user.memberships[0].tenantId;
    const { id } = await params;
    
    const result = await deleteWebhook(id, tenantId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
