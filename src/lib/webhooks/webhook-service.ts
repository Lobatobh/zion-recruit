/**
 * Webhook Service
 * 
 * Main webhook management service for CRUD operations,
 * testing, and delivery history
 */

import { db } from '@/lib/db';
import { 
  WebhookEventTypeValue, 
  WebhookPayload, 
  buildWebhookPayload 
} from './event-types';
import { 
  generateWebhookSecret, 
  encryptSecret, 
  decryptSecret,
  generateTestSignature,
} from './webhook-signature';
import { 
  dispatchWebhookEvent, 
  deliverWebhookImmediately,
  DeliveryStatus 
} from './webhook-dispatcher';

// Types
export interface CreateWebhookInput {
  tenantId: string;
  name: string;
  url: string;
  events: WebhookEventTypeValue[];
  isActive?: boolean;
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  events?: WebhookEventTypeValue[];
  isActive?: boolean;
}

export interface WebhookWithDecryptedSecret {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventTypeValue[];
  isActive: boolean;
  lastTriggeredAt: Date | null;
  lastStatus: string | null;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDeliveryWithWebhook {
  id: string;
  webhookId: string;
  eventType: string;
  payload: WebhookPayload;
  statusCode: number | null;
  response: string | null;
  deliveredAt: Date | null;
  attempts: number;
  nextRetryAt: Date | null;
  createdAt: Date;
  webhook: {
    id: string;
    name: string;
    url: string;
  };
}

// Validation
const VALID_URL_REGEX = /^https?:\/\/.+/;
const MAX_NAME_LENGTH = 100;
const MAX_URL_LENGTH = 500;
const MAX_EVENTS = 50;

/**
 * Validate webhook input
 */
export function validateWebhookInput(input: CreateWebhookInput | UpdateWebhookInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if ('name' in input && input.name !== undefined) {
    if (!input.name || input.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (input.name.length > MAX_NAME_LENGTH) {
      errors.push(`Name must be ${MAX_NAME_LENGTH} characters or less`);
    }
  }
  
  if ('url' in input && input.url !== undefined) {
    if (!input.url || input.url.trim().length === 0) {
      errors.push('URL is required');
    } else if (!VALID_URL_REGEX.test(input.url)) {
      errors.push('URL must start with http:// or https://');
    } else if (input.url.length > MAX_URL_LENGTH) {
      errors.push(`URL must be ${MAX_URL_LENGTH} characters or less`);
    }
  }
  
  if ('events' in input && input.events !== undefined) {
    if (!input.events || input.events.length === 0) {
      errors.push('At least one event type is required');
    } else if (input.events.length > MAX_EVENTS) {
      errors.push(`Cannot subscribe to more than ${MAX_EVENTS} events`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new webhook
 */
export async function createWebhook(input: CreateWebhookInput): Promise<{
  success: boolean;
  webhook?: WebhookWithDecryptedSecret;
  error?: string;
}> {
  // Validate input
  const validation = validateWebhookInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }
  
  // Check for duplicate name
  const existing = await db.webhook.findUnique({
    where: {
      tenantId_name: {
        tenantId: input.tenantId,
        name: input.name,
      },
    },
  });
  
  if (existing) {
    return { success: false, error: 'A webhook with this name already exists' };
  }
  
  // Generate and encrypt secret
  const secret = generateWebhookSecret();
  const encryptedSecret = encryptSecret(secret);
  
  try {
    const webhook = await db.webhook.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        url: input.url,
        secret: encryptedSecret,
        events: JSON.stringify(input.events),
        isActive: input.isActive ?? true,
      },
    });
    
    return {
      success: true,
      webhook: {
        ...webhook,
        secret, // Return decrypted secret only on creation
        events: input.events,
      },
    };
  } catch (error) {
    console.error('Failed to create webhook:', error);
    return { success: false, error: 'Failed to create webhook' };
  }
}

/**
 * Get all webhooks for a tenant
 */
export async function getWebhooks(tenantId: string): Promise<WebhookWithDecryptedSecret[]> {
  const webhooks = await db.webhook.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
  
  return webhooks.map(webhook => ({
    ...webhook,
    secret: '', // Don't expose secret in list
    events: JSON.parse(webhook.events) as WebhookEventTypeValue[],
  }));
}

/**
 * Get a single webhook by ID
 */
export async function getWebhook(
  webhookId: string,
  tenantId: string
): Promise<WebhookWithDecryptedSecret | null> {
  const webhook = await db.webhook.findFirst({
    where: {
      id: webhookId,
      tenantId,
    },
  });
  
  if (!webhook) {
    return null;
  }
  
  return {
    ...webhook,
    secret: '', // Don't expose secret
    events: JSON.parse(webhook.events) as WebhookEventTypeValue[],
  };
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  webhookId: string,
  tenantId: string,
  input: UpdateWebhookInput
): Promise<{
  success: boolean;
  webhook?: WebhookWithDecryptedSecret;
  error?: string;
}> {
  // Validate input
  const validation = validateWebhookInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }
  
  // Check webhook exists
  const existing = await db.webhook.findFirst({
    where: { id: webhookId, tenantId },
  });
  
  if (!existing) {
    return { success: false, error: 'Webhook not found' };
  }
  
  // Check for duplicate name if name is being changed
  if (input.name && input.name !== existing.name) {
    const duplicate = await db.webhook.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: input.name,
        },
      },
    });
    
    if (duplicate) {
      return { success: false, error: 'A webhook with this name already exists' };
    }
  }
  
  try {
    const webhook = await db.webhook.update({
      where: { id: webhookId },
      data: {
        name: input.name,
        url: input.url,
        events: input.events ? JSON.stringify(input.events) : undefined,
        isActive: input.isActive,
      },
    });
    
    return {
      success: true,
      webhook: {
        ...webhook,
        secret: '',
        events: JSON.parse(webhook.events) as WebhookEventTypeValue[],
      },
    };
  } catch (error) {
    console.error('Failed to update webhook:', error);
    return { success: false, error: 'Failed to update webhook' };
  }
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(
  webhookId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const existing = await db.webhook.findFirst({
    where: { id: webhookId, tenantId },
  });
  
  if (!existing) {
    return { success: false, error: 'Webhook not found' };
  }
  
  try {
    await db.webhook.delete({
      where: { id: webhookId },
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete webhook:', error);
    return { success: false, error: 'Failed to delete webhook' };
  }
}

/**
 * Regenerate webhook secret
 */
export async function regenerateSecret(
  webhookId: string,
  tenantId: string
): Promise<{ success: boolean; secret?: string; error?: string }> {
  const existing = await db.webhook.findFirst({
    where: { id: webhookId, tenantId },
  });
  
  if (!existing) {
    return { success: false, error: 'Webhook not found' };
  }
  
  const newSecret = generateWebhookSecret();
  const encryptedSecret = encryptSecret(newSecret);
  
  try {
    await db.webhook.update({
      where: { id: webhookId },
      data: { secret: encryptedSecret },
    });
    
    return { success: true, secret: newSecret };
  } catch (error) {
    console.error('Failed to regenerate secret:', error);
    return { success: false, error: 'Failed to regenerate secret' };
  }
}

/**
 * Test a webhook by sending a test payload
 */
export async function testWebhook(
  webhookId: string,
  tenantId: string
): Promise<{
  success: boolean;
  statusCode?: number;
  response?: string;
  error?: string;
  signature?: { signature: string; timestamp: number };
}> {
  const webhook = await db.webhook.findFirst({
    where: { id: webhookId, tenantId },
  });
  
  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }
  
  // Create test payload
  const testPayload = buildWebhookPayload(
    'task.completed' as WebhookEventTypeValue,
    {
      test: true,
      message: 'This is a test webhook delivery',
      webhookName: webhook.name,
    },
    tenantId
  );
  
  // Decrypt secret
  const secret = decryptSecret(webhook.secret);
  
  // Generate signature for display
  const signature = generateTestSignature(testPayload, secret);
  
  // Send webhook
  const result = await deliverWebhookImmediately(
    {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      secret,
      events: JSON.parse(webhook.events),
      failureCount: webhook.failureCount,
    },
    testPayload
  );
  
  return {
    ...result,
    signature: { signature: signature.signature, timestamp: signature.timestamp },
  };
}

/**
 * Get delivery history for a webhook
 */
export async function getDeliveryHistory(
  webhookId: string,
  tenantId: string,
  options?: {
    limit?: number;
    offset?: number;
    eventType?: string;
  }
): Promise<{ deliveries: WebhookDeliveryWithWebhook[]; total: number }> {
  // Verify webhook belongs to tenant
  const webhook = await db.webhook.findFirst({
    where: { id: webhookId, tenantId },
  });
  
  if (!webhook) {
    return { deliveries: [], total: 0 };
  }
  
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  
  const where = {
    webhookId,
    ...(options?.eventType ? { eventType: options.eventType } : {}),
  };
  
  const [deliveries, total] = await Promise.all([
    db.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.webhookDelivery.count({ where }),
  ]);
  
  return {
    deliveries: deliveries.map(d => ({
      ...d,
      payload: JSON.parse(d.payload) as WebhookPayload,
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
      },
    })),
    total,
  };
}

