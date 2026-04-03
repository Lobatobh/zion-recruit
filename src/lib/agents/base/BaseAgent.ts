/**
 * Base Agent Class - Zion Recruit
 * Foundation for all AI agents in the system
 * 
 * Designed for:
 * - Low token usage
 * - High reliability
 * - Human supervision capability
 * - Retry logic
 * - Task queuing
 */

import { db } from '@/lib/db';
import { AgentType, AgentStatus, TaskStatus } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  autoRun?: boolean;
  schedule?: string;
}

export interface TaskInput {
  [key: string]: unknown;
}

export interface TaskOutput {
  [key: string]: unknown;
}

export interface TaskResult<T = TaskOutput> {
  success: boolean;
  data?: T;
  error?: string;
  tokensUsed?: number;
  requiresReview?: boolean;
}

// ============================================
// Base Agent Class
// ============================================

export abstract class BaseAgent {
  protected type: AgentType;
  protected name: string;
  protected description: string;
  protected model: string;
  protected maxTokens: number;
  protected temperature: number;
  protected systemPrompt: string;
  
  protected tenantId: string;
  protected agentId: string | null = null;
  
  constructor(
    tenantId: string,
    config: AgentConfig
  ) {
    this.tenantId = tenantId;
    this.type = config.type;
    this.name = config.name;
    this.description = config.description || '';
    this.model = config.model || 'gpt-4o-mini';
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.3;
    this.systemPrompt = config.systemPrompt || '';
  }

  // ============================================
  // Agent Management
  // ============================================

  async initialize(): Promise<void> {
    // Find or create agent record
    let agent = await db.aIAgent.findUnique({
      where: {
        tenantId_type: {
          tenantId: this.tenantId,
          type: this.type,
        },
      },
    });

    if (!agent) {
      agent = await db.aIAgent.create({
        data: {
          tenantId: this.tenantId,
          type: this.type,
          name: this.name,
          description: this.description,
          model: this.model,
          maxTokens: this.maxTokens,
          temperature: this.temperature,
          prompts: JSON.stringify({ systemPrompt: this.systemPrompt }),
          status: AgentStatus.IDLE,
        },
      });
    }

    this.agentId = agent.id;
  }

  async updateStatus(status: AgentStatus): Promise<void> {
    if (!this.agentId) return;
    
    await db.aIAgent.update({
      where: { id: this.agentId },
      data: { status },
    });
  }

  async updateStats(
    success: boolean,
    tokensUsed?: number,
    duration?: number
  ): Promise<void> {
    if (!this.agentId) return;

    await db.aIAgent.update({
      where: { id: this.agentId },
      data: {
        totalRuns: { increment: 1 },
        successCount: success ? { increment: 1 } : undefined,
        errorCount: !success ? { increment: 1 } : undefined,
        totalTokensUsed: tokensUsed ? { increment: tokensUsed } : undefined,
        lastRunAt: new Date(),
      },
    });
  }

  // ============================================
  // Task Management
  // ============================================

  async createTask(
    type: string,
    input: TaskInput,
    options?: {
      priority?: number;
      jobId?: string;
      candidateId?: string;
      requiresReview?: boolean;
    }
  ): Promise<string> {
    if (!this.agentId) {
      await this.initialize();
    }

    const task = await db.aITask.create({
      data: {
        tenantId: this.tenantId,
        agentId: this.agentId!,
        type,
        input: JSON.stringify(input),
        priority: options?.priority ?? 5,
        jobId: options?.jobId,
        candidateId: options?.candidateId,
        requiresReview: options?.requiresReview ?? false,
      },
    });

    return task.id;
  }

  async getTask(taskId: string) {
    return db.aITask.findUnique({
      where: { id: taskId },
    });
  }

  async startTask(taskId: string): Promise<void> {
    await db.aITask.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.RUNNING,
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
  }

  async completeTask(
    taskId: string,
    result: TaskResult
  ): Promise<void> {
    await db.aITask.update({
      where: { id: taskId },
      data: {
        status: result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED,
        output: result.data ? JSON.stringify(result.data) : null,
        error: result.error,
        completedAt: new Date(),
        duration: result.success
          ? Math.floor((Date.now() - Date.now()) / 1000)
          : null,
        tokensUsed: result.tokensUsed,
        modelUsed: this.model,
        requiresReview: result.requiresReview,
      },
    });
  }

  async failTask(taskId: string, error: string): Promise<void> {
    const task = await this.getTask(taskId);
    
    const shouldRetry = task && task.attempts < task.maxAttempts;
    
    await db.aITask.update({
      where: { id: taskId },
      data: {
        status: shouldRetry ? TaskStatus.RETRY : TaskStatus.FAILED,
        error,
        completedAt: new Date(),
      },
    });
  }

  // ============================================
  // Abstract Methods
  // ============================================

  abstract execute(input: TaskInput): Promise<TaskResult>;

  // ============================================
  // Utility Methods
  // ============================================

  protected parseJsonSafe<T>(text: string): T | null {
    try {
      // Remove markdown code blocks if present
      let clean = text.trim();
      if (clean.startsWith('```json')) {
        clean = clean.slice(7);
      }
      if (clean.startsWith('```')) {
        clean = clean.slice(3);
      }
      if (clean.endsWith('```')) {
        clean = clean.slice(0, -3);
      }
      clean = clean.trim();
      
      return JSON.parse(clean) as T;
    } catch {
      return null;
    }
  }

  protected truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  protected estimateTokens(text: string): number {
    // Rough estimate: ~4 chars per token for Portuguese/English
    return Math.ceil(text.length / 4);
  }
}
