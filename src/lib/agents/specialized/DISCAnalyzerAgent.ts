/**
 * DISC Analyzer Agent - Zion Recruit
 * 
 * Specialized agent that:
 * - Analyzes DISC test results
 * - Generates comprehensive AI-powered reports in pt-BR
 * - Calculates job fit scores
 * - Produces alerts, development plans, team dynamics
 * - Includes candidate data (name, email, phone, address, job)
 * 
 * Enhanced with full pt-BR report generation including:
 * - Alertas (alerts for recruiters)
 * - Plano de Desenvolvimento (development recommendations)
 * - Dinâmica em Equipe (team dynamics)
 * - Gatilhos de Estresse (stress triggers)
 * - Fatores Motivacionais (motivational factors)
 * - Resumo Executivo (executive summary)
 */

import { BaseAgent, AgentConfig, TaskInput, TaskResult, TaskOutput } from '../base/BaseAgent';
import { llmService } from '../base/LLMService';
import { AgentType } from '@prisma/client';
import { db } from '@/lib/db';
import { DISCFactor } from '@/lib/disc/questions';
import { calculateJobFit } from '@/lib/disc/calculator';
import { getProfileDescription, getComboProfile } from '@/lib/disc/profiles';

// ============================================
// Types
// ============================================

interface DISCAnalysisInput {
  testId: string;
  jobContext?: string;
  jobProfileRequirements?: { D: number; I: number; S: number; C: number };
}

/** Full AI response structure with all report fields */
interface DISCAIResponse {
  // Core analysis
  strengths: string[];            // 5 strengths
  areasForDevelopment: string[];  // 4 areas
  workStyle: string;              // Detailed work style
  communicationTips: string;      // How to communicate with this profile
  leadershipStyle: string;        // Leadership approach
  idealEnvironment: string[];     // 4 ideal environments
  insights: string;               // 2-3 sentence key insight

  // Enhanced report fields
  alerts: string[];               // 3-5 alert/recommendation items for recruiter
  developmentPlan: string[];      // 4-6 development recommendations
  teamDynamics: string;           // How they work in teams
  stressTriggers: string[];       // 3-4 stress triggers
  motivationalFactors: string[];  // 3-4 motivation factors
  reportSummary: string;          // Complete summary paragraph (pt-BR)
}

interface DISCAnalysisOutput extends TaskOutput {
  primaryProfile: DISCFactor;
  secondaryProfile: DISCFactor | null;
  profileCombo: string;
  profileName: string;
  strengths: string[];
  areasForDevelopment: string[];
  workStyle: string;
  communicationTips: string;
  leadershipStyle: string;
  idealEnvironment: string[];
  jobFitScore: number;
  jobFitDetails: string;
  aiInsights: string;
  // Enhanced report fields
  alerts: string[];
  developmentPlan: string[];
  teamDynamics: string;
  stressTriggers: string[];
  motivationalFactors: string[];
  reportSummary: string;
}

// ============================================
// Agent Configuration
// ============================================

const DISC_ANALYZER_CONFIG: AgentConfig = {
  type: AgentType.DISC_ANALYZER,
  name: 'DISC Analyzer Agent',
  description: 'Analisa resultados de testes DISC e gera relatório completo em português brasileiro',
  model: 'gpt-4o-mini',
  maxTokens: 1500,
  temperature: 0.4,
  systemPrompt: `Você é um especialista em análise comportamental DISC com vasta experiência em recursos humanos e seleção de pessoas no Brasil.
Analise o perfil DISC do candidato e gere insights detalhados e personalizados.
TODAS as respostas devem ser em português brasileiro (pt-BR).
Retorne APENAS JSON válido, sem texto adicional.
Seja específico, profissional e use linguagem adequada para o contexto de RH corporativo brasileiro.`,
};

// ============================================
// DISC Analyzer Agent Class
// ============================================

