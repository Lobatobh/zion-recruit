"use client";

/**
 * Job Detail Dialog - Zion Recruit
 * Shows complete job details including DISC profile, AI analysis, Hunter AI, and pipeline preview
 */

import { useState } from "react";
import {
  Briefcase,
  MapPin,
  DollarSign,
  FileText,
  ListChecks,
  Gift,
  Brain,
  Loader2,
  RefreshCw,
  Users,
  Calendar,
  Building2,
  Edit,
  Trash2,
  Eye,
  Link2,
  CheckCircle2,
  Clock,
  Copy,
  Crosshair,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Job,
  getJobStatusLabel,
  getJobTypeLabel,
  formatSalary,
  JobStatus,
  PipelineStageSummary,
} from "@/types/job";
import { DISCProfileSuggestionCard, DISCBadge } from "./disc-profile-suggestion";
import { HunterAIPanel } from "./hunter-ai-panel";

// ============================================
// Props
// ============================================

interface JobDetailDialogProps {
  job: (Job & { pipeline?: PipelineStageSummary[] }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (job: Job) => void;
  onDelete?: (job: Job) => void;
  onCandidatesImported?: () => void;
}

const statusColors: Record<JobStatus, string> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  PAUSED: "outline",
  CLOSED: "outline",
  ARCHIVED: "destructive",
};

// ============================================
// Component
// ============================================

