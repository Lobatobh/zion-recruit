"use client";

import {
  Clock,
  XCircle,
  Pause,
  Activity,
} from "lucide-react";
import type { AITask } from "@/components/agents/agent-task-list";

export type AgentType =
  | "JOB_PARSER"
  | "SOURCING"
  | "SCREENING"
  | "CONTACT"
  | "SCHEDULER"
  | "DISC_ANALYZER"
  | "MATCHING"
  | "REPORT"
  | "ORCHESTRATOR";

export type AgentStatus = "IDLE" | "RUNNING" | "ERROR" | "PAUSED" | "DISABLED";

export interface AIAgent {
  id: string;
  type: AgentType;
  name: string;
  description?: string | null;
  status: AgentStatus;
  enabled: boolean;
  model?: string | null;
  maxTokens?: number | null;
  temperature?: number | null;
  totalRuns: number;
  successCount: number;
  errorCount: number;
  totalTokensUsed: number;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
  lastError?: string | null;
  lastErrorAt?: Date | null;
  autoRun: boolean;
  schedule?: string | null;
  credentialId?: string | null;
  credentialName?: string | null;  // denormalized for display
  tasksCount: number;
  createdAt?: Date | null;
  tasks?: AITask[];
  stats?: {
    completedTasks: number;
    failedTasks: number;
    runningTasks: number;
    pendingTasks: number;
    totalTokens: number;
  };
}

export const statusConfig: Record<
  AgentStatus,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  IDLE: {
    label: "Inativo",
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    icon: Clock,
  },
  RUNNING: {
    label: "Executando",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    icon: Activity,
  },
  ERROR: {
    label: "Erro",
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900",
    icon: XCircle,
  },
  PAUSED: {
    label: "Pausado",
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900",
    icon: Pause,
  },
  DISABLED: {
    label: "Desabilitado",
    color: "text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-900",
    icon: Pause,
  },
};
