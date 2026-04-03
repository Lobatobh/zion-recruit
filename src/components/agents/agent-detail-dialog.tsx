"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Play,
  Pause,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  Settings,
  Calendar,
  AlertTriangle,
  Key,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentTaskList, type AITask } from "./agent-task-list";
import { cn } from "@/lib/utils";
import {
  type AIAgent,
  type AgentStatus,
  statusConfig,
} from "@/types/agent";
import { toast } from "sonner";

interface AgentDetailDialogProps {
  agent: AIAgent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle?: (id: string, enabled: boolean) => void;
  onRun?: (id: string) => void;
  onUpdated?: (agent: AIAgent) => void;
}

export function AgentDetailDialog({
  agent,
  open,
  onOpenChange,
  onToggle,
  onRun,
  onUpdated,
}: AgentDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Array<{ id: string; name: string; provider: string }>>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [savingCredential, setSavingCredential] = useState(false);

  // Fetch available credentials
  const fetchCredentials = useCallback(async () => {
    setCredentialsLoading(true);
    try {
      const res = await fetch("/api/credentials");
      if (res.ok) {
        const data = await res.json();
        // Only show AI provider credentials
        const aiProviders = ["OPENAI", "GEMINI", "OPENROUTER", "ANTHROPIC"];
        const aiCreds = (data.credentials || data || []).filter(
          (c: { provider: string }) => aiProviders.includes(c.provider)
        );
        setCredentials(aiCreds);
      }
    } catch {
      // Silently fail
    } finally {
      setCredentialsLoading(false);
    }
  }, []);

  // Initialize selectedCredentialId from agent
  useEffect(() => {
    if (agent) {
      setSelectedCredentialId(agent.credentialId || null);
    }
  }, [agent]);

  // Fetch credentials when config tab is opened
  useEffect(() => {
    if (open && activeTab === "config" && credentials.length === 0) {
      fetchCredentials();
    }
  }, [open, activeTab, credentials.length, fetchCredentials]);

  if (!agent) return null;

  const statusInfo = statusConfig[agent.status];

  const handleCredentialChange = async (value: string) => {
    const newCredentialId = value === "auto" ? null : value;
    setSelectedCredentialId(newCredentialId);

    if (!agent) return;

    setSavingCredential(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId: newCredentialId }),
      });

      if (res.ok) {
        toast.success("Credencial atualizada com sucesso");
        const selectedCred = newCredentialId
          ? credentials.find((c) => c.id === newCredentialId)
          : null;
        onUpdated?.({
          ...agent,
          credentialId: newCredentialId,
          credentialName: selectedCred?.name || null,
        });
      } else {
        toast.error("Erro ao atualizar credencial");
        setSelectedCredentialId(agent.credentialId || null);
      }
    } catch {
      toast.error("Erro ao atualizar credencial");
      setSelectedCredentialId(agent.credentialId || null);
    } finally {
      setSavingCredential(false);
    }
  };

  const successRate =
    agent.totalRuns > 0
      ? Math.round((agent.successCount / agent.totalRuns) * 100)
      : 0;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Nunca";
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {agent.name}
                <Badge
                  variant="secondary"
                  className={cn(statusInfo.bgColor, statusInfo.color)}
                >
                  {agent.status === "RUNNING" && (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  )}
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="text-sm font-normal text-muted-foreground">
                {agent.type.replace(/_/g, " ")}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <Tabs key={agent.id} value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="tasks">Tarefas</TabsTrigger>
              <TabsTrigger value="config">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* Quick Actions */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={agent.enabled}
                      onCheckedChange={(checked) => onToggle?.(agent.id, checked)}
                      disabled={agent.status === "RUNNING"}
                    />
                    <span className="text-sm">
                      {agent.enabled ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => onRun?.(agent.id)}
                  disabled={!agent.enabled || agent.status === "RUNNING"}
                >
                  {agent.status === "RUNNING" ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Executar Agora
                    </>
                  )}
                </Button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4" />
                    <span className="text-xs">Execuções</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold">{agent.totalRuns}</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs">Taxa de Sucesso</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold">{successRate}%</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs">Tokens Usados</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {formatTokens(agent.totalTokensUsed)}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <XCircle className="h-4 w-4" />
                    <span className="text-xs">Erros</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-red-500">
                    {agent.errorCount}
                  </div>
                </motion.div>
              </div>

              {/* Task Stats */}
              {agent.stats && (
                <div className="p-4 rounded-lg border border-border">
                  <h4 className="text-sm font-medium mb-3">Status das Tarefas</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {agent.stats.pendingTasks}
                      </div>
                      <div className="text-xs text-muted-foreground">Pendentes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-500">
                        {agent.stats.runningTasks}
                      </div>
                      <div className="text-xs text-muted-foreground">Executando</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {agent.stats.completedTasks}
                      </div>
                      <div className="text-xs text-muted-foreground">Concluídas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {agent.stats.failedTasks}
                      </div>
                      <div className="text-xs text-muted-foreground">Falharam</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Error */}
              {agent.lastError && (
                <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-700 dark:text-red-400">
                        Último Erro
                      </h4>
                      <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                        {agent.lastError}
                      </p>
                      {agent.lastErrorAt && (
                        <p className="mt-2 text-xs text-red-500">
                          {formatDate(agent.lastErrorAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              <AgentTaskList
                tasks={agent.tasks || []}
                title="Histórico de Tarefas"
                maxHeight="max-h-[400px]"
              />
            </TabsContent>

            <TabsContent value="config" className="mt-4 space-y-4">
              {/* Model Configuration */}
              <div className="p-4 rounded-lg border border-border">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Configuração do Modelo
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Modelo</label>
                    <div className="text-sm font-medium">
                      {agent.model || "gpt-4o-mini"}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Max Tokens
                    </label>
                    <div className="text-sm font-medium">
                      {agent.maxTokens || 2000}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Temperatura
                    </label>
                    <div className="text-sm font-medium">
                      {agent.temperature || 0.3}
                    </div>
                  </div>
                </div>
              </div>

              {/* API Credential */}
              <div className="p-4 rounded-lg border border-border">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Credencial de API
                  {savingCredential && (
                    <Loader2 className="h-3 w-3 animate-spin ml-auto" />
                  )}
                </h4>
                {credentialsLoading ? (
                  <div className="h-10 bg-muted rounded-md animate-pulse" />
                ) : (
                  <Select
                    value={selectedCredentialId || "auto"}
                    onValueChange={handleCredentialChange}
                    disabled={savingCredential}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar credencial" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        Automático (primeira disponível)
                      </SelectItem>
                      {credentials.map((cred) => (
                        <SelectItem key={cred.id} value={cred.id}>
                          {cred.name} ({cred.provider})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedCredentialId && (
                  <p className="text-xs text-emerald-600 mt-2">
                    ✓ Usando: {credentials.find((c) => c.id === selectedCredentialId)?.name || selectedCredentialId}
                  </p>
                )}
                {!selectedCredentialId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Define qual credencial de API este agente deve usar. Se
                    &quot;Automático&quot;, o sistema seleciona a primeira credencial
                    válida disponível.
                  </p>
                )}
              </div>

              {/* Schedule Configuration */}
              <div className="p-4 rounded-lg border border-border">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Agendamento
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Execução Automática</span>
                    <Badge variant={agent.autoRun ? "default" : "secondary"}>
                      {agent.autoRun ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {agent.schedule && (
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Cron Expression
                      </label>
                      <div className="text-sm font-mono bg-muted p-2 rounded">
                        {agent.schedule}
                      </div>
                    </div>
                  )}
                  {agent.nextRunAt && (
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Próxima Execução
                      </label>
                      <div className="text-sm font-medium">
                        {formatDate(agent.nextRunAt)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="p-4 rounded-lg border border-border">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Histórico
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Última Execução
                    </label>
                    <div className="text-sm font-medium">
                      {formatDate(agent.lastRunAt)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Criado em</label>
                    <div className="text-sm font-medium">
                      {formatDate(agent.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
