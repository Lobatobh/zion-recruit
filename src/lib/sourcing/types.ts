/**
 * Sourcing Types - Zion Recruit
 * 
 * Types for candidate sourcing from multiple channels
 */

// ============================================
// Source Types
// ============================================

export type SourcingSource = 
  | 'linkedin'
  | 'indeed'
  | 'github'
  | 'internal'
  | 'ai_generated';

export interface SourceConfig {
  id: SourcingSource;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  requiresAuth: boolean;
  authType?: 'oauth' | 'api_key' | 'credentials';
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  features: {
    skillSearch: boolean;
    locationSearch: boolean;
    experienceSearch: boolean;
    profilePreview: boolean;
    bulkImport: boolean;
  };
}

// ============================================
// Search Types
// ============================================

export interface SourcingSearchParams {
  // Job-based search
  jobId?: string;
  
  // Direct search parameters
  query?: string;
  skills?: string[];
  location?: string;
  experienceLevel?: ExperienceLevel;
  keywords?: string[];
  
  // Filters
  remoteOnly?: boolean;
  minExperience?: number;
  maxExperience?: number;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  
  // Source selection
  sources?: SourcingSource[];
  
  // Pagination
  limit?: number;
  offset?: number;
  maxResults?: number;
  
  // Options
  deduplicate?: boolean;
  includeContactInfo?: boolean;
}

export type ExperienceLevel = 
  | 'entry'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'principal'
  | 'executive';

// ============================================
// Candidate Types
// ============================================

export interface SourcedCandidate {
  // Identity
  id: string;
  externalId?: string;
  name: string;
  email?: string;
  phone?: string;
  
  // Professional info
  title: string;
  company?: string;
  summary?: string;
  
  // Skills and experience
  skills: string[];
  skillsMatch?: number; // 0-100
  experienceYears?: number;
  experience?: WorkExperience[];
  education?: Education[];
  
  // Location
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  remote?: boolean;
  
  // Links
  linkedin?: string;
  github?: string;
  portfolio?: string;
  sourceUrl?: string;
  profileUrl?: string;
  
  // Source info
  source: SourcingSource;
  sourcedAt: string;
  
  // Match info
  relevanceScore?: number; // 0-100
  matchReasons?: string[];
  
  // Contact status
  contactStatus?: ContactStatus;
  lastContactedAt?: string;
  
  // Metadata
  raw?: Record<string, unknown>;
}

export interface WorkExperience {
  title: string;
  company: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  location?: string;
}

export interface Education {
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
}

export type ContactStatus = 
  | 'not_contacted'
  | 'contacted'
  | 'responded'
  | 'not_interested'
  | 'hired';

// ============================================
// Search Results
// ============================================

export interface SourcingSearchResult {
  success: boolean;
  candidates: SourcedCandidate[];
  total: number;
  source: SourcingSource;
  error?: string;
  metadata?: {
    query: string;
    limit: number;
    offset: number;
    durationMs: number;
    rateLimitRemaining?: number;
  };
}

export interface MultiSourceSearchResult {
  success: boolean;
  candidates: SourcedCandidate[];
  total: number;
  bySource: Record<SourcingSource, SourcingSearchResult>;
  deduplicated: number;
  durationMs: number;
  errors: string[];
}

// ============================================
// Import Types
// ============================================

export interface ImportCandidateInput {
  candidate: SourcedCandidate;
  jobId: string;
  tags?: string[];
  notes?: string;
  skipDuplicateCheck?: boolean;
}

export interface ImportCandidateResult {
  success: boolean;
  candidateId?: string;
  isDuplicate?: boolean;
  existingCandidateId?: string;
  error?: string;
}

export interface BulkImportInput {
  candidates: SourcedCandidate[];
  jobId: string;
  tags?: string[];
  skipDuplicateCheck?: boolean;
}

export interface BulkImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  failed: number;
  results: ImportCandidateResult[];
}

// ============================================
// Rate Limiting
// ============================================

