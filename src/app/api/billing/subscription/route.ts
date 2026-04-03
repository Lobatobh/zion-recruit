import { NextRequest, NextResponse } from 'next/server';
import { getTenantSubscription, getSubscriptionWithStripeData, listCustomerInvoices } from '@/lib/stripe/subscriptions';
import { getStripeCustomer } from '@/lib/stripe/customer';
import { stripe } from '@/lib/stripe/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/billing/subscription
 * Get current subscription for tenant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required', success: false },
        { status: 400 }
      );
    }

    // Verify user has access to this tenant
    const membership = await db.tenantMember.findFirst({
      where: {
        tenantId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    // Get tenant
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        plan: true,
        stripeCustomerId: true,
        maxJobs: true,
        maxCandidates: true,
        maxMembers: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found', success: false },
        { status: 404 }
      );
    }

    // Get subscription from database
    const subscription = await getTenantSubscription(tenantId);

    // Get invoices if customer exists
    let invoices: any[] = [];
    if (tenant.stripeCustomerId) {
      invoices = await listCustomerInvoices(tenant.stripeCustomerId, 12);
    }

    // Get payment method info
    let paymentMethod = null;
    if (tenant.stripeCustomerId) {
      const customer = await getStripeCustomer(tenant.stripeCustomerId);
      if (customer && 'invoice_settings' in customer) {
        const defaultPm = customer.invoice_settings?.default_payment_method;
        if (defaultPm && typeof defaultPm === 'object') {
          paymentMethod = {
            brand: defaultPm.card?.brand,
            last4: defaultPm.card?.last4,
            expMonth: defaultPm.card?.exp_month,
            expYear: defaultPm.card?.exp_year,
          };
        } else if (defaultPm && typeof defaultPm === 'string') {
          // Need to fetch payment method details
          try {
            const pm = await stripe.paymentMethods.retrieve(defaultPm);
            paymentMethod = {
              brand: pm.card?.brand,
              last4: pm.card?.last4,
              expMonth: pm.card?.exp_month,
              expYear: pm.card?.exp_year,
            };
          } catch (e) {
            console.error('Error fetching payment method:', e);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      tenant: {
        ...tenant,
        currentUsage: {
          jobs: await db.job.count({ where: { tenantId } }),
          candidates: await db.candidate.count({ where: { tenantId } }),
          members: await db.tenantMember.count({ where: { tenantId } }),
        },
      },
      subscription,
      paymentMethod,
      invoices: invoices.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        createdAt: invoice.created,
        invoicePdf: invoice.invoice_pdf,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      })),
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription', success: false },
      { status: 500 }
    );
  }
}
