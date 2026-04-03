/**
 * Task Worker - Zion Recruit
 * 
 * Processes PENDING AI tasks by:
 * 1. Loading the task and associated agent
 * 2. Constructing appropriate prompts based on agent type
 * 3. Calling the LLM with the agent's assigned credential
 * 4. Updating the task with results
 * 5. Updating agent stats
 */

import { db } from '@/lib/db';
import { llmService } from '@/lib/agents/base/LLMService';
import type { LLMRequest, LLMResponse } from '@/lib/agents/base/LLMService';

// ============================================
// Types
// ============================================

interface TaskResult {
  success: boolean;
  output?: string;
  error?: string;
  tokensUsed?: number;
  durationMs?: number;
}

interface TrackedLLMRequest extends LLMRequest {
  agentType?: string;
  jobId?: string;
  candidateId?: string;
  taskId?: string;
}

interface TrackedLLMResponse extends LLMResponse {
  latencyMs?: number;
  costCents?: number;
}

// ============================================
// Main Processing
// ============================================

/**
 * Process a single task by ID.
 * This is the main entry point called by the agents API route.
 */
export async function processTask(taskId: string): Promise<TaskResult> {
  // 1. Load the task with agent info
  const task = await db.aITask.findUnique({
    where: { id: taskId },
    include: {
      agent: true,
    },
  });

  if (!task) {
    return { success: false, error: 'Tarefa não encontrada' };
  }

  if (task.status !== 'PENDING' && task.status !== 'RETRY') {
    return { success: false, error: `Tarefa não está pendente (status: ${task.status})` };
  }

  // 2. Mark as RUNNING
  await db.aITask.update({
    where: { id: taskId },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  // Update agent status
  await db.aIAgent.update({
    where: { id: task.agentId },
    data: { status: 'RUNNING' },
  });

  try {
    // 3. Parse task input
    const input = JSON.parse(task.input || '{}');

    // 4. Construct prompt based on agent type
    const { systemPrompt, userPrompt } = constructPrompt(task.agent.type, input);

    // 5. Call LLM with agent's credential
    const startTime = Date.now();

    const llmRequest: TrackedLLMRequest = {
      systemPrompt,
      userPrompt,
      maxTokens: task.agent.maxTokens || 2000,
      temperature: task.agent.temperature || 0.3,
      model: task.agent.model || undefined,
      jsonMode: shouldUseJson(task.agent.type),
      credentialId: task.agent.credentialId || undefined,
      agentType: task.agent.type,
      jobId: task.jobId || undefined,
      candidateId: task.candidateId || undefined,
      taskId: task.id,
    };

    // Use callWithTracking if available (added by another agent), otherwise fall back to call
    const result: TrackedLLMResponse = typeof llmService.callWithTracking === 'function'
      ? await (llmService as unknown as { callWithTracking: (req: TrackedLLMRequest) => Promise<TrackedLLMResponse> }).callWithTracking(llmRequest)
      : await llmService.call(llmRequest);

    const durationMs = Date.now() - startTime;

    if (result.success) {
      const output = result.rawContent || JSON.stringify(result.data);
      const tokensUsed = result.tokensUsed || 0;

      // 6. Update task as COMPLETED
      await db.aITask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          output,
          completedAt: new Date(),
          duration: durationMs,
          tokensUsed,
          modelUsed: task.agent.model || 'auto',
        },
      });

      // 7. Update agent stats
      await db.aIAgent.update({
        where: { id: task.agentId },
        data: {
          status: 'IDLE',
          successCount: { increment: 1 },
          totalTokensUsed: { increment: tokensUsed },
          lastRunAt: new Date(),
        },
      });

      // 8. Post-process based on agent type (apply results to entities)
      await postProcess(task, result.data);

      return {
        success: true,
        output,
        tokensUsed,
        durationMs,
      };
    } else {
      // Mark task as FAILED
      const errorMsg = result.error || 'Erro desconhecido';

      await db.aITask.update({
        where: { id: taskId },
        data: {
          status: task.attempts >= task.maxAttempts ? 'FAILED' : 'RETRY',
          error: errorMsg,
          completedAt: new Date(),
          duration: durationMs,
        },
      });

      await db.aIAgent.update({
        where: { id: task.agentId },
        data: {
          status: 'ERROR',
          errorCount: { increment: 1 },
          lastError: errorMsg,
          lastErrorAt: new Date(),
        },
      });

      return { success: false, error: errorMsg, durationMs };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro inesperado';

    await db.aITask.update({
      where: { id: taskId },
      data: {
        status: task.attempts >= task.maxAttempts ? 'FAILED' : 'RETRY',
        error: errorMsg,
        completedAt: new Date(),
        duration: Date.now() - (task.startedAt?.getTime() || Date.now()),
      },
    });

    await db.aIAgent.update({
      where: { id: task.agentId },
      data: {
        status: 'ERROR',
        errorCount: { increment: 1 },
        lastError: errorMsg,
        lastErrorAt: new Date(),
      },
    });

    return { success: false, error: errorMsg };
  }
}

