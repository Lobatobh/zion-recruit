/**
 * Matching Agent - Zion Recruit
 * 
 * Specialized agent that:
 * - Calculates candidate-job compatibility scores
 * - Performs multi-dimensional matching
 * - Ranks candidates automatically
 * - Provides detailed match analysis
 * 
 * Matching dimensions:
 * - Skills match (technical requirements)
 * - Experience match (years and relevance)
 * - DISC profile fit (behavioral compatibility)
 * - Cultural fit (values and work style)
 * - Geographic fit (location and remote work)
 */

import { BaseAgent, AgentConfig, TaskInput, TaskResult, TaskOutput } from '../base/BaseAgent';
import { llmService } from '../base/LLMService';
import { AgentType } from '@prisma/client';
import { db } from '@/lib/db';

// ============================================
// Types
// ============================================

interface MatchingInput {
  candidateId: string;
  jobId: string;
  includeExplanation?: boolean;
}

interface SkillMatch {
  skill: string;
  required: boolean;
  candidateLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  requiredLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  score: number;
  gap: boolean;
}

interface ExperienceMatch {
  yearsRequired: number;
  yearsCandidate: number;
  relevanceScore: number;
  highlights: string[];
  gaps: string[];
}

interface DISCMatch {
  candidateProfile: { D: number; I: number; S: number; C: number };
  requiredProfile: { D: number; I: number; S: number; C: number } | null;
  compatibilityScore: number;
  behavioralFit: string;
  potentialFrictions: string[];
}

interface CulturalMatch {
  score: number;
  workStyleFit: string;
  teamFit: string;
  valuesAlignment: string[];
}

interface GeographicMatch {
  score: number;
  location: string;
  relocationNeeded: boolean;
  remoteWorkFit: number;
  timezoneMatch: boolean;
}

interface MatchBreakdown {
  skills: number;
  experience: number;
  disc: number;
  cultural: number;
  geographic: number;
  weights: {
    skills: number;
    experience: number;
    disc: number;
    cultural: number;
    geographic: number;
  };
}

interface MatchingOutput extends TaskOutput {
  overallScore: number;
  breakdown: MatchBreakdown;
  skillMatches: SkillMatch[];
  experienceMatch: ExperienceMatch;
  discMatch: DISCMatch;
  culturalMatch: CulturalMatch;
  geographicMatch: GeographicMatch;
  ranking: {
    position: number;
    totalCandidates: number;
    percentile: number;
  };
  recommendation: 'STRONG_MATCH' | 'GOOD_MATCH' | 'PARTIAL_MATCH' | 'WEAK_MATCH';
  summary: string;
  improvementSuggestions: string[];
}

// ============================================
// Agent Configuration
// ============================================

const MATCHING_CONFIG: AgentConfig = {
  type: AgentType.MATCHING,
  name: 'Matching Agent',
  description: 'Calcula compatibilidade candidato-vaga com análise detalhada',
  model: 'gpt-4o-mini',
  maxTokens: 1000,
  temperature: 0.2,
  systemPrompt: `Você é um especialista em recrutamento. Calcule scores de compatibilidade.
Analise skills, experiência, DISC, cultura e geografia.
Retorne JSON válido com análise detalhada.`,
};

// Default weights for scoring
const DEFAULT_WEIGHTS = {
  skills: 0.35,
  experience: 0.25,
  disc: 0.15,
  cultural: 0.15,
  geographic: 0.10,
};

// ============================================
// Matching Agent Class
// ============================================

export class MatchingAgent extends BaseAgent {
  constructor(tenantId: string) {
    super(tenantId, MATCHING_CONFIG);
  }

