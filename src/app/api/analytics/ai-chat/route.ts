/**
 * AI Chat API
 * Provides a conversational interface for analytics data using z-ai-web-dev-sdk LLM.
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
    const { message, context, history } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Mensagem inválida' },
        { status: 400 }
      );
    }

    // Build context from analytics data
    const contextStr = context
      ? JSON.stringify({
          overview: {
            totalCandidates: context.overview?.totalCandidates,
            candidateTrend: context.overview?.candidateTrend,
            totalJobs: context.overview?.totalJobs,
            activeJobs: context.overview?.activeJobs,
            totalHired: context.overview?.totalHired,
            hireTrend: context.overview?.hireTrend,
            totalInterviews: context.overview?.totalInterviews,
            pendingInterviews: context.overview?.pendingInterviews,
            activeAgents: context.overview?.activeAgents,
            totalTasks: context.overview?.totalTasks,
            completedTasks: context.overview?.completedTasks,
            taskSuccessRate: context.overview?.taskSuccessRate,
          },
          pipeline: {
            metrics: context.pipeline?.metrics,
            funnel: context.pipeline?.funnel,
          },
          sources: {
            metrics: context.sources?.metrics,
          },
          timeToHire: {
            averageDays: context.timeToHire?.metrics?.averageDays,
            medianDays: context.timeToHire?.metrics?.medianDays,
            minDays: context.timeToHire?.metrics?.minDays,
            maxDays: context.timeToHire?.metrics?.maxDays,
            trend: context.timeToHire?.metrics?.trend,
          },
          agentPerformance: {
            metrics: context.agentPerformance?.metrics,
            performanceChart: context.agentPerformance?.performanceChart,
          },
        }, null, 2)
      : 'Dados não disponíveis no momento.';

    const systemPrompt = `Você é o "Zion Analytics AI", um assistente virtual especialista em análise de dados de recrutamento para um ATS (Applicant Tracking System) chamado Zion Recruit.

Seu papel é:
- Responder perguntas sobre métricas de recrutamento em português brasileiro
- Fornecer insights acionáveis baseados nos dados
- Ajudar a identificar gargalos no pipeline de contratação
- Sugerir melhorias para otimizar o processo de recrutamento
- Ser conciso mas informativo

Regras:
- Responda SEMPRE em português brasileiro
- Use dados reais das métricas quando disponíveis para fundamentar suas respostas
- Use formatação simples: negrito com **texto**, listas com - item
- Seja proativo em sugerir ações
- Se os dados não estiverem disponíveis, informe de forma amigável
- Mantenha respostas concisas (3-5 frases para perguntas simples, até 8 para análises complexas)`;

    // Build messages array with history
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Aqui estão os dados atuais de métricas do ATS:\n\n${contextStr}\n\nResponda considerando estes dados.` },
    ];

    // Add conversation history (last 10 messages max to stay within context limits)
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
      temperature: 0.7,
      max_tokens: 800,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return NextResponse.json(
        { success: false, error: 'IA não conseguiu gerar resposta' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      response: responseContent,
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar mensagem com IA' },
      { status: 500 }
    );
  }
}