/**
 * Process all PENDING tasks (for cron/batch processing)
 */
export async function processPendingTasks(limit: number = 10): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const pendingTasks = await db.aITask.findMany({
    where: { status: { in: ['PENDING', 'RETRY'] } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    take: limit,
  });

  let succeeded = 0;
  let failed = 0;

  for (const task of pendingTasks) {
    const result = await processTask(task.id);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return { processed: pendingTasks.length, succeeded, failed };
}

// ============================================
// Prompt Construction
// ============================================

function constructPrompt(
  agentType: string,
  input: Record<string, unknown>
): { systemPrompt: string; userPrompt: string } {
  switch (agentType) {
    case 'JOB_PARSER':
      return constructJobParserPrompt(input);
    case 'SCREENING':
      return constructScreeningPrompt(input);
    case 'MATCHING':
      return constructMatchingPrompt(input);
    case 'SOURCING':
      return constructSourcingPrompt(input);
    case 'CONTACT':
      return constructContactPrompt(input);
    case 'SCHEDULER':
      return constructSchedulerPrompt(input);
    case 'DISC_ANALYZER':
      return constructDISCPrompt(input);
    case 'REPORT':
      return constructReportPrompt(input);
    default:
      return {
        systemPrompt: 'You are a helpful AI assistant for a recruitment system. Respond in JSON.',
        userPrompt: `Process the following data: ${JSON.stringify(input)}`,
      };
  }
}

function shouldUseJson(agentType: string): boolean {
  return ['JOB_PARSER', 'SCREENING', 'MATCHING', 'DISC_ANALYZER', 'SCHEDULER'].includes(agentType);
}

/**
 * JOB_PARSER - Uses LLMService helper, maps { system, user } → { systemPrompt, userPrompt }
 */
function constructJobParserPrompt(input: Record<string, unknown>): { systemPrompt: string; userPrompt: string } {
  const prompt = llmService.createJobParsingPrompt((input.description as string) || '');
  return { systemPrompt: prompt.system, userPrompt: prompt.user };
}

/**
 * SCREENING - Custom prompt for resume vs job analysis
 */
function constructScreeningPrompt(input: Record<string, unknown>): { systemPrompt: string; userPrompt: string } {
  const resume = (input.resume || input.resumeText || '') as string;
  const jobDesc = (input.jobDescription || input.requirements || '') as string;
  return {
    systemPrompt: 'Você é um especialista em recrutamento de TI. Analise o currículo do candidato em relação à vaga. Retorne APENAS JSON.',
    userPrompt: `Currículo do Candidato:
${resume.substring(0, 3000)}

Requisitos da Vaga:
${jobDesc.substring(0, 2000)}

Retorne JSON:
{
  "fitScore": 0-100,
  "skillsMatch": ["skill1", "skill2"],
  "missingSkills": ["skill1"],
  "experienceMatch": "ALTO/MÉDIO/BAIXO",
  "recommendation": "AVANÇAR/ENTREVISTA/REJEITAR",
  "summary": "Resumo de 2-3 frases",
  "strengths": ["ponto forte 1"],
  "concerns": ["preocupação 1"]
}`,
  };
}

/**
 * MATCHING - Uses LLMService helper, maps { system, user } → { systemPrompt, userPrompt }
 */
function constructMatchingPrompt(input: Record<string, unknown>): { systemPrompt: string; userPrompt: string } {
  const candidate = (input.candidateSummary || '') as string;
  const job = (input.jobRequirements || '') as string;
  const prompt = llmService.createMatchingPrompt(candidate, job);
  return { systemPrompt: prompt.system, userPrompt: prompt.user };
}

/**
 * SOURCING - Custom prompt for candidate sourcing
 */
function constructSourcingPrompt(input: Record<string, unknown>): { systemPrompt: string; userPrompt: string } {
  const query = (input.query || input.title || '') as string;
  const skills = (input.skills || []) as string[];
  return {
    systemPrompt: 'Você é um expert em sourcing de candidatos de TI. Gere uma lista de candidatos ideais fictícios para a busca. Retorne APENAS JSON.',
    userPrompt: `Busca: ${query}
Skills desejadas: ${skills.join(', ')}

Retorne JSON com 5 candidatos fictícios:
{
  "candidates": [
    {
      "name": "Nome Completo",
      "title": "Título Profissional",
      "email": "email@exemplo.com",
      "skills": ["skill1", "skill2"],
      "experience": "X anos",
      "location": "Cidade, Estado",
      "matchScore": 85,
      "source": "linkedin",
      "profileUrl": "https://linkedin.com/in/example"
    }
  ]
}`,
  };
}

/**
 * CONTACT - Uses LLMService helper, maps { system, user } → { systemPrompt, userPrompt }
 */
function constructContactPrompt(input: Record<string, unknown>): { systemPrompt: string; userPrompt: string } {
  const name = (input.candidateName || 'Candidato') as string;
  const jobTitle = (input.jobTitle || 'a vaga') as string;
  const company = (input.companyName || 'nossa empresa') as string;
  const prompt = llmService.createContactMessagePrompt(name, jobTitle, company);
  return { systemPrompt: prompt.system, userPrompt: prompt.user };
}

/**
 * SCHEDULER - Custom prompt for interview scheduling
 */
function constructSchedulerPrompt(input: Record<string, unknown>): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: 'Você é um assistente de agendamento de entrevistas. Retorne APENAS JSON.',
    userPrompt: `Dados do candidato: ${JSON.stringify(input)}

Retorne JSON com sugestões de horário:
{
  "suggestedSlots": ["2025-01-20T10:00", "2025-01-20T14:00"],
  "message": "Mensagem de convite para o candidato",
  "estimatedDuration": 60
}`,
  };
}

