/**
 * Sourcing Agent - Zion Recruit
 * 
 * Enhanced AI agent that:
 * - Searches for candidates across multiple sources
 * - Uses the unified sourcing service
 * - Imports candidates with deduplication
 * - Tracks sourcing metrics
 * 
 * Token optimization:
 * - Processes in batches
 * - Uses gpt-4o-mini
 * - Caches results
 */

import { BaseAgent, AgentConfig, TaskInput, TaskResult, TaskOutput } from '../base/BaseAgent';
import { llmService } from '../base/LLMService';
import { AgentType } from '@prisma/client';
import { db } from '@/lib/db';
import { createSourcingService } from '@/lib/sourcing/sourcing-service';
import {
  SourcingSource,
  SourcingSearchParams,
  SourcedCandidate,
} from '@/lib/sourcing/types';

// ============================================
// Types
// ============================================

interface SourcingInput {
  jobId: string;
  sources?: SourcingSource[];
  maxCandidates?: number;
  autoImport?: boolean;
  filters?: {
    location?: string;
    seniority?: string;
    skills?: string[];
    minRelevanceScore?: number;
  };
}

interface SourcingOutput extends TaskOutput {
  candidates: SourcedCandidate[];
  totalFound: number;
  imported: number;
  duplicates: number;
  bySource: Record<SourcingSource, { total: number; success: boolean }>;
  processedAt: string;
}

// ============================================
// Agent Configuration
// ============================================

const SOURCING_CONFIG: AgentConfig = {
  type: AgentType.SOURCING,
  name: 'Sourcing Agent',
  description: 'Busca candidatos na web baseado nos requisitos da vaga',
  model: 'gpt-4o-mini',
  maxTokens: 1500,
  temperature: 0.2,
  systemPrompt: 'Analise candidatos e extraia informações. Retorne JSON válido.',
};

// ============================================
// Sourcing Agent Class
// ============================================

export class SourcingAgent extends BaseAgent {
  constructor(tenantId: string) {
    super(tenantId, SOURCING_CONFIG);
  }

