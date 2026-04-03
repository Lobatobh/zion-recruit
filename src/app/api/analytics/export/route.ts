/**
 * Analytics Export API
 * Export analytics data to CSV or JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  calculateTimeToHire,
  calculatePipelineConversion,
  calculateSourceEffectiveness,
  calculateCostPerHire,
  calculateCandidatesPerJob,
  calculateInterviewSuccess,
  calculateDISCDistribution,
  calculateAgentPerformance,
  getDefaultDateRange,
} from '@/lib/analytics/metrics';
import {
  exportAllCSV,
  exportAllJSON,
  generateFilename,
  addExportMetadata,
} from '@/lib/analytics/export';

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
    const format = (searchParams.get('format') as 'csv' | 'json') || 'json';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const dateRange = startDateStr && endDateStr
      ? {
          startDate: new Date(startDateStr),
          endDate: new Date(endDateStr),
        }
      : getDefaultDateRange(30);

    // Fetch all analytics data in parallel
    const [
      timeToHire,
      pipeline,
      sources,
      costPerHire,
      candidatesPerJob,
      interviews,
      discDistribution,
      agentPerformance,
    ] = await Promise.all([
      calculateTimeToHire(tenantId, dateRange),
      calculatePipelineConversion(tenantId, dateRange),
      calculateSourceEffectiveness(tenantId, dateRange),
      calculateCostPerHire(tenantId, dateRange),
      calculateCandidatesPerJob(tenantId, dateRange),
      calculateInterviewSuccess(tenantId, dateRange),
      calculateDISCDistribution(tenantId, dateRange),
      calculateAgentPerformance(tenantId, dateRange),
    ]);

    const exportData = {
      timeToHire,
      pipeline,
      sources,
      costPerHire,
      candidatesPerJob,
      interviews,
      discDistribution,
      agentPerformance,
    };

    let content: string;
    let mimeType: string;
    let filename: string;

    if (format === 'csv') {
      content = addExportMetadata(
        exportAllCSV(exportData),
        tenantId,
        dateRange
      );
      mimeType = 'text/csv';
      filename = generateFilename('analytics', 'csv');
    } else {
      content = exportAllJSON(exportData);
      mimeType = 'application/json';
      filename = generateFilename('analytics', 'json');
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao exportar analytics' },
      { status: 500 }
    );
  }
}
