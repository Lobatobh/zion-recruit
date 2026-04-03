/**
 * Webhook Deliveries by Webhook ID API Route
 * 
 * GET /api/webhooks/[id]/deliveries - Get delivery history for specific webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getDeliveryHistory } from '@/lib/webhooks';

// GET /api/webhooks/[id]/deliveries - Get delivery history for webhook
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user and tenant
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });
    
    if (!user || user.memberships.length === 0) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 404 }
      );
    }
    
    const tenantId = user.memberships[0].tenantId;
    const { id } = await params;
    
    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const eventType = searchParams.get('eventType') || undefined;
    
    const { deliveries, total } = await getDeliveryHistory(id, tenantId, {
      limit,
      offset,
      eventType,
    });
    
    return NextResponse.json({
      deliveries,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deliveries' },
      { status: 500 }
    );
  }
}
