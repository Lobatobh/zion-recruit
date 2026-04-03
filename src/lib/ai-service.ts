/**
 * AI Service - Zion Recruit
 * Handles LLM calls using LLMService (database credentials)
 * Optimized for low token cost with concise prompts and JSON output
 */

import { llmService } from './agents/base/LLMService';

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
}

export interface ParsedResume {
  name: string;
  email: string;
  phone?: string;
  skills: string[];
  experience: Array<{
    company: string;
    title: string;
    startDate?: string;
    endDate?: string;
    years?: number;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year?: string;
  }>;
  languages: string[];
  summary: string;
}

export interface MatchScoreResult {
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  overallScore: number;
  reasons: string[];
  strengths: string[];
  gaps: string[];
}

/**
 * Call LLM with structured JSON output
 */
export async function callLLM<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<AIResponse<T>> {
  try {
    const result = await llmService.call<T>({
      systemPrompt,
      userPrompt,
      maxTokens: options?.maxTokens || 500,
      temperature: options?.temperature || 0.3,
      jsonMode: true,
    });

    if (result.success && result.data) {
      return { success: true, data: result.data, cached: result.cached };
    }

    return { success: false, error: result.error || 'No response from AI' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Parse resume text with AI
 */
export async function parseResumeWithAI(resumeText: string): Promise<AIResponse<ParsedResume>> {
  const systemPrompt = 'Extract resume data. Return JSON only.';

  const userPrompt = `Extract from resume:
- name, email, phone
- skills (array of strings)
- experience (array: company, title, startDate, endDate, years number)
- education (array: institution, degree, year)
- languages (array of strings)
- summary (2 sentences max)

Return JSON only. No markdown.
Resume: ${resumeText.slice(0, 3000)}`;

  return callLLM<ParsedResume>(systemPrompt, userPrompt, { maxTokens: 600 });
}

/**
 * Calculate match score with AI
 */
export async function calculateMatchWithAI(
  candidate: {
    skills: string[];
    experience: Array<{ years?: number; title?: string }>;
    education: Array<{ degree: string }>;
    summary?: string;
  },
  jobRequirements: {
    skills?: string[];
    experienceYears?: number;
    educationLevel?: string;
    description?: string;
  }
): Promise<AIResponse<MatchScoreResult>> {
  const systemPrompt = 'Score candidate-job match. Return JSON only.';

  const userPrompt = `Compare candidate to job. Score 0-100 each:
- skillsScore: match between candidate skills and required skills
- experienceScore: candidate experience vs required years
- educationScore: candidate degree vs required level
- overallScore: weighted average

Also provide:
- reasons: array of 2-3 main reasons for the score
- strengths: array of 1-2 candidate strengths
- gaps: array of 1-2 missing qualifications

Candidate:
Skills: ${candidate.skills.join(', ') || 'None'}
Experience: ${candidate.experience.length} roles
Education: ${candidate.education.map(e => e.degree).join(', ') || 'None'}
${candidate.summary ? `Summary: ${candidate.summary}` : ''}

Job Requirements:
Skills: ${jobRequirements.skills?.join(', ') || 'Not specified'}
Experience: ${jobRequirements.experienceYears || 0} years required
Education: ${jobRequirements.educationLevel || 'Not specified'}

Return JSON: {skillsScore, experienceScore, educationScore, overallScore, reasons, strengths, gaps}`;

  return callLLM<MatchScoreResult>(systemPrompt, userPrompt, { maxTokens: 400 });
}

/**
 * Generate candidate summary with AI
 */
export async function generateSummaryWithAI(
  skills: string[],
  experience: Array<{ title?: string; company?: string }>,
  education: Array<{ degree: string }>
): Promise<AIResponse<string>> {
  const systemPrompt = 'Generate professional summary. Return plain text only.';

  const userPrompt = `Write 2-sentence professional summary for:
Skills: ${skills.slice(0, 5).join(', ')}
Experience: ${experience.slice(0, 3).map(e => e.title).join(', ')}
Education: ${education[0]?.degree || 'Not specified'}

Keep it concise and professional. No markdown.`;

  try {
    const result = await llmService.call<string>({
      systemPrompt,
      userPrompt,
      maxTokens: 100,
      temperature: 0.5,
      jsonMode: false,
    });

    if (result.success && result.rawContent) {
      return { success: true, data: result.rawContent.trim() };
    }

    return { success: false, error: result.error || 'No summary generated' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
