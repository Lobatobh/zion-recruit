"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Play,
  Pause,
  RefreshCw,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  type AgentStatus,
  type AgentType,
  type AIAgent,
  statusConfig,
} from "@/types/agent";

const agentTypeIcons: Record<AgentType, React.ElementType> = {
  JOB_PARSER: Bot,
  SOURCING: Bot,
  SCREENING: Bot,
  CONTACT: Bot,
  SCHEDULER: Bot,
  DISC_ANALYZER: Bot,
  MATCHING: Bot,
  REPORT: Bot,
  ORCHESTRATOR: Zap,
};

const agentTypeColors: Record<AgentType, string> = {
  JOB_PARSER: "text-violet-500 bg-violet-100 dark:bg-violet-900/30",
  SOURCING: "text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30",
  SCREENING: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30",
  CONTACT: "text-orange-500 bg-orange-100 dark:bg-orange-900/30",
  SCHEDULER: "text-pink-500 bg-pink-100 dark:bg-pink-900/30",
  DISC_ANALYZER: "text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30",
  MATCHING: "text-teal-500 bg-teal-100 dark:bg-teal-900/30",
  REPORT: "text-amber-500 bg-amber-100 dark:bg-amber-900/30",
  ORCHESTRATOR: "text-primary bg-primary/10",
};

interface AgentCardProps {
  agent: AIAgent;
  onToggle?: (id: string, enabled: boolean) => void;
  onRun?: (id: string) => void;
  onClick?: () => void;
}

export function AgentCard({ agent, onToggle, onRun, onClick }: AgentCardProps) {
  const statusInfo = statusConfig[agent.status];
  const StatusIcon = statusInfo.icon;
  const AgentIcon = agentTypeIcons[agent.type];
  const agentColor = agentTypeColors[agent.type];

  const successRate =
    agent.totalRuns > 0
      ? Math.round((agent.successCount / agent.totalRuns) * 100)
      : 0;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const formatLastRun = (date: Date | null | undefined) => {
    if (!date) return "Nunca";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    if (minutes > 0) return `${minutes}min atrás`;
    return "Agora";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "cursor-pointer hover:shadow-md transition-all",
          !agent.enabled && "opacity-60"
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  agentColor
                )}
              >
                <AgentIcon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="font-medium">{agent.name}</div>
                <div className="text-xs text-muted-foreground">
                  {agent.type.replace(/_/g, " ")}
                </div>
              </div>
            </div>

            {/* Toggle Switch */}
            <div
              className="flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Switch
                checked={agent.enabled}
                onCheckedChange={(checked) => onToggle?.(agent.id, checked)}
                disabled={agent.status === "RUNNING"}
              />
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-3 flex items-center justify-between">
            <Badge
              variant="secondary"
              className={cn(statusInfo.bgColor, statusInfo.color)}
            >
              {agent.status === "RUNNING" && (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              )}
              {agent.status !== "RUNNING" && (
                <StatusIcon className="h-3 w-3 mr-1" />
              )}
              {statusInfo.label}
            </Badge>

            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              disabled={!agent.enabled || agent.status === "RUNNING"}
              onClick={(e) => {
                e.stopPropagation();
                onRun?.(agent.id);
              }}
            >
              <Play className="h-3 w-3 mr-1" />
              Executar
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                Execuções
              </div>
              <div className="mt-1 text-lg font-semibold">{agent.totalRuns}</div>
            </div>

            <div className="rounded-lg bg-muted/50 p-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3" />
                Taxa de Sucesso
              </div>
              <div className="mt-1 text-lg font-semibold">{successRate}%</div>
            </div>

            <div className="rounded-lg bg-muted/50 p-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                Tokens
              </div>
              <div className="mt-1 text-lg font-semibold">
                {formatTokens(agent.totalTokensUsed)}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Última Execução
              </div>
              <div className="mt-1 text-sm font-medium">
                {formatLastRun(agent.lastRunAt)}
              </div>
            </div>
          </div>

          {/* Error indicator */}
          {agent.errorCount > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500">
              <XCircle className="h-3 w-3" />
              {agent.errorCount} erro{agent.errorCount > 1 ? "s" : ""} registrado
              {agent.errorCount > 1 ? "s" : ""}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