export class DISCAnalyzerAgent extends BaseAgent {
  constructor(tenantId: string) {
    super(tenantId, DISC_ANALYZER_CONFIG);
  }

  async execute(input: TaskInput): Promise<TaskResult<DISCAnalysisOutput>> {
    const { testId, jobContext, jobProfileRequirements } = input as DISCAnalysisInput;

    // Get test data with full candidate information
    const test = await db.dISTest.findUnique({
      where: { id: testId },
      include: {
        candidate: {
          select: {
            name: true,
            email: true,
            phone: true,
            city: true,
            state: true,
            country: true,
            job: {
              select: {
                title: true,
                discProfileRequired: true,
              },
            },
          },
        },
      },
    });

    if (!test) {
      return { success: false, error: 'Teste DISC não encontrado' };
    }

    // Get DISC scores
    const scores = {
      D: test.profileD || 0,
      I: test.profileI || 0,
      S: test.profileS || 0,
      C: test.profileC || 0,
    };

    // Get profile descriptions
    const primaryProfile = test.primaryProfile as DISCFactor;
    const secondaryProfile = test.secondaryProfile as DISCFactor | null;
    const profileCombo = test.profileCombo || primaryProfile;

    const primaryDesc = getProfileDescription(primaryProfile);
    const comboDesc = getComboProfile(profileCombo);

    // Calculate job fit
    let jobFitScore = 0;
    let jobFitDetails = '';

    if (jobProfileRequirements) {
      const fit = calculateJobFit(
        scores,
        jobProfileRequirements
      );
      jobFitScore = fit.score;
      jobFitDetails = fit.details;
    } else if (test.candidate.job?.discProfileRequired) {
      try {
        const required = JSON.parse(test.candidate.job.discProfileRequired);
        const fit = calculateJobFit(scores, required);
        jobFitScore = fit.score;
        jobFitDetails = fit.details;
      } catch {
        // Invalid JSON, skip job fit calculation
      }
    }

    // Build candidate info object
    const candidateInfo = {
      name: test.candidate.name,
      email: test.candidate.email,
      phone: test.candidate.phone || 'Não informado',
      city: test.candidate.city || 'Não informada',
      state: test.candidate.state || 'Não informado',
      country: test.candidate.country || 'Brasil',
      address: [
        test.candidate.city,
        test.candidate.state,
        test.candidate.country,
      ].filter(Boolean).join(', ') || 'Não informada',
      jobTitle: jobContext || test.candidate.job?.title || 'Não especificada',
    };

    // Build comprehensive analysis prompt
    const prompt = this.buildAnalysisPrompt(
      scores,
      primaryProfile,
      secondaryProfile,
      candidateInfo
    );

    // Get AI analysis with enhanced token budget for detailed reports
    const response = await llmService.call<DISCAIResponse>(
      {
        systemPrompt: DISC_ANALYZER_CONFIG.systemPrompt!,
        userPrompt: prompt,
        maxTokens: 1500,
        temperature: 0.4,
        model: 'gpt-4o-mini',
        jsonMode: true,
      },
      {
        enabled: true,
        tenantId: this.tenantId,
        cacheKey: `disc_analysis_${testId}_${profileCombo}_v2`,
        ttlDays: 30,
      }
    );

    if (!response.success || !response.data) {
      // Fallback to static analysis if AI fails
      return this.getStaticAnalysis(
        test,
        primaryDesc,
        comboDesc,
        jobFitScore,
        jobFitDetails
      );
    }

    // Update test with analysis — store in available DB fields
    // aiAnalysis = full report summary
    // aiStrengths = JSON string of strengths array
    // aiWeaknesses = JSON string of areasForDevelopment array
    // aiWorkStyle = JSON string of extended report object (alerts, plan, dynamics, etc.)
    await db.dISTest.update({
      where: { id: testId },
      data: {
        aiAnalysis: response.data.reportSummary,
        aiStrengths: JSON.stringify(response.data.strengths),
        aiWeaknesses: JSON.stringify(response.data.areasForDevelopment),
        aiWorkStyle: JSON.stringify({
          alerts: response.data.alerts,
          developmentPlan: response.data.developmentPlan,
          teamDynamics: response.data.teamDynamics,
          stressTriggers: response.data.stressTriggers,
          motivationalFactors: response.data.motivationalFactors,
          workStyle: response.data.workStyle,
          communicationTips: response.data.communicationTips,
          leadershipStyle: response.data.leadershipStyle,
          idealEnvironment: response.data.idealEnvironment,
          insights: response.data.insights,
        }),
        jobFitScore,
        jobFitDetails,
      },
    });

    return {
      success: true,
      data: {
        primaryProfile,
        secondaryProfile,
        profileCombo,
        profileName: comboDesc?.name || primaryDesc.title,
        strengths: response.data.strengths,
        areasForDevelopment: response.data.areasForDevelopment,
        workStyle: response.data.workStyle,
        communicationTips: response.data.communicationTips,
        leadershipStyle: response.data.leadershipStyle,
        idealEnvironment: response.data.idealEnvironment,
        jobFitScore,
        jobFitDetails,
        aiInsights: response.data.insights,
        alerts: response.data.alerts,
        developmentPlan: response.data.developmentPlan,
        teamDynamics: response.data.teamDynamics,
        stressTriggers: response.data.stressTriggers,
        motivationalFactors: response.data.motivationalFactors,
        reportSummary: response.data.reportSummary,
      },
      tokensUsed: response.tokensUsed,
    };
  }