  async execute(input: TaskInput): Promise<TaskResult<MatchingOutput>> {
    const { candidateId, jobId, includeExplanation } = input as MatchingInput;

    // Get candidate data
    const candidate = await db.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        name: true,
        parsedSkills: true,
        parsedExperience: true,
        resumeText: true,
        city: true,
        state: true,
        country: true,
        matchScore: true,
        skillsScore: true,
        experienceScore: true,
        job: {
          select: {
            id: true,
            title: true,
            aiParsedSkills: true,
            requirements: true,
            discProfileRequired: true,
            remote: true,
            workModel: true,
            city: true,
            state: true,
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

    // Get DISC test
    const discTest = await db.dISCTest.findUnique({
      where: { candidateId },
      select: {
        profileD: true,
        profileI: true,
        profileS: true,
        profileC: true,
        primaryProfile: true,
        jobFitScore: true,
      },
    });

    // Get other candidates for ranking
    const otherCandidates = await db.candidate.findMany({
      where: {
        jobId,
        id: { not: candidateId },
      },
      select: {
        id: true,
        matchScore: true,
      },
    });

    // Perform matching calculations
    const skillMatches = this.calculateSkillMatches(
      candidate.parsedSkills,
      candidate.job.aiParsedSkills
    );

    const experienceMatch = this.calculateExperienceMatch(
      candidate.parsedExperience,
      candidate.job.requirements
    );

    const discMatch = this.calculateDISCMatch(
      discTest,
      candidate.job.discProfileRequired
    );

    const culturalMatch = this.calculateCulturalMatch(candidate);

    const geographicMatch = this.calculateGeographicMatch(candidate);

    // Calculate weighted scores
    const skillsScore = this.averageScore(skillMatches.map(s => s.score));
    const breakdown: MatchBreakdown = {
      skills: skillsScore,
      experience: experienceMatch.relevanceScore,
      disc: discMatch.compatibilityScore,
      cultural: culturalMatch.score,
      geographic: geographicMatch.score,
      weights: DEFAULT_WEIGHTS,
    };

    const overallScore = Math.round(
      breakdown.skills * breakdown.weights.skills +
      breakdown.experience * breakdown.weights.experience +
      breakdown.disc * breakdown.weights.disc +
      breakdown.cultural * breakdown.weights.cultural +
      breakdown.geographic * breakdown.weights.geographic
    );

    // Calculate ranking
    const allScores = [overallScore, ...otherCandidates.map(c => c.matchScore || 0)]
      .sort((a, b) => b - a);
    const position = allScores.indexOf(overallScore) + 1;
    const total = allScores.length;
    const percentile = total > 1 ? Math.round(((total - position) / (total - 1)) * 100) : 100;

    // Determine recommendation
    let recommendation: 'STRONG_MATCH' | 'GOOD_MATCH' | 'PARTIAL_MATCH' | 'WEAK_MATCH';
    if (overallScore >= 80) recommendation = 'STRONG_MATCH';
    else if (overallScore >= 60) recommendation = 'GOOD_MATCH';
    else if (overallScore >= 40) recommendation = 'PARTIAL_MATCH';
    else recommendation = 'WEAK_MATCH';

    // Generate improvement suggestions
    const improvementSuggestions = this.generateImprovementSuggestions(
      skillMatches,
      experienceMatch,
      discMatch
    );

    // Generate summary
    const summary = this.generateSummary(
      candidate.name,
      candidate.job.title,
      overallScore,
      recommendation
    );

    // Update candidate scores in database
    await db.candidate.update({
      where: { id: candidateId },
      data: {
        matchScore: overallScore,
        skillsScore: Math.round(breakdown.skills),
        experienceScore: Math.round(breakdown.experience),
        matchDetails: JSON.stringify({
          breakdown,
          recommendation,
          calculatedAt: new Date().toISOString(),
        }),
      },
    });

    const output: MatchingOutput = {
      overallScore,
      breakdown,
      skillMatches,
      experienceMatch,
      discMatch,
      culturalMatch,
      geographicMatch,
      ranking: {
        position,
        totalCandidates: total,
        percentile,
      },
      recommendation,
      summary,
      improvementSuggestions,
    };

    return {
      success: true,
      data: output,
    };
  }

  // ============================================
  // Matching Calculations
  // ============================================

  private calculateSkillMatches(
    candidateSkills: string | null,
    jobSkills: string | null
  ): SkillMatch[] {
    const cSkills = candidateSkills ? JSON.parse(candidateSkills) : [];
    const jSkills = jobSkills ? JSON.parse(jobSkills) : [];

    if (!Array.isArray(jSkills) || jSkills.length === 0) {
      return [];
    }

    return jSkills.map((skill: string) => {
      const hasSkill = Array.isArray(cSkills) && cSkills.some((s: string) =>
        s.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(s.toLowerCase())
      );

      return {
        skill,
        required: true,
        candidateLevel: hasSkill ? 'intermediate' : null,
        requiredLevel: 'intermediate' as const,
        score: hasSkill ? 80 : 0,
        gap: !hasSkill,
      };
    });
  }

  private calculateExperienceMatch(
    candidateExperience: string | null,
    requirements: string
  ): ExperienceMatch {
    // Extract years from experience
    const expText = candidateExperience || '';
    const yearsMatch = expText.match(/(\d+)\s*(anos?|years?)/i);
    const yearsCandidate = yearsMatch ? parseInt(yearsMatch[1]) : 3;

    // Extract required years from requirements
    const reqYearsMatch = requirements.match(/(\d+)\s*(anos?|years?)/i);
    const yearsRequired = reqYearsMatch ? parseInt(reqYearsMatch[1]) : 3;

    // Calculate relevance
    let relevanceScore = 50;
    if (yearsCandidate >= yearsRequired) {
      relevanceScore = Math.min(100, 70 + (yearsCandidate - yearsRequired) * 5);
    } else {
      relevanceScore = Math.max(20, 70 - (yearsRequired - yearsCandidate) * 10);
    }

    return {
      yearsRequired,
      yearsCandidate,
      relevanceScore,
      highlights: yearsCandidate >= yearsRequired 
        ? ['Experiência adequada para a vaga']
        : ['Experiência abaixo do requerido'],
      gaps: yearsCandidate < yearsRequired 
        ? [`${yearsRequired - yearsCandidate} anos de experiência faltando`]
        : [],
    };
  }

  private calculateDISCMatch(
    discTest: {
      profileD: number | null;
      profileI: number | null;
      profileS: number | null;
      profileC: number | null;
      primaryProfile: string | null;
      jobFitScore: number | null;
    } | null,
    requiredProfile: string | null
  ): DISCMatch {
    const candidateProfile = {
      D: discTest?.profileD || 50,
      I: discTest?.profileI || 50,
      S: discTest?.profileS || 50,
      C: discTest?.profileC || 50,
    };

    let required: { D: number; I: number; S: number; C: number } | null = null;
    if (requiredProfile) {
      try {
        required = JSON.parse(requiredProfile);
      } catch {
        // Invalid JSON
      }
    }

    // Calculate compatibility
    let compatibilityScore = 70; // Default
    if (required) {
      const diff = 
        Math.abs(candidateProfile.D - required.D) +
        Math.abs(candidateProfile.I - required.I) +
        Math.abs(candidateProfile.S - required.S) +
        Math.abs(candidateProfile.C - required.C);
      compatibilityScore = Math.max(0, 100 - diff / 4);
    } else if (discTest?.jobFitScore) {
      compatibilityScore = discTest.jobFitScore;
    }

    const primary = discTest?.primaryProfile || 'S';
    const behavioralFit = this.getBehavioralFit(primary);
    const potentialFrictions = this.getPotentialFrictions(primary, required);

    return {
      candidateProfile,
      requiredProfile: required,
      compatibilityScore,
      behavioralFit,
      potentialFrictions,
    };
  }

  private calculateCulturalMatch(candidate: {
    resumeText: string | null;
    parsedExperience: string | null;
  }): CulturalMatch {
    // Simplified cultural match based on available data
    const resumeText = (candidate.resumeText || '').toLowerCase();
    const experience = (candidate.parsedExperience || '').toLowerCase();

    // Check for cultural indicators
    const teamworkKeywords = ['equipe', 'team', 'colaboração', 'collaboration'];
    const leadershipKeywords = ['liderança', 'leadership', 'gestão', 'management'];
    const innovationKeywords = ['inovação', 'innovation', 'startup', 'ágil'];

    let score = 70;
    if (teamworkKeywords.some(k => resumeText.includes(k) || experience.includes(k))) {
      score += 5;
    }
    if (leadershipKeywords.some(k => resumeText.includes(k) || experience.includes(k))) {
      score += 5;
    }
    if (innovationKeywords.some(k => resumeText.includes(k) || experience.includes(k))) {
      score += 5;
    }

    return {
      score: Math.min(100, score),
      workStyleFit: 'Perfil compatível com ambiente colaborativo',
      teamFit: 'Boa adaptação a equipes multidisciplinares',
      valuesAlignment: ['Trabalho em equipe', 'Comunicação', 'Resultados'],
    };
  }

  private calculateGeographicMatch(candidate: {
    city: string | null;
    state: string | null;
    country: string | null;
    job: {
      remote: boolean;
      workModel: string | null;
      city: string | null;
      state: string | null;
    };
  }): GeographicMatch {
    const location = [candidate.city, candidate.state, candidate.country]
      .filter(Boolean)
      .join(', ') || 'Não informada';

    const sameCity = candidate.city && candidate.job.city &&
      candidate.city.toLowerCase() === candidate.job.city.toLowerCase();
    const sameState = candidate.state && candidate.job.state &&
      candidate.state.toLowerCase() === candidate.job.state.toLowerCase();

    const relocationNeeded = !candidate.job.remote && !sameCity;
    const remoteWorkFit = candidate.job.remote ? 100 : sameCity ? 90 : sameState ? 70 : 40;
    const timezoneMatch = true; // Assuming same timezone for Brazil

    let score = 100;
    if (!candidate.job.remote) {
      if (sameCity) score = 100;
      else if (sameState) score = 70;
      else score = 30;
    }

    return {
      score,
      location,
      relocationNeeded,
      remoteWorkFit,
      timezoneMatch,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private averageScore(scores: number[]): number {
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  private getBehavioralFit(profile: string): string {
    const fits: Record<string, string> = {
      D: 'Orientado a resultados, adequado para posições de liderança e vendas',
      I: 'Comunicativo e entusiasmado, ideal para relacionamento e equipe',
      S: 'Estável e confiável, excelente para suporte e operações',
      C: 'Analítico e detalhista, perfeito para qualidade e análise',
    };
    return fits[profile] || 'Perfil comportamental versátil';
  }

  private getPotentialFrictions(
    profile: string,
    required: { D: number; I: number; S: number; C: number } | null
  ): string[] {
    const frictions: Record<string, string[]> = {
      D: ['Pode ser visto como impaciente', 'Necessita de autonomia'],
      I: ['Pode ter dificuldade com tarefas repetitivas', 'Precisa de interação social'],
      S: ['Pode resistir a mudanças rápidas', 'Prefere ambiente estável'],
      C: ['Pode ser visto como perfeccionista', 'Necessita de dados para decisões'],
    };
    return frictions[profile] || [];
  }

  private generateImprovementSuggestions(
    skillMatches: SkillMatch[],
    experienceMatch: ExperienceMatch,
    discMatch: DISCMatch
  ): string[] {
    const suggestions: string[] = [];

    // Skill gaps
    const skillGaps = skillMatches.filter(s => s.gap);
    if (skillGaps.length > 0) {
      suggestions.push(`Desenvolver habilidades em: ${skillGaps.slice(0, 3).map(s => s.skill).join(', ')}`);
    }

    // Experience gaps
    if (experienceMatch.gaps.length > 0) {
      suggestions.push(...experienceMatch.gaps);
    }

    // DISC suggestions
    if (discMatch.potentialFrictions.length > 0) {
      suggestions.push(discMatch.potentialFrictions[0]);
    }

    return suggestions.slice(0, 5);
  }

  private generateSummary(
    name: string,
    jobTitle: string,
    score: number,
    recommendation: string
  ): string {
    const recommendationLabels = {
      STRONG_MATCH: 'excelente',
      GOOD_MATCH: 'boa',
      PARTIAL_MATCH: 'parcial',
      WEAK_MATCH: 'baixa',
    };

    return `${name} apresenta ${recommendationLabels[recommendation as keyof typeof recommendationLabels]} compatibilidade (${score}%) com a vaga ${jobTitle}.`;
  }
}

// ============================================
// Convenience Functions
// ============================================

export async function matchCandidate(
  tenantId: string,
  candidateId: string,
  jobId: string
): Promise<TaskResult<MatchingOutput>> {
  const agent = new MatchingAgent(tenantId);
  await agent.initialize();
  
  return agent.execute({ candidateId, jobId });
}

export async function matchAllCandidates(
  tenantId: string,
  jobId: string
): Promise<{ success: number; failed: number; results: MatchingOutput[] }> {
  const candidates = await db.candidate.findMany({
    where: { jobId },
    select: { id: true },
  });

  const agent = new MatchingAgent(tenantId);
  await agent.initialize();

  const results: MatchingOutput[] = [];
  let success = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const result = await agent.execute({
      candidateId: candidate.id,
      jobId,
    });

    if (result.success && result.data) {
      results.push(result.data);
      success++;
    } else {
      failed++;
    }
  }

  // Sort by score
  results.sort((a, b) => b.overallScore - a.overallScore);

  return { success, failed, results };
}

export async function getTopCandidates(
  tenantId: string,
  jobId: string,
  limit: number = 5
): Promise<MatchingOutput[]> {
  const { results } = await matchAllCandidates(tenantId, jobId);
  return results.slice(0, limit);
}
