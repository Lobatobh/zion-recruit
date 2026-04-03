import { stripe, getWebhookSecret } from './client';
import { syncSubscriptionFromStripe, cancelSubscription } from './subscriptions';
import { db } from '@/lib/db';
import { Plan } from '@prisma/client';
import Stripe from 'stripe';

export interface WebhookResult {
  received: boolean;
  error?: string;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = getWebhookSecret();
  
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Handle checkout.session.completed event
 * This is triggered when a customer completes a checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const tenantId = session.metadata?.tenantId;
    const plan = session.metadata?.plan as Plan;

    if (!tenantId || !plan) {
      console.error('Missing tenantId or plan in checkout session metadata');
      return;
    }

    // Get the subscription from the session
    const subscriptionId = session.subscription as string;
    
    if (!subscriptionId) {
      console.error('No subscription ID in checkout session');
      return;
    }

    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Sync to database
    await syncSubscriptionFromStripe(subscription, tenantId);

    console.log(`Checkout completed for tenant ${tenantId}, plan ${plan}`);
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const tenantId = subscription.metadata?.tenantId;
    
    if (!tenantId) {
      console.error('Missing tenantId in subscription metadata');
      return;
    }

    await syncSubscriptionFromStripe(subscription, tenantId);
    console.log(`Subscription created for tenant ${tenantId}`);
  } catch (error) {
    console.error('Error handling customer.subscription.created:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const tenantId = subscription.metadata?.tenantId;
    
    if (!tenantId) {
      // Try to find tenant by subscription ID
      const existingSub = await db.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });
      
      if (existingSub) {
        await syncSubscriptionFromStripe(subscription, existingSub.tenantId);
      } else {
        console.error('No tenant found for subscription:', subscription.id);
      }
      return;
    }

    await syncSubscriptionFromStripe(subscription, tenantId);
    console.log(`Subscription updated for tenant ${tenantId}`);
  } catch (error) {
    console.error('Error handling customer.subscription.updated:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const tenantId = subscription.metadata?.tenantId;
    
    // Find subscription in database
    const existingSub = await db.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSub) {
      console.error('No subscription found for deletion:', subscription.id);
      return;
    }

    // Update subscription status
    await db.subscription.update({
      where: { id: existingSub.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    // Downgrade tenant to free plan
    await db.tenant.update({
      where: { id: existingSub.tenantId },
      data: {
        plan: 'FREE',
        maxJobs: 1,
        maxCandidates: 50,
        maxMembers: 1,
      },
    });

    console.log(`Subscription canceled for tenant ${existingSub.tenantId}`);
  } catch (error) {
    console.error('Error handling customer.subscription.deleted:', error);
    throw error;
  }
}

/**
 * Handle invoice.paid event
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    const subscriptionId = invoice.subscription as string;
    
    if (!subscriptionId) return;

    const subscription = await db.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (subscription) {
      // Update subscription period
      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        },
      });
    }

    console.log(`Invoice paid for subscription ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling invoice.paid:', error);
    throw error;
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const subscriptionId = invoice.subscription as string;
    
    if (!subscriptionId) return;

    const subscription = await db.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (subscription) {
      // Update subscription status to past_due
      await db.subscription.update({
        where: { id: subscription.id },
        data: { status: 'PAST_DUE' },
      });

      // TODO: Send notification to tenant about payment failure
      console.log(`Payment failed for tenant ${subscription.tenantId}`);
    }

    console.log(`Invoice payment failed for subscription ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling invoice.payment_failed:', error);
    throw error;
  }
}

/**
 * Handle customer.created event
 */
async function handleCustomerCreated(customer: Stripe.Customer) {
  try {
    const tenantId = customer.metadata?.tenantId;
    
    if (!tenantId) return;

    // Update tenant with customer ID if not already set
    await db.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customer.id },
    });

    console.log(`Customer created for tenant ${tenantId}`);
  } catch (error) {
    console.error('Error handling customer.created:', error);
    throw error;
  }
}

/**
 * Handle customer.updated event
 */
async function handleCustomerUpdated(customer: Stripe.Customer) {
  try {
    const tenantId = customer.metadata?.tenantId;
    
    if (!tenantId) return;

    // Update tenant info if needed
    console.log(`Customer updated for tenant ${tenantId}`);
  } catch (error) {
    console.error('Error handling customer.updated:', error);
    throw error;
  }
}

/**
 * Handle customer.deleted event
 */
async function handleCustomerDeleted(customer: Stripe.Customer) {
  try {
    const tenantId = customer.metadata?.tenantId;
    
    if (!tenantId) return;

    // Remove customer ID from tenant
    await db.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: null },
    });

    // Delete subscription record
    await db.subscription.deleteMany({
      where: { tenantId },
    });

    // Downgrade to free
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        plan: 'FREE',
        maxJobs: 1,
        maxCandidates: 50,
        maxMembers: 1,
      },
    });

    console.log(`Customer deleted for tenant ${tenantId}`);
  } catch (error) {
    console.error('Error handling customer.deleted:', error);
    throw error;
  }
}

/**
 * Main webhook handler
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<WebhookResult> {
  try {
    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      case 'customer.deleted':
        await handleCustomerDeleted(event.data.object as Stripe.Customer);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return {
      received: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