  /**
   * Build comprehensive analysis prompt with ALL candidate data
   * Entirely in pt-BR for consistent AI responses
   */
  private buildAnalysisPrompt(
    scores: { D: number; I: number; S: number; C: number },
    primary: DISCFactor,
    secondary: DISCFactor | null,
    candidate: {
      name: string;
      email: string;
      phone: string;
      city: string;
      state: string;
      country: string;
      address: string;
      jobTitle: string;
    }
  ): string {
    return `# Relatório Completo do Perfil DISC

## Dados do Candidato
- **Nome:** ${candidate.name}
- **E-mail:** ${candidate.email}
- **Telefone:** ${candidate.phone}
- **Localização:** ${candidate.address}
- **Vaga pretendida:** ${candidate.jobTitle}

## Pontuações DISC (0-100)
- **Dominância (D):** ${scores.D}
- **Influência (I):** ${scores.I}
- **Estabilidade (S):** ${scores.S}
- **Conformidade (C):** ${scores.C}

## Perfil Identificado
- **Perfil Primário:** ${primary}
- **Perfil Secundário:** ${secondary || 'Não identificado'}
- **Combinação:** ${primary}${secondary || ''}

## Instruções
Com base nos dados acima, gere um relatório completo e detalhado em português brasileiro. Use linguagem profissional de RH. Seja específico e personalizado para o candidato e a vaga.

Retorne APENAS o seguinte JSON (sem texto adicional, sem markdown):

{
  "strengths": ["ponto forte 1", "ponto forte 2", "ponto forte 3", "ponto forte 4", "ponto forte 5"],
  "areasForDevelopment": ["área de desenvolvimento 1", "área de desenvolvimento 2", "área de desenvolvimento 3", "área de desenvolvimento 4"],
  "workStyle": "Descrição detalhada do estilo de trabalho do candidato, considerando o perfil DISC e a vaga pretendida. Mínimo 3 frases.",
  "communicationTips": "Orientações detalhadas sobre como se comunicar eficazmente com este perfil. Mínimo 3 frases.",
  "leadershipStyle": "Descrição do estilo de liderança natural do candidato e como ele pode evoluir. Mínimo 2 frases.",
  "idealEnvironment": ["ambiente ideal 1", "ambiente ideal 2", "ambiente ideal 3", "ambiente ideal 4"],
  "insights": "Insight principal sobre o candidato em 2-3 frases, conectando o perfil DISC com a vaga pretendida.",
  "alerts": ["alerta ou ponto de atenção para o recrutador 1", "alerta 2", "alerta 3", "alerta 4", "alerta 5"],
  "developmentPlan": ["recomendação de desenvolvimento 1", "recomendação 2", "recomendação 3", "recomendação 4", "recomendação 5", "recomendação 6"],
  "teamDynamics": "Descrição detalhada de como este candidato interage em equipes, considerando conflitos, colaboração e sinergias com outros perfis DISC. Mínimo 3 frases.",
  "stressTriggers": ["gatilho de estresse 1", "gatilho 2", "gatilho 3", "gatilho 4"],
  "motivationalFactors": ["fator motivacional 1", "fator 2", "fator 3", "fator 4"],
  "reportSummary": "Resumo executivo completo do relatório DISC. Deve ser um parágrafo denso e abrangente (mínimo 5 frases) que sintetize: perfil do candidato, pontos fortes, pontos de atenção, compatibilidade com a vaga, recomendação geral e principais ações sugeridas para o gestor."
}`;
  }

