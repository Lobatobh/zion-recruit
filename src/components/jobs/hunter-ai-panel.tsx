"use client";

/**
 * Hunter AI Panel - Zion Recruit
 * Dialog-based AI-powered candidate sourcing panel
 * Searches the web for matching candidates and ranks them by relevance
 */

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crosshair,
  Target,
  Search,
  Users,
  UserCheck,
  Download,
  Linkedin,
  Globe,
  Github,
  Briefcase,
  Sparkles,
  Check,
  Loader2,
  Mail,
  MapPin,
  AlertCircle,
  X,
  Zap,
  ExternalLink,
  TrendingUp,
  Clock,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { SourcedCandidate, getSourceColor, SourcingSource } from "@/lib/sourcing/types";
import { Job } from "@/types/job";

// ============================================
// Types
// ============================================

interface HunterResponse {
  success: boolean;
  candidates: SourcedCandidate[];
  imported?: number;
  totalGenerated: number;
  durationMs: number;
  sourceStats?: SourceStat[];
  webSearchResults?: number;
}

interface SourceStat {
  source: string;
  count: number;
}

interface HunterAIPanelProps {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

type HunterPhase = "idle" | "searching" | "extracting" | "results" | "error";

// ============================================
// Source Configuration
// ============================================

const SOURCE_OPTIONS: {
  id: SourcingSource;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  enabled: boolean;
}[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Perfis profissionais",
    icon: <Linkedin className="h-5 w-5" />,
    gradient: "from-blue-500 to-blue-600",
    enabled: true,
  },
  {
    id: "github",
    name: "GitHub",
    description: "Desenvolvedores",
    icon: <Github className="h-5 w-5" />,
    gradient: "from-gray-600 to-gray-800",
    enabled: true,
  },
  {
    id: "indeed",
    name: "Indeed",
    description: "Currículos e vagas",
    icon: <Briefcase className="h-5 w-5" />,
    gradient: "from-purple-500 to-purple-600",
    enabled: true,
  },
  {
    id: "internal",
    name: "Google Jobs",
    description: "Busca na web",
    icon: <Globe className="h-5 w-5" />,
    gradient: "from-emerald-500 to-teal-600",
    enabled: true,
  },
];

const CANDIDATE_LIMITS = [5, 10, 15, 20];

// ============================================
// Match Score Circle Component
// ============================================

