/**
 * Screening Agent - Zion Recruit
 * 
 * Specialized agent that:
 * - Screens candidates against job requirements
 * - Calculates match scores
 * - Ranks candidates by relevance
 * - Identifies strengths and gaps
 * 
 * Token optimization:
 * - Batch processing
 * - Concise analysis
 * - Cached scoring
 */

import { BaseAgent, AgentConfig, TaskInput, TaskResult, TaskOutput } from '../base/BaseAgent';
import { llmService } from '../base/LLMService';
import { AgentType } from '@prisma/client';
import { db } from '@/lib/db';

// ============================================
// Types
// ============================================

interface ScreeningInput {
  candidateId: string;
  jobId: string;
}

interface ScreeningOutput extends TaskOutput {
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  discScore?: number;
  strengths: string[];
  gaps: string[];
  recommendation: 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'NEUTRAL' | 'NOT_RECOMMENDED';
  summary: string;
}

// ============================================
// Agent Configuration
// ============================================

const SCREENING_CONFIG: AgentConfig = {
  type: AgentType.SCREENING,
  name: 'Screening Agent',
  description: 'Avalia candidatos contra requisitos da vaga',
  model: 'gpt-4o-mini',
  maxTokens: 600,
  temperature: 0.2,
  systemPrompt: 'Avalie compatibilidade candidato-vaga. Retorne JSON válido.',
};

// ============================================
// Screening Agent Class
// ============================================

export class ScreeningAgent extends BaseAgent {
  constructor(tenantId: string) {
    super(tenantId, SCREENING_CONFIG);
  }

  async execute(input: TaskInput): Promise<TaskResult<ScreeningOutput>> {
    const { candidateId, jobId } = input as ScreeningInput;

    // Get candidate data
    const candidate = await db.candidate.findUnique({
      where: { id: candidateId },
      select: {
        name: true,
        resumeText: true,
        parsedSkills: true,
        parsedExperience: true,
        aiSummary: true,
      },
    });

    if (!candidate) {
      return { success: false, error: 'Candidato não encontrado' };
    }

    // Get job data
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        title: true,
        description: true,
        requirements: true,
        aiParsedSkills: true,
        discProfileRequired: true,
      },
    });

    if (!job) {
      return { success: false, error: 'Vaga não encontrada' };
    }

    // Build comparison prompt
    const prompt = this.buildComparisonPrompt(candidate, job);

    // Get AI analysis
    const response = await llmService.call<ScreeningOutput>(
      {
        systemPrompt: SCREENING_CONFIG.systemPrompt!,
        userPrompt: prompt,
        maxTokens: 600,
        temperature: 0.2,
        model: 'gpt-4o-mini',
        jsonMode: true,
      },
      {
        enabled: true,
        tenantId: this.tenantId,
        cacheKey: `screen_${candidateId}_${jobId}`,
        ttlDays: 7,
      }
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Falha na análise',
      };
    }

    // Update candidate with scores
    await db.candidate.update({
      where: { id: candidateId },
      data: {
        matchScore: response.data.overallScore,
        skillsScore: response.data.skillsScore,
        experienceScore: response.data.experienceScore,
        matchDetails: JSON.stringify({
          strengths: response.data.strengths,
          gaps: response.data.gaps,
          recommendation: response.data.recommendation,
        }),
        aiSummary: response.data.summary,
      },
    });

    return {
      success: true,
      data: response.data,
      tokensUsed: response.tokensUsed,
    };
  }

  private buildComparisonPrompt(
    candidate: {
      name: string;
      resumeText: string | null;
      parsedSkills: string | null;
      aiSummary: string | null;
    },
    job: {
      title: string;
      description: string;
      requirements: string;
      aiParsedSkills: string | null;
    }
  ): string {
    const candidateSkills = candidate.parsedSkills
      ? JSON.parse(candidate.parsedSkills)
      : [];
    
    const jobSkills = job.aiParsedSkills
      ? JSON.parse(job.aiParsedSkills)
      : [];

    return `CANDIDATO: ${candidate.name}
Skills: ${Array.isArray(candidateSkills) ? candidateSkills.join(', ') : 'N/A'}
Resumo: ${candidate.aiSummary || this.truncateText(candidate.resumeText || 'N/A', 300)}

VAGA: ${job.title}
Requisitos: ${Array.isArray(jobSkills) ? jobSkills.join(', ') : this.truncateText(job.requirements, 200)}

Retorne JSON:
{
  "overallScore": 0-100,
  "skillsScore": 0-100,
  "experienceScore": 0-100,
  "educationScore": 0-100,
  "strengths": ["ponto1", "ponto2"],
  "gaps": ["gap1"],
  "recommendation": "HIGHLY_RECOMMENDED|RECOMMENDED|NEUTRAL|NOT_RECOMMENDED",
  "summary": "Resumo em 1 frase"
}`;
  }
}

// ============================================
// Batch Screening
// ============================================

export async function screenAllCandidates(
  tenantId: string,
  jobId: string
): Promise<{ success: number; failed: number }> {
  const candidates = await db.candidate.findMany({
    where: { jobId, matchScore: null },
    select: { id: true },
  });

  const agent = new ScreeningAgent(tenantId);
  await agent.initialize();

  let success = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const result = await agent.execute({ candidateId: candidate.id, jobId });
    if (result.success) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

// ============================================
// Convenience Function
// ============================================

export async function screenCandidate(
  tenantId: string,
  candidateId: string,
  jobId: string
): Promise<TaskResult<ScreeningOutput>> {
  const agent = new ScreeningAgent(tenantId);
  await agent.initialize();
  
  return agent.execute({ candidateId, jobId });
}