  /**
   * Static fallback analysis when AI is unavailable
   * Returns enhanced structure with pt-BR content
   */
  private getStaticAnalysis(
    test: {
      id: string;
      primaryProfile: string | null;
      secondaryProfile: string | null;
      profileCombo: string | null;
      candidate: {
        name: string;
        email: string;
        phone?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
        job: { title: string } | null;
      };
    },
    primaryDesc: ReturnType<typeof getProfileDescription>,
    comboDesc: ReturnType<typeof getComboProfile>,
    jobFitScore: number,
    jobFitDetails: string
  ): TaskResult<DISCAnalysisOutput> {
    const primary = test.primaryProfile as DISCFactor;
    const secondary = test.secondaryProfile as DISCFactor | null;
    const candidateName = test.candidate.name;
    const jobTitle = test.candidate.job?.title || 'Não especificada';

    const address = [
      test.candidate.city,
      test.candidate.state,
      test.candidate.country,
    ].filter(Boolean).join(', ') || 'Não informada';

    const fitContext = jobFitScore > 0
      ? `Compatibilidade com a vaga "${jobTitle}": ${jobFitScore}%. ${jobFitDetails}`
      : `Vaga pretendida: "${jobTitle}".`;

    const reportSummary = `${candidateName} apresenta um perfil DISC primário ${primary}${secondary ? ` com tendência secundária ${secondary}` : ''}, conhecido como "${comboDesc?.name || primaryDesc.title}". Com base nas pontuações DISC, ${candidateName} demonstra como principais pontos fortes: ${primaryDesc.strengths.slice(0, 3).join(', ')}. As áreas que merecem atenção para desenvolvimento incluem: ${primaryDesc.weaknesses.slice(0, 3).join(', ')}. ${fitContext} Recomenda-se que o gestor adote um estilo de comunicação ${primaryDesc.communicationStyle.toLowerCase()}. Para potencializar o desempenho, sugere-se oferecer um ambiente que valorize ${primaryDesc.idealEnvironment.slice(0, 2).join(' e ')}. Acompanhamento e feedbacks regulares serão importantes para o engajamento e retenção deste profissional.`;

    return {
      success: true,
      data: {
        primaryProfile: primary,
        secondaryProfile: secondary,
        profileCombo: test.profileCombo || primary,
        profileName: comboDesc?.name || primaryDesc.title,
        strengths: primaryDesc.strengths.slice(0, 5),
        areasForDevelopment: primaryDesc.weaknesses.slice(0, 4),
        workStyle: primaryDesc.communicationStyle,
        communicationTips: `Para comunicar eficazmente com ${candidateName}, considere: ${primaryDesc.communicationStyle} Prefira abordagens ${primary === 'D' ? 'diretas e focadas em resultados' : primary === 'I' ? 'entusiasmadas e colaborativas' : primary === 'S' ? 'pacientes e empáticas' : 'estruturadas e baseadas em dados'}.`,
        leadershipStyle: primaryDesc.leadershipStyle,
        idealEnvironment: primaryDesc.idealEnvironment.slice(0, 4),
        jobFitScore,
        jobFitDetails,
        aiInsights: `${primaryDesc.name} — ${primaryDesc.description.slice(0, 200)}...`,
        alerts: [
          `O candidato tem perfil predominante ${primary} — verifique se a cultura da empresa é compatível com esse perfil`,
          `Pontos cegos potenciais: ${primaryDesc.weaknesses.slice(0, 2).join(' e ')}`,
          `Estilo de comunicação pode gerar conflitos com perfis ${primary === 'D' ? 'S ou C' : primary === 'I' ? 'C ou D' : primary === 'S' ? 'D ou I' : 'I ou D'}`,
          jobFitScore > 0 && jobFitScore < 50
            ? `Compatibilidade baixa (${jobFitScore}%) com a vaga — avaliar gaps com atenção`
            : `Compatibilidade com a vaga: ${jobFitScore > 0 ? `${jobFitScore}% — adequada` : 'não calculada'}`,
          `Localização: ${address} — considerar se há necessidade de realocação ou trabalho remoto`,
        ],
        developmentPlan: [
          `Desenvolver habilidades de ${primaryDesc.weaknesses[0]?.toLowerCase() || 'autoconhecimento'} para ampliar a versatilidade profissional`,
          `Participar de treinamentos de comunicação interpessoal e inteligência emocional`,
          `Buscar feedbacks regulares com o gestor para acompanhar a evolução`,
          `Trabalhar em projetos multidisciplinares para desenvolver novas competências`,
          `Mentoria com profissional de perfil complementar para equilibrar pontos fortes e fracos`,
        ],
        teamDynamics: `${candidateName} tende a ${primaryDesc.teamContribution.toLowerCase()} Em equipes, contribui de forma ${primary === 'D' ? 'direta e orientada a resultados' : primary === 'I' ? 'entusiasmada e social' : primary === 'S' ? 'estável e colaborativa' : 'analítica e precisa'}. Pode apresentar maior sinergia com perfis complementares e necessita de adaptação ao trabalhar com perfis opostos.`,
        stressTriggers: primaryDesc.stressors.slice(0, 4),
        motivationalFactors: primaryDesc.motivators.slice(0, 4),
        reportSummary,
      },
    };
  }
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Analyze a DISC test result with AI — main entry point called from submit API
 */
export async function analyzeDISCResult(
  tenantId: string,
  testId: string,
  jobContext?: string | null,
  jobProfileRequirements?: { D: number; I: number; S: number; C: number }
): Promise<TaskResult<DISCAnalysisOutput>> {
  const agent = new DISCAnalyzerAgent(tenantId);
  await agent.initialize();
  
  return agent.execute({
    testId,
    jobContext: jobContext || undefined,
    jobProfileRequirements,
  });
}

/**
 * Get a quick DISC interpretation without AI — lightweight helper
 */
export function getQuickDISCInterpretation(
  primaryProfile: DISCFactor,
  secondaryProfile: DISCFactor | null
): {
  profileName: string;
  summary: string;
  keyStrengths: string[];
} {
  const primaryDesc = getProfileDescription(primaryProfile);
  const comboCode = secondaryProfile 
    ? [primaryProfile, secondaryProfile].sort().join('') 
    : primaryProfile;
  const comboDesc = getComboProfile(comboCode);

  return {
    profileName: comboDesc?.name || primaryDesc.title,
    summary: primaryDesc.description,
    keyStrengths: primaryDesc.strengths.slice(0, 3),
  };
}
