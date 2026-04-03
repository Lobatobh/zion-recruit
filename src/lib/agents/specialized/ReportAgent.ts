/**
 * Report Agent - Zion Recruit
 * 
 * Specialized agent that:
 * - Generates comprehensive candidate reports
 * - Analyzes job fit and compatibility
 * - Provides DISC profile insights
 * - Compares candidates for ranking
 * - Includes geographic analysis
 * - Offers hiring recommendations
 * 
 * Token optimization:
 * - Structured output
 * - Concise analysis
 * - Cached report templates
 */

import { BaseAgent, AgentConfig, TaskInput, TaskResult, TaskOutput } from '../base/BaseAgent';
import { llmService } from '../base/LLMService';
import { AgentType } from '@prisma/client';
import { db } from '@/lib/db';

// ============================================
// Types
// ============================================

interface ReportInput {
  candidateId: string;
  jobId: string;
  includeComparison?: boolean;
  includeDISC?: boolean;
  includeGeographic?: boolean;
}

interface CandidateAnalysis {
  overallScore: number;
  skillsMatch: number;
  experienceMatch: number;
  discFit: number;
  culturalFit: number;
  strengths: string[];
  weaknesses: string[];
  riskFactors: string[];
}

interface DISCSummary {
  primaryProfile: string;
  secondaryProfile: string | null;
  profileDescription: string;
  workStyle: string;
  communicationStyle: string;
  leadershipStyle: string;
  idealEnvironment: string[];
  jobFitScore: number;
  jobFitAnalysis: string;
}

interface GeographicAnalysis {
  location: string;
  relocationNeeded: boolean;
  remoteWorkSuitability: number;
  timezoneCompatibility: string;
  commuteAnalysis?: string;
}

interface HiringRecommendation {
  recommendation: 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'NEUTRAL' | 'NOT_RECOMMENDED';
  confidence: number;
  reasoning: string;
  onboardingNotes: string[];
  interviewFocus: string[];
  salaryExpectation?: {
    min: number;
    max: number;
    currency: string;
  };
}

interface CandidateComparison {
  rank: number;
  totalCandidates: number;
  percentile: number;
  advantages: string[];
  gaps: string[];
}

interface ReportOutput extends TaskOutput {
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    linkedin: string | null;
    portfolio: string | null;
    photo: string | null;
    resumeUrl: string | null;
    summary: string;
  };
  job: {
    id: string;
    title: string;
    department: string | null;
    location: string | null;
    workModel: string;
  };
  analysis: CandidateAnalysis;
  discProfile?: DISCSummary;
  geographic?: GeographicAnalysis;
  recommendation: HiringRecommendation;
  comparison?: CandidateComparison;
  reportSummary: string;
  generatedAt: string;
}

// ============================================
// Agent Configuration
// ============================================

const REPORT_CONFIG: AgentConfig = {
  type: AgentType.REPORT,
  name: 'Report Agent',
  description: 'Gera relatórios detalhados de candidatos',
  model: 'gpt-4o-mini',
  maxTokens: 1500,
  temperature: 0.3,
  systemPrompt: `Você é um especialista em RH e recrutamento. Gere relatórios detalhados de candidatos.
Analise compatibilidade, perfil DISC, e forneça recomendações de contratação.
Retorne JSON válido com análise estruturada.`,
};

// ============================================
// Report Agent Class
// ============================================

export class ReportAgent extends BaseAgent {
  constructor(tenantId: string) {
    super(tenantId, REPORT_CONFIG);
  }

