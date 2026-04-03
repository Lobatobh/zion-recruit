/**
 * Web Search Service - Hunter AI
 *
 * Wraps z-ai-web-dev-sdk web search for real candidate sourcing
 * across multiple platforms (LinkedIn, Google Jobs, Indeed, GitHub).
 * Queries are tailored for the Brazilian job market.
 */

import ZAI from 'z-ai-web-dev-sdk';
import type { SourcingSource } from './types';

// ============================================
// Types
// ============================================

export interface JobData {
  title: string;
  department?: string;
  requirements?: string;
  aiParsedSkills?: string; // JSON string array
  city?: string;
  state?: string;
  location?: string;
  workModel?: string;
}

interface SearchOptions {
  numResults?: number;
  recencyDays?: number;
}

interface SearchQueryResult {
  platform: SourcingSource;
  query: string;
}

interface RawSearchResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  rank: number;
  date: string;
  favicon: string;
}

export interface ExtractedCandidate {
  url: string;
  name: string;
  title?: string;
  snippet: string;
  source: SourcingSource;
  platform: string;
  raw: RawSearchResult;
}

interface SearchCandidatesResult {
  success: boolean;
  candidates: ExtractedCandidate[];
  totalResults: number;
  query: string;
  source: SourcingSource;
  durationMs: number;
  error?: string;
}

// ============================================
// Constants
// ============================================

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const DEFAULT_NUM_RESULTS = 10;
const BRAZIL_MARKET_SUFFIX = ' Brasil';

// ============================================
// Service
// ============================================

class HunterWebSearchService {
  /**
   * Build platform-specific search queries based on job requirements.
   * Optimized for the Brazilian job market.
   */
  buildSearchQueries(job: JobData): SearchQueryResult[] {
    const queries: SearchQueryResult[] = [];

    const title = job.title || '';
    const location = [job.city, job.state].filter(Boolean).join(', ') || job.location || '';
    const skills = this.parseSkills(job.aiParsedSkills, job.requirements);
    const topSkill = skills[0] || '';
    const secondSkill = skills[1] || '';

    // LinkedIn: profile search
    // "site:linkedin.com/in/ [job title] [key skill] [city] -jobs"
    if (title) {
      const linkedinParts = [
        'site:linkedin.com/in/',
        title,
        topSkill,
        location,
      ].filter(Boolean).join(' ');
      queries.push({
        platform: 'linkedin',
        query: `${linkedinParts} -jobs${BRAZIL_MARKET_SUFFIX}`,
      });
    }

    // Google Jobs: candidate search in Portuguese
    // "[job title] candidatos [location] currículo"
    if (title) {
      const googleJobsParts = [
        title,
        'candidatos',
        location,
        'currículo',
      ].filter(Boolean).join(' ');
      queries.push({
        platform: 'linkedin' as SourcingSource, // Google Jobs maps to linkedin source for sourcing
        query: `${googleJobsParts}${BRAZIL_MARKET_SUFFIX}`,
      });
    }

    // Indeed: profile search
    // "site:indeed.com [job title] perfil [location]"
    if (title) {
      const indeedParts = [
        'site:indeed.com',
        title,
        'perfil',
        location,
      ].filter(Boolean).join(' ');
      queries.push({
        platform: 'indeed',
        query: `${indeedParts}${BRAZIL_MARKET_SUFFIX}`,
      });
    }

    // GitHub: developer search
    // "site:github.com [skill] developer Brazil"
    if (topSkill) {
      const githubSkillPart = secondSkill
        ? `${topSkill} ${secondSkill}`
        : topSkill;
      queries.push({
        platform: 'github',
        query: `site:github.com ${githubSkillPart} developer Brazil`,
      });
    }

    // Extra LinkedIn query combining title + location for better coverage
    if (title && location) {
      queries.push({
        platform: 'linkedin',
        query: `site:linkedin.com/in/ "${title}" "${location}" -jobs${BRAZIL_MARKET_SUFFIX}`,
      });
    }

    // Extra Indeed query focused on skills
    if (topSkill && location) {
      queries.push({
        platform: 'indeed',
        query: `site:indeed.com ${topSkill} "${location}" currículo${BRAZIL_MARKET_SUFFIX}`,
      });
    }

    return queries;
  }