  async execute(input: TaskInput): Promise<TaskResult<SourcingOutput>> {
    const { jobId, sources, maxCandidates = 10, autoImport = false, filters } = input as SourcingInput;

    // Get job requirements
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        title: true,
        description: true,
        requirements: true,
        aiParsedSkills: true,
        city: true,
        state: true,
        aiParsedSeniority: true,
      },
    });

    if (!job) {
      return { success: false, error: 'Vaga não encontrada' };
    }

    // Create sourcing service
    const sourcingService = createSourcingService(this.tenantId);

    // Parse job skills
    let requiredSkills: string[] = [];
    if (job.aiParsedSkills) {
      try {
        requiredSkills = JSON.parse(job.aiParsedSkills);
      } catch {
        requiredSkills = this.extractSkillsFromText(job.requirements);
      }
    } else {
      requiredSkills = this.extractSkillsFromText(job.requirements);
    }

    // Override with filter skills if provided
    if (filters?.skills && filters.skills.length > 0) {
      requiredSkills = [...new Set([...requiredSkills, ...filters.skills])];
    }

    // Build search params
    const searchParams: SourcingSearchParams = {
      jobId,
      skills: requiredSkills,
      query: job.title,
      location: filters?.location || `${job.city || ''} ${job.state || ''}`.trim() || undefined,
      sources: sources || ['linkedin', 'indeed', 'github', 'internal'],
      limit: maxCandidates,
      experienceLevel: this.mapSeniorityToLevel(filters?.seniority || job.aiParsedSeniority),
    };

    // Execute multi-source search
    const searchResult = await sourcingService.searchByJob(jobId, searchParams);

    if (!searchResult.success) {
      return {
        success: false,
        error: searchResult.errors.join('; ') || 'Failed to search candidates',
      };
    }

    // Filter by minimum relevance score
    let candidates = searchResult.candidates;
    if (filters?.minRelevanceScore) {
      candidates = candidates.filter(
        c => (c.relevanceScore || 0) >= (filters.minRelevanceScore || 0)
      );
    }

    // Limit results
    candidates = candidates.slice(0, maxCandidates);

    // Auto-import if requested
    let imported = 0;
    let duplicates = 0;

    if (autoImport && candidates.length > 0) {
      const importResult = await sourcingService.bulkImport({
        candidates,
        jobId,
        tags: ['auto-sourced'],
      });

      imported = importResult.imported;
      duplicates = importResult.duplicates;
    }

    // Build bySource summary
    const bySource: Record<SourcingSource, { total: number; success: boolean }> = {} as Record<SourcingSource, { total: number; success: boolean }>;
    for (const [source, result] of Object.entries(searchResult.bySource)) {
      bySource[source as SourcingSource] = {
        total: result.total,
        success: result.success,
      };
    }

    // Update job sourcing timestamp
    await db.job.update({
      where: { id: jobId },
      data: { sourcingLastRun: new Date() },
    });

    return {
      success: true,
      data: {
        candidates,
        totalFound: searchResult.total,
        imported,
        duplicates,
        bySource,
        processedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Extract skills from text using pattern matching
   */
  private extractSkillsFromText(text: string): string[] {
    const skillPatterns = [
      /\b(react|node|typescript|javascript|python|java|go|rust|vue|angular|next\.js|svelte)\b/gi,
      /\b(aws|azure|gcp|docker|kubernetes|ci\/cd|devops|terraform|ansible)\b/gi,
      /\b(sql|mongodb|postgresql|redis|graphql|elasticsearch)\b/gi,
      /\b(machine learning|data science|nlp|tensorflow|pytorch)\b/gi,
      /\b(git|github|gitlab|bitbucket|jenkins|github actions)\b/gi,
    ];

    const skills = new Set<string>();
    for (const pattern of skillPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((m) => skills.add(m.toLowerCase()));
      }
    }

    return Array.from(skills);
  }

  /**
   * Map seniority string to experience level
   */
  private mapSeniorityToLevel(seniority?: string | null): SourcingSearchParams['experienceLevel'] {
    if (!seniority) return undefined;

    const lower = seniority.toLowerCase();
    if (lower.includes('entry') || lower.includes('intern') || lower.includes('estágio')) return 'entry';
    if (lower.includes('junior') || lower.includes('jr')) return 'junior';
    if (lower.includes('mid') || lower.includes('pleno')) return 'mid';
    if (lower.includes('senior') || lower.includes('sr')) return 'senior';
    if (lower.includes('lead')) return 'lead';
    if (lower.includes('principal') || lower.includes('staff')) return 'principal';
    if (lower.includes('executive') || lower.includes('director')) return 'executive';

    return undefined;
  }

  /**
   * Run scheduled sourcing for all active jobs
   */
  static async runScheduledSourcing(tenantId: string): Promise<void> {
    // Get all active jobs with sourcing enabled
    const jobs = await db.job.findMany({
      where: {
        tenantId,
        status: 'PUBLISHED',
        sourcingEnabled: true,
        OR: [
          { sourcingLastRun: null },
          { sourcingLastRun: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Not run in last 24h
        ],
      },
      select: { id: true },
    });

    const agent = new SourcingAgent(tenantId);
    await agent.initialize();

    for (const job of jobs) {
      try {
        await agent.execute({
          jobId: job.id,
          maxCandidates: 5,
          autoImport: false,
        });
      } catch (error) {
        console.error(`Failed to source for job ${job.id}:`, error);
      }
    }
  }
}

// ============================================
// Convenience Function
// ============================================

export async function sourceCandidates(
  tenantId: string,
  jobId: string,
  options?: Partial<SourcingInput>
): Promise<TaskResult<SourcingOutput>> {
  const agent = new SourcingAgent(tenantId);
  await agent.initialize();

  return agent.execute({
    jobId,
    ...options,
  });
}
