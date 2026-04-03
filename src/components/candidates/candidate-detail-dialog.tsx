"use client";

/**
 * Candidate Detail Dialog - Zion Recruit
 * Full candidate information with tabs and actions
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Phone,
  Linkedin,
  Globe,
  Calendar,
  Briefcase,
  Building2,
  ArrowRight,
  Send,
  XCircle,
  CheckCircle,
  FileText,
  Star,
  Clock,
  MessageSquare,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { usePipelineStore } from "@/stores/pipeline-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getMatchScoreColor,
  getMatchScoreLabel,
  getInitials,
  formatAppliedDate,
} from "@/types/pipeline";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { DiscProfileCard } from "@/components/disc/disc-profile-card";

// Activity type for timeline
interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string | Date;
}

// Match details type
interface MatchDetails {
  skillsScore?: number;
  experienceScore?: number;
  educationScore?: number;
  reasons?: string[];
  strengths?: string[];
  gaps?: string[];
}

export function CandidateDetailDialog() {
  const {
    selectedCandidate,
    isCandidateDetailOpen,
    closeCandidateDetail,
    stages,
    moveCandidate,
  } = usePipelineStore();

  const isMobile = useIsMobile();
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [discTest, setDiscTest] = useState<{
    id: string;
    status: string;
    profileD?: number;
    profileI?: number;
    profileS?: number;
    profileC?: number;
    primaryProfile?: string;
    secondaryProfile?: string | null;
    profileCombo?: string;
    aiAnalysis?: string | null;
    aiStrengths?: string | null;
    aiWeaknesses?: string | null;
    aiWorkStyle?: string | null;
    jobFitScore?: number | null;
    jobFitDetails?: string | null;
  } | null>(null);
  const [isSendingDisc, setIsSendingDisc] = useState(false);

  // Set initial stage when candidate changes
  useEffect(() => {
    if (selectedCandidate) {
      setSelectedStageId(selectedCandidate.pipelineStageId || "");
      fetchActivities();
      parseMatchDetails();
      fetchDiscTest();
    }
  }, [selectedCandidate]);

  const fetchActivities = async () => {
    if (!selectedCandidate) return;
    try {
      const response = await fetch(
        `/api/candidates/${selectedCandidate.id}/activities`
      );
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch {
      // Silently fail for activities
    }
  };

  const parseMatchDetails = () => {
    if (!selectedCandidate) return;
    try {
      // Fetch match details from API
      fetch(`/api/candidates/${selectedCandidate.id}/match`)
        .then((res) => res.json())
        .then((data) => {
          setMatchDetails(data);
        })
        .catch(() => {
          setMatchDetails(null);
        });
    } catch {
      setMatchDetails(null);
    }
  };

  const fetchDiscTest = async () => {
    if (!selectedCandidate) return;
    try {
      const response = await fetch(
        `/api/disc?candidateId=${selectedCandidate.id}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.tests && data.tests.length > 0) {
          setDiscTest(data.tests[0]);
        } else {
          setDiscTest(null);
        }
      }
    } catch {
      setDiscTest(null);
    }
  };

  const sendDiscTest = async () => {
    if (!selectedCandidate) return;
    setIsSendingDisc(true);
    try {
      const response = await fetch("/api/disc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          tenantId: selectedCandidate.tenantId,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setDiscTest(data.test);
        toast.success("Teste DISC enviado com sucesso");
      } else {
        const error = await response.json();
        if (error.test) {
          // Test already exists
          setDiscTest(error.test);
          toast.info("Este candidato já possui um teste DISC");
        } else {
          toast.error("Erro ao enviar teste DISC");
        }
      }
    } catch {
      toast.error("Erro ao enviar teste DISC");
    } finally {
      setIsSendingDisc(false);
    }
  };

  const handleMoveStage = async () => {
    if (!selectedCandidate || !selectedStageId) return;

    setIsLoading(true);
    try {
      await moveCandidate(selectedCandidate.id, selectedStageId);
      toast.success("Candidato movido com sucesso");
    } catch {
      toast.error("Erro ao mover candidato");
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedCandidate) return null;

  const scoreColor = getMatchScoreColor(selectedCandidate.matchScore);
  const scoreLabel = getMatchScoreLabel(selectedCandidate.matchScore);
  const appliedDate = formatAppliedDate(selectedCandidate.createdAt);

  const content = (
    <>
      {/* Header */}
      <div className="flex items-start gap-4 p-6 border-b">
        <Avatar className="h-16 w-16">
          <AvatarImage
            src={selectedCandidate.photo || undefined}
            alt={selectedCandidate.name}
          />
          <AvatarFallback className="text-lg">
            {getInitials(selectedCandidate.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">{selectedCandidate.name}</h2>
              <p className="text-muted-foreground">{selectedCandidate.email}</p>
            </div>
            <Badge className={cn("ml-2", scoreColor)}>
              {selectedCandidate.matchScore ?? 0}% - {scoreLabel}
            </Badge>
          </div>

          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            {selectedCandidate.job && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                {selectedCandidate.job.title}
              </span>
            )}
            {selectedCandidate.job?.department && (
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {selectedCandidate.job.department}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
        <Select value={selectedStageId} onValueChange={setSelectedStageId}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Mover para..." />
          </SelectTrigger>
          <SelectContent>
            {stages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  {stage.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          onClick={handleMoveStage}
          disabled={
            isLoading || selectedStageId === selectedCandidate.pipelineStageId
          }
        >
          <ArrowRight className="h-4 w-4 mr-1" />
          Mover
        </Button>

        <Separator orientation="vertical" className="h-8 mx-2" />

        <Button size="sm" variant="outline">
          <Send className="h-4 w-4 mr-1" />
          Email
        </Button>

        <Button size="sm" variant="outline">
          <MessageSquare className="h-4 w-4 mr-1" />
          Nota
        </Button>

        <Button 
          size="sm" 
          variant="outline"
          onClick={sendDiscTest}
          disabled={isSendingDisc}
        >
          {isSendingDisc ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <ClipboardList className="h-4 w-4 mr-1" />
          )}
          DISC
        </Button>

        <Button size="sm" variant="destructive">
          <XCircle className="h-4 w-4 mr-1" />
          Rejeitar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <TabsList className="px-4 pt-2">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="skills">Habilidades</TabsTrigger>
          <TabsTrigger value="experience">Experiência</TabsTrigger>
          <TabsTrigger value="education">Educação</TabsTrigger>
          <TabsTrigger value="disc">DISC</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="p-4 space-y-6 m-0">
            {/* Contact Info */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Contato
              </h3>
              <div className="grid gap-2">
                {selectedCandidate.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${selectedCandidate.email}`}
                      className="text-sm hover:underline"
                    >
                      {selectedCandidate.email}
                    </a>
                  </div>
                )}
                {selectedCandidate.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${selectedCandidate.phone}`}
                      className="text-sm hover:underline"
                    >
                      {selectedCandidate.phone}
                    </a>
                  </div>
                )}
                {selectedCandidate.linkedin && (
                  <div className="flex items-center gap-3">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={selectedCandidate.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline"
                    >
                      LinkedIn
                    </a>
                  </div>
                )}
                {selectedCandidate.portfolio && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={selectedCandidate.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline"
                    >
                      Portfolio
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Candidatou-se {appliedDate}</span>
                </div>
              </div>
            </div>

            {/* Match Score Breakdown */}
            {matchDetails && (
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Análise de Compatibilidade
                </h3>
                <div className="space-y-3">
                  <ScoreBar
                    label="Habilidades"
                    score={matchDetails.skillsScore ?? 0}
                    color="bg-green-500"
                  />
                  <ScoreBar
                    label="Experiência"
                    score={matchDetails.experienceScore ?? 0}
                    color="bg-blue-500"
                  />
                  <ScoreBar
                    label="Educação"
                    score={matchDetails.educationScore ?? 0}
                    color="bg-purple-500"
                  />
                </div>

                {matchDetails.strengths && matchDetails.strengths.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                      Pontos Fortes
                    </h4>
                    <ul className="space-y-1">
                      {matchDetails.strengths.map((strength, i) => (
                        <li
                          key={i}
                          className="text-sm flex items-center gap-2"
                        >
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {matchDetails.gaps && matchDetails.gaps.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                      Pontos de Atenção
                    </h4>
                    <ul className="space-y-1">
                      {matchDetails.gaps.map((gap, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <Star className="h-3 w-3 text-amber-500" />
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Atividades
              </h3>
              <div className="space-y-3">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p>{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatAppliedDate(new Date(activity.createdAt))}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma atividade registrada
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="skills" className="p-4 m-0">
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Habilidades Identificadas
              </h3>
              <p className="text-sm text-muted-foreground">
                Dados de habilidades extraídos do currículo aparecerão aqui.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="experience" className="p-4 m-0">
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Experiência Profissional
              </h3>
              <p className="text-sm text-muted-foreground">
                Dados de experiência extraídos do currículo aparecerão aqui.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="education" className="p-4 m-0">
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Formação Acadêmica
              </h3>
              <p className="text-sm text-muted-foreground">
                Dados de educação extraídos do currículo aparecerão aqui.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="disc" className="p-4 m-0">
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Perfil Comportamental DISC
              </h3>
              
              {discTest ? (
                discTest.status === 'COMPLETED' ? (
                  <DiscProfileCard
                    primaryProfile={discTest.primaryProfile as 'D' | 'I' | 'S' | 'C'}
                    secondaryProfile={discTest.secondaryProfile as 'D' | 'I' | 'S' | 'C' | null}
                    profileCombo={discTest.profileCombo || discTest.primaryProfile || 'D'}
                    scores={{
                      D: discTest.profileD || 0,
                      I: discTest.profileI || 0,
                      S: discTest.profileS || 0,
                      C: discTest.profileC || 0,
                    }}
                  />
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Teste DISC enviado. Aguardando conclusão.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Status: {discTest.status}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nenhum teste DISC enviado para este candidato.
                  </p>
                  <Button onClick={sendDiscTest} disabled={isSendingDisc}>
                    {isSendingDisc ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Enviar Teste DISC
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notes" className="p-4 m-0">
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Notas
              </h3>
              <p className="text-sm text-muted-foreground">
                Notas adicionais sobre o candidato aparecerão aqui.
              </p>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </>
  );

  // Use Sheet on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Sheet open={isCandidateDetailOpen} onOpenChange={(open) => !open && closeCandidateDetail()}>
        <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Detalhes do Candidato</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isCandidateDetailOpen} onOpenChange={(open) => !open && closeCandidateDetail()}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhes do Candidato</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

// Helper component for score bars
function ScoreBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{score}%</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}