export interface RateLimitStatus {
  source: SourcingSource;
  requestsRemaining: number;
  requestsLimit: number;
  resetAt: string;
  isLimited: boolean;
}

// ============================================
// Source Config Storage
// ============================================

export interface SourceConfiguration {
  source: SourcingSource;
  enabled: boolean;
  credentials?: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
  };
  settings?: Record<string, unknown>;
  lastUsed?: string;
}

// ============================================
// Sourcing Job
// ============================================

export interface SourcingJob {
  id: string;
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  params: SourcingSearchParams;
  result?: MultiSourceSearchResult;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

// ============================================
// Helper Functions
// ============================================

export function getSourceLabel(source: SourcingSource): string {
  const labels: Record<SourcingSource, string> = {
    linkedin: 'LinkedIn',
    indeed: 'Indeed',
    github: 'GitHub',
    internal: 'Internal Pool',
    ai_generated: 'AI Generated',
  };
  return labels[source] || source;
}

export function getSourceIcon(source: SourcingSource): string {
  const icons: Record<SourcingSource, string> = {
    linkedin: 'Linkedin',
    indeed: 'Briefcase',
    github: 'Github',
    internal: 'Database',
    ai_generated: 'Sparkles',
  };
  return icons[source] || 'Search';
}

export function getSourceColor(source: SourcingSource): string {
  const colors: Record<SourcingSource, string> = {
    linkedin: 'bg-blue-100 text-blue-700',
    indeed: 'bg-purple-100 text-purple-700',
    github: 'bg-gray-100 text-gray-700',
    internal: 'bg-green-100 text-green-700',
    ai_generated: 'bg-amber-100 text-amber-700',
  };
  return colors[source] || 'bg-gray-100 text-gray-700';
}

export function getExperienceLevelLabel(level: ExperienceLevel): string {
  const labels: Record<ExperienceLevel, string> = {
    entry: 'Entry Level (0-1 years)',
    junior: 'Junior (1-3 years)',
    mid: 'Mid-Level (3-5 years)',
    senior: 'Senior (5-8 years)',
    lead: 'Lead (8-10 years)',
    principal: 'Principal (10+ years)',
    executive: 'Executive (15+ years)',
  };
  return labels[level] || level;
}

export function calculateRelevanceScore(
  candidate: SourcedCandidate,
  requiredSkills: string[],
  preferredLocation?: string,
  experienceLevel?: ExperienceLevel
): number {
  let score = 0;
  
  // Skills match (40% weight)
  if (requiredSkills.length > 0 && candidate.skills.length > 0) {
    const matchedSkills = requiredSkills.filter(skill =>
      candidate.skills.some(s => 
        s.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(s.toLowerCase())
      )
    );
    const skillsMatch = (matchedSkills.length / requiredSkills.length) * 40;
    score += skillsMatch;
  }
  
  // Location match (20% weight)
  if (preferredLocation && candidate.location) {
    const locationMatch = candidate.location.toLowerCase().includes(preferredLocation.toLowerCase());
    if (locationMatch) score += 20;
  }
  
  // Experience level match (20% weight)
  if (experienceLevel && candidate.experienceYears) {
    const expRanges: Record<ExperienceLevel, [number, number]> = {
      entry: [0, 1],
      junior: [1, 3],
      mid: [3, 5],
      senior: [5, 8],
      lead: [8, 10],
      principal: [10, 15],
      executive: [15, 100],
    };
    const [min, max] = expRanges[experienceLevel] || [0, 100];
    if (candidate.experienceYears >= min && candidate.experienceYears <= max) {
      score += 20;
    }
  }
  
  // Profile completeness (20% weight)
  let completeness = 0;
  if (candidate.email) completeness += 5;
  if (candidate.linkedin) completeness += 5;
  if (candidate.summary) completeness += 5;
  if (candidate.experience && candidate.experience.length > 0) completeness += 5;
  score += completeness;
  
  return Math.min(100, Math.round(score));
}