function MatchScoreCircle({ score }: { score: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return { stroke: "text-emerald-500", bg: "bg-emerald-500/10" };
    if (s >= 60) return { stroke: "text-amber-500", bg: "bg-amber-500/10" };
    return { stroke: "text-red-400", bg: "bg-red-400/10" };
  };

  const color = getColor(score);

  return (
    <div className={`relative inline-flex items-center justify-center ${color.bg} rounded-full`}>
      <svg width="52" height="52" className="-rotate-90">
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-muted/30"
        />
        <motion.circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className={color.stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <span className="absolute text-xs font-bold">{score}%</span>
    </div>
  );
}

// ============================================
// Candidate Card Component
// ============================================

function CandidateCard({
  candidate,
  selected,
  onToggle,
}: {
  candidate: SourcedCandidate;
  selected: boolean;
  onToggle: () => void;
}) {
  const isFromWeb =
    candidate.source === "linkedin" ||
    candidate.source === "indeed" ||
    candidate.source === "github";

  const score = candidate.relevanceScore ?? candidate.skillsMatch ?? 50;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-0.5">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
          />
        </div>

        {/* Score */}
        <div className="flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <MatchScoreCircle score={score} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Score de compatibilidade: {score}%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm truncate">{candidate.name}</h4>
            {isFromWeb && (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] px-1.5 py-0">
                <Globe className="h-2.5 w-2.5 mr-0.5" />
                Real
              </Badge>
            )}
            <Badge variant="secondary" className={`${getSourceColor(candidate.source)} text-[10px] px-1.5 py-0`}>
              {candidate.source === "linkedin" && <Linkedin className="h-2.5 w-2.5 mr-0.5" />}
              {candidate.source === "github" && <Github className="h-2.5 w-2.5 mr-0.5" />}
              {candidate.source === "indeed" && <Briefcase className="h-2.5 w-2.5 mr-0.5" />}
              {candidate.source === "ai_generated" && <Sparkles className="h-2.5 w-2.5 mr-0.5" />}
              {candidate.source === "internal" && <Search className="h-2.5 w-2.5 mr-0.5" />}
              {candidate.source}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-2 truncate">{candidate.title}</p>

          {/* Skills */}
          {candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {candidate.skills.slice(0, 4).map((skill, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 4 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  +{candidate.skills.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Info row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {candidate.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {candidate.location}
              </span>
            )}
            {candidate.experienceYears && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {candidate.experienceYears} anos
              </span>
            )}
          </div>

          {/* Contact & links */}
          <div className="flex items-center gap-2 mt-2">
            {candidate.email && (
              <a
                href={`mailto:${candidate.email}`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="h-3 w-3" />
                {candidate.email}
              </a>
            )}
            {candidate.linkedin && (
              <a
                href={candidate.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-5 w-5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-blue-600"
                onClick={(e) => e.stopPropagation()}
              >
                <Linkedin className="h-3.5 w-3.5" />
              </a>
            )}
            {candidate.github && (
              <a
                href={candidate.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-5 w-5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <Github className="h-3.5 w-3.5" />
              </a>
            )}
            {candidate.profileUrl && !candidate.linkedin && !candidate.github && (
              <a
                href={candidate.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                Perfil
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Progress Phase Display
// ============================================

function ProgressPhase({
  phase,
  currentPhase,
}: {
  phase: HunterPhase;
  currentPhase: HunterPhase;
  label: string;
  children: React.ReactNode;
}) {
  const isActive = phase === currentPhase;
  const isDone =
    (currentPhase === "extracting" && phase === "searching") ||
    (currentPhase === "results" && (phase === "searching" || phase === "extracting"));

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        isActive ? "bg-violet-50 border border-violet-200" : ""
      }`}
    >
      <div className="flex-shrink-0">
        {isDone ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center"
          >
            <Check className="h-3.5 w-3.5 text-white" />
          </motion.div>
        ) : isActive ? (
          <Loader2 className="h-5 w-5 text-violet-600 animate-spin" />
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-muted" />
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${isActive ? "text-violet-700" : isDone ? "text-emerald-700" : "text-muted-foreground"}`}>
          {label}
        </p>
        {isActive && children}
      </div>
    </motion.div>
  );
}

// ============================================
// Main Component
// ============================================

export function HunterAIPanel({ job, open, onOpenChange, onImported }: HunterAIPanelProps) {
  // State
  const [phase, setPhase] = useState<HunterPhase>("idle");
  const [enabledSources, setEnabledSources] = useState<SourcingSource[]>(
    SOURCE_OPTIONS.filter((s) => s.enabled).map((s) => s.id)
  );
  const [candidateLimit, setCandidateLimit] = useState(10);
  const [candidates, setCandidates] = useState<SourcedCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hunterResult, setHunterResult] = useState<HunterResponse | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsed skills from job
  const jobSkills = useMemo(() => {
    try {
      return job.aiParsedSkills ? (JSON.parse(job.aiParsedSkills) as string[]) : [];
    } catch {
      return [];
    }
  }, [job.aiParsedSkills]);

  // Toggle source
  const toggleSource = useCallback((source: SourcingSource) => {
    setEnabledSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  }, []);

  // Toggle candidate selection
  const toggleCandidate = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select / deselect all
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(candidates.map((c) => c.id)));
  }, [candidates]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Run Hunter AI
  const runHunter = useCallback(async () => {
    if (enabledSources.length === 0) {
      toast.error("Selecione ao menos uma fonte de busca");
      return;
    }

    setPhase("searching");
    setCandidates([]);
    setSelectedIds(new Set());
    setHunterResult(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/sourcing/hunter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          limit: candidateLimit,
          autoImport: false,
        }),
      });

      const data: HunterResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao buscar candidatos");
      }

      // Transition through phases for visual feedback
      setPhase("extracting");

      // Brief pause to show extraction phase
      await new Promise((resolve) => setTimeout(resolve, 800));

      setPhase("results");
      setCandidates(data.candidates);
      setHunterResult(data);

      toast.success(
        `${data.candidates.length} candidatos encontrados em ${(data.durationMs / 1000).toFixed(1)}s`
      );
    } catch (err: unknown) {
      setPhase("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro desconhecido");
      toast.error(errorMessage || "Erro ao executar Hunter AI");
    }
  }, [enabledSources, job.id, candidateLimit, errorMessage]);

  // Import selected candidates
  const importSelected = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos um candidato para importar");
      return;
    }

    setIsImporting(true);
    try {
      const selectedCandidates = candidates.filter((c) => selectedIds.has(c.id));

      const response = await fetch("/api/sourcing/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: selectedCandidates,
          jobId: job.id,
          tags: ["hunter-ai"],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `${data.imported ?? selectedCandidates.length} candidato(s) importado(s) com sucesso!`
        );
        if (onImported) onImported();
      } else {
        toast.error(data.error || "Falha ao importar candidatos");
      }
    } catch {
      toast.error("Erro de conexão ao importar candidatos");
    } finally {
      setIsImporting(false);
    }
  }, [selectedIds, candidates, job.id, onImported]);

  // Reset state when dialog opens/closes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setPhase("idle");
        setCandidates([]);
        setSelectedIds(new Set());
        setHunterResult(null);
        setErrorMessage(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  const allSelected = candidates.length > 0 && selectedIds.size === candidates.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-5 rounded-t-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-xl">
              <Crosshair className="h-6 w-6" />
              Hunter AI
            </DialogTitle>
            <DialogDescription className="text-violet-100">
              Busca inteligente de candidatos com inteligência artificial
            </DialogDescription>
          </DialogHeader>

          {/* Close button */}
          <button
            onClick={() => handleOpenChange(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 max-h-[calc(92vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Target Job Section */}
            <div className="rounded-xl border p-4 bg-muted/30">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-violet-500" />
                Vaga Alvo
              </h3>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg">{job.title}</h4>
                <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                  {job.department && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      {job.department}
                    </span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </span>
                  )}
                </div>
                {jobSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {jobSkills.slice(0, 8).map((skill: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {jobSkills.length > 8 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        +{jobSkills.length - 8}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Source Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Globe className="h-4 w-4 text-violet-500" />
                Fontes de Busca
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SOURCE_OPTIONS.map((source) => {
                  const isEnabled = enabledSources.includes(source.id);
                  return (
                    <motion.button
                      key={source.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleSource(source.id)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors text-left ${
                        isEnabled
                          ? "border-violet-500 bg-violet-50"
                          : "border-transparent bg-muted/40 hover:bg-muted/60"
                      }`}
                    >
                      <div
                        className={`h-10 w-10 rounded-lg bg-gradient-to-br ${source.gradient} flex items-center justify-center text-white ${
                          !isEnabled ? "opacity-40" : ""
                        }`}
                      >
                        {source.icon}
                      </div>
                      <div className="text-center">
                        <p className={`text-sm font-medium ${isEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                          {source.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{source.description}</p>
                      </div>
                      {isEnabled && (
                        <motion.div
                          layoutId="source-check"
                          className="absolute top-2 right-2 h-4 w-4 rounded-full bg-violet-600 flex items-center justify-center"
                        >
                          <Check className="h-2.5 w-2.5 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Candidate Limit */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-500" />
                Quantidade de Candidatos
              </h3>
              <div className="flex gap-2">
                {CANDIDATE_LIMITS.map((limit) => (
                  <motion.button
                    key={limit}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCandidateLimit(limit)}
                    className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                      candidateLimit === limit
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {limit}
                  </motion.button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Progress / Loading Phases */}
            <AnimatePresence mode="wait">
              {(phase === "searching" || phase === "extracting") && (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="rounded-xl border p-5 bg-gradient-to-br from-violet-50 to-fuchsia-50 space-y-3">
                    <ProgressPhase phase="searching" currentPhase={phase} label="Buscando na web...">
                      <p className="text-xs text-violet-600">
                        Analisando fontes: {enabledSources.join(", ")}
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-violet-200 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                          initial={{ width: "0%" }}
                          animate={{ width: phase === "extracting" ? "100%" : "60%" }}
                          transition={{ duration: 2, ease: "easeInOut" }}
                        />
                      </div>
                    </ProgressPhase>

                    <ProgressPhase phase="extracting" currentPhase={phase} label="Extraindo perfis com IA...">
                      <p className="text-xs text-violet-600">
                        Analisando {candidateLimit} perfis com inteligência artificial
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-violet-200 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500"
                          initial={{ width: "0%" }}
                          animate={{ width: "80%" }}
                          transition={{ duration: 3, ease: "easeInOut" }}
                        />
                      </div>
                    </ProgressPhase>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4 inline mr-1 text-violet-500 animate-pulse" />
                      A IA está trabalhando para encontrar os melhores candidatos...
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error State */}
            <AnimatePresence>
              {phase === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-red-200 bg-red-50 p-5 text-center"
                >
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-red-700 mb-1">
                    Erro na busca de candidatos
                  </p>
                  <p className="text-xs text-red-600/80 mb-4">
                    {errorMessage || "Ocorreu um erro inesperado. Tente novamente."}
                  </p>
                  <Button variant="outline" size="sm" onClick={runHunter}>
                    <Zap className="h-4 w-4 mr-1" />
                    Tentar Novamente
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results */}
            <AnimatePresence>
              {phase === "results" && candidates.length > 0 && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Results Stats Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-violet-500" />
                      <span className="text-sm font-medium">
                        {candidates.length} candidatos encontrados
                      </span>
                      {hunterResult && (
                        <span className="text-xs text-muted-foreground">
                          em {(hunterResult.durationMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {hunterResult?.webSearchResults && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Globe className="h-3 w-3" />
                          {hunterResult.webSearchResults} resultados web
                        </Badge>
                      )}
                      {hunterResult?.sourceStats?.map((stat) => (
                        <Badge key={stat.source} variant="secondary" className="text-xs">
                          {stat.source}: {stat.count}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Select All / Deselect All */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={allSelected ? deselectAll : selectAll}
                      className="text-xs"
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      {allSelected ? "Desmarcar Todos" : "Selecionar Todos"}
                    </Button>
                    {selectedIds.size > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-0.5" />
                        {selectedIds.size} selecionado(s)
                      </Badge>
                    )}
                  </div>

                  {/* Candidate Cards Grid */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AnimatePresence>
                      {candidates.map((candidate) => (
                        <CandidateCard
                          key={candidate.id}
                          candidate={candidate}
                          selected={selectedIds.has(candidate.id)}
                          onToggle={() => toggleCandidate(candidate.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty results */}
            <AnimatePresence>
              {phase === "results" && candidates.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-10"
                >
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum candidato encontrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tente alterar as fontes de busca ou aumentar a quantidade de candidatos.
                  </p>
                  <Button variant="outline" onClick={runHunter}>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar Novamente
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        {phase === "results" && candidates.length > 0 && (
          <div className="border-t px-6 py-4 bg-muted/30 rounded-b-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedIds.size > 0 ? (
                  <>
                    <span className="font-medium text-foreground">{selectedIds.size}</span> candidato(s) selecionado(s) para importação
                  </>
                ) : (
                  "Selecione candidatos para importar"
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runHunter}
                  disabled={phase === "searching" || phase === "extracting"}
                >
                  <Search className="h-4 w-4 mr-1" />
                  Nova Busca
                </Button>
                <Button
                  size="sm"
                  onClick={importSelected}
                  disabled={selectedIds.size === 0 || isImporting}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      Importar {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Initial Launch Button */}
        {phase === "idle" && (
          <div className="border-t px-6 py-4 bg-muted/30 rounded-b-lg">
            <Button
              className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white h-11"
              onClick={runHunter}
              disabled={enabledSources.length === 0}
            >
              <Zap className="h-5 w-5 mr-2" />
              Iniciar Busca com Hunter AI
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
