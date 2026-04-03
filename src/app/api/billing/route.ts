import { NextRequest, NextResponse } from 'next/server';
import { getAllPlans, getPlanById, PLANS } from '@/lib/stripe/products';
import { createCheckoutSession } from '@/lib/stripe/subscriptions';
import { getOrCreateStripeCustomer } from '@/lib/stripe/customer';
import { db } from '@/lib/db';
import { Plan } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/billing
 * Get all available plans
 */
export async function GET(request: NextRequest) {
  try {
    const plans = getAllPlans();
    
    return NextResponse.json({
      plans,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans', success: false },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing
 * Create a checkout session for a plan
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plan, tenantId } = body;

    if (!plan || !tenantId) {
      return NextResponse.json(
        { error: 'Plan and tenantId are required', success: false },
        { status: 400 }
      );
    }

    // Validate plan
    const validPlans: Plan[] = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan selected', success: false },
        { status: 400 }
      );
    }

    // Get plan config
    const planConfig = getPlanById(plan);

    // Check if it's an enterprise plan (custom pricing)
    if (plan === 'ENTERPRISE') {
      return NextResponse.json({
        success: true,
        message: 'Please contact sales for enterprise pricing',
        contactSales: true,
      });
    }

    // Get tenant
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: {
        members: {
          where: { userId: session.user.id },
          select: { role: true },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found', success: false },
        { status: 404 }
      );
    }

    // Check if user has permission
    const memberRole = tenant.members[0]?.role;
    if (!memberRole || !['OWNER', 'ADMIN'].includes(memberRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', success: false },
        { status: 403 }
      );
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer(
      tenantId,
      session.user.email || '',
      session.user.name || '',
      tenant.name
    );

    // Create checkout session
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkoutSession = await createCheckoutSession({
      customerId: customer.id,
      priceId: planConfig.priceId,
      successUrl: `${origin}/?view=settings&tab=billing&success=true`,
      cancelUrl: `${origin}/?view=settings&tab=billing&canceled=true`,
      tenantId,
      plan,
      trialDays: 14, // 14-day free trial for new subscriptions
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', success: false },
      { status: 500 }
    );
  }
}
