/**
 * Sourcing Service - Zion Recruit
 * 
 * Unified interface for multi-source candidate sourcing
 * Coordinates LinkedIn, Indeed, GitHub, and internal searches
 */

import { db } from '@/lib/db';
import { linkedInScraper } from './linkedin-scraper';
import { indeedScraper } from './indeed-scraper';
import { githubScraper } from './github-scraper';
import { internalSearch } from './internal-search';
import {
  SourcingSource,
  SourcingSearchParams,
  SourcingSearchResult,
  MultiSourceSearchResult,
  SourcedCandidate,
  ImportCandidateInput,
  ImportCandidateResult,
  BulkImportInput,
  BulkImportResult,
  SourceConfig,
  RateLimitStatus,
  calculateRelevanceScore,
} from './types';

// ============================================
// Sourcing Service Class
// ============================================

export class SourcingService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Search candidates across multiple sources
   */
  async multiSourceSearch(
    params: SourcingSearchParams
  ): Promise<MultiSourceSearchResult> {
    const startTime = Date.now();
    const sources = params.sources || ['linkedin', 'indeed', 'github', 'internal'];
    
    // Execute searches in parallel
    const searchPromises = sources.map(source => this.searchSingleSource(source, params));
    const results = await Promise.allSettled(searchPromises);
    
    // Aggregate results
    const bySource: Record<SourcingSource, SourcingSearchResult> = {} as Record<SourcingSource, SourcingSearchResult>;
    const errors: string[] = [];
    let allCandidates: SourcedCandidate[] = [];
    
    results.forEach((result, index) => {
      const source = sources[index] as SourcingSource;
      
      if (result.status === 'fulfilled') {
        bySource[source] = result.value;
        if (result.value.success) {
          allCandidates = allCandidates.concat(result.value.candidates);
        } else if (result.value.error) {
          errors.push(`${source}: ${result.value.error}`);
        }
      } else {
        bySource[source] = {
          success: false,
          candidates: [],
          total: 0,
          source,
          error: result.reason?.message || 'Unknown error',
        };
        errors.push(`${source}: ${result.reason?.message || 'Unknown error'}`);
      }
    });
    
    // Deduplicate candidates
    const { unique, duplicates } = this.deduplicateCandidates(allCandidates, params.deduplicate !== false);
    
    // Calculate relevance scores
    const skills = params.skills || [];
    const location = params.location;
    const experienceLevel = params.experienceLevel;
    
    unique.forEach(candidate => {
      if (skills.length > 0 && !candidate.relevanceScore) {
        candidate.relevanceScore = calculateRelevanceScore(candidate, skills, location, experienceLevel);
      }
    });
    
    // Sort by relevance
    unique.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    return {
      success: true,
      candidates: unique,
      total: unique.length,
      bySource,
      deduplicated: duplicates,
      durationMs: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Search a single source
   */
  private async searchSingleSource(
    source: SourcingSource,
    params: SourcingSearchParams
  ): Promise<SourcingSearchResult> {
    switch (source) {
      case 'linkedin':
        return linkedInScraper.search(params);
      case 'indeed':
        return indeedScraper.search(params);
      case 'github':
        return githubScraper.search(params);
      case 'internal':
        return internalSearch.search(params, this.tenantId);
      default:
        return {
          success: false,
          candidates: [],
          total: 0,
          source,
          error: `Unknown source: ${source}`,
        };
    }
  }

  /**
   * Deduplicate candidates by email and LinkedIn URL
   */
  private deduplicateCandidates(
    candidates: SourcedCandidate[],
    enabled: boolean = true
  ): { unique: SourcedCandidate[]; duplicates: number } {
    if (!enabled) {
      return { unique: candidates, duplicates: 0 };
    }
    
    const seen = new Map<string, SourcedCandidate>();
    let duplicates = 0;
    
    for (const candidate of candidates) {
      // Create deduplication keys
      const keys = [
        candidate.email?.toLowerCase(),
        candidate.linkedin?.toLowerCase(),
        candidate.github?.toLowerCase(),
        `${candidate.name.toLowerCase()}_${candidate.source}`,
      ].filter(Boolean) as string[];
      
      // Check if already seen
      let isDuplicate = false;
      for (const key of keys) {
        if (seen.has(key)) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        // Add to seen with all keys
        keys.forEach(key => seen.set(key, candidate));
        seen.set(candidate.id, candidate);
      } else {
        duplicates++;
      }
    }
    
    return {
      unique: Array.from(new Set(seen.values())),
      duplicates,
    };
  }

  /**
   * Import a candidate into the database
   */
  async importCandidate(input: ImportCandidateInput): Promise<ImportCandidateResult> {
    try {
      // Check for duplicates
      if (!input.skipDuplicateCheck) {
        const existing = await db.candidate.findFirst({
          where: {
            tenantId: this.tenantId,
            jobId: input.jobId,
            OR: [
              { email: input.candidate.email },
              { linkedin: input.candidate.linkedin },
              { github: input.candidate.github },
            ].filter(Boolean),
          },
        });
        
        if (existing) {
          return {
            success: false,
            isDuplicate: true,
            existingCandidateId: existing.id,
            error: 'Candidate already exists in this job pipeline',
          };
        }
      }
      
      // Create candidate
      const candidate = await db.candidate.create({
        data: {
          tenantId: this.tenantId,
          jobId: input.jobId,
          name: input.candidate.name,
          email: input.candidate.email || `pending_${Date.now()}@temp.com`,
          phone: input.candidate.phone,
          linkedin: input.candidate.linkedin,
          github: input.candidate.github,
          portfolio: input.candidate.portfolio,
          city: input.candidate.city,
          state: input.candidate.state,
          country: input.candidate.country,
          parsedSkills: JSON.stringify(input.candidate.skills),
          parsedExperience: input.candidate.experience ? JSON.stringify(input.candidate.experience) : null,
          matchScore: input.candidate.relevanceScore,
          source: input.candidate.source,
          sourceUrl: input.candidate.sourceUrl,
          status: 'SOURCED',
          tags: input.tags ? JSON.stringify(input.tags) : null,
          notes: input.notes ? input.notes : null,
        },
      });
      
      return {
        success: true,
        candidateId: candidate.id,
      };
    } catch (error) {
      console.error('Import candidate error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import candidate',
      };
    }
  }

  /**
   * Bulk import candidates
   */
  async bulkImport(input: BulkImportInput): Promise<BulkImportResult> {
    const results: ImportCandidateResult[] = [];
    let imported = 0;
    let duplicates = 0;
    let failed = 0;
    
    for (const candidate of input.candidates) {
      const result = await this.importCandidate({
        candidate,
        jobId: input.jobId,
        tags: input.tags,
        skipDuplicateCheck: input.skipDuplicateCheck,
      });
      
      results.push(result);
      
      if (result.success) {
        imported++;
      } else if (result.isDuplicate) {
        duplicates++;
      } else {
        failed++;
      }
    }
    
    return {
      success: imported > 0,
      imported,
      duplicates,
      failed,
      results,
    };
  }

  /**
   * Get available sources configuration
   */
  static getAvailableSources(): SourceConfig[] {
    return [
      linkedInScraper.constructor.getSourceConfig(),
      indeedScraper.constructor.getSourceConfig(),
      githubScraper.constructor.getSourceConfig(),
      internalSearch.constructor.getSourceConfig(),
    ];
  }

  /**
   * Get rate limit status for all sources
   */
  getRateLimitStatuses(): Record<SourcingSource, RateLimitStatus> {
    return {
      linkedin: linkedInScraper.getRateLimitStatus(),
      indeed: indeedScraper.getRateLimitStatus(),
      github: githubScraper.getRateLimitStatus(),
      internal: internalSearch.getRateLimitStatus(),
    };
  }

  /**
   * Search by job requirements (extracts skills from job)
   */
  async searchByJob(jobId: string, options?: Partial<SourcingSearchParams>): Promise<MultiSourceSearchResult> {
    // Get job details
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
      return {
        success: false,
        candidates: [],
        total: 0,
        bySource: {} as Record<SourcingSource, SourcingSearchResult>,
        deduplicated: 0,
        durationMs: 0,
        errors: ['Job not found'],
      };
    }
    
    // Parse skills from job
    let skills: string[] = [];
    if (job.aiParsedSkills) {
      try {
        skills = JSON.parse(job.aiParsedSkills);
      } catch {
        // Extract skills from requirements
        skills = this.extractSkillsFromText(job.requirements);
      }
    } else {
      skills = this.extractSkillsFromText(job.requirements);
    }
    
    // Map seniority
    const experienceLevel = this.mapSeniorityToLevel(job.aiParsedSeniority);
    
    // Build search params
    const searchParams: SourcingSearchParams = {
      jobId,
      skills,
      query: job.title,
      location: [job.city, job.state].filter(Boolean).join(', ') || undefined,
      experienceLevel,
      ...options,
    };
    
    return this.multiSourceSearch(searchParams);
  }

  /**
   * Extract skills from text using pattern matching
   */
  private extractSkillsFromText(text: string): string[] {
    const skillPatterns = [
      /\b(react|vue|angular|next\.js|svelte|javascript|typescript|node\.js|express)\b/gi,
      /\b(python|django|flask|fastapi|tensorflow|pytorch)\b/gi,
      /\b(java|spring|kotlin|scala)\b/gi,
      /\b(go|golang|rust|c\+\+|c#)\b/gi,
      /\b(aws|azure|gcp|docker|kubernetes|terraform|ansible)\b/gi,
      /\b(sql|mongodb|postgresql|redis|elasticsearch|graphql)\b/gi,
      /\b(git|ci\/cd|jenkins|github actions|gitlab ci)\b/gi,
      /\b(machine learning|data science|nlp|computer vision)\b/gi,
    ];
    
    const skills = new Set<string>();
    for (const pattern of skillPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => skills.add(m.toLowerCase()));
      }
    }
    
    return Array.from(skills);
  }

  /**
   * Map seniority string to experience level
   */
  private mapSeniorityToLevel(seniority: string | null): SourcingSearchParams['experienceLevel'] {
    if (!seniority) return undefined;
    
    const lower = seniority.toLowerCase();
    if (lower.includes('entry') || lower.includes('intern')) return 'entry';
    if (lower.includes('junior')) return 'junior';
    if (lower.includes('mid') || lower.includes('pleno')) return 'mid';
    if (lower.includes('senior')) return 'senior';
    if (lower.includes('lead') || lower.includes('tech lead')) return 'lead';
    if (lower.includes('principal') || lower.includes('staff')) return 'principal';
    if (lower.includes('executive') || lower.includes('director')) return 'executive';
    
    return undefined;
  }
}

// ============================================
// Export Factory Function
// ============================================

export function createSourcingService(tenantId: string): SourcingService {
  return new SourcingService(tenantId);
}
