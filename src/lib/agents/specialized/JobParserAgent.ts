/**
 * Job Parser Agent - Zion Recruit
 * 
 * Specialized agent that:
 * - Parses job descriptions
 * - Extracts skills, requirements, seniority
 * - Identifies DISC profile requirements
 * - Creates AI summary
 * 
 * Token optimization:
 * - Uses gpt-4o-mini
 * - Max 800 tokens output
 * - Concise prompts
 */

import { BaseAgent, AgentConfig, TaskInput, TaskResult, TaskOutput } from '../base/BaseAgent';
import { llmService } from '../base/LLMService';
import { AgentType } from '@prisma/client';
import { db } from '@/lib/db';

// ============================================
// Types
// ============================================

interface JobParsingInput {
  jobId: string;
  title: string;
  description: string;
  requirements: string;
}

interface JobParsingOutput extends TaskOutput {
  skills: string[];
  keywords: string[];
  seniority: string;
  discProfile: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
  summary: string;
  salaryEstimate?: {
    min: number;
    max: number;
    currency: string;
  };
}

// ============================================
// Agent Configuration
// ============================================

const JOB_PARSER_CONFIG: AgentConfig = {
  type: AgentType.JOB_PARSER,
  name: 'Job Parser Agent',
  description: 'Analisa descrições de vagas e extrai informações estruturadas',
  model: '', // Uses default from credential (e.g., deepseek/deepseek-chat on OpenRouter)
  maxTokens: 800,
  temperature: 0.2,
  systemPrompt: `Você é um especialista em RH. Extraia informações da vaga em JSON.
Seja conciso. Use termos em português.
Retorne APENAS JSON válido, sem markdown.`,
};

// ============================================
// Job Parser Agent Class
// ============================================

export class JobParserAgent extends BaseAgent {
  constructor(tenantId: string) {
    super(tenantId, JOB_PARSER_CONFIG);
  }

  async execute(input: TaskInput): Promise<TaskResult<JobParsingOutput>> {
    const { jobId, title, description, requirements } = input as JobParsingInput;

    if (!description && !requirements) {
      return {
        success: false,
        error: 'Descrição ou requisitos são obrigatórios',
      };
    }

    // Combine and truncate to save tokens
    const fullText = `TÍTULO: ${title}\n\nDESCRIÇÃO:\n${description}\n\nREQUISITOS:\n${requirements}`;
    const truncatedText = this.truncateText(fullText, 2000);

    // Call LLM with optimized prompt
    const response = await llmService.call<JobParsingOutput>(
      {
        systemPrompt: JOB_PARSER_CONFIG.systemPrompt!,
        userPrompt: this.buildUserPrompt(truncatedText),
        maxTokens: 800,
        temperature: 0.2,
        // No model specified → uses default from credential
        jsonMode: true,
      },
      {
        enabled: true,
        tenantId: this.tenantId,
        cacheKey: `job_parse_${jobId}`,
        ttlDays: 30,
      }
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Falha ao processar vaga',
        tokensUsed: response.tokensUsed,
      };
    }

    // Update job with parsed data
    try {
      await db.job.update({
        where: { id: jobId },
        data: {
          aiParsedSkills: JSON.stringify(response.data.skills),
          aiParsedKeywords: JSON.stringify(response.data.keywords),
          aiParsedSeniority: response.data.seniority,
          discProfileRequired: JSON.stringify(response.data.discProfile),
          aiSummary: response.data.summary,
        },
      });
    } catch (error) {
      console.error('Failed to update job:', error);
    }

    return {
      success: true,
      data: response.data,
      tokensUsed: response.tokensUsed,
    };
  }

  private buildUserPrompt(text: string): string {
    return `${text}

Extraia e retorne JSON:
{
  "skills": ["skill1", "skill2", ...],
  "keywords": ["keyword1", ...],
  "seniority": "Junior|Pleno|Senior|Especialista",
  "discProfile": {"D": 0-100, "I": 0-100, "S": 0-100, "C": 0-100},
  "summary": "Resumo em 2 frases",
  "salaryEstimate": {"min": number, "max": number, "currency": "BRL"}
}`;
  }
}

// ============================================
// Convenience Function
// ============================================

export async function parseJob(
  tenantId: string,
  jobId: string,
  title: string,
  description: string,
  requirements: string
): Promise<TaskResult<JobParsingOutput>> {
  const agent = new JobParserAgent(tenantId);
  await agent.initialize();
  
  return agent.execute({
    jobId,
    title,
    description,
    requirements,
  });
}