  async execute(input: TaskInput): Promise<TaskResult<ReportOutput>> {
    const { candidateId, jobId, includeComparison, includeDISC, includeGeographic } = input as ReportInput;

    // Get candidate data
    const candidate = await db.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        linkedin: true,
        portfolio: true,
        photo: true,
        resumeUrl: true,
        resumeText: true,
        parsedSkills: true,
        parsedExperience: true,
        aiSummary: true,
        city: true,
        state: true,
        country: true,
        matchScore: true,
        matchDetails: true,
        skillsScore: true,
        experienceScore: true,
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            city: true,
            state: true,
            remote: true,
            workModel: true,
            requirements: true,
            aiParsedSkills: true,
            discProfileRequired: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
          },
        },
      },
    });

    if (!candidate) {
      return { success: false, error: 'Candidato não encontrado' };
    }

    if (candidate.job.id !== jobId) {
      return { success: false, error: 'Candidato não pertence a esta vaga' };
    }

    // Get DISC test if available
    let discTest = null;
    if (includeDISC) {
      discTest = await db.dISCTest.findUnique({
        where: { candidateId },
        select: {
          primaryProfile: true,
          secondaryProfile: true,
          profileCombo: true,
          profileD: true,
          profileI: true,
          profileS: true,
          profileC: true,
          aiAnalysis: true,
          aiStrengths: true,
          aiWorkStyle: true,
          jobFitScore: true,
          jobFitDetails: true,
        },
      });
    }

    // Get other candidates for comparison
    let otherCandidates: Array<{ id: string; name: string; matchScore: number | null }> = [];
    if (includeComparison) {
      otherCandidates = await db.candidate.findMany({
        where: {
          jobId,
          id: { not: candidateId },
        },
        select: {
          id: true,
          name: true,
          matchScore: true,
        },
      });
    }

    // Build analysis prompt
    const prompt = this.buildAnalysisPrompt(candidate, discTest, includeGeographic);

    // Get AI analysis
    const response = await llmService.call<{
      analysis: CandidateAnalysis;
      recommendation: HiringRecommendation;
      reportSummary: string;
    }>(
      {
        systemPrompt: REPORT_CONFIG.systemPrompt!,
        userPrompt: prompt,
        maxTokens: 1500,
        temperature: 0.3,
        model: 'gpt-4o-mini',
        jsonMode: true,
      },
      {
        enabled: true,
        tenantId: this.tenantId,
        cacheKey: `report_${candidateId}_${jobId}`,
        ttlDays: 7,
      }
    );

    if (!response.success || !response.data) {
      // Fallback to static analysis if AI fails
      return this.getStaticReport(candidate, discTest, includeGeographic);
    }

    // Build comparison if requested
    let comparison: CandidateComparison | undefined;
    if (includeComparison && otherCandidates.length > 0) {
      comparison = this.buildComparison(candidate, otherCandidates);
    }

    // Build DISC summary if available
    let discSummary: DISCSummary | undefined;
    if (discTest && includeDISC) {
      discSummary = this.buildDISCSummary(discTest, candidate.job.discProfileRequired);
    }

    // Build geographic analysis if requested
    let geographic: GeographicAnalysis | undefined;
    if (includeGeographic) {
      geographic = this.buildGeographicAnalysis(candidate);
    }

    // Build final report
    const report: ReportOutput = {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        linkedin: candidate.linkedin,
        portfolio: candidate.portfolio,
        photo: candidate.photo,
        resumeUrl: candidate.resumeUrl,
        summary: candidate.aiSummary || 'Sem resumo disponível',
      },
      job: {
        id: candidate.job.id,
        title: candidate.job.title,
        department: candidate.job.department,
        location: candidate.job.location || `${candidate.job.city || ''}, ${candidate.job.state || ''}`.trim(),
        workModel: candidate.job.workModel || 'REMOTE',
      },
      analysis: response.data.analysis,
      discProfile: discSummary,
      geographic,
      recommendation: response.data.recommendation,
      comparison,
      reportSummary: response.data.reportSummary,
      generatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: report,
      tokensUsed: response.tokensUsed,
    };
  }

  private buildAnalysisPrompt(
    candidate: {
      name: string;
      email: string;
      resumeText: string | null;
      parsedSkills: string | null;
      parsedExperience: string | null;
      aiSummary: string | null;
      matchScore: number | null;
      skillsScore: number | null;
      experienceScore: number | null;
      city: string | null;
      state: string | null;
      country: string | null;
      job: {
        title: string;
        department: string | null;
        requirements: string;
        aiParsedSkills: string | null;
        discProfileRequired: string | null;
        salaryMin: number | null;
        salaryMax: number | null;
        remote: boolean;
      };
    },
    discTest: {
      primaryProfile: string | null;
      secondaryProfile: string | null;
      profileD: number | null;
      profileI: number | null;
      profileS: number | null;
      profileC: number | null;
      jobFitScore: number | null;
    } | null,
    includeGeographic: boolean | undefined
  ): string {
    const skills = candidate.parsedSkills ? JSON.parse(candidate.parsedSkills) : [];
    const jobSkills = candidate.job.aiParsedSkills ? JSON.parse(candidate.job.aiParsedSkills) : [];
    const discRequired = candidate.job.discProfileRequired ? JSON.parse(candidate.job.discProfileRequired) : null;

    return `CANDIDATO: ${candidate.name}
Email: ${candidate.email}
Localização: ${candidate.city || 'N/A'}, ${candidate.state || 'N/A'}, ${candidate.country || 'N/A'}

RESUMO: ${candidate.aiSummary || this.truncateText(candidate.resumeText || 'N/A', 500)}

SKILLS: ${Array.isArray(skills) ? skills.join(', ') : 'N/A'}
SCORE ATUAL: Match ${candidate.matchScore || 0}%, Skills ${candidate.skillsScore || 0}%, Experiência ${candidate.experienceScore || 0}%

VAGA: ${candidate.job.title}
Departamento: ${candidate.job.department || 'N/A'}
Requisitos: ${jobSkills.length > 0 ? jobSkills.join(', ') : this.truncateText(candidate.job.requirements, 200)}
Modelo: ${candidate.job.remote ? 'Remoto' : 'Presencial/Híbrido'}
Faixa Salarial: ${candidate.job.salaryMin?.toLocaleString('pt-BR') || 'N/A'} - ${candidate.job.salaryMax?.toLocaleString('pt-BR') || 'N/A'} ${candidate.job.currency || 'BRL'}

${discTest ? `PERFIL DISC:
Primário: ${discTest.primaryProfile || 'N/A'}
Secundário: ${discTest.secondaryProfile || 'N/A'}
Scores: D=${discTest.profileD || 0}, I=${discTest.profileI || 0}, S=${discTest.profileS || 0}, C=${discTest.profileC || 0}
Fit Score: ${discTest.jobFitScore || 0}%
${discRequired ? `DISC Esperado: D=${discRequired.D}, I=${discRequired.I}, S=${discRequired.S}, C=${discRequired.C}` : ''}` : ''}

${includeGeographic ? `Considerar análise geográfica para trabalho remoto/híbrido.` : ''}

Retorne JSON:
{
  "analysis": {
    "overallScore": 0-100,
    "skillsMatch": 0-100,
    "experienceMatch": 0-100,
    "discFit": 0-100,
    "culturalFit": 0-100,
    "strengths": ["ponto1", "ponto2", "ponto3"],
    "weaknesses": ["ponto1", "ponto2"],
    "riskFactors": ["risco1"]
  },
  "recommendation": {
    "recommendation": "HIGHLY_RECOMMENDED|RECOMMENDED|NEUTRAL|NOT_RECOMMENDED",
    "confidence": 0-100,
    "reasoning": "Explicação em 2-3 frases",
    "onboardingNotes": ["nota1", "nota2"],
    "interviewFocus": ["foco1", "foco2"],
    "salaryExpectation": {"min": number, "max": number, "currency": "BRL"}
  },
  "reportSummary": "Resumo executivo em 3-4 frases"
}`;
  }

  private buildComparison(
    candidate: { id: string; name: string; matchScore: number | null },
    others: Array<{ id: string; name: string; matchScore: number | null }>
  ): CandidateComparison {
    const allCandidates = [
      { ...candidate, score: candidate.matchScore || 0 },
      ...others.map((c) => ({ ...c, score: c.matchScore || 0 })),
    ].sort((a, b) => b.score - a.score);

    const rank = allCandidates.findIndex((c) => c.id === candidate.id) + 1;
    const total = allCandidates.length;
    const percentile = total > 1 ? Math.round(((total - rank) / (total - 1)) * 100) : 100;

    // Determine advantages and gaps
    const avgScore = allCandidates.reduce((acc, c) => acc + c.score, 0) / total;
    const advantages: string[] = [];
    const gaps: string[] = [];

    if ((candidate.matchScore || 0) > avgScore + 10) {
      advantages.push('Score acima da média dos candidatos');
    } else if ((candidate.matchScore || 0) < avgScore - 10) {
      gaps.push('Score abaixo da média dos candidatos');
    }

    if (rank === 1) {
      advantages.push('Melhor posicionamento no ranking');
    } else if (rank === total) {
      gaps.push('Último no ranking de candidatos');
    }

    return {
      rank,
      totalCandidates: total,
      percentile,
      advantages: advantages.length > 0 ? advantages : ['Posição competitiva'],
      gaps: gaps.length > 0 ? gaps : ['Nenhum gap significativo identificado'],
    };
  }

  private buildDISCSummary(
    test: {
      primaryProfile: string | null;
      secondaryProfile: string | null;
      profileCombo: string | null;
      profileD: number | null;
      profileI: number | null;
      profileS: number | null;
      profileC: number | null;
      aiAnalysis: string | null;
      aiStrengths: string | null;
      aiWorkStyle: string | null;
      jobFitScore: number | null;
      jobFitDetails: string | null;
    },
    requiredProfile: string | null
  ): DISCSummary {
    const profileDescriptions: Record<string, string> = {
      D: 'Dominante - Focado em resultados, direto e decisivo',
      I: 'Influente - Entusiasmado, otimista e bom comunicador',
      S: 'Estável - Paciente, confiável e trabalha bem em equipe',
      C: 'Conforme - Analítico, preciso e orientado a qualidade',
    };

    const workStyles: Record<string, string> = {
      D: 'Ambicioso e orientado a desafios',
      I: 'Colaborativo e focado em relacionamentos',
      S: 'Consistente e prefere ambiente estável',
      C: 'Detalhista e segue procedimentos',
    };

    const communicationStyles: Record<string, string> = {
      D: 'Direto e objetivo, foca em resultados',
      I: 'Expressivo e persuasivo, gosta de interação',
      S: 'Diplomático e bom ouvinte',
      C: 'Preciso e baseado em dados',
    };

    const leadershipStyles: Record<string, string> = {
      D: 'Autoritário e focado em metas',
      I: 'Inspirador e motivador',
      S: 'Suporte e desenvolvimento de equipe',
      C: 'Baseado em processos e qualidade',
    };

    const primary = (test.primaryProfile || 'D') as string;

    return {
      primaryProfile: primary,
      secondaryProfile: test.secondaryProfile,
      profileDescription: profileDescriptions[primary] || 'Perfil não identificado',
      workStyle: test.aiWorkStyle || workStyles[primary] || 'N/A',
      communicationStyle: communicationStyles[primary] || 'N/A',
      leadershipStyle: leadershipStyles[primary] || 'N/A',
      idealEnvironment: ['Ambiente de trabalho adequado ao perfil'],
      jobFitScore: test.jobFitScore || 0,
      jobFitAnalysis: test.jobFitDetails || 'Análise não disponível',
    };
  }

  private buildGeographicAnalysis(candidate: {
    city: string | null;
    state: string | null;
    country: string | null;
    job: {
      city: string | null;
      state: string | null;
      remote: boolean;
    };
  }): GeographicAnalysis {
    const candidateLocation = [candidate.city, candidate.state, candidate.country]
      .filter(Boolean)
      .join(', ') || 'Não informada';
    
    const jobLocation = [candidate.job.city, candidate.job.state]
      .filter(Boolean)
      .join(', ') || 'Remoto';

    const sameCity = candidate.city && candidate.job.city && 
      candidate.city.toLowerCase() === candidate.job.city.toLowerCase();
    
    const sameState = candidate.state && candidate.job.state &&
      candidate.state.toLowerCase() === candidate.job.state.toLowerCase();

    const relocationNeeded = !candidate.job.remote && !sameCity;
    const remoteSuitability = candidate.job.remote ? 100 : sameCity ? 90 : sameState ? 70 : 40;

    return {
      location: candidateLocation,
      relocationNeeded,
      remoteWorkSuitability: remoteSuitability,
      timezoneCompatibility: 'América/São_Paulo (GMT-3)',
      commuteAnalysis: relocationNeeded ? 'Requer mudança de cidade' : sameCity ? 'Sem necessidade de deslocamento longo' : undefined,
    };
  }

  private getStaticReport(
    candidate: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      linkedin: string | null;
      portfolio: string | null;
      photo: string | null;
      resumeUrl: string | null;
      resumeText: string | null;
      parsedSkills: string | null;
      aiSummary: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      matchScore: number | null;
      skillsScore: number | null;
      experienceScore: number | null;
      job: {
        id: string;
        title: string;
        department: string | null;
        location: string | null;
        city: string | null;
        state: string | null;
        remote: boolean;
        workModel: string | null;
        requirements: string;
        aiParsedSkills: string | null;
        discProfileRequired: string | null;
        salaryMin: number | null;
        salaryMax: number | null;
        currency: string | null;
      };
    },
    discTest: {
      primaryProfile: string | null;
      secondaryProfile: string | null;
      profileD: number | null;
      profileI: number | null;
      profileS: number | null;
      profileC: number | null;
      jobFitScore: number | null;
    } | null,
    includeGeographic: boolean | undefined
  ): TaskResult<ReportOutput> {
    const skills = candidate.parsedSkills ? JSON.parse(candidate.parsedSkills) : [];
    const overallScore = candidate.matchScore || 50;
    
    // Determine recommendation based on score
    let recommendation: 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'NEUTRAL' | 'NOT_RECOMMENDED';
    if (overallScore >= 80) recommendation = 'HIGHLY_RECOMMENDED';
    else if (overallScore >= 60) recommendation = 'RECOMMENDED';
    else if (overallScore >= 40) recommendation = 'NEUTRAL';
    else recommendation = 'NOT_RECOMMENDED';

    const discSummary = discTest ? this.buildDISCSummary(discTest, candidate.job.discProfileRequired) : undefined;
    const geographic = includeGeographic ? this.buildGeographicAnalysis(candidate) : undefined;

    const report: ReportOutput = {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        linkedin: candidate.linkedin,
        portfolio: candidate.portfolio,
        photo: candidate.photo,
        resumeUrl: candidate.resumeUrl,
        summary: candidate.aiSummary || 'Sem resumo disponível',
      },
      job: {
        id: candidate.job.id,
        title: candidate.job.title,
        department: candidate.job.department,
        location: candidate.job.location || `${candidate.job.city || ''}, ${candidate.job.state || ''}`.trim(),
        workModel: candidate.job.workModel || 'REMOTE',
      },
      analysis: {
        overallScore,
        skillsMatch: candidate.skillsScore || 50,
        experienceMatch: candidate.experienceScore || 50,
        discFit: discTest?.jobFitScore || 50,
        culturalFit: 70,
        strengths: [
          Array.isArray(skills) && skills.length > 0 ? `Experiência em ${skills.slice(0, 3).join(', ')}` : 'Perfil em análise',
          overallScore >= 60 ? 'Boa compatibilidade com a vaga' : 'Potencial de desenvolvimento',
          'Disponível para novas oportunidades',
        ],
        weaknesses: [
          'Análise detalhada pendente',
        ],
        riskFactors: [],
      },
      discProfile: discSummary,
      geographic,
      recommendation: {
        recommendation,
        confidence: 75,
        reasoning: `Baseado no score de compatibilidade de ${overallScore}%, o candidato ${overallScore >= 60 ? 'é uma boa opção para a vaga' : 'pode necessitar de avaliação adicional'}.`,
        onboardingNotes: [
          'Realizar entrevista técnica',
          'Verificar disponibilidade',
        ],
        interviewFocus: [
          'Experiência técnica',
          'Fit cultural',
          'Disponibilidade e expectativas',
        ],
        salaryExpectation: candidate.job.salaryMin && candidate.job.salaryMax ? {
          min: candidate.job.salaryMin,
          max: candidate.job.salaryMax,
          currency: candidate.job.currency || 'BRL',
        } : undefined,
      },
      reportSummary: `${candidate.name} apresenta score de ${overallScore}% de compatibilidade com a vaga ${candidate.job.title}. ${overallScore >= 60 ? 'Recomendado para próxima etapa do processo seletivo.' : 'Recomendada avaliação adicional antes de avançar.'}`,
      generatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: report,
    };
  }
}

// ============================================
// Convenience Functions
// ============================================

export async function generateCandidateReport(
  tenantId: string,
  candidateId: string,
  jobId: string,
  options: {
    includeComparison?: boolean;
    includeDISC?: boolean;
    includeGeographic?: boolean;
  } = {}
): Promise<TaskResult<ReportOutput>> {
  const agent = new ReportAgent(tenantId);
  await agent.initialize();
  
  return agent.execute({
    candidateId,
    jobId,
    includeComparison: options.includeComparison ?? true,
    includeDISC: options.includeDISC ?? true,
    includeGeographic: options.includeGeographic ?? true,
  });
}

export async function generateBatchReports(
  tenantId: string,
  jobId: string
): Promise<{ success: number; failed: number; reports: ReportOutput[] }> {
  const candidates = await db.candidate.findMany({
    where: { jobId },
    select: { id: true },
  });

  const agent = new ReportAgent(tenantId);
  await agent.initialize();

  const reports: ReportOutput[] = [];
  let success = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const result = await agent.execute({
      candidateId: candidate.id,
      jobId,
      includeComparison: true,
      includeDISC: true,
      includeGeographic: true,
    });

    if (result.success && result.data) {
      reports.push(result.data);
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed, reports };
}
