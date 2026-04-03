import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, handleWebhookEvent } from '@/lib/stripe/webhooks';

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body
    const payload = await request.text();
    
    // Get signature from header
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify signature
    let event;
    try {
      event = verifyWebhookSignature(payload, signature);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    const result = await handleWebhookEvent(event);

    if (result.received) {
      return NextResponse.json({ received: true });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to process event' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Disable body parsing for webhook verification
export const runtime = 'nodejs';
