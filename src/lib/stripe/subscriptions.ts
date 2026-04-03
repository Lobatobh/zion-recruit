import { stripe } from './client';
import { PLANS, type PlanConfig } from './products';
import { db } from '@/lib/db';
import { Plan, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  tenantId: string;
  plan: Plan;
  trialDays?: number;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  tenantId: string;
  plan: Plan;
  trialDays?: number;
}) {
  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: params.customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        tenantId: params.tenantId,
        plan: params.plan,
      },
      subscription_data: {
        metadata: {
          tenantId: params.tenantId,
          plan: params.plan,
        },
      },
    };

    // Add trial if specified
    if (params.trialDays && params.trialDays > 0) {
      sessionParams.subscription_data!.trial_period_days = params.trialDays;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create a subscription directly (without checkout)
 */
export async function createSubscription(params: CreateSubscriptionParams) {
  try {
    const planConfig = PLANS[params.plan];
    
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: params.customerId,
      items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        tenantId: params.tenantId,
        plan: params.plan,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    };

    // Add trial if specified
    if (params.trialDays && params.trialDays > 0) {
      subscriptionParams.trial_period_days = params.trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);
    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

/**
 * Get subscription by ID
 */
export async function getStripeSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    return null;
  }
}

/**
 * Update subscription (upgrade/downgrade)
 */
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string,
  newPlan: Plan
) {
  try {
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Update the subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      metadata: {
        ...subscription.metadata,
        plan: newPlan,
      },
      proration_behavior: 'create_prorations',
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
) {
  try {
    let subscription: Stripe.Subscription;

    if (immediately) {
      subscription = await stripe.subscriptions.cancel(subscriptionId);
    } else {
      // Cancel at period end
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
    return subscription;
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
}

/**
 * Create billing portal session for customer self-service
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
}

/**
 * Sync subscription data from Stripe to database
 */
export async function syncSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription,
  tenantId: string
) {
  try {
    const plan = (stripeSubscription.metadata?.plan || 'FREE') as Plan;
    const planConfig = PLANS[plan];
    const price = stripeSubscription.items.data[0]?.price;
    
    // Map Stripe status to our status
    const statusMap: Record<string, SubscriptionStatus> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      trialing: 'TRIALING',
      incomplete: 'INCOMPLETE',
      incomplete_expired: 'INCOMPLETE_EXPIRED',
      unpaid: 'UNPAID',
      paused: 'PAUSED',
    };

    const subscriptionData = {
      tenantId,
      stripeCustomerId: stripeSubscription.customer as string,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: price?.id || planConfig.priceId,
      stripeProductId: price?.product as string || planConfig.productId,
      status: statusMap[stripeSubscription.status] || 'ACTIVE',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at 
        ? new Date(stripeSubscription.canceled_at * 1000) 
        : null,
      trialStart: stripeSubscription.trial_start 
        ? new Date(stripeSubscription.trial_start * 1000) 
        : null,
      trialEnd: stripeSubscription.trial_end 
        ? new Date(stripeSubscription.trial_end * 1000) 
        : null,
      plan,
      priceAmount: price?.unit_amount || planConfig.price,
      priceCurrency: price?.currency || 'usd',
      interval: price?.recurring?.interval || 'month',
    };

    // Upsert subscription
    const subscription = await db.subscription.upsert({
      where: { tenantId },
      create: subscriptionData,
      update: subscriptionData,
    });

    // Update tenant plan
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        plan,
        maxJobs: planConfig.limits.jobs === -1 ? 999999 : planConfig.limits.jobs,
        maxCandidates: planConfig.limits.candidates === -1 ? 999999 : planConfig.limits.candidates,
        maxMembers: planConfig.limits.members === -1 ? 999999 : planConfig.limits.members,
      },
    });

    return subscription;
  } catch (error) {
    console.error('Error syncing subscription from Stripe:', error);
    throw error;
  }
}

/**
 * Get subscription for tenant
 */
export async function getTenantSubscription(tenantId: string) {
  try {
    const subscription = await db.subscription.findUnique({
      where: { tenantId },
    });
    return subscription;
  } catch (error) {
    console.error('Error getting tenant subscription:', error);
    return null;
  }
}

/**
 * Get subscription with Stripe data
 */
export async function getSubscriptionWithStripeData(tenantId: string) {
  try {
    const dbSubscription = await getTenantSubscription(tenantId);
    
    if (!dbSubscription) {
      return null;
    }

    const stripeSubscription = await getStripeSubscription(dbSubscription.stripeSubscriptionId);
    
    return {
      ...dbSubscription,
      stripeData: stripeSubscription,
    };
  } catch (error) {
    console.error('Error getting subscription with Stripe data:', error);
    return null;
  }
}

/**
 * Get upcoming invoice for subscription
 */
export async function getUpcomingInvoice(customerId: string) {
  try {
    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
    return invoice;
  } catch (error) {
    console.error('Error getting upcoming invoice:', error);
    return null;
  }
}

/**
 * List invoices for customer
 */
export async function listCustomerInvoices(customerId: string, limit: number = 10) {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data;
  } catch (error) {
    console.error('Error listing invoices:', error);
    return [];
  }
}
