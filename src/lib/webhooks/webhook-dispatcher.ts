/**
 * Webhook Dispatcher
 * 
 * Handles webhook event dispatching with retry logic, timeout handling,
 * and delivery tracking
 */

import { db } from '@/lib/db';
import { 
  WebhookPayload, 
  WebhookEventTypeValue 
} from './event-types';
import { 
  createSignatureHeaders, 
  decryptSecret 
} from './webhook-signature';
import { getQueue } from '@/lib/queue/job-queue';
import { JobType, JobPriority } from '@/lib/queue/job-types';

// Configuration
const WEBHOOK_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAYS = [
  60000,     // 1 minute
  300000,    // 5 minutes
  900000,    // 15 minutes
  3600000,   // 1 hour
  14400000,  // 4 hours
];

// Delivery status
export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

// Webhook with decrypted secret for dispatch
interface DispatchableWebhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventTypeValue[];
  failureCount: number;
}

/**
 * Get active webhooks for a tenant and event type
 */
async function getActiveWebhooksForEvent(
  tenantId: string,
  eventType: WebhookEventTypeValue
): Promise<DispatchableWebhook[]> {
  const webhooks = await db.webhook.findMany({
    where: {
      tenantId,
      isActive: true,
    },
  });
  
  // Filter webhooks that subscribe to this event type
  const filtered = webhooks.filter(webhook => {
    try {
      const events = JSON.parse(webhook.events) as string[];
      return events.includes(eventType);
    } catch {
      return false;
    }
  });
  
  // Decrypt secrets
  return filtered.map(webhook => ({
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    secret: decryptSecret(webhook.secret),
    events: JSON.parse(webhook.events) as WebhookEventTypeValue[],
    failureCount: webhook.failureCount,
  }));
}

/**
 * Create a delivery record
 */
async function createDeliveryRecord(
  webhookId: string,
  eventType: WebhookEventTypeValue,
  payload: WebhookPayload
): Promise<string> {
  const delivery = await db.webhookDelivery.create({
    data: {
      webhookId,
      eventType,
      payload: JSON.stringify(payload),
      attempts: 0,
    },
  });
  
  return delivery.id;
}

/**
 * Update delivery record
 */
async function updateDeliveryRecord(
  deliveryId: string,
  data: {
    statusCode?: number;
    response?: string;
    deliveredAt?: Date;
    attempts?: number;
    nextRetryAt?: Date | null;
  }
): Promise<void> {
  await db.webhookDelivery.update({
    where: { id: deliveryId },
    data,
  });
}

/**
 * Update webhook status after delivery
 */
async function updateWebhookStatus(
  webhookId: string,
  success: boolean
): Promise<void> {
  if (success) {
    await db.webhook.update({
      where: { id: webhookId },
      data: {
        lastTriggeredAt: new Date(),
        lastStatus: 'success',
        failureCount: 0,
      },
    });
  } else {
    const webhook = await db.webhook.findUnique({
      where: { id: webhookId },
      select: { failureCount: true },
    });
    
    const newFailureCount = (webhook?.failureCount || 0) + 1;
    
    // Disable webhook if too many failures
    const shouldDisable = newFailureCount >= 10;
    
    await db.webhook.update({
      where: { id: webhookId },
      data: {
        lastTriggeredAt: new Date(),
        lastStatus: 'failed',
        failureCount: newFailureCount,
        isActive: shouldDisable ? false : undefined,
      },
    });
    
    if (shouldDisable) {
      console.warn(`Webhook ${webhookId} disabled due to too many failures`);
    }
  }
}

/**
 * Send webhook HTTP request
 */
async function sendWebhookRequest(
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; response?: string; error?: string }> {
  const payloadStr = JSON.stringify(payload);
  const headers = createSignatureHeaders(
    payloadStr, 
    secret, 
    payload.id,
    payload.type
  );
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payloadStr,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const responseText = await response.text().catch(() => '');
    
    return {
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      response: responseText.substring(0, 1000), // Limit response size
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Request timeout' };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error' };
  }
}

/**
 * Calculate next retry delay based on attempt number
 */
function getRetryDelay(attemptNumber: number): number {
  return RETRY_DELAYS[Math.min(attemptNumber, RETRY_DELAYS.length - 1)];
}

/**
 * Dispatch a webhook event to all subscribers
 * This is the main entry point for triggering webhooks
 */
export async function dispatchWebhookEvent(
  tenantId: string,
  eventType: WebhookEventTypeValue,
  payload: WebhookPayload
): Promise<{ dispatched: number; failed: number }> {
  // Get all webhooks that should receive this event
  const webhooks = await getActiveWebhooksForEvent(tenantId, eventType);
  
  if (webhooks.length === 0) {
    return { dispatched: 0, failed: 0 };
  }
  
  let dispatched = 0;
  let failed = 0;
  
  // Create delivery records and queue jobs
  for (const webhook of webhooks) {
    try {
      // Create delivery record
      const deliveryId = await createDeliveryRecord(webhook.id, eventType, payload);
      
      // Queue webhook dispatch as background job
      const queue = getQueue();
      await queue.createJob(
        JobType.WEBHOOK_DISPATCH,
        `Webhook: ${webhook.name}`,
        {
          webhook,
          payload,
          deliveryId,
        },
        {
          tenantId,
          priority: JobPriority.NORMAL,
          relatedType: 'webhook_delivery',
          relatedId: deliveryId,
        }
      );
      
      dispatched++;
    } catch (error) {
      console.error(`Failed to queue webhook ${webhook.id}:`, error);
      failed++;
    }
  }
  
  return { dispatched, failed };
}

