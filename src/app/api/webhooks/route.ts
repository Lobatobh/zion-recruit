/**
 * Webhooks API Route
 * 
 * GET  /api/webhooks - List all webhooks for tenant
 * POST /api/webhooks - Create a new webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper';
import {
  createWebhook,
  getWebhooks,
  validateWebhookInput,
  WebhookEventTypeValue,
} from '@/lib/webhooks';

// GET /api/webhooks - List webhooks
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);
    
    const webhooks = await getWebhooks(tenantId);
    
    return NextResponse.json({ webhooks });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// POST /api/webhooks - Create webhook
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);
    
    // Parse request body
    const body = await request.json();
    const { name, url, events, isActive } = body;
    
    // Validate events
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'At least one event type is required' },
        { status: 400 }
      );
    }
    
    const input = {
      tenantId,
      name,
      url,
      events: events as WebhookEventTypeValue[],
      isActive,
    };
    
    // Validate input
    const validation = validateWebhookInput(input);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    // Create webhook
    const result = await createWebhook(input);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      webhook: result.webhook,
      message: 'Webhook created successfully. Save the secret - it will only be shown once!',
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