/**
 * Get all delivery history for a tenant
 */
export async function getAllDeliveryHistory(
  tenantId: string,
  options?: {
    limit?: number;
    offset?: number;
    eventType?: string;
  }
): Promise<{ deliveries: WebhookDeliveryWithWebhook[]; total: number }> {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  
  // Get webhook IDs for tenant
  const webhooks = await db.webhook.findMany({
    where: { tenantId },
    select: { id: true },
  });
  
  const webhookIds = webhooks.map(w => w.id);
  
  if (webhookIds.length === 0) {
    return { deliveries: [], total: 0 };
  }
  
  const where = {
    webhookId: { in: webhookIds },
    ...(options?.eventType ? { eventType: options.eventType } : {}),
  };
  
  const [deliveries, total] = await Promise.all([
    db.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        webhook: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    }),
    db.webhookDelivery.count({ where }),
  ]);
  
  return {
    deliveries: deliveries.map(d => ({
      ...d,
      payload: JSON.parse(d.payload) as WebhookPayload,
    })),
    total,
  };
}

/**
 * Get delivery status
 */
export function getDeliveryStatus(delivery: {
  deliveredAt: Date | null;
  statusCode: number | null;
  nextRetryAt: Date | null;
  attempts: number;
}): DeliveryStatus {
  if (delivery.deliveredAt && delivery.statusCode && delivery.statusCode >= 200 && delivery.statusCode < 300) {
    return 'success';
  }
  
  if (delivery.nextRetryAt) {
    return 'retrying';
  }
  
  if (delivery.deliveredAt) {
    return 'failed';
  }
  
  return 'pending';
}

/**
 * Trigger a webhook event (wrapper for convenience)
 */
export async function triggerWebhookEvent(
  tenantId: string,
  eventType: WebhookEventTypeValue,
  data: Record<string, unknown>
): Promise<{ dispatched: number; failed: number }> {
  const payload = buildWebhookPayload(eventType, data, tenantId);
  return dispatchWebhookEvent(tenantId, eventType, payload);
}

// Re-export types and functions
export { generateWebhookSecret } from './webhook-signature';
export { WebhookEventType, EventCategory } from './event-types';
