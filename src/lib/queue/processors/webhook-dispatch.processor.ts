/**
 * Webhook Dispatch Processor
 * Zion Recruit - Background Job Queue System
 * 
 * Dispatches webhook events to external services.
 * Integrates with the new webhook system for proper signature handling and delivery tracking.
 */

import {
  JobProcessor,
  JobProcessorContext,
  JobError,
} from '../job-types';
import { processWebhookDispatch, WebhookPayload } from '@/lib/webhooks';

// Input type for the job queue
interface WebhookDispatchJobInput {
  webhook: {
    id: string;
    name: string;
    url: string;
    secret: string;
    events: string[];
    failureCount: number;
  };
  payload: WebhookPayload;
  deliveryId: string;
  isRetry?: boolean;
}

// Output type
interface WebhookDispatchJobOutput {
  success: boolean;
  statusCode?: number;
  response?: string;
  error?: string;
}

export const webhookDispatchProcessor: JobProcessor<WebhookDispatchJobInput, WebhookDispatchJobOutput> = async (
  input: WebhookDispatchJobInput,
  context: JobProcessorContext
): Promise<WebhookDispatchJobOutput> => {
  const { webhook, payload, deliveryId } = input;
  const { updateProgress, checkCancelled, logger } = context;

  logger.info(`Dispatching webhook to ${webhook.url}`, { 
    webhookId: webhook.id,
    eventType: payload.type,
    deliveryId,
  });

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false);
  }

  await updateProgress(30, 'Preparing webhook request');

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false);
  }

  await updateProgress(50, 'Sending webhook');

  // Process the webhook dispatch using our webhook system
  try {
    const result = await processWebhookDispatch({
      webhook,
      payload,
      deliveryId,
    });

    await updateProgress(100, result.success ? 'Webhook delivered' : 'Webhook failed');

    if (result.success) {
      logger.info(`Webhook dispatched successfully`, {
        webhookId: webhook.id,
        deliveryId,
        eventType: payload.type,
      });
    } else {
      logger.warn(`Webhook delivery failed`, {
        webhookId: webhook.id,
        deliveryId,
        eventType: payload.type,
      });
    }

    return {
      success: result.success,
    };
  } catch (error) {
    logger.error('Webhook dispatch error', error);
    
    throw new JobError(
      `Webhook dispatch failed: ${error instanceof Error ? error.message : String(error)}`,
      'DISPATCH_ERROR',
      true, // Retry on error
      { deliveryId, webhookId: webhook.id }
    );
  }
};

// Legacy processor for backward compatibility with old job format
interface LegacyWebhookDispatchInput {
  url: string;
  method: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  options?: {
    timeout?: number;
    signature?: string;
    retryOnFailure?: boolean;
  };
}

interface LegacyWebhookDispatchOutput {
  url: string;
  statusCode: number;
  response: unknown;
  duration: number;
}

export const legacyWebhookDispatchProcessor: JobProcessor<LegacyWebhookDispatchInput, LegacyWebhookDispatchOutput> = async (
  input: LegacyWebhookDispatchInput,
  context: JobProcessorContext
): Promise<LegacyWebhookDispatchOutput> => {
  const { url, method, payload, headers = {}, options = {} } = input;
  const { updateProgress, checkCancelled, logger } = context;

  logger.info(`Dispatching webhook to ${url}`, { method });

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false);
  }

  await updateProgress(30, 'Preparing webhook request');

  const startTime = Date.now();
  const timeout = options.timeout || 30000; // 30 seconds default

  // Default headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add signature if provided
  if (options.signature) {
    requestHeaders['X-Webhook-Signature'] = options.signature;
  }

  await updateProgress(50, 'Sending webhook');

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false);
  }

  let response: Response;
  let responseText: string;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: method !== 'GET' ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    responseText = await response.text();
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof Error && error.name === 'AbortError') {
      throw new JobError(
        `Webhook request timed out after ${timeout}ms`,
        'TIMEOUT',
        options.retryOnFailure ?? true
      );
    }

    logger.error('Webhook request failed', error);
    throw new JobError(
      `Webhook request failed: ${error instanceof Error ? error.message : String(error)}`,
      'REQUEST_ERROR',
      options.retryOnFailure ?? true
    );
  }

  const duration = Date.now() - startTime;
  const statusCode = response.status;

  await updateProgress(90, 'Processing response');

  // Parse response if JSON
  let responseData: unknown;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = responseText;
  }

  // Check for HTTP errors
  if (!response.ok) {
    const errorMessage = `Webhook returned HTTP ${statusCode}: ${responseText.substring(0, 500)}`;
    
    // 4xx errors are typically not retryable
    const isClientError = statusCode >= 400 && statusCode < 500;
    const retryable = !isClientError && (options.retryOnFailure ?? true);

    throw new JobError(errorMessage, 'HTTP_ERROR', retryable, {
      statusCode,
      response: responseData,
    });
  }

  await updateProgress(100, 'Webhook dispatched');

  logger.info(`Webhook dispatched successfully`, {
    url,
    method,
    statusCode,
    duration,
  });

  return {
    url,
    statusCode,
    response: responseData,
    duration,
  };
};