/**
 * Process a single webhook dispatch (called by the job processor)
 */
export async function processWebhookDispatch(data: {
  webhook: DispatchableWebhook;
  payload: WebhookPayload;
  deliveryId: string;
}): Promise<{ success: boolean }> {
  const { webhook, payload, deliveryId } = data;
  
  // Increment attempt count
  const delivery = await db.webhookDelivery.findUnique({
    where: { id: deliveryId },
    select: { attempts: true },
  });
  
  const attempts = (delivery?.attempts || 0) + 1;
  
  await updateDeliveryRecord(deliveryId, { attempts });
  
  // Send the webhook request
  const result = await sendWebhookRequest(webhook.url, webhook.secret, payload);
  
  if (result.success) {
    // Success - update records
    await updateDeliveryRecord(deliveryId, {
      statusCode: result.statusCode,
      response: result.response,
      deliveredAt: new Date(),
      nextRetryAt: null,
    });
    
    await updateWebhookStatus(webhook.id, true);
    
    return { success: true };
  }
  
  // Failure - check if we should retry
  if (attempts < MAX_RETRY_ATTEMPTS) {
    const nextRetryAt = new Date(Date.now() + getRetryDelay(attempts));
    
    await updateDeliveryRecord(deliveryId, {
      statusCode: result.statusCode,
      response: result.response || result.error,
      nextRetryAt,
    });
    
    // Re-queue for retry
    const queue = getQueue();
    await queue.createJob(
      JobType.WEBHOOK_DISPATCH,
      `Webhook Retry: ${webhook.name}`,
      {
        webhook,
        payload,
        deliveryId,
        isRetry: true,
      },
      {
        tenantId: payload.tenantId,
        priority: JobPriority.LOW,
        runAt: nextRetryAt,
        relatedType: 'webhook_delivery',
        relatedId: deliveryId,
      }
    );
    
    return { success: false };
  }
  
  // Max retries reached - mark as failed
  await updateDeliveryRecord(deliveryId, {
    statusCode: result.statusCode,
    response: result.response || result.error,
    nextRetryAt: null,
  });
  
  await updateWebhookStatus(webhook.id, false);
  
  return { success: false };
}

/**
 * Deliver webhook immediately (for testing)
 */
export async function deliverWebhookImmediately(
  webhook: DispatchableWebhook,
  payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; response?: string; error?: string }> {
  // Create delivery record
  const deliveryId = await createDeliveryRecord(webhook.id, payload.type, payload);
  
  // Send request
  const result = await sendWebhookRequest(webhook.url, webhook.secret, payload);
  
  // Update records
  await updateDeliveryRecord(deliveryId, {
    statusCode: result.statusCode,
    response: result.response || result.error,
    deliveredAt: new Date(),
    attempts: 1,
  });
  
  await updateWebhookStatus(webhook.id, result.success);
  
  return result;
}

/**
 * Get pending retries
 */
export async function getPendingRetries(): Promise<Array<{
  deliveryId: string;
  webhookId: string;
  eventType: string;
  nextRetryAt: Date;
}>> {
  const pending = await db.webhookDelivery.findMany({
    where: {
      deliveredAt: null,
      nextRetryAt: { lte: new Date() },
    },
    select: {
      id: true,
      webhookId: true,
      eventType: true,
      nextRetryAt: true,
    },
  });
  
  return pending.map(d => ({
    deliveryId: d.id,
    webhookId: d.webhookId,
    eventType: d.eventType,
    nextRetryAt: d.nextRetryAt!,
  }));
}

/**
 * Process pending retries
 */
export async function processPendingRetries(): Promise<{ processed: number }> {
  const pending = await getPendingRetries();
  
  for (const item of pending) {
    const delivery = await db.webhookDelivery.findUnique({
      where: { id: item.deliveryId },
      include: { webhook: true },
    });
    
    if (!delivery || !delivery.webhook) continue;
    
    const webhook: DispatchableWebhook = {
      id: delivery.webhook.id,
      name: delivery.webhook.name,
      url: delivery.webhook.url,
      secret: decryptSecret(delivery.webhook.secret),
      events: JSON.parse(delivery.webhook.events),
      failureCount: delivery.webhook.failureCount,
    };
    
    const payload = JSON.parse(delivery.payload) as WebhookPayload;
    
    await processWebhookDispatch({
      webhook,
      payload,
      deliveryId: item.deliveryId,
    });
  }
  
  return { processed: pending.length };
}
