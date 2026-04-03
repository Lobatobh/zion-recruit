"use client";

import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Pause,
  Play,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type TaskStatus =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "RETRY";

export interface AITask {
  id: string;
  type: string;
  status: TaskStatus;
  input: string;
  output?: string | null;
  error?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  duration?: number | null;
  tokensUsed?: number | null;
  modelUsed?: string | null;
  attempts: number;
  maxAttempts: number;
  requiresReview: boolean;
  createdAt: Date;
  agent?: {
    id: string;
    name: string;
    type: string;
  };
}

const taskStatusConfig: Record<
  TaskStatus,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "Pendente",
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    icon: Clock,
  },
  QUEUED: {
    label: "Na Fila",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    icon: Play,
  },
  RUNNING: {
    label: "Executando",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    icon: Loader2,
  },
  COMPLETED: {
    label: "Concluído",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900",
    icon: CheckCircle,
  },
  FAILED: {
    label: "Falhou",
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900",
    icon: XCircle,
  },
  CANCELLED: {
    label: "Cancelado",
    color: "text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    icon: Pause,
  },
  RETRY: {
    label: "Tentando",
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900",
    icon: AlertCircle,
  },
};

interface AgentTaskListProps {
  tasks: AITask[];
  title?: string;
  showAgent?: boolean;
  maxHeight?: string;
}

export function AgentTaskList({
  tasks,
  title = "Tarefas Recentes",
  showAgent = false,
  maxHeight = "max-h-96",
}: AgentTaskListProps) {
  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return "-";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTokens = (tokens: number | null | undefined) => {
    if (!tokens) return "-";
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const formatTime = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusInfo = (status: TaskStatus) => taskStatusConfig[status];

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma tarefa encontrada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          {title}
          <Badge variant="secondary" className="font-normal">
            {tasks.length} tarefa{tasks.length > 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className={cn(maxHeight, "overflow-y-auto")}>
          <div className="space-y-1 px-6 pb-4">
            {tasks.map((task, index) => {
              const statusInfo = getStatusInfo(task.status);
              const StatusIcon = statusInfo.icon;
              const isRunning = task.status === "RUNNING";

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        statusInfo.bgColor
                      )}
                    >
                      <StatusIcon
                        className={cn(
                          "h-4 w-4",
                          statusInfo.color,
                          isRunning && "animate-spin"
                        )}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{task.type}</span>
                        {task.requiresReview && (
                          <Zap className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {showAgent && task.agent && (
                          <span className="text-primary">
                            {task.agent.name}
                          </span>
                        )}
                        <span>{formatTime(task.createdAt)}</span>
                        {task.attempts > 1 && (
                          <span className="text-amber-500">
                            ({task.attempts}/{task.maxAttempts})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {task.duration && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          Duração
                        </div>
                        <div className="text-sm font-medium">
                          {formatDuration(task.duration)}
                        </div>
                      </div>
                    )}
                    {task.tokensUsed && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          Tokens
                        </div>
                        <div className="text-sm font-medium">
                          {formatTokens(task.tokensUsed)}
                        </div>
                      </div>
                    )}
                    <Badge
                      variant="secondary"
                      className={cn(statusInfo.bgColor, statusInfo.color)}
                    >
                      {statusInfo.label}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
