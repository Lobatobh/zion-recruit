/**
 * Analytics Time-to-Hire API
 * Returns time-to-hire metrics and trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateTimeToHire, getDefaultDateRange } from '@/lib/analytics/metrics';
import { formatTimeToHireChart } from '@/lib/analytics/charts';

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
      : getDefaultDateRange(90);

    const metrics = await calculateTimeToHire(tenantId, dateRange);

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        lineChart: formatTimeToHireChart(metrics),
      },
      dateRange: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching time-to-hire metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar métricas de tempo de contratação' },
      { status: 500 }
    );
  }
}
