"use client";

import { useEffect, useState, useCallback } from "react";
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
  MapPin,
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
  Download,
  ExternalLink,
  GraduationCap,
  Award,
  Languages,
  TrendingUp,
  AlertCircle,
  ChevronLeft,
  Edit,
  Save,
  Share2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CandidateForm } from "./candidate-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DiscProfileCard } from "@/components/disc/disc-profile-card";
import { useIsMobile } from "@/hooks/use-mobile";

// Types
interface Skill {
  name: string;
  level?: "beginner" | "intermediate" | "advanced" | "expert";
  years?: number;
}

interface Experience {
  id: string;
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  location?: string;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

interface Language {
  name: string;
  level: "basic" | "intermediate" | "advanced" | "fluent" | "native";
}

interface MatchDetails {
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  overallScore: number;
  strengths: string[];
  gaps: string[];
  recommendations?: string[];
}

interface DiscTest {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  profileD: number;
  profileI: number;
  profileS: number;
  profileC: number;
  primaryProfile: string;
  secondaryProfile: string | null;
  profileCombo: string;
  aiAnalysis?: string;
  aiStrengths?: string;
  aiWeaknesses?: string;
  aiWorkStyle?: string;
  jobFitScore?: number;
  jobFitDetails?: string;
  completedAt?: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  member?: {
    name: string;
    avatar?: string;
  } | null;
}

interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  portfolio?: string;
  photo?: string;
  status: string;
  source?: string;
  matchScore: number | null;
  matchDetails?: MatchDetails | null;
  aiSummary?: string;
  resumeUrl?: string;
  resumeText?: string;
  parsedSkills?: Skill[];
  parsedExperience?: Experience[];
  parsedEducation?: Education[];
  parsedLanguages?: Language[];
  discTest?: DiscTest | null;
  job: {
    id: string;
    title: string;
    department?: string;
    location?: string;
  };
  pipelineStage?: {
    id: string;
    name: string;
    color: string;
    order: number;
  } | null;
  createdAt: string;
  updatedAt: string;
  notes?: Array<{
    id: string;
    content: string;
    createdAt: string;
    member?: { name: string } | null;
  }>;
  activities?: Activity[];
}

interface CandidateProfilePanelProps {
  candidateId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (candidateId: string) => void;
  stages?: Array<{ id: string; name: string; color: string }>;
  onMoveStage?: (candidateId: string, stageId: string) => Promise<void>;
}

// Skill level colors
const skillLevelColors: Record<string, string> = {
  beginner: "bg-gray-100 text-gray-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
  expert: "bg-amber-100 text-amber-700",
};

const skillLevelLabels: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
  expert: "Especialista",
};

const languageLevelLabels: Record<string, string> = {
  basic: "Básico",
  intermediate: "Intermediário",
  advanced: "Avançado",
  fluent: "Fluente",
  native: "Nativo",
};

// Match score color helper
function getMatchScoreColor(score: number | null): string {
  if (score === null) return "bg-gray-100 text-gray-700";
  if (score >= 80) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (score >= 60) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
}

function getMatchScoreLabel(score: number | null): string {
  if (score === null) return "Não avaliado";
  if (score >= 80) return "Excelente match";
  if (score >= 60) return "Bom match";
  return "Match parcial";
}

// Get initials helper
function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Format date helper
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins}m atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return formatDate(date);
}

