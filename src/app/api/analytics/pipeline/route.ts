/**
 * Analytics Pipeline API
 * Returns pipeline conversion rates and funnel data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculatePipelineConversion, getDefaultDateRange } from '@/lib/analytics/metrics';
import { formatPipelineFunnel, formatPipelineBarChart } from '@/lib/analytics/charts';

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

    const metrics = await calculatePipelineConversion(tenantId, dateRange);

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        funnel: formatPipelineFunnel(metrics),
        barChart: formatPipelineBarChart(metrics),
      },
      dateRange: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching pipeline metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar métricas do pipeline' },
      { status: 500 }
    );
  }
}
