/**
 * Resend Email Webhook - Zion Recruit
 * Receives delivery status updates and events from Resend email service.
 *
 * Supported events:
 * - email.sent       — Email was accepted by Resend for delivery
 * - email.delivered  — Email was delivered to the recipient's inbox
 * - email.opened     — Recipient opened the email
 * - email.clicked    — Recipient clicked a link in the email
 * - email.bounced    — Email bounced (permanent delivery failure)
 * - email.complained — Recipient marked the email as spam
 *
 * Authentication:
 * - If RESEND_WEBHOOK_SECRET is set, verifies the 'x-webhook-signature' header
 * - If INTERNAL_SERVICE_TOKEN is set, verifies the 'x-service-token' header
 * - If neither is set, allows all requests (development mode)
 *
 * GET /api/email/webhook — Endpoint verification (Resend sends GET to confirm)
 * POST /api/email/webhook — Receive webhook events
 */

import { NextRequest, NextResponse } from "next/server";

// ============================================
// Types
// ============================================

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject?: string;
    status?: string;
    tags?: string[];
    created_at?: string;
    opened_at?: string;
    clicked_at?: string;
    bounced_at?: string;
    bounced_reason?: string;
    complaint_at?: string;
    complaint_reason?: string;
  };
}

type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.opened"
  | "email.clicked"
  | "email.bounced"
  | "email.complained";

const VALID_EVENT_TYPES: ResendEventType[] = [
  "email.sent",
  "email.delivered",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
];

// ============================================
// Authentication
// ============================================

/**
 * Verify webhook authentication.
 * Returns true if the request is authenticated (or in development mode).
 */
function verifyWebhookAuth(request: NextRequest): boolean {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const serviceToken = process.env.INTERNAL_SERVICE_TOKEN;

  // Development mode — no auth configured
  if (!webhookSecret && !serviceToken) {
    console.log("[Email Webhook] No auth configured — development mode");
    return true;
  }

  // Check internal service token
  if (serviceToken) {
    const token = request.headers.get("x-service-token");
    if (token === serviceToken) {
      return true;
    }
  }

  // Check Resend webhook signature
  if (webhookSecret) {
    const signature = request.headers.get("x-webhook-signature");
    if (signature && signature === webhookSecret) {
      return true;
    }
  }

  return false;
}

// ============================================
// Event Handlers
// ============================================

/**
 * Process and log a Resend webhook event.
 * Future: persist events to DB for analytics / notification tracking.
 */
function processEvent(event: ResendWebhookEvent): void {
  const { type, data } = event;
  const timestamp = event.created_at;

  switch (type as ResendEventType) {
    case "email.sent":
      console.log(
        `[Email Webhook] ✉️ Email SENT | id=${data.email_id} | to=${data.to.join(", ")} | subject=${data.subject || "—"}`
      );
      break;

    case "email.delivered":
      console.log(
        `[Email Webhook] ✅ Email DELIVERED | id=${data.email_id} | to=${data.to.join(", ")}`
      );
      break;

    case "email.opened":
      console.log(
        `[Email Webhook] 👁️ Email OPENED | id=${data.email_id} | to=${data.to.join(", ")} | opened_at=${data.opened_at}`
      );
      break;

    case "email.clicked":
      console.log(
        `[Email Webhook] 🔗 Email CLICKED | id=${data.email_id} | to=${data.to.join(", ")} | clicked_at=${data.clicked_at}`
      );
      break;

    case "email.bounced":
      console.warn(
        `[Email Webhook] ⚠️ Email BOUNCED | id=${data.email_id} | to=${data.to.join(", ")} | reason=${data.bounced_reason || "unknown"} | bounced_at=${data.bounced_at}`
      );
      break;

    case "email.complained":
      console.warn(
        `[Email Webhook] 🚫 Email COMPLAINED | id=${data.email_id} | to=${data.to.join(", ")} | reason=${data.complaint_reason || "unknown"} | complaint_at=${data.complaint_at}`
      );
      break;

    default:
      console.log(`[Email Webhook] Unknown event type: ${type}`);
      break;
  }
}

// ============================================
// Route Handlers
// ============================================

/**
 * GET /api/email/webhook
 * Endpoint verification — Resend may send a GET request to verify the endpoint exists.
 */
export async function GET(request: NextRequest) {
  // Verify authentication for verification requests
  if (!verifyWebhookAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "active",
    service: "resend-webhook",
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/email/webhook
 * Receive delivery status events from Resend.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook authentication
    if (!verifyWebhookAuth(request)) {
      console.warn("[Email Webhook] Authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Resend may send a single event or a batch
    const events: ResendWebhookEvent[] = Array.isArray(body) ? body : [body];

    for (const event of events) {
      // Validate event structure
      if (!event.type || !event.data?.email_id) {
        console.warn("[Email Webhook] Invalid event structure, skipping:", event);
        continue;
      }

      // Validate event type
      if (!VALID_EVENT_TYPES.includes(event.type as ResendEventType)) {
        console.warn(`[Email Webhook] Unknown event type: ${event.type}`);
        continue;
      }

      // Process the event
      processEvent(event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Email Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    );
  }
}
