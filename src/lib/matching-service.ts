/**
 * Matching Service - Zion Recruit
 * Compares candidate profiles with job requirements and calculates match scores
 */

import { calculateMatchWithAI, MatchScoreResult, AIResponse } from './ai-service';
import { getCachedResult, setCachedResult, generateCacheKey } from './cache-service';
import { db } from './db';

export interface CandidateProfile {
  skills: string[];
  experience: Array<{
    company?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    years?: number;
  }>;
  education: Array<{
    institution?: string;
    degree: string;
    year?: string;
  }>;
  languages?: string[];
  summary?: string;
}

export interface JobRequirements {
  title: string;
  department?: string;
  skills: string[];
  experienceYears?: number;
  educationLevel?: string;
  description?: string;
  requirements?: string;
}

export interface MatchResult extends MatchScoreResult {
  candidateId?: string;
  jobId?: string;
  cached?: boolean;
  calculatedAt: Date;
}

/**
 * Extract skills from job description/requirements text
 */
function extractSkillsFromText(text: string): string[] {
  const skillPatterns = [
    // Programming languages
    /\b(javascript|typescript|python|java|c\+\+|c#|ruby|go|rust|swift|kotlin|php|scala)\b/gi,
    // Frameworks & Libraries
    /\b(react|angular|vue|node\.?js|express|django|flask|spring|rails|next\.?js|nestjs)\b/gi,
    // Cloud & DevOps
    /\b(aws|azure|gcp|docker|kubernetes|ci\/cd|jenkins|terraform|ansible)\b/gi,
    // Databases
    /\b(sql|mysql|postgresql|mongodb|redis|elasticsearch|graphql)\b/gi,
    // General skills
    /\b(agile|scrum|kanban|git|rest api|microservices|ml|ai|machine learning)\b/gi
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
 * Extract experience requirements from job text
 */
function extractExperienceFromText(text: string): number {
  const patterns = [
    /(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i,
    /(\d+)\s*years?\s*(of\s*)?(experience|exp)/i,
    /minimum\s*(of\s*)?(\d+)\s*years?/i,
    /at least\s*(\d+)\s*years?/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const years = parseInt(match[1] || match[2]);
      if (!isNaN(years)) return years;
    }
  }
  
  return 0;
}

/**
 * Map education levels
 */
function normalizeEducationLevel(level: string): string {
  const levelMap: Record<string, string> = {
    'bs': "Bachelor's",
    'bachelor': "Bachelor's",
    'bachelors': "Bachelor's",
    'bsc': "Bachelor's",
    'ba': "Bachelor's",
    'ms': "Master's",
    'master': "Master's",
    'masters': "Master's",
    'msc': "Master's",
    'ma': "Master's",
    'mba': 'MBA',
    'phd': 'PhD',
    'doctorate': 'PhD',
    'doctor': 'PhD',
    'high school': 'High School',
    'associate': 'Associate',
    'technical': 'Technical'
  };
  
  const normalized = level.toLowerCase().replace(/[._-]/g, ' ');
  
  for (const [key, value] of Object.entries(levelMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  return level;
}

/**
 * Calculate total years of experience from candidate experience array
 */
function calculateTotalYears(experience: CandidateProfile['experience']): number {
  let totalYears = 0;
  
  for (const exp of experience) {
    if (exp.years) {
      totalYears += exp.years;
    } else if (exp.startDate && exp.endDate) {
      try {
        const start = new Date(exp.startDate);
        const end = exp.endDate.toLowerCase() === 'present' 
          ? new Date() 
          : new Date(exp.endDate);
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        if (years > 0) totalYears += years;
      } catch {
        // Invalid date format
      }
    }
  }
  
  return Math.round(totalYears);
}

/**
 * Calculate skill match percentage
 */
function calculateSkillMatch(candidateSkills: string[], requiredSkills: string[]): number {
  if (!requiredSkills.length) return 100;
  if (!candidateSkills.length) return 0;
  
  const normalizedCandidate = candidateSkills.map(s => s.toLowerCase().trim());
  let matches = 0;
  
  for (const required of requiredSkills) {
    const normalized = required.toLowerCase().trim();
    // Check for exact match or partial match
    if (normalizedCandidate.some(cs => 
      cs === normalized || 
      cs.includes(normalized) || 
      normalized.includes(cs)
    )) {
      matches++;
    }
  }
  
  return Math.round((matches / requiredSkills.length) * 100);
}

/**
 * Get job requirements from database
 */
export async function getJobRequirements(jobId: string): Promise<JobRequirements | null> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      department: true,
      description: true,
      requirements: true
    }
  });
  
  if (!job) return null;
  
  // Extract skills from description and requirements
  const fullText = `${job.description} ${job.requirements}`;
  const skills = extractSkillsFromText(fullText);
  const experienceYears = extractExperienceFromText(fullText);
  
  return {
    title: job.title,
    department: job.department || undefined,
    skills,
    experienceYears,
    description: job.description,
    requirements: job.requirements
  };
}

/**
 * Calculate match score with AI and caching
 */
export async function calculateMatchScore(
  candidate: CandidateProfile,
  jobRequirements: JobRequirements,
  tenantId: string,
  useCache: boolean = true
): Promise<MatchResult> {
  // Create cache key from inputs
  const cacheInput = JSON.stringify({
    skills: candidate.skills.sort(),
    expCount: candidate.experience.length,
    edu: candidate.education.map(e => e.degree).sort(),
    jobSkills: jobRequirements.skills.sort(),
    jobExpYears: jobRequirements.experienceYears
  });
  
  const cacheKey = generateCacheKey(cacheInput, 'match_score');
  
  // Check cache
  if (useCache) {
    const cached = await getCachedResult<MatchResult>(cacheKey, tenantId);
    if (cached) {
      return {
        ...cached,
        cached: true
      };
    }
  }
  
  // Calculate with AI
  const aiResult = await calculateMatchWithAI(
    {
      skills: candidate.skills,
      experience: candidate.experience,
      education: candidate.education,
      summary: candidate.summary
    },
    {
      skills: jobRequirements.skills,
      experienceYears: jobRequirements.experienceYears,
      educationLevel: jobRequirements.educationLevel,
      description: jobRequirements.description
    }
  );
  
  let result: MatchResult;
  
  if (aiResult.success && aiResult.data) {
    result = {
      ...aiResult.data,
      cached: false,
      calculatedAt: new Date()
    };
  } else {
    // Fallback to rule-based matching
    result = fallbackMatchCalculation(candidate, jobRequirements);
  }
  
  // Cache the result
  if (useCache) {
    await setCachedResult(cacheKey, 'match_score', tenantId, cacheInput, result);
  }
  
  return result;
}

/**
 * Fallback rule-based matching when AI fails
 */
function fallbackMatchCalculation(
  candidate: CandidateProfile,
  jobRequirements: JobRequirements
): MatchResult {
  const skillsScore = calculateSkillMatch(candidate.skills, jobRequirements.skills);
  
  // Experience score
  let experienceScore = 50;
  const candidateYears = calculateTotalYears(candidate.experience);
  const requiredYears = jobRequirements.experienceYears || 0;
  
  if (requiredYears > 0) {
    if (candidateYears >= requiredYears) {
      experienceScore = Math.min(100, 80 + (candidateYears - requiredYears) * 2);
    } else {
      experienceScore = Math.max(20, (candidateYears / requiredYears) * 80);
    }
  }
  
  // Education score (simplified)
  let educationScore = 50;
  if (candidate.education.length > 0) {
    const degrees = candidate.education.map(e => normalizeEducationLevel(e.degree));
    if (degrees.some(d => ['PhD', "Master's", 'MBA'].includes(d))) {
      educationScore = 90;
    } else if (degrees.some(d => d.includes("Bachelor"))) {
      educationScore = 75;
    } else if (degrees.some(d => ['Associate', 'Technical'].includes(d))) {
      educationScore = 60;
    }
  }
  
  // Overall score (weighted average)
  const overallScore = Math.round(
    skillsScore * 0.5 + experienceScore * 0.3 + educationScore * 0.2
  );
  
  return {
    skillsScore,
    experienceScore,
    educationScore,
    overallScore,
    reasons: [
      `Skills match: ${skillsScore}%`,
      `Experience: ${candidateYears} years vs ${requiredYears} required`,
      `Education level: ${candidate.education[0]?.degree || 'Not specified'}`
    ],
    strengths: skillsScore >= 70 ? ['Strong skill alignment'] : [],
    gaps: skillsScore < 50 ? ['Skill gaps identified'] : [],
    cached: false,
    calculatedAt: new Date()
  };
}

/**
 * Batch calculate match scores for multiple candidates
 */
export async function batchCalculateMatchScores(
  candidates: Array<{ id: string; profile: CandidateProfile }>,
  jobRequirements: JobRequirements,
  tenantId: string
): Promise<Array<{ id: string; result: MatchResult }>> {
  const results: Array<{ id: string; result: MatchResult }> = [];
  
  for (const candidate of candidates) {
    const result = await calculateMatchScore(
      candidate.profile,
      jobRequirements,
      tenantId
    );
    results.push({ id: candidate.id, result });
  }
  
  // Sort by overall score descending
  results.sort((a, b) => b.result.overallScore - a.result.overallScore);
  
  return results;
}

/**
 * Get match score color for UI
 */
export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-50';
  if (score >= 60) return 'text-blue-600 bg-blue-50';
  if (score >= 40) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}

/**
 * Get match score label for UI
 */
export function getMatchScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent Match';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Partial Match';
  return 'Low Match';
}