export function CandidateProfilePanel({
  candidateId,
  open,
  onClose,
  onEdit,
  stages = [],
  onMoveStage,
}: CandidateProfilePanelProps) {
  const isMobile = useIsMobile();
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);
  const [isSendingDisc, setIsSendingDisc] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Handle save profile edit
  const handleSaveEdit = async (data: any) => {
    if (!candidate) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/candidates/${candidate.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast.success("Perfil atualizado com sucesso!");
        setIsEditDialogOpen(false);
        fetchCandidate();
      } else {
        toast.error("Erro ao atualizar perfil");
      }
    } catch {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  // Share candidate profile text generator
  const getShareText = () => {
    if (!candidate) return "";
    return `Candidato: ${candidate.name}
Vaga: ${candidate.job?.title || 'N/A'}
Match: ${candidate.matchScore !== null ? `${candidate.matchScore}%` : "N/A"}
Contato: ${candidate.email}${candidate.phone ? ` | ${candidate.phone}` : ""}`;
  };

  // Handle share
  const handleShare = async () => {
    const text = getShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: `Perfil: ${candidate.name}`, text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
      toast.success("Perfil copiado!");
    }
  };

  // Fetch candidate data
  const fetchCandidate = useCallback(async () => {
    if (!candidateId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/profile`);
      if (response.ok) {
        const data = await response.json();
        setCandidate(data);
        setSelectedStageId(data.pipelineStage?.id || "");
      } else {
        toast.error("Erro ao carregar perfil do candidato");
      }
    } catch (error) {
      console.error("Error fetching candidate:", error);
      toast.error("Erro ao carregar perfil");
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    if (open && candidateId) {
      fetchCandidate();
    }
  }, [open, candidateId, fetchCandidate]);

  // Handle move stage
  const handleMoveStage = async () => {
    if (!candidate || !selectedStageId || !onMoveStage) return;
    
    setIsMoving(true);
    try {
      await onMoveStage(candidate.id, selectedStageId);
      toast.success("Candidato movido com sucesso");
      fetchCandidate();
    } catch (error) {
      toast.error("Erro ao mover candidato");
    } finally {
      setIsMoving(false);
    }
  };

  // Handle send DISC test
  const handleSendDisc = async () => {
    if (!candidate) return;
    
    setIsSendingDisc(true);
    try {
      const response = await fetch("/api/disc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
        }),
      });
      
      if (response.ok) {
        toast.success("Teste DISC enviado com sucesso");
        fetchCandidate();
      } else {
        const error = await response.json();
        if (error.test) {
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

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );

  // Content
  const Content = () => {
    if (isLoading) return <LoadingSkeleton />;
    if (!candidate) return null;

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 border-b bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                  <AvatarImage src={candidate.photo} alt={candidate.name} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                    {getInitials(candidate.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold">{candidate.name}</h2>
                    {candidate.matchScore !== null && (
                      <Badge className={cn("text-sm", getMatchScoreColor(candidate.matchScore))}>
                        {candidate.matchScore}% Match
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1">{candidate.email}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    {candidate.job && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        {candidate.job.title}
                      </span>
                    )}
                    {candidate.job?.department && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        {candidate.job.department}
                      </span>
                    )}
                  </div>
                  {candidate.pipelineStage && (
                    <div className="flex items-center gap-2 mt-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: candidate.pipelineStage.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {candidate.pipelineStage.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeitar Candidato
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {stages.length > 0 && (
                <>
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
                    disabled={isMoving || selectedStageId === candidate.pipelineStage?.id}
                  >
                    {isMoving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-1" />
                    )}
                    Mover
                  </Button>
                  <Separator orientation="vertical" className="h-8 mx-1" />
                </>
              )}
              
              {candidate.email && (
                <Button size="sm" variant="outline" asChild>
                  <a href={`mailto:${candidate.email}`}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </a>
                </Button>
              )}
              
              <Button size="sm" variant="outline">
                <MessageSquare className="h-4 w-4 mr-1" />
                Nota
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendDisc}
                disabled={isSendingDisc || candidate.discTest?.status === "COMPLETED"}
              >
                {isSendingDisc ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <ClipboardList className="h-4 w-4 mr-1" />
                )}
                DISC
              </Button>
              
              <Separator orientation="vertical" className="h-8 mx-1" />
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar Perfil
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleShare}
              >
                {shareCopied ? (
                  <CheckCircle className="h-4 w-4 mr-1 text-emerald-500" />
                ) : (
                  <Share2 className="h-4 w-4 mr-1" />
                )}
                {shareCopied ? "Copiado!" : "Compartilhar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="flex-shrink-0 border-b px-4">
              <TabsList className="h-12">
                <TabsTrigger value="overview" className="gap-1.5">
                  <Star className="h-4 w-4" />
                  <span className="hidden sm:inline">Visão Geral</span>
                </TabsTrigger>
                <TabsTrigger value="resume" className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Currículo</span>
                </TabsTrigger>
                <TabsTrigger value="disc" className="gap-1.5">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">DISC</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Docs</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Timeline</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 space-y-6 m-0">
                {/* Contact Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Contato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {candidate.email && (
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${candidate.email}`} className="text-sm hover:underline truncate">
                            {candidate.email}
                          </a>
                        </div>
                      )}
                      {candidate.phone && (
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${candidate.phone}`} className="text-sm hover:underline">
                            {candidate.phone}
                          </a>
                        </div>
                      )}
                      {candidate.linkedin && (
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <Linkedin className="h-4 w-4 text-blue-600" />
                          <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline flex items-center gap-1">
                            LinkedIn
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      {candidate.portfolio && (
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a href={candidate.portfolio} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline flex items-center gap-1">
                            Portfolio
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        Candidatou-se {formatTimeAgo(candidate.createdAt)}
                      </span>
                      {candidate.source && (
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4" />
                          via {candidate.source}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Summary */}
                {candidate.aiSummary && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Resumo IA
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {candidate.aiSummary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Match Analysis */}
                {candidate.matchDetails && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Análise de Compatibilidade
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Score Bars */}
                      <div className="space-y-3">
                        <ScoreBar
                          label="Habilidades"
                          score={candidate.matchDetails.skillsScore}
                          color="bg-emerald-500"
                        />
                        <ScoreBar
                          label="Experiência"
                          score={candidate.matchDetails.experienceScore}
                          color="bg-blue-500"
                        />
                        <ScoreBar
                          label="Educação"
                          score={candidate.matchDetails.educationScore}
                          color="bg-purple-500"
                        />
                      </div>

                      {/* Strengths */}
                      {candidate.matchDetails.strengths.length > 0 && (
                        <div className="pt-3 border-t">
                          <h4 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4" />
                            Pontos Fortes
                          </h4>
                          <ul className="space-y-1.5">
                            {candidate.matchDetails.strengths.map((strength, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Gaps */}
                      {candidate.matchDetails.gaps.length > 0 && (
                        <div className="pt-3 border-t">
                          <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4" />
                            Pontos de Atenção
                          </h4>
                          <ul className="space-y-1.5">
                            {candidate.matchDetails.gaps.map((gap, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                {gap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Quick Skills Preview */}
                {candidate.parsedSkills && candidate.parsedSkills.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Principais Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {candidate.parsedSkills.slice(0, 8).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            {skill.name}
                            {skill.level && (
                              <span className="text-xs opacity-60">
                                ({skillLevelLabels[skill.level]})
                              </span>
                            )}
                          </Badge>
                        ))}
                        {candidate.parsedSkills.length > 8 && (
                          <Badge variant="outline">
                            +{candidate.parsedSkills.length - 8} mais
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Resume Tab */}
              <TabsContent value="resume" className="p-6 space-y-6 m-0">
                {/* Skills */}
                {candidate.parsedSkills && candidate.parsedSkills.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Habilidades
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {candidate.parsedSkills.map((skill, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <span className="font-medium">{skill.name}</span>
                            {skill.level && (
                              <Badge className={skillLevelColors[skill.level]}>
                                {skillLevelLabels[skill.level]}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Experience */}
                {candidate.parsedExperience && candidate.parsedExperience.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Experiência Profissional
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
                        
                        <div className="space-y-6">
                          {candidate.parsedExperience.map((exp, i) => (
                            <div key={exp.id || i} className="relative flex gap-4">
                              {/* Timeline dot */}
                              <div className="w-4 h-4 rounded-full bg-primary border-4 border-background z-10 flex-shrink-0" />
                              
                              <div className="flex-1 pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-medium">{exp.title}</h4>
                                    <p className="text-sm text-primary">{exp.company}</p>
                                  </div>
                                  {exp.current && (
                                    <Badge variant="default" className="text-xs">Atual</Badge>
                                  )}
                                </div>
                                {exp.description && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {exp.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Education */}
                {candidate.parsedEducation && candidate.parsedEducation.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Formação Acadêmica
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {candidate.parsedEducation.map((edu, i) => (
                          <div key={edu.id || i} className="flex gap-4 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <GraduationCap className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{edu.degree}</h4>
                              {edu.field && (
                                <p className="text-sm text-muted-foreground">{edu.field}</p>
                              )}
                              <p className="text-sm text-primary mt-1">{edu.institution}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Languages */}
                {candidate.parsedLanguages && candidate.parsedLanguages.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Languages className="h-4 w-4" />
                        Idiomas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {candidate.parsedLanguages.map((lang, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <span className="font-medium">{lang.name}</span>
                            <Badge variant="outline">{languageLevelLabels[lang.level]}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Empty state */}
                {(!candidate.parsedSkills?.length && !candidate.parsedExperience?.length && !candidate.parsedEducation?.length) && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium mb-2">Nenhum dado de currículo</h3>
                    <p className="text-sm text-muted-foreground">
                      Faça upload do currículo para extrair automaticamente as informações
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* DISC Tab */}
              <TabsContent value="disc" className="p-6 space-y-6 m-0">
                {candidate.discTest ? (
                  candidate.discTest.status === "COMPLETED" ? (
                    <div className="space-y-6">
                      {/* DISC Profile Card */}
                      <DiscProfileCard
                        primaryProfile={candidate.discTest.primaryProfile as 'D' | 'I' | 'S' | 'C'}
                        secondaryProfile={candidate.discTest.secondaryProfile as 'D' | 'I' | 'S' | 'C' | null}
                        profileCombo={candidate.discTest.profileCombo || candidate.discTest.primaryProfile}
                        scores={{
                          D: candidate.discTest.profileD,
                          I: candidate.discTest.profileI,
                          S: candidate.discTest.profileS,
                          C: candidate.discTest.profileC,
                        }}
                      />

                      {/* AI Analysis */}
                      {candidate.discTest.aiAnalysis && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Análise Comportamental</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {candidate.discTest.aiAnalysis}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Strengths & Weaknesses */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        {candidate.discTest.aiStrengths && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2 text-emerald-600">
                                <CheckCircle className="h-4 w-4" />
                                Pontos Fortes
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">
                                {candidate.discTest.aiStrengths}
                              </p>
                            </CardContent>
                          </Card>
                        )}
                        {candidate.discTest.aiWeaknesses && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                                Áreas de Desenvolvimento
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">
                                {candidate.discTest.aiWeaknesses}
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Work Style */}
                      {candidate.discTest.aiWorkStyle && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Estilo de Trabalho</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              {candidate.discTest.aiWorkStyle}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Job Fit */}
                      {candidate.discTest.jobFitScore !== null && (
                        <Card className="border-primary/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-primary" />
                              Fit para a Vaga
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-4 mb-3">
                              <span className="text-3xl font-bold text-primary">
                                {candidate.discTest.jobFitScore}%
                              </span>
                              <Progress value={candidate.discTest.jobFitScore} className="flex-1" />
                            </div>
                            {candidate.discTest.jobFitDetails && (
                              <p className="text-sm text-muted-foreground">
                                {candidate.discTest.jobFitDetails}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="font-medium mb-2">Teste DISC em andamento</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Status: {candidate.discTest.status === "PENDING" ? "Aguardando" : "Em progresso"}
                      </p>
                      <Badge variant="secondary">
                        Enviado em {formatDate(candidate.discTest.completedAt || new Date())}
                      </Badge>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium mb-2">Nenhum teste DISC</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Envie um teste DISC para avaliar o perfil comportamental do candidato
                    </p>
                    <Button onClick={handleSendDisc} disabled={isSendingDisc}>
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
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="p-6 space-y-6 m-0">
                {/* Resume */}
                {candidate.resumeUrl ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Currículo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Currículo</p>
                            <p className="text-xs text-muted-foreground">
                              Enviado em {formatDate(candidate.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Ver
                            </a>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={candidate.resumeUrl} download>
                              <Download className="h-4 w-4 mr-1" />
                              Baixar
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium mb-2">Nenhum documento</h3>
                    <p className="text-sm text-muted-foreground">
                      Nenhum currículo foi enviado por este candidato
                    </p>
                  </div>
                )}

                {/* Resume Text Preview */}
                {candidate.resumeText && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Texto Extraído</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                          {candidate.resumeText}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="p-6 space-y-4 m-0">
                {candidate.activities && candidate.activities.length > 0 ? (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border" />
                    
                    <div className="space-y-4">
                      {candidate.activities.map((activity, i) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="relative flex gap-4"
                        >
                          {/* Timeline dot */}
                          <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center z-10 flex-shrink-0">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          
                          <div className="flex-1 p-4 rounded-lg bg-muted/50">
                            <p className="text-sm">{activity.description}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{formatTimeAgo(activity.createdAt)}</span>
                              {activity.member && (
                                <>
                                  <span>•</span>
                                  <span>{activity.member.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium mb-2">Sem atividades</h3>
                    <p className="text-sm text-muted-foreground">
                      Nenhuma atividade registrada para este candidato
                    </p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    );
  };

  // Render as Sheet on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
          <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col">
            <SheetHeader className="sr-only">
              <SheetTitle>Perfil do Candidato</SheetTitle>
            </SheetHeader>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 z-50"
            >
              <X className="h-5 w-5" />
            </Button>
            <Content />
          </SheetContent>
        </Sheet>

        {/* Edit Profile Dialog - Mobile */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
              <DialogDescription>
                Atualize as informações do candidato {candidate?.name}
              </DialogDescription>
            </DialogHeader>
            {candidate && (
              <div className="space-y-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name-m">Nome</Label>
                    <Input id="edit-name-m" defaultValue={candidate.name} placeholder="Nome completo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email-m">Email</Label>
                    <Input id="edit-email-m" type="email" defaultValue={candidate.email} placeholder="email@exemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone-m">Telefone</Label>
                    <Input id="edit-phone-m" defaultValue={candidate.phone || ""} placeholder="(11) 99999-9999" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-linkedin-m">LinkedIn</Label>
                    <Input id="edit-linkedin-m" defaultValue={candidate.linkedin || ""} placeholder="https://linkedin.com/in/usuario" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-portfolio-m">Portfolio</Label>
                    <Input id="edit-portfolio-m" defaultValue={candidate.portfolio || ""} placeholder="https://portfolio.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-source-m">Origem</Label>
                    <Input id="edit-source-m" defaultValue={candidate.source || ""} placeholder="LinkedIn, Indeed, Indicação..." />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>Cancelar</Button>
                  <Button onClick={async () => {
                    const name = (document.getElementById("edit-name-m") as HTMLInputElement)?.value;
                    const email = (document.getElementById("edit-email-m") as HTMLInputElement)?.value;
                    const phone = (document.getElementById("edit-phone-m") as HTMLInputElement)?.value || null;
                    const linkedin = (document.getElementById("edit-linkedin-m") as HTMLInputElement)?.value || null;
                    const portfolio = (document.getElementById("edit-portfolio-m") as HTMLInputElement)?.value || null;
                    const source = (document.getElementById("edit-source-m") as HTMLInputElement)?.value || null;
                    await handleSaveEdit({ name, email, phone, linkedin, portfolio, source });
                  }} disabled={isSaving}>
                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar</>}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl h-[90vh] p-0 flex flex-col gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Perfil do Candidato</DialogTitle>
        </DialogHeader>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-50"
        >
          <X className="h-5 w-5" />
        </Button>
        <Content />
      </DialogContent>
    </Dialog>
  );
}

// Score bar helper component
function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}%</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}
