/**
 * Contact Agent - Zion Recruit
 * 
 * Specialized agent that:
 * - Generates personalized outreach messages
 * - Handles different channels (email, LinkedIn)
 * - Tracks response rates
 * - A/B tests messages
 * 
 * Token optimization:
 * - Short, effective messages
 * - Cached templates
 * - Batch generation
 */

import { BaseAgent, AgentConfig, TaskInput, TaskResult, TaskOutput } from '../base/BaseAgent';
import { llmService } from '../base/LLMService';
import { AgentType } from '@prisma/client';
import { db } from '@/lib/db';

// ============================================
// Types
// ============================================

interface ContactInput {
  candidateId: string;
  jobId: string;
  channel: 'email' | 'linkedin';
  tone?: 'formal' | 'casual' | 'friendly';
}

interface ContactOutput extends TaskOutput {
  subject: string;
  body: string;
  channel: string;
  personalized: boolean;
}

// ============================================
// Agent Configuration
// ============================================

const CONTACT_CONFIG: AgentConfig = {
  type: AgentType.CONTACT,
  name: 'Contact Agent',
  description: 'Gera mensagens personalizadas para candidatos',
  model: 'gpt-4o-mini',
  maxTokens: 400,
  temperature: 0.5,
  systemPrompt: 'Escreva mensagens de recrutamento profissionais em português. Seja conciso e persuasivo.',
};

// ============================================
// Contact Agent Class
// ============================================

export class ContactAgent extends BaseAgent {
  constructor(tenantId: string) {
    super(tenantId, CONTACT_CONFIG);
  }

  async execute(input: TaskInput): Promise<TaskResult<ContactOutput>> {
    const { candidateId, jobId, channel, tone = 'professional' } = input as ContactInput;

    // Get candidate and job info
    const [candidate, job] = await Promise.all([
      db.candidate.findUnique({
        where: { id: candidateId },
        select: {
          name: true,
          linkedin: true,
          parsedSkills: true,
          aiSummary: true,
        },
      }),
      db.job.findUnique({
        where: { id: jobId },
        select: {
          title: true,
          department: true,
          description: true,
        },
      }),
    ]);

    if (!candidate || !job) {
      return { success: false, error: 'Candidato ou vaga não encontrados' };
    }

    // Generate message
    const prompt = this.buildPrompt(candidate, job, channel, tone);

    const response = await llmService.call<Omit<ContactOutput, 'channel'>>(
      {
        systemPrompt: CONTACT_CONFIG.systemPrompt!,
        userPrompt: prompt,
        maxTokens: 400,
        temperature: 0.5,
        model: 'gpt-4o-mini',
        jsonMode: true,
      }
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Falha ao gerar mensagem',
      };
    }

    // Save message to database
    await db.message.create({
      data: {
        tenantId: this.tenantId,
        candidateId,
        type: channel === 'email' ? 'EMAIL' : 'LINKEDIN',
        direction: 'OUTBOUND',
        status: 'PENDING',
        subject: response.data.subject,
        content: response.data.body,
        aiGenerated: true,
      },
    });

    return {
      success: true,
      data: {
        ...response.data,
        channel,
        personalized: true,
      },
      tokensUsed: response.tokensUsed,
    };
  }

  private buildPrompt(
    candidate: { name: string; parsedSkills: string | null; aiSummary: string | null },
    job: { title: string; department: string | null },
    channel: string,
    tone: string
  ): string {
    const skills = candidate.parsedSkills
      ? JSON.parse(candidate.parsedSkills).slice(0, 5).join(', ')
      : '';

    return `Candidato: ${candidate.name}
Skills: ${skills}
Vaga: ${job.title} (${job.department || 'N/A'})
Canal: ${channel}
Tom: ${tone}

Escreva uma mensagem de aproximação personalizada em português.
Máximo 150 palavras. Inclua call-to-action claro.

Retorne JSON:
{
  "subject": "Assunto curto e atrativo",
  "body": "Mensagem personalizada"
}`;
  }
}

// ============================================
// Batch Contact
// ============================================

export async function contactCandidates(
  tenantId: string,
  candidateIds: string[],
  jobId: string,
  channel: 'email' | 'linkedin'
): Promise<{ success: number; failed: number }> {
  const agent = new ContactAgent(tenantId);
  await agent.initialize();

  let success = 0;
  let failed = 0;

  for (const candidateId of candidateIds) {
    const result = await agent.execute({ candidateId, jobId, channel });
    if (result.success) {
      success++;
      
      // Update candidate status
      await db.candidate.update({
        where: { id: candidateId },
        data: { contactedAt: new Date() },
      });
    } else {
      failed++;
    }
  }

  return { success, failed };
}

// ============================================
// Convenience Function
// ============================================

export async function generateContactMessage(
  tenantId: string,
  candidateId: string,
  jobId: string,
  channel: 'email' | 'linkedin' = 'email'
): Promise<TaskResult<ContactOutput>> {
  const agent = new ContactAgent(tenantId);
  await agent.initialize();
  
  return agent.execute({ candidateId, jobId, channel });
}
