/**
 * Orchestrator Agent - Zion Recruit
 * 
 * Master agent that:
 * - Coordinates all specialized agents
 * - Manages workflows
 * - Handles task dependencies
 * - Provides supervision interface
 * 
 * This is the "brain" of the AI recruitment system
 */

import { BaseAgent, AgentConfig, TaskInput, TaskResult, TaskOutput } from '../base/BaseAgent';
import { AgentType, TaskStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { JobParserAgent } from '../specialized/JobParserAgent';
import { SourcingAgent } from '../specialized/SourcingAgent';
import { ScreeningAgent } from '../specialized/ScreeningAgent';
import { ContactAgent } from '../specialized/ContactAgent';

// ============================================
// Types
// ============================================

interface WorkflowStep {
  agent: AgentType;
  input: TaskInput;
  dependsOn?: string[];
  condition?: (results: Map<string, TaskOutput>) => boolean;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

interface OrchestrationInput {
  workflowId: string;
  jobId: string;
  options?: Record<string, unknown>;
}

interface OrchestrationOutput extends TaskOutput {
  workflowId: string;
  stepsCompleted: string[];
  stepsFailed: string[];
  results: Record<string, TaskOutput>;
  duration: number;
}

// ============================================
// Predefined Workflows
// ============================================

const WORKFLOWS: Record<string, Workflow> = {
  NEW_JOB_PIPELINE: {
    id: 'NEW_JOB_PIPELINE',
    name: 'Nova Vaga - Pipeline Completo',
    description: 'Parse job → Source candidates → Screen candidates → Contact top candidates',
    steps: [
      {
        agent: AgentType.JOB_PARSER,
        input: { jobId: '${jobId}' },
      },
      {
        agent: AgentType.SOURCING,
        input: { jobId: '${jobId}', maxCandidates: 20 },
        dependsOn: ['JOB_PARSER'],
      },
      {
        agent: AgentType.SCREENING,
        input: { candidateId: '${candidateId}', jobId: '${jobId}' },
        dependsOn: ['SOURCING'],
        condition: (results) => {
          const sourcing = results.get('SOURCING');
          return sourcing ? (sourcing as { candidates: unknown[] }).candidates.length > 0 : false;
        },
      },
      {
        agent: AgentType.CONTACT,
        input: { candidateId: '${candidateId}', jobId: '${jobId}', channel: 'email' },
        dependsOn: ['SCREENING'],
        condition: (results) => {
          const screening = results.get('SCREENING');
          return screening ? (screening as { overallScore: number }).overallScore >= 70 : false;
        },
      },
    ],
  },

  BATCH_SCREENING: {
    id: 'BATCH_SCREENING',
    name: 'Triagem em Lote',
    description: 'Screen all unscreened candidates for a job',
    steps: [
      {
        agent: AgentType.SCREENING,
        input: { candidateId: '${candidateId}', jobId: '${jobId}' },
      },
    ],
  },

  DISC_ANALYSIS: {
    id: 'DISC_ANALYSIS',
    name: 'Análise DISC',
    description: 'Analyze DISC test results and compare with job requirements',
    steps: [
      {
        agent: AgentType.DISC_ANALYZER,
        input: { candidateId: '${candidateId}', jobId: '${jobId}' },
      },
    ],
  },

  CANDIDATE_REPORT: {
    id: 'CANDIDATE_REPORT',
    name: 'Relatório de Candidato',
    description: 'Generate comprehensive candidate report',
    steps: [
      {
        agent: AgentType.SCREENING,
        input: { candidateId: '${candidateId}', jobId: '${jobId}' },
      },
      {
        agent: AgentType.DISC_ANALYZER,
        input: { candidateId: '${candidateId}', jobId: '${jobId}' },
        dependsOn: ['SCREENING'],
      },
      {
        agent: AgentType.REPORT,
        input: { candidateId: '${candidateId}', jobId: '${jobId}' },
        dependsOn: ['DISC_ANALYZER'],
      },
    ],
  },
};

// ============================================
// Agent Configuration
// ============================================

const ORCHESTRATOR_CONFIG: AgentConfig = {
  type: AgentType.ORCHESTRATOR,
  name: 'Orchestrator Agent',
  description: 'Coordena todos os agentes especializados',
  model: 'gpt-4o-mini',
  maxTokens: 500,
  temperature: 0.1,
  systemPrompt: 'Orchestrate AI recruitment workflows. Track progress and handle errors.',
};

// ============================================
// Orchestrator Agent Class
// ============================================

export class OrchestratorAgent extends BaseAgent {
  private agentInstances: Map<AgentType, BaseAgent> = new Map();

  constructor(tenantId: string) {
    super(tenantId, ORCHESTRATOR_CONFIG);
    this.initializeAgents();
  }

  private initializeAgents(): void {
    this.agentInstances.set(AgentType.JOB_PARSER, new JobParserAgent(this.tenantId));
    this.agentInstances.set(AgentType.SOURCING, new SourcingAgent(this.tenantId));
    this.agentInstances.set(AgentType.SCREENING, new ScreeningAgent(this.tenantId));
    this.agentInstances.set(AgentType.CONTACT, new ContactAgent(this.tenantId));
    // Add more agents as they're created
  }

  async execute(input: TaskInput): Promise<TaskResult<OrchestrationOutput>> {
    const { workflowId, jobId, options } = input as OrchestrationInput;

    const workflow = WORKFLOWS[workflowId];
    if (!workflow) {
      return { success: false, error: `Workflow ${workflowId} not found` };
    }

    const startTime = Date.now();
    const stepResults = new Map<string, TaskOutput>();
    const stepsCompleted: string[] = [];
    const stepsFailed: string[] = [];

    // Initialize all agents
    await Promise.all(
      Array.from(this.agentInstances.values()).map((agent) => agent.initialize())
    );

    // Execute workflow steps
    for (const step of workflow.steps) {
      const stepId = step.agent;

      // Check dependencies
      if (step.dependsOn) {
        const allDependenciesMet = step.dependsOn.every((dep) => stepsCompleted.includes(dep));
        if (!allDependenciesMet) {
          stepsFailed.push(stepId);
          continue;
        }
      }

      // Check condition
      if (step.condition && !step.condition(stepResults)) {
        continue;
      }

      // Prepare input with variable substitution
      const stepInput = this.substituteVariables(step.input, {
        jobId,
        ...options,
        results: Object.fromEntries(stepResults),
      });

      // Execute step
      const agent = this.agentInstances.get(step.agent);
      if (!agent) {
        stepsFailed.push(stepId);
        continue;
      }

      // For steps that need to run per candidate, we handle specially
      if (stepInput.candidateId === '${candidateId}' && stepInput.candidates) {
        const candidates = stepInput.candidates as string[];
        for (const candidateId of candidates) {
          const result = await agent.execute({ ...stepInput, candidateId });
          if (result.success) {
            stepResults.set(`${stepId}_${candidateId}`, result.data!);
          }
        }
        stepsCompleted.push(stepId);
      } else {
        const result = await agent.execute(stepInput);
        if (result.success) {
          stepResults.set(stepId, result.data!);
          stepsCompleted.push(stepId);
        } else {
          stepsFailed.push(stepId);
        }
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: stepsFailed.length === 0,
      data: {
        workflowId,
        stepsCompleted,
        stepsFailed,
        results: Object.fromEntries(stepResults),
        duration,
      },
    };
  }

  private substituteVariables(
    input: TaskInput,
    context: Record<string, unknown>
  ): TaskInput {
    const result: TaskInput = {};

    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const varName = value.slice(2, -1);
        result[key] = context[varName];
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  // ============================================
  // Workflow Management
  // ============================================

  getAvailableWorkflows(): Workflow[] {
    return Object.values(WORKFLOWS);
  }

  getWorkflow(workflowId: string): Workflow | undefined {
    return WORKFLOWS[workflowId];
  }

  // ============================================
  // Supervision Interface
  // ============================================

  async getPendingTasks(): Promise<TaskInput[]> {
    const tasks = await db.aITask.findMany({
      where: {
        tenantId: this.tenantId,
        status: TaskStatus.PENDING,
        requiresReview: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return tasks.map((task) => ({
      taskId: task.id,
      type: task.type,
      input: JSON.parse(task.input),
    }));
  }

  async approveTask(taskId: string, notes?: string): Promise<void> {
    await db.aITask.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.COMPLETED,
        reviewedAt: new Date(),
        reviewNotes: notes,
      },
    });
  }

  async rejectTask(taskId: string, reason: string): Promise<void> {
    await db.aITask.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.FAILED,
        error: reason,
        reviewedAt: new Date(),
        reviewNotes: reason,
      },
    });
  }
}

// ============================================
// Convenience Functions
// ============================================

export async function runWorkflow(
  tenantId: string,
  workflowId: string,
  jobId: string,
  options?: Record<string, unknown>
): Promise<TaskResult<OrchestrationOutput>> {
  const orchestrator = new OrchestratorAgent(tenantId);
  await orchestrator.initialize();

  return orchestrator.execute({ workflowId, jobId, options });
}

export function getAvailableWorkflows(): Workflow[] {
  return Object.values(WORKFLOWS);
}
