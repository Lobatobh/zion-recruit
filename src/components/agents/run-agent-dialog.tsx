"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type AgentType, type AIAgent } from "@/types/agent";

interface RunAgentDialogProps {
  agent: AIAgent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRun: (agentId: string, input?: Record<string, unknown>) => Promise<void>;
}

const agentInputHints: Record<AgentType, { label: string; placeholder: string }> = {
  JOB_PARSER: {
    label: "Descrição da Vaga",
    placeholder: "Cole a descrição da vaga aqui para extrair habilidades, senioridade e palavras-chave...",
  },
  SOURCING: {
    label: "Critérios de Busca",
    placeholder: "Descreva os critérios para busca de candidatos (ex: Senior React Developer com experiência em TypeScript)...",
  },
  SCREENING: {
    label: "ID do Candidato (opcional)",
    placeholder: "Deixe em branco para processar todos os candidatos pendentes...",
  },
  CONTACT: {
    label: "ID do Candidato",
    placeholder: "Informe o ID do candidato para gerar mensagem de contato personalizada...",
  },
  SCHEDULER: {
    label: "Configuração",
    placeholder: "Configure os parâmetros de agendamento...",
  },
  DISC_ANALYZER: {
    label: "ID do Candidato",
    placeholder: "Informe o ID do candidato para análise DISC...",
  },
  MATCHING: {
    label: "ID da Vaga",
    placeholder: "Informe o ID da vaga para matching com candidatos...",
  },
  REPORT: {
    label: "Tipo de Relatório",
    placeholder: "Especifique o tipo de relatório desejado...",
  },
  ORCHESTRATOR: {
    label: "Workflow",
    placeholder: "Selecione o workflow a ser executado...",
  },
};

const workflowOptions = [
  { value: "NEW_JOB_PIPELINE", label: "Pipeline de Nova Vaga" },
  { value: "BATCH_SCREENING", label: "Triagem em Lote" },
  { value: "CANDIDATE_REPORT", label: "Relatório de Candidato" },
];

export function RunAgentDialog({
  agent,
  open,
  onOpenChange,
  onRun,
}: RunAgentDialogProps) {
  const [input, setInput] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const inputHint = agent ? agentInputHints[agent.type] : null;
  const isOrchestrator = agent?.type === "ORCHESTRATOR";

  const handleRun = async () => {
    if (!agent) return;

    setIsLoading(true);
    setResult(null);

    try {
      let parsedInput: Record<string, unknown> = {};

      if (isOrchestrator && selectedWorkflow) {
        parsedInput = { workflow: selectedWorkflow };
      } else if (input.trim()) {
        // Try to parse as JSON, otherwise use as raw input
        try {
          parsedInput = JSON.parse(input);
        } catch {
          parsedInput = { rawInput: input };
        }
      }

      await onRun(agent.id, parsedInput);
      setResult("success");
    } catch {
      setResult("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setInput("");
      setSelectedWorkflow("");
      setResult(null);
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Executar {agent.name}
          </DialogTitle>
          <DialogDescription>
            Configure os parâmetros para execução do agente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isOrchestrator ? (
            <div className="space-y-2">
              <Label>Workflow</Label>
              <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um workflow" />
                </SelectTrigger>
                <SelectContent>
                  {workflowOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            inputHint && (
              <div className="space-y-2">
                <Label>{inputHint.label}</Label>
                <Textarea
                  placeholder={inputHint.placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            )
          )}

          {/* Status Feedback */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg ${
                result === "success"
                  ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
                  : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {result === "success" ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700 dark:text-green-400">
                      Tarefa iniciada com sucesso!
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-700 dark:text-red-400">
                      Erro ao iniciar tarefa. Tente novamente.
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                onClick={handleRun}
                disabled={isLoading || (isOrchestrator && !selectedWorkflow)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Executar
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