/**
 * DISC_ANALYZER - Uses LLMService helper, maps { system, user } → { systemPrompt, userPrompt }
 */
function constructDISCPrompt(input: Record<string, unknown>): { systemPrompt: string; userPrompt: string } {
  const d = Number(input.D || input.d || 0);
  const i = Number(input.I || input.i || 0);
  const s = Number(input.S || input.s || 0);
  const c = Number(input.C || input.c || 0);
  const prompt = llmService.createDISCAnalysisPrompt(d, i, s, c, input.jobContext as string | undefined);
  return { systemPrompt: prompt.system, userPrompt: prompt.user };
}

/**
 * REPORT - Custom prompt for executive reports
 */
function constructReportPrompt(input: Record<string, unknown>): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: 'Você é um analista de recrutamento sênior. Gere relatórios executivos em pt-BR. Retorne APENAS JSON.',
    userPrompt: `Dados para o relatório: ${JSON.stringify(input)}

Retorne JSON:
{
  "title": "Título do Relatório",
  "summary": "Resumo executivo de 3-4 frases",
  "metrics": {"totalCandidates": 0, "avgScore": 0},
  "highlights": ["destaque 1"],
  "recommendations": ["recomendação 1"],
  "risks": ["risco 1"]
}`,
  };
}

// ============================================
// Post-processing (apply results to entities)
// ============================================

interface PostProcessTask {
  agentId: string;
  agent: { type: string };
  jobId?: string | null;
  candidateId?: string | null;
  id: string;
}

async function postProcess(
  task: PostProcessTask,
  data: unknown
): Promise<void> {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    switch (task.agent.type) {
      case 'JOB_PARSER':
        await postProcessJobParser(task.jobId, parsed);
        break;
      case 'MATCHING':
        await postProcessMatching(task.candidateId, parsed);
        break;
      case 'DISC_ANALYZER':
        await postProcessDISC(task.candidateId, parsed);
        break;
      case 'SCREENING':
        await postProcessScreening(task.candidateId, parsed);
        break;
    }
  } catch (error) {
    console.warn(`[TaskWorker] Post-processing failed for task ${task.id}:`, error);
  }
}

async function postProcessJobParser(jobId: string | null | undefined, data: Record<string, unknown>): Promise<void> {
  if (!jobId) return;

  await db.job.update({
    where: { id: jobId },
    data: {
      aiParsedSkills: JSON.stringify(data.skills || []),
      aiParsedKeywords: JSON.stringify(data.keywords || []),
      aiParsedSeniority: data.seniority as string | undefined,
      aiSummary: data.summary as string | undefined,
      discProfileRequired: data.discProfile ? JSON.stringify(data.discProfile) : undefined,
    },
  });
}

async function postProcessMatching(candidateId: string | null | undefined, data: Record<string, unknown>): Promise<void> {
  if (!candidateId) return;

  await db.candidate.update({
    where: { id: candidateId },
    data: {
      matchScore: data.overallScore as number | undefined,
      matchDetails: JSON.stringify(data),
      skillsScore: data.skillsScore as number | undefined,
      experienceScore: data.experienceScore as number | undefined,
    },
  });
}

async function postProcessDISC(candidateId: string | null | undefined, data: Record<string, unknown>): Promise<void> {
  if (!candidateId) return;

  // Find the DISC test for this candidate (unique constraint on candidateId)
  const discTest = await db.dISCTest.findUnique({
    where: { candidateId },
  });

  if (!discTest) return;

  await db.dISCTest.update({
    where: { id: discTest.id },
    data: {
      aiAnalysis: typeof data.analysis === 'string' ? data.analysis : JSON.stringify(data),
      aiStrengths: JSON.stringify(data.strengths || []),
      aiWeaknesses: JSON.stringify(data.gaps || data.weaknesses || []),
      aiWorkStyle: data.workStyle as string | undefined,
    },
  });
}

async function postProcessScreening(candidateId: string | null | undefined, data: Record<string, unknown>): Promise<void> {
  if (!candidateId) return;

  await db.candidate.update({
    where: { id: candidateId },
    data: {
      aiSummary: data.summary as string | undefined,
      matchScore: data.fitScore as number | undefined,
      matchDetails: JSON.stringify(data),
    },
  });
}