export function JobDetailDialog({
  job,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onCandidatesImported,
}: JobDetailDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [jobData, setJobData] = useState(job);
  const [hunterOpen, setHunterOpen] = useState(false);

  // Keep local state in sync with prop changes
  if (job && job.id !== jobData?.id) {
    setJobData(job);
  }

  const currentJob = jobData;

  // Guard: return early if no job data
  if (!currentJob) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="py-12 text-center text-muted-foreground">
            Nenhuma vaga selecionada.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const salary = formatSalary(currentJob.salaryMin, currentJob.salaryMax, currentJob.currency);
  let parsedSkills: string[] = [];
  let parsedKeywords: string[] = [];
  try {
    parsedSkills = currentJob.aiParsedSkills ? JSON.parse(currentJob.aiParsedSkills) : [];
  } catch { /* ignore */ }
  try {
    parsedKeywords = currentJob.aiParsedKeywords ? JSON.parse(currentJob.aiParsedKeywords) : [];
  } catch { /* ignore */ }

  const handleAnalyzeDISC = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/jobs/${currentJob.id}/analyze-disc`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        toast.success("Análise DISC concluída!");
        if (data.job) {
          setJobData((prev) => ({
            ...prev,
            discProfileRequired: data.job.discProfileRequired,
            aiParsedSkills: data.job.aiParsedSkills,
            aiParsedKeywords: data.job.aiParsedKeywords,
            aiParsedSeniority: data.job.aiParsedSeniority,
            aiSummary: data.job.aiSummary || prev.aiSummary,
          }));
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.error || "Falha ao analisar vaga");
      }
    } catch {
      toast.error("Erro de conexão ao analisar vaga");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyLink = async () => {
    if (currentJob.publicSlug) {
      const link = `${window.location.origin}/careers/${currentJob.publicSlug}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link público copiado!");
    } else {
      toast.info("Esta vaga ainda não é pública");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{currentJob.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                {currentJob.department && (
                  <>
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{currentJob.department}</span>
                  </>
                )}
                {currentJob.location && (
                  <>
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{currentJob.location}</span>
                  </>
                )}
                {currentJob.workModel && (
                  <Badge variant="outline" className="text-xs">
                    {currentJob.workModel === "REMOTE" ? "Remoto" : currentJob.workModel === "HYBRID" ? "Híbrido" : "Presencial"}
                  </Badge>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Badge variant={statusColors[currentJob.status] as "default" | "secondary" | "outline" | "destructive"}>
                {getJobStatusLabel(currentJob.status)}
              </Badge>
              <Badge variant="outline">{getJobTypeLabel(currentJob.type)}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1">
              <Users className="h-3.5 w-3.5" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="disc" className="gap-1">
              <Brain className="h-3.5 w-3.5" />
              DISC
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1">
              <Brain className="h-3.5 w-3.5" />
              IA
            </TabsTrigger>
            <TabsTrigger value="hunter" className="gap-1" onClick={() => setHunterOpen(true)}>
              <Crosshair className="h-3.5 w-3.5" />
              Hunter
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 m-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Candidatos</span>
                  </div>
                  <div className="text-2xl font-bold">{currentJob.candidatesCount ?? 0}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Salário</span>
                  </div>
                  <div className="text-lg font-semibold">{salary || "Não definido"}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-sm">Tipo</span>
                  </div>
                  <div className="text-lg font-semibold">{getJobTypeLabel(currentJob.type)}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Criado</span>
                  </div>
                  <div className="text-sm font-medium">
                    {new Date(currentJob.createdAt).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>

              {/* Extra Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg border text-center">
                  <Eye className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <div className="text-lg font-bold">{currentJob.viewsCount}</div>
                  <div className="text-xs text-muted-foreground">Visualizações</div>
                </div>
                <div className="p-3 rounded-lg border text-center">
                  <Copy className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <div className="text-lg font-bold">{currentJob.applicationsCount}</div>
                  <div className="text-xs text-muted-foreground">Aplicações</div>
                </div>
                <div className="p-3 rounded-lg border text-center">
                  <Link2 className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <Badge variant={currentJob.isPublic ? "default" : "outline"}>
                    {currentJob.isPublic ? "Pública" : "Privada"}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">Visibilidade</div>
                </div>
              </div>

              {/* DISC Badge */}
              {currentJob.discProfileRequired && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border">
                  <Brain className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Perfil DISC Ideal:</span>
                  <DISCBadge profile={currentJob.discProfileRequired} />
                </div>
              )}

              {/* Dates */}
              {(currentJob.publishedAt || currentJob.expiresAt) && (
                <div className="flex gap-4 text-sm">
                  {currentJob.publishedAt && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-emerald-500" />
                      <span className="text-muted-foreground">Publicado:</span>
                      <span className="font-medium">
                        {new Date(currentJob.publishedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                  {currentJob.expiresAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-muted-foreground">Expira:</span>
                      <span className="font-medium">
                        {new Date(currentJob.expiresAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descrição
                </h4>
                <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg bg-muted/30">
                  {currentJob.description}
                </div>
              </div>

              {/* Requirements */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Requisitos
                </h4>
                <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg bg-muted/30">
                  {currentJob.requirements}
                </div>
              </div>

              {/* Benefits */}
              {currentJob.benefits && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Benefícios
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg bg-muted/30">
                    {currentJob.benefits}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Pipeline Tab */}
            <TabsContent value="pipeline" className="m-0">
              {currentJob.pipeline && currentJob.pipeline.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {currentJob.pipeline.map((stage) => (
                      <div key={stage.name} className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className="font-medium text-sm">{stage.name}</span>
                          </div>
                          <Badge variant="secondary">{stage.count}</Badge>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(stage.count / (currentJob.candidatesCount || 1)) * 100}%`,
                              backgroundColor: stage.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <span className="text-sm text-muted-foreground">
                      Total: <strong>{currentJob.candidatesCount}</strong> candidatos em {currentJob.pipeline.length} etapa(s)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum candidato ainda</h3>
                  <p className="text-sm text-muted-foreground">
                    Quando candidatos forem adicionados, o pipeline será exibido aqui.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* DISC Tab */}
            <TabsContent value="disc" className="m-0">
              <div className="space-y-4">
                {currentJob.discProfileRequired ? (
                  <DISCProfileSuggestionCard job={currentJob} />
                ) : (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Perfil DISC não analisado</h3>
                    <p className="text-muted-foreground mb-4">
                      Clique no botão abaixo para que a IA analise a vaga e sugira o perfil DISC ideal.
                    </p>
                    <Button onClick={handleAnalyzeDISC} disabled={isAnalyzing}>
                      {isAnalyzing ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</>
                      ) : (
                        <><Brain className="h-4 w-4 mr-2" />Analisar Perfil DISC</>
                      )}
                    </Button>
                  </div>
                )}

                {currentJob.discProfileRequired && (
                  <Button variant="outline" onClick={handleAnalyzeDISC} disabled={isAnalyzing} className="w-full">
                    {isAnalyzing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reanalisando...</>
                    ) : (
                      <><RefreshCw className="h-4 w-4 mr-2" />Reanalisar Perfil DISC</>
                    )}
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* Hunter Tab */}
            <TabsContent value="hunter" className="m-0">
              <div className="text-center py-8 space-y-4">
                <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-100 to-fuchsia-100 mx-auto">
                  <Crosshair className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Hunter AI</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Encontre os melhores candidatos de forma inteligente com IA.
                    Clique abaixo para iniciar a busca por profissionais ideais
                    para esta vaga.
                  </p>
                </div>
                <Button
                  onClick={() => setHunterOpen(true)}
                  className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
                >
                  <Crosshair className="h-4 w-4" />
                  Abrir Hunter AI
                </Button>
              </div>
            </TabsContent>

            {/* AI Tab */}
            <TabsContent value="ai" className="m-0">
              <div className="space-y-6">
                {currentJob.aiSummary ? (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      Resumo IA
                    </h4>
                    <p className="text-sm text-muted-foreground">{currentJob.aiSummary}</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Análise IA não disponível</h3>
                    <p className="text-muted-foreground mb-4">
                      A análise será gerada automaticamente quando a vaga for criada.
                    </p>
                    <Button onClick={handleAnalyzeDISC} disabled={isAnalyzing}>
                      {isAnalyzing ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</>
                      ) : (
                        <><Brain className="h-4 w-4 mr-2" />Analisar com IA</>
                      )}
                    </Button>
                  </div>
                )}

                {currentJob.aiParsedSeniority && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Senioridade sugerida:</span>
                    <Badge variant="secondary">{currentJob.aiParsedSeniority}</Badge>
                  </div>
                )}

                {parsedSkills.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Habilidades Extraídas</h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedSkills.map((skill: string, index: number) => (
                        <Badge key={index} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {parsedKeywords.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Palavras-chave</h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedKeywords.map((keyword: string, index: number) => (
                        <Badge key={index} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setHunterOpen(true)}
              className="gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
            >
              <Crosshair className="h-4 w-4" />
              Hunter AI
            </Button>
            {onDelete && (
              <Button variant="destructive" size="sm" onClick={() => onDelete(job)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <><CheckCircle2 className="h-4 w-4 mr-1 text-emerald-500" />Copiado!</>
              ) : (
                <><Link2 className="h-4 w-4 mr-1" />Copiar Link</>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {onEdit && (
              <Button size="sm" onClick={() => onEdit(job)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Hunter AI Panel (dialog) */}
        <HunterAIPanel
          job={currentJob}
          open={hunterOpen}
          onOpenChange={setHunterOpen}
          onImported={() => {
            if (onCandidatesImported) onCandidatesImported();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