  /**
   * Perform a web search using z-ai-web-dev-sdk.
   * Includes retry logic (max 2 retries with 1s delay).
   */
  async searchCandidates(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchCandidatesResult> {
    const { numResults = DEFAULT_NUM_RESULTS } = options;
    const startTime = Date.now();

    // Determine source from query
    const source = this.inferSourceFromQuery(query);

    try {
      const results = await this.executeWithRetry(async () => {
        const zai = await ZAI.create();
        const searchResult = await zai.functions.invoke('web_search', {
          query,
          num: numResults,
        });
        return searchResult;
      });

      const durationMs = Date.now() - startTime;
      const rawResults = results as RawSearchResult[];
      const extracted = this.extractCandidatesFromResults(rawResults, source);

      return {
        success: true,
        candidates: extracted,
        totalResults: rawResults.length,
        query,
        source,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        candidates: [],
        totalResults: 0,
        query,
        source,
        durationMs,
        error: message,
      };
    }
  }

  /**
   * Extract candidate information from raw search results.
   * Structures data for LLM processing.
   */
  extractCandidatesFromResults(
    searchResults: RawSearchResult[],
    source: SourcingSource
  ): ExtractedCandidate[] {
    if (!Array.isArray(searchResults)) {
      return [];
    }

    return searchResults
      .filter((result) => {
        // Filter out job posting pages and non-profile URLs
        const url = (result.url || '').toLowerCase();
        const excludedPatterns = ['/jobs/', '/jobs?', 'job-opens', 'jobid=', '/careers/jobs'];
        return !excludedPatterns.some((pattern) => url.includes(pattern));
      })
      .map((result) => {
        const inferredName = this.inferNameFromResult(result, source);
        const inferredTitle = this.inferTitleFromResult(result, source);

        return {
          url: result.url,
          name: inferredName,
          title: inferredTitle,
          snippet: result.snippet || '',
          source,
          platform: result.host_name || this.getPlatformLabel(source),
          raw: result,
        };
      });
  }

  // ============================================
  // Private helpers
  // ============================================

  /**
   * Parse skills from either aiParsedSkills (JSON string array) or requirements text.
   */
  private parseSkills(aiParsedSkills?: string, requirements?: string): string[] {
    // Try parsing aiParsedSkills first
    if (aiParsedSkills) {
      try {
        const parsed = JSON.parse(aiParsedSkills);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 3).map(String);
        }
      } catch {
        // Not valid JSON, fall through
      }
    }

    // Fall back to extracting from requirements
    if (requirements) {
      // Extract words that look like tech skills (2+ chars, not common stop words)
      const stopWords = new Set([
        'com', 'para', 'que', 'uma', 'com', 'dos', 'das', 'nos', 'por',
        'the', 'and', 'for', 'with', 'our', 'are', 'can', 'you', 'all',
        'de', 'em', 'um', 'uma', 'ser', 'ter', 'seu', 'sua',
        'experiência', 'conhecimento', 'habilidades', 'vaga', 'cargo',
        'experience', 'knowledge', 'skills', 'position', 'role',
      ]);

      const words = requirements
        .replace(/[^a-zA-ZÀ-ÿ0-9+#.\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.has(word.toLowerCase()));

      // Deduplicate while preserving order
      const seen = new Set<string>();
      const unique: string[] = [];
      for (const word of words) {
        const lower = word.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          unique.push(word);
          if (unique.length >= 3) break;
        }
      }
      return unique;
    }

    return [];
  }

  /**
   * Infer the sourcing source from a search query string.
   */
  private inferSourceFromQuery(query: string): SourcingSource {
    const lower = query.toLowerCase();
    if (lower.includes('linkedin.com')) return 'linkedin';
    if (lower.includes('github.com')) return 'github';
    if (lower.includes('indeed.com')) return 'indeed';
    if (lower.includes('candidatos') || lower.includes('currículo')) return 'linkedin';
    return 'linkedin'; // default fallback
  }

  /**
   * Attempt to infer a person's name from a search result.
   */
  private inferNameFromResult(
    result: RawSearchResult,
    source: SourcingSource
  ): string {
    const name = result.name || '';

    if (source === 'linkedin') {
      // LinkedIn results often have the format "Name | Title - LinkedIn"
      const pipeIndex = name.indexOf('|');
      if (pipeIndex > 0) {
        return name.slice(0, pipeIndex).trim();
      }
      // "Name - LinkedIn"
      const dashIndex = name.indexOf(' - ');
      if (dashIndex > 0) {
        return name.slice(0, dashIndex).trim();
      }
    }

    if (source === 'github') {
      // GitHub results: "username · GitHub" or "GitHub - org/repo"
      const separatorIndex = name.indexOf('·');
      if (separatorIndex > 0) {
        return name.slice(0, separatorIndex).trim();
      }
    }

    return name;
  }

  /**
   * Attempt to infer a professional title from a search result.
   */
  private inferTitleFromResult(
    result: RawSearchResult,
    source: SourcingSource
  ): string | undefined {
    const name = result.name || '';
    const snippet = result.snippet || '';

    if (source === 'linkedin') {
      // Try extracting from the name string after a pipe or dash
      const pipeMatch = name.match(/\|\s*(.+?)(?:\s*-\s*LinkedIn)?$/);
      if (pipeMatch) return pipeMatch[1].trim();

      const dashMatch = name.match(/\s*-\s*(.+?)(?:\s*-\s*LinkedIn)?$/);
      if (dashMatch) return dashMatch[1].trim();
    }

    // Try extracting from snippet
    if (snippet) {
      // Look for title-like patterns: "Software Engineer at Company"
      const titleMatch = snippet.match(
        /(?:is a|works as|positioned as|\. )([A-Z][a-zA-Z\s]+?)(?:\s+at\s+|\s+@\s+)/
      );
      if (titleMatch) return titleMatch[1].trim();
    }

    return undefined;
  }

  /**
   * Get a human-readable platform label for a source.
   */
  private getPlatformLabel(source: SourcingSource): string {
    const labels: Record<SourcingSource, string> = {
      linkedin: 'LinkedIn',
      indeed: 'Indeed',
      github: 'GitHub',
      internal: 'Internal',
      ai_generated: 'AI Generated',
    };
    return labels[source] || source;
  }

  /**
   * Execute an async operation with retry logic.
   * Max 2 retries with 1s delay between attempts.
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          await this.delay(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    throw lastError;
  }

  /**
   * Promise-based delay utility.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// Singleton Export
// ============================================

export const hunterWebSearch = new HunterWebSearchService();
