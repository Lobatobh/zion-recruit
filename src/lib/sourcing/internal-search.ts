/**
 * Internal Search - Zion Recruit
 * 
 * Search for candidates within the internal talent pool
 * This searches existing candidates in the database across all jobs
 */

import { db } from '@/lib/db';
import {
  SourcingSource,
  SourcingSearchParams,
  SourcingSearchResult,
  SourcedCandidate,
  RateLimitStatus,
  calculateRelevanceScore,
} from './types';
import { CandidateStatus } from '@prisma/client';

// ============================================
// Internal Search Service
// ============================================

export class InternalSearch {
  private config: {
    enabled: boolean;
  };

  constructor(config?: { enabled?: boolean }) {
    this.config = {
      enabled: config?.enabled ?? true,
    };
  }

  /**
   * Search for candidates in the internal talent pool
   */
  async search(
    params: SourcingSearchParams,
    tenantId: string
  ): Promise<SourcingSearchResult> {
    const startTime = Date.now();
    
    if (!this.config.enabled) {
      return {
        success: false,
        candidates: [],
        total: 0,
        source: 'internal',
        error: 'Internal search is disabled',
        metadata: {
          query: params.query || '',
          limit: params.limit || 10,
          offset: params.offset || 0,
          durationMs: Date.now() - startTime,
        },
      };
    }
    
    try {
      const limit = params.limit || 10;
      const offset = params.offset || 0;
      
      // Build where clause
      const whereConditions: unknown[] = [
        { tenantId },
        // Include candidates from all statuses except rejected/withdrawn
        { status: { notIn: [CandidateStatus.REJECTED, CandidateStatus.WITHDRAWN] } },
      ];
      
      // If jobId is specified, search candidates for other jobs (talent pool reuse)
      if (params.jobId) {
        whereConditions.push({ NOT: { jobId: params.jobId } });
      }
      
      // Search by skills
      if (params.skills && params.skills.length > 0) {
        // Search in parsedSkills JSON string
        const skillConditions = params.skills.map(skill => ({
          parsedSkills: { contains: skill },
        }));
        whereConditions.push({ OR: skillConditions });
      }
      
      // Search by location
      if (params.location) {
        whereConditions.push({
          OR: [
            { city: { contains: params.location } },
            { state: { contains: params.location } },
          ],
        });
      }
      
      // Search by keywords
      if (params.query) {
        whereConditions.push({
          OR: [
            { name: { contains: params.query } },
            { email: { contains: params.query } },
            { parsedSkills: { contains: params.query } },
          ],
        });
      }
      
      // Execute search
      const [candidates, total] = await Promise.all([
        db.candidate.findMany({
          where: { AND: whereConditions },
          take: limit,
          skip: offset,
          orderBy: [
            { matchScore: 'desc' },
            { createdAt: 'desc' },
          ],
          include: {
            job: {
              select: {
                id: true,
                title: true,
                department: true,
              },
            },
          },
        }),
        db.candidate.count({
          where: { AND: whereConditions },
        }),
      ]);
      
      // Transform to SourcedCandidate format
      const sourcedCandidates: SourcedCandidate[] = candidates.map((candidate, index) => {
        // Parse skills
        let skills: string[] = [];
        try {
          if (candidate.parsedSkills) {
            skills = JSON.parse(candidate.parsedSkills);
          }
        } catch {
          skills = [];
        }
        
        // Calculate relevance score if we have skills to match
        const relevanceScore = params.skills && params.skills.length > 0
          ? calculateRelevanceScore(
              { ...candidate, skills } as SourcedCandidate,
              params.skills,
              params.location,
              params.experienceLevel
            )
          : candidate.matchScore || 50;
        
        return {
          id: `internal_${candidate.id}`,
          externalId: candidate.id,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone || undefined,
          title: skills.length > 0 ? `${skills[0]} Developer` : 'Professional',
          summary: `Previously applied for ${candidate.job?.title || 'a position'}`,
          skills,
          location: [candidate.city, candidate.state].filter(Boolean).join(', ') || undefined,
          city: candidate.city || undefined,
          state: candidate.state || undefined,
          country: candidate.country || 'Brazil',
          linkedin: candidate.linkedin || undefined,
          github: candidate.github || undefined,
          portfolio: candidate.portfolio || undefined,
          sourceUrl: `/candidates/${candidate.id}`,
          profileUrl: `/candidates/${candidate.id}`,
          source: 'internal' as SourcingSource,
          sourcedAt: new Date().toISOString(),
          relevanceScore,
          contactStatus: this.mapContactStatus(candidate.status),
          raw: {
            originalJobId: candidate.jobId,
            originalJobTitle: candidate.job?.title,
            originalStatus: candidate.status,
            matchScore: candidate.matchScore,
            tags: candidate.tags,
          },
        };
      });
      
      return {
        success: true,
        candidates: sourcedCandidates,
        total,
        source: 'internal',
        metadata: {
          query: params.query || '',
          limit,
          offset,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('Internal search error:', error);
      return {
        success: false,
        candidates: [],
        total: 0,
        source: 'internal',
        error: error instanceof Error ? error.message : 'Failed to search internal candidates',
        metadata: {
          query: params.query || '',
          limit: params.limit || 10,
          offset: params.offset || 0,
          durationMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Map candidate status to contact status
   */
  private mapContactStatus(status: CandidateStatus): SourcedCandidate['contactStatus'] {
    switch (status) {
      case CandidateStatus.SOURCED:
        return 'not_contacted';
      case CandidateStatus.APPLIED:
      case CandidateStatus.SCREENING:
      case CandidateStatus.INTERVIEWING:
      case CandidateStatus.DISC_TEST:
      case CandidateStatus.OFFERED:
        return 'responded';
      case CandidateStatus.HIRED:
        return 'hired';
      case CandidateStatus.NO_RESPONSE:
        return 'contacted';
      default:
        return 'not_contacted';
    }
  }

  /**
   * Get rate limit status (internal search has no rate limit)
   */
  getRateLimitStatus(): RateLimitStatus {
    return {
      source: 'internal',
      requestsRemaining: 1000,
      requestsLimit: 1000,
      resetAt: new Date(Date.now() + 60000).toISOString(),
      isLimited: false,
    };
  }

  /**
   * Get source configuration
   */
  static getSourceConfig() {
    return {
      id: 'internal' as SourcingSource,
      name: 'Internal Pool',
      description: 'Search candidates from your internal talent database',
      icon: 'Database',
      enabled: true,
      requiresAuth: false,
      rateLimit: {
        requestsPerMinute: 1000,
        requestsPerDay: 10000,
      },
      features: {
        skillSearch: true,
        locationSearch: true,
        experienceSearch: false,
        profilePreview: true,
        bulkImport: false, // Already in system
      },
    };
  }
}

// ============================================
// Export singleton instance
// ============================================

export const internalSearch = new InternalSearch();
