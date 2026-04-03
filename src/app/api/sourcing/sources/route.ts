/**
 * Sourcing Sources API - Zion Recruit
 * 
 * GET /api/sourcing/sources
 * Get available sourcing channels and their configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSourcingService } from '@/lib/sourcing/sourcing-service';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant ID from session
    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    // Get available sources
    const sources = SourcingService.getAvailableSources();
    
    // Get rate limit statuses
    const sourcingService = createSourcingService(tenantId);
    const rateLimits = sourcingService.getRateLimitStatuses();
    
    return NextResponse.json({
      sources: sources.map(source => ({
        ...source,
        rateLimitStatus: rateLimits[source.id],
      })),
    });
  } catch (error) {
    console.error('Get sources error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get sources' },
      { status: 500 }
    );
  }
}
