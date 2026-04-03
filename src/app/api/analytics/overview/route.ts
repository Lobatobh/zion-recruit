/**
 * Analytics Overview API
 * Returns high-level metrics for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOverviewMetrics, getDefaultDateRange } from '@/lib/analytics/metrics';

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

    const metrics = await getOverviewMetrics(tenantId, dateRange);

    return NextResponse.json({
      success: true,
      data: metrics,
      dateRange: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching overview metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar métricas gerais' },
      { status: 500 }
    );
  }
}
