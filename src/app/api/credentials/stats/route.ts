/**
 * API Credentials Stats API
 * Get usage statistics for all credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/credentials/stats - Get usage statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get date range (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate usage logs
    const usageLogs = await db.apiUsageLog.findMany({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth },
      },
      select: {
        provider: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        costCents: true,
        status: true,
        durationMs: true,
      },
    });

    // Calculate totals
    const totalTokens = usageLogs.reduce((acc, log) => acc + (log.totalTokens || 0), 0);
    const totalCost = usageLogs.reduce((acc, log) => acc + (log.costCents || 0), 0);
    const totalRequests = usageLogs.length;
    const successCount = usageLogs.filter((log) => log.status === 'SUCCESS').length;
    const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 100;
    const avgLatency = usageLogs.length > 0
      ? Math.round(usageLogs.reduce((acc, log) => acc + (log.durationMs || 0), 0) / usageLogs.length)
      : 0;

    // Group by provider
    const byProvider: Record<string, { tokens: number; cost: number; requests: number }> = {};

    for (const log of usageLogs) {
      const provider = log.provider as string;
      if (!byProvider[provider]) {
        byProvider[provider] = { tokens: 0, cost: 0, requests: 0 };
      }
      byProvider[provider].tokens += log.totalTokens || 0;
      byProvider[provider].cost += log.costCents || 0;
      byProvider[provider].requests += 1;
    }

    return NextResponse.json({
      totalTokens,
      totalCost,
      totalRequests,
      successRate,
      avgLatency,
      byProvider,
      periodStart: startOfMonth.toISOString(),
      periodEnd: now.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
