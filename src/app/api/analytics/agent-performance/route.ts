/**
 * Analytics Agent Performance API
 * Returns AI agent performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateAgentPerformance, getDefaultDateRange } from '@/lib/analytics/metrics';
import { formatAgentPerformanceChart, formatAgentTokensChart } from '@/lib/analytics/charts';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }
    const tenantId = session.user.tenantId;

    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const dateRange = startDateStr && endDateStr
      ? {
          startDate: new Date(startDateStr),
          endDate: new Date(endDateStr),
        }
      : getDefaultDateRange(30);

    const metrics = await calculateAgentPerformance(tenantId, dateRange);

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        performanceChart: formatAgentPerformanceChart(metrics),
        tokensChart: formatAgentTokensChart(metrics),
      },
      dateRange: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching agent performance metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar métricas de performance dos agentes' },
      { status: 500 }
    );
  }
}
