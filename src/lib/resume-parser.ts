/**
 * Resume Parser Service - Zion Recruit
 * Parses resume text and extracts structured candidate data using AI
 */

import { parseResumeWithAI, generateSummaryWithAI, ParsedResume, AIResponse } from './ai-service';
import { getOrCompute, generateCacheKey, getCachedResult, setCachedResult, CacheType } from './cache-service';

export interface ResumeData extends ParsedResume {
  rawText?: string;
  parsingConfidence?: number;
}

export interface ParseResult {
  success: boolean;
  data?: ResumeData;
  error?: string;
  cached?: boolean;
}

/**
 * Clean and prepare resume text for parsing
 */
function preprocessResumeText(text: string): string {
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Remove common noise patterns
  cleaned = cleaned.replace(/Page \d+ of \d+/gi, '');
  cleaned = cleaned.replace(/Confidential/gi, '');
  cleaned = cleaned.replace(/Curriculum Vitae|CV|Resume/gi, '');
  
  // Limit length to avoid token limits
  if (cleaned.length > 4000) {
    cleaned = cleaned.slice(0, 4000) + '...';
  }
  
  return cleaned;
}

/**
 * Validate parsed resume data
 */
function validateParsedData(data: ParsedResume): boolean {
  // Must have at least a name
  if (!data.name || typeof data.name !== 'string') {
    return false;
  }
  
  // Email validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    data.email = '';
  }
  
  // Ensure arrays are arrays
  if (!Array.isArray(data.skills)) data.skills = [];
  if (!Array.isArray(data.experience)) data.experience = [];
  if (!Array.isArray(data.education)) data.education = [];
  if (!Array.isArray(data.languages)) data.languages = [];
  
  return true;
}

/**
 * Calculate confidence score based on extracted data
 */
function calculateConfidence(data: ParsedResume): number {
  let score = 0;
  
  // Name is most important (40 points)
  if (data.name && data.name.length > 2) score += 40;
  
  // Email (20 points)
  if (data.email && data.email.includes('@')) score += 20;
  
  // Skills (15 points)
  if (data.skills && data.skills.length > 0) score += Math.min(data.skills.length * 3, 15);
  
  // Experience (15 points)
  if (data.experience && data.experience.length > 0) score += Math.min(data.experience.length * 5, 15);
  
  // Education (10 points)
  if (data.education && data.education.length > 0) score += 10;
  
  return Math.min(score, 100);
}

/**
 * Parse resume text and extract structured data
 */
export async function parseResume(
  resumeText: string,
  tenantId: string,
  useCache: boolean = true
): Promise<ParseResult> {
  const cleanedText = preprocessResumeText(resumeText);
  
  if (cleanedText.length < 50) {
    return {
      success: false,
      error: 'Resume text is too short to parse'
    };
  }

  // Try cache first
  if (useCache) {
    const cacheKey = generateCacheKey(cleanedText, 'resume_parse');
    const cached = await getCachedResult<ResumeData>(cacheKey, tenantId);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        cached: true
      };
    }
  }

  // Parse with AI
  const aiResult = await parseResumeWithAI(cleanedText);
  
  if (!aiResult.success || !aiResult.data) {
    return {
      success: false,
      error: aiResult.error || 'Failed to parse resume'
    };
  }

  const parsedData = aiResult.data;
  
  // Validate data
  if (!validateParsedData(parsedData)) {
    return {
      success: false,
      error: 'Invalid parsed data - missing required fields'
    };
  }

  // Generate summary if not provided
  if (!parsedData.summary || parsedData.summary.length < 10) {
    const summaryResult = await generateSummaryWithAI(
      parsedData.skills,
      parsedData.experience,
      parsedData.education
    );
    if (summaryResult.success && summaryResult.data) {
      parsedData.summary = summaryResult.data;
    }
  }

  const result: ResumeData = {
    ...parsedData,
    rawText: resumeText.slice(0, 2000), // Store truncated raw text
    parsingConfidence: calculateConfidence(parsedData)
  };

  // Cache the result
  if (useCache) {
    const cacheKey = generateCacheKey(cleanedText, 'resume_parse');
    await setCachedResult(cacheKey, 'resume_parse', tenantId, cleanedText, result);
  }

  return {
    success: true,
    data: result,
    cached: false
  };
}

/**
 * Parse resume with automatic caching
 */
export async function parseResumeCached(
  resumeText: string,
  tenantId: string
): Promise<ParseResult> {
  const cleanedText = preprocessResumeText(resumeText);
  
  const { data, cached } = await getOrCompute(
    'resume_parse',
    tenantId,
    cleanedText,
    async () => {
      const result = await parseResume(resumeText, tenantId, false);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Parse failed');
      }
      return result.data;
    }
  );

  return {
    success: true,
    data,
    cached
  };
}

/**
 * Extract text from base64 encoded file
 * For now, assumes text content. Can be extended for PDF/DOCX parsing
 */
export function extractTextFromBase64(
  base64Content: string,
  mimeType?: string
): string {
  try {
    // If it's already text
    if (mimeType?.startsWith('text/')) {
      return Buffer.from(base64Content, 'base64').toString('utf-8');
    }
    
    // For PDF/DOCX, we would need additional libraries
    // For now, try to decode as text
    const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
    
    // Check if it looks like text
    if (/[\x00-\x08\x0E-\x1F]/.test(decoded)) {
      // Contains binary characters - not parseable as text
      return '';
    }
    
    return decoded;
  } catch {
    return '';
  }
}

/**
 * Quick validation of resume content
 */
export function validateResumeContent(content: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (content.length < 100) {
    issues.push('Content is too short');
  }
  
  if (content.length > 50000) {
    issues.push('Content is too long');
  }
  
  // Check for common resume sections
  const resumeIndicators = [
    /experience/i,
    /education/i,
    /skills/i,
    /work/i,
    /employment/i,
    /qualification/i
  ];
  
  const foundIndicators = resumeIndicators.filter(pattern => pattern.test(content));
  
  if (foundIndicators.length < 2) {
    issues.push('Content does not appear to be a resume');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}
