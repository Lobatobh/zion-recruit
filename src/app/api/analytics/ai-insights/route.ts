/**
 * AI Insights API
 * Analyzes all collected analytics metrics and generates AI-powered insights
 * using z-ai-web-dev-sdk LLM.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { overview, pipeline, sources, timeToHire, agentPerformance } = body;

    if (!overview || !pipeline || !sources || !timeToHire || !agentPerformance) {
      return NextResponse.json(
        { success: false, error: 'Dados insuficientes para gerar insights' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    // Build context from metrics
    const metricsContext = JSON.stringify({
      overview: {
        totalCandidates: overview.totalCandidates,
        candidateTrend: overview.candidateTrend,
        totalJobs: overview.totalJobs,
        activeJobs: overview.activeJobs,
        totalHired: overview.totalHired,
        hireTrend: overview.hireTrend,
        totalInterviews: overview.totalInterviews,
        pendingInterviews: overview.pendingInterviews,
        activeAgents: overview.activeAgents,
        totalTasks: overview.totalTasks,
        completedTasks: overview.completedTasks,
        taskSuccessRate: overview.taskSuccessRate,
      },
      pipeline: {
        metrics: pipeline.metrics,
        funnel: pipeline.funnel,
        barChart: pipeline.barChart,
      },
      sources: {
        metrics: sources.metrics,
        pieChart: sources.pieChart,
        barChart: sources.barChart,
      },
      timeToHire: {
        averageDays: timeToHire.metrics.averageDays,
        medianDays: timeToHire.metrics.medianDays,
        minDays: timeToHire.metrics.minDays,
        maxDays: timeToHire.metrics.maxDays,
        trend: timeToHire.metrics.trend,
      },
      agentPerformance: {
        metrics: agentPerformance.metrics,
        performanceChart: agentPerformance.performanceChart,
        tokensChart: agentPerformance.tokensChart,
      },
    }, null, 2);

    const systemPrompt = `Você é um analista de dados de recrutamento especialista em ATS (Applicant Tracking System) chamado "Zion Analytics AI". 
Analise os dados de métricas de recrutamento fornecidos e gere insights acionáveis em português brasileiro.

Você DEVE responder EXCLUSIVAMENTE com um JSON válido (sem markdown, sem \`\`\`json) no seguinte formato exato:

{
  "score": <número inteiro de 0 a 100 representando a saúde geral do recrutamento>,
  "summary": "<resumo de 2-3 frases sobre o estado geral do recrutamento>",
  "highlights": [
    {
      "icon": "<emoji>",
      "title": "<título curto>",
      "description": "<descrição concisa do destaque positivo>"
    }
  ],
  "alerts": [
    {
      "severity": "warning" ou "danger",
      "title": "<título do alerta>",
      "description": "<descrição do problema>",
      "suggestion": "<sugestão de ação>"
    }
  ],
  "recommendations": [
    {
      "priority": "high" ou "medium" ou "low",
      "title": "<título da recomendação>",
      "description": "<descrição detalhada>"
    }
  ],
  "predictions": [
    {
      "metric": "<nome da métrica>",
      "currentValue": <valor atual numérico>,
      "predictedValue": <valor previsto numérico>,
      "confidence": <número de 0 a 100>,
      "trend": "up" ou "down" ou "stable"
    }
  ]
}

Regras:
- score: Considere contratações, taxa de conversão do pipeline, tempo de contratação, performance dos agentes. >=70 verde, 40-69 amarelo, <40 vermelho.
- highlights: 2-4 pontos fortes identificados nos dados. Use emojis relevantes.
- alerts: 1-3 alertas sobre problemas ou riscos. "danger" para críticos, "warning" para atenção.
- recommendations: 2-4 recomendações priorizadas (high/medium/low).
- predictions: 2-3 previsões baseadas nas tendências dos dados (candidatos, contratações, tempo).
- Seja conciso mas informativo.
- Use números reais dos dados nas descrições quando relevante.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Aqui estão os dados de métricas de recrutamento do período:\n\n${metricsContext}\n\nGere insights baseados nestes dados.` },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'IA não conseguiu gerar insights' },
        { status: 500 }
      );
    }

    // Parse the JSON response - handle potential markdown wrapping
    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      // If parsing fails, return a structured fallback
      parsed = {
        score: 50,
        summary: 'Análise dos dados de recrutamento em andamento. A IA não conseguiu gerar insights completos neste momento.',
        highlights: [],
        alerts: [],
        recommendations: [],
        predictions: [],
      };
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar insights com IA' },
      { status: 500 }
    );
  }
}
