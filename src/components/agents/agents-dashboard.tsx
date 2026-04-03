"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  RefreshCw,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentCard } from "./agent-card";
import { type AIAgent, type AgentStatus } from "@/types/agent";
import { AgentDetailDialog } from "./agent-detail-dialog";
import { RunAgentDialog } from "./run-agent-dialog";
import { AgentTaskList, type AITask } from "./agent-task-list";
import { toast } from "sonner";

interface AgentsDashboardProps {
  organizationId: string;
}

// Summary stats component
function DashboardStats({
  agents,
  isLoading,
}: {
  agents: AIAgent[];
  isLoading: boolean;
}) {
  const stats = {
    total: agents.length,
    running: agents.filter((a) => a.status === "RUNNING").length,
    idle: agents.filter((a) => a.status === "IDLE").length,
    error: agents.filter((a) => a.status === "ERROR").length,
    totalRuns: agents.reduce((sum, a) => sum + a.totalRuns, 0),
    totalTokens: agents.reduce((sum, a) => sum + a.totalTokensUsed, 0),
    successRate:
      agents.reduce((sum, a) => sum + a.successCount, 0) /
        (agents.reduce((sum, a) => sum + a.totalRuns, 0) || 1) *
        100 || 0,
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agentes Ativos
            </CardTitle>
            <Bot className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-bold">{stats.running}</div>
              <div className="text-sm text-muted-foreground">
                / {stats.total} total
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Execuções
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRuns}</div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Sucesso
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.successRate.toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tokens Utilizados
            </CardTitle>
            <Activity className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTokens(stats.totalTokens)}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export function AgentsDashboard({ organizationId }: AgentsDashboardProps) {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [agentToRun, setAgentToRun] = useState<AIAgent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/agents?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setAgents(data.agents);
      } else {
        toast.error("Erro ao carregar agentes");
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast.error("Erro ao carregar agentes");
    }
  }, [statusFilter]);

  // Fetch recent tasks
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/agents/tasks?limit=5");
      const data = await response.json();

      if (response.ok) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchAgents(), fetchTasks()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchAgents, fetchTasks]);

  // Refresh when filter changes
  useEffect(() => {
    fetchAgents();
  }, [statusFilter, fetchAgents]);

  // Toggle agent enabled status
  const handleToggle = async (agentId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();

      if (response.ok) {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agentId
              ? { ...a, enabled, status: data.agent.status }
              : a
          )
        );
        toast.success(
          `Agente ${enabled ? "habilitado" : "desabilitado"} com sucesso`
        );
      } else {
        toast.error(data.error || "Erro ao atualizar agente");
      }
    } catch (error) {
      console.error("Error toggling agent:", error);
      toast.error("Erro ao atualizar agente");
    }
  };

  // Run agent
  const handleRun = async (
    agentId: string,
    input?: Record<string, unknown>
  ) => {
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, input }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update agent status locally
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agentId
              ? { ...a, status: "RUNNING" as AgentStatus, totalRuns: a.totalRuns + 1 }
              : a
          )
        );
        toast.success("Tarefa iniciada com sucesso");
        // Refresh tasks
        fetchTasks();
      } else {
        toast.error(data.error || "Erro ao executar agente");
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error running agent:", error);
      toast.error("Erro ao executar agente");
      throw error;
    }
  };

  // Open agent detail
  const handleAgentClick = async (agent: AIAgent) => {
    try {
      const response = await fetch(`/api/agents/${agent.id}`);
      const data = await response.json();

      if (response.ok) {
        setSelectedAgent(data.agent);
        setDetailOpen(true);
      }
    } catch (error) {
      console.error("Error fetching agent details:", error);
      toast.error("Erro ao carregar detalhes do agente");
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([fetchAgents(), fetchTasks()]);
    setIsLoading(false);
    toast.success("Dados atualizados");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agentes de IA</h1>
          <p className="text-muted-foreground mt-1">
            Monitore e gerencie os agentes de IA do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <DashboardStats agents={agents} isLoading={isLoading} />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtrar por:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="IDLE">Inativo</SelectItem>
            <SelectItem value="RUNNING">Executando</SelectItem>
            <SelectItem value="ERROR">Erro</SelectItem>
            <SelectItem value="PAUSED">Pausado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agents Grid */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <Skeleton className="h-5 w-10" />
                      </div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <div className="grid grid-cols-2 gap-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : agents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Nenhum agente encontrado
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <AnimatePresence>
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onToggle={handleToggle}
                    onRun={(id) => {
                      const a = agents.find((ag) => ag.id === id);
                      if (a) {
                        setAgentToRun(a);
                        setRunDialogOpen(true);
                      }
                    }}
                    onClick={() => handleAgentClick(agent)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Recent Tasks Sidebar */}
        <div>
          <AgentTaskList
            tasks={tasks}
            title="Tarefas Recentes"
            showAgent={true}
          />
        </div>
      </div>

      {/* Dialogs */}
      <AgentDetailDialog
        agent={selectedAgent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onToggle={handleToggle}
        onRun={(id) => {
          setDetailOpen(false);
          const agent = agents.find((a) => a.id === id);
          if (agent) {
            setAgentToRun(agent);
            setRunDialogOpen(true);
          }
        }}
      />

      <RunAgentDialog
        agent={agentToRun}
        open={runDialogOpen}
        onOpenChange={setRunDialogOpen}
        onRun={handleRun}
      />
    </div>
  );
}
