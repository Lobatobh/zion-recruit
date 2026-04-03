import { NextRequest, NextResponse } from 'next/server';
import { createBillingPortalSession } from '@/lib/stripe/subscriptions';
import { getOrCreateStripeCustomer } from '@/lib/stripe/customer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/billing/portal
 * Create a customer portal session for self-service billing management
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
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required', success: false },
        { status: 400 }
      );
    }

    // Verify user has permission
    const membership = await db.tenantMember.findFirst({
      where: {
        tenantId,
        userId: session.user.id,
      },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', success: false },
        { status: 403 }
      );
    }

    // Get tenant
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found', success: false },
        { status: 404 }
      );
    }

    // Ensure customer exists
    const customer = await getOrCreateStripeCustomer(
      tenantId,
      session.user.email || '',
      session.user.name || '',
      tenant.name
    );

    // Create portal session
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portalSession = await createBillingPortalSession(
      customer.id,
      `${origin}/?view=settings&tab=billing`
    );

    return NextResponse.json({
      success: true,
      portalUrl: portalSession.url,
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session', success: false },
      { status: 500 }
    );
  }
}
