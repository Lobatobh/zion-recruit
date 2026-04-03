"use client";

/**
 * Hunter AI Page - Zion Recruit
 * Unified full-page component combining Auto IA and Busca Avançada sourcing modes.
 * Provides AI-powered candidate search from the web with advanced filtering options.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
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
  ExternalLink,
  TrendingUp,
  Clock,
  Zap,
  SlidersHorizontal,
  Bot,
  RefreshCw,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  SourcedCandidate,
  SourcingSource,
  getSourceColor,
} from "@/lib/sourcing/types";
import type { Job } from "@/types/job";

// ============================================
// Props & Types
// ============================================

interface HunterAIPageProps {
  jobId?: string;
  jobTitle?: string;
}

interface HunterResponse {
  success: boolean;
  candidates: SourcedCandidate[];
  imported?: number;
  totalGenerated: number;
  durationMs: number;
  sourceStats?: SourceStat[];
  webSearchResults?: number;
  error?: string;
}

interface SourceStat {
  source: string;
  count: number;
}

type HunterPhase = "idle" | "searching" | "extracting" | "results" | "error";

// ============================================
// Source Configuration (same as hunter-ai-panel)
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

const EXPERIENCE_OPTIONS = [
  { value: "entry", label: "Entry (0-1 anos)" },
  { value: "junior", label: "Júnior (1-3 anos)" },
  { value: "mid", label: "Pleno (3-5 anos)" },
  { value: "senior", label: "Sênior (5-8 anos)" },
  { value: "lead", label: "Líder (8-10 anos)" },
  { value: "principal", label: "Principal (10+ anos)" },
];

// ============================================
// Internal: Match Score Circle
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
    <div
      className={`relative inline-flex items-center justify-center ${color.bg} rounded-full`}
    >
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
// Internal: Candidate Card
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
            <h4 className="font-semibold text-sm truncate">
              {candidate.name}
            </h4>
            {isFromWeb && (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] px-1.5 py-0">
                <Globe className="h-2.5 w-2.5 mr-0.5" />
                Real
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={`${getSourceColor(candidate.source)} text-[10px] px-1.5 py-0`}
            >
              {candidate.source === "linkedin" && (
                <Linkedin className="h-2.5 w-2.5 mr-0.5" />
              )}
              {candidate.source === "github" && (
                <Github className="h-2.5 w-2.5 mr-0.5" />
              )}
              {candidate.source === "indeed" && (
                <Briefcase className="h-2.5 w-2.5 mr-0.5" />
              )}
              {candidate.source === "ai_generated" && (
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              )}
              {candidate.source === "internal" && (
                <Search className="h-2.5 w-2.5 mr-0.5" />
              )}
              {candidate.source}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-2 truncate">
            {candidate.title}
          </p>

          {/* Skills */}
          {candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {candidate.skills.slice(0, 4).map((skill, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                >
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 4 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 text-muted-foreground"
                >
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
// Internal: Progress Phase Display
// ============================================

function ProgressPhase({
  phase,
  currentPhase,
  label,
  children,
}: {
  phase: HunterPhase;
  currentPhase: HunterPhase;
  label: string;
  children: React.ReactNode;
}) {
  const isActive = phase === currentPhase;
  const isDone =
    (currentPhase === "extracting" && phase === "searching") ||
    (currentPhase === "results" &&
      (phase === "searching" || phase === "extracting"));

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
        <p
          className={`text-sm font-medium ${
            isActive
              ? "text-violet-700"
              : isDone
                ? "text-emerald-700"
                : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
        {isActive && children}
      </div>
    </motion.div>
  );
}

// ============================================
// Internal: Job Selector
// ============================================

function JobSelector({
  jobId: propJobId,
  jobTitle: propJobTitle,
  selectedJobId,
  onJobSelect,
}: {
  jobId?: string;
  jobTitle?: string;
  selectedJobId: string | null;
  onJobSelect: (id: string) => void;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(!propJobId);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (propJobId) {
      // jobId is provided, no need to fetch
      return;
    }
    // Fetch jobs list for dropdown (loading state initialized above)
    let cancelled = false;
    const controller = new AbortController();

    fetch("/api/vacancies?limit=100", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.jobs) {
          setJobs(data.jobs);
        }
      })
      .catch((err) => {
        if (!cancelled && err.name !== "AbortError") {
          toast.error("Erro ao carregar vagas");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [propJobId]);

  // If jobId prop is provided, show read-only badge
  if (propJobId) {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Vaga:
        </Label>
        <Badge
          variant="secondary"
          className="bg-violet-100 text-violet-800 hover:bg-violet-100 px-3 py-1.5 text-sm font-medium"
        >
          <Briefcase className="h-3.5 w-3.5 mr-1.5" />
          {propJobTitle || propJobId}
        </Badge>
      </div>
    );
  }

  // Searchable dropdown
  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[300px]">
      <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        Vaga:
      </Label>
      <Select
        value={selectedJobId || ""}
        onValueChange={onJobSelect}
      >
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {loading ? (
              <Skeleton className="h-4 w-24" />
            ) : selectedJobId ? (
              <SelectValue />
            ) : (
              <span className="text-muted-foreground">Selecione uma vaga...</span>
            )}
          </div>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 border-b mb-1">
            <Input
              placeholder="Buscar vaga..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredJobs.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma vaga encontrada
              </div>
            ) : (
              filteredJobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  <div className="flex items-center gap-2">
                    <span className="truncate">{job.title}</span>
                    {job.location && (
                      <span className="text-muted-foreground text-xs flex-shrink-0">
                        · {job.location}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================
// Internal: Source Selection Cards
// ============================================

function SourceSelectionCards({
  enabledSources,
  onToggle,
}: {
  enabledSources: SourcingSource[];
  onToggle: (source: SourcingSource) => void;
}) {
  return (
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
              onClick={() => onToggle(source.id)}
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
                <p
                  className={`text-sm font-medium ${isEnabled ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {source.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {source.description}
                </p>
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
  );
}

// ============================================
// Internal: Candidate Limit Selector
// ============================================

function CandidateLimitSelector({
  limit,
  onChange,
}: {
  limit: number;
  onChange: (limit: number) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Users className="h-4 w-4 text-violet-500" />
        Quantidade de Candidatos
      </h3>
      <div className="flex gap-2">
        {CANDIDATE_LIMITS.map((l) => (
          <motion.button
            key={l}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(l)}
            className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
              limit === l
                ? "border-violet-500 bg-violet-50 text-violet-700"
                : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"
            }`}
          >
            {l}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function HunterAIPage({ jobId, jobTitle }: HunterAIPageProps) {
  // Job selection state
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    jobId || null
  );
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Mode & phases
  const [activeTab, setActiveTab] = useState("auto");
  const [phase, setPhase] = useState<HunterPhase>("idle");

  // Sources & limits
  const [enabledSources, setEnabledSources] = useState<SourcingSource[]>(
    SOURCE_OPTIONS.filter((s) => s.enabled).map((s) => s.id)
  );
  const [candidateLimit, setCandidateLimit] = useState(10);

  // Advanced search params
  const [advQuery, setAdvQuery] = useState("");
  const [advSkills, setAdvSkills] = useState("");
  const [advLocation, setAdvLocation] = useState("");
  const [advExperience, setAdvExperience] = useState("");
  const [advRemoteOnly, setAdvRemoteOnly] = useState(false);

  // Results
  const [candidates, setCandidates] = useState<SourcedCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hunterResult, setHunterResult] = useState<HunterResponse | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch job data when jobId prop is provided or selected
  const fetchJob = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/vacancies/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.job) {
          setSelectedJob(data.job);
          // Pre-fill advanced search fields
          setAdvQuery(data.job.title || "");
          setAdvLocation(data.job.location || "");
          try {
            const skills = data.job.aiParsedSkills
              ? JSON.parse(data.job.aiParsedSkills)
              : [];
            setAdvSkills(skills.join(", "));
          } catch {
            setAdvSkills("");
          }
        }
      }
    } catch {
      // Job fetch failed silently
    }
  }, []);

  // When jobId prop changes
  useEffect(() => {
    if (jobId) {
      setSelectedJobId(jobId);
      fetchJob(jobId);
    }
  }, [jobId, fetchJob]);

  // When user selects a job from dropdown
  const handleJobSelect = useCallback(
    (id: string) => {
      setSelectedJobId(id);
      fetchJob(id);
    },
    [fetchJob]
  );

  // Parsed skills from selected job
  const jobSkills = useMemo(() => {
    if (!selectedJob?.aiParsedSkills) return [];
    try {
      return JSON.parse(selectedJob.aiParsedSkills) as string[];
    } catch {
      return [];
    }
  }, [selectedJob?.aiParsedSkills]);

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

  // Reset to idle
  const resetToIdle = useCallback(() => {
    setPhase("idle");
    setCandidates([]);
    setSelectedIds(new Set());
    setHunterResult(null);
    setErrorMessage(null);
  }, []);

  // Reset and go to search config
  const newSearch = useCallback(() => {
    resetToIdle();
  }, [resetToIdle]);

  // Run Auto IA search
  const runAutoSearch = useCallback(async () => {
    if (!selectedJobId) {
      toast.error("Selecione uma vaga para a busca automática");
      return;
    }
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
      const response = await fetch("/api/sourcing/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId,
          sources: enabledSources,
          limit: candidateLimit,
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
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setPhase("error");
      setErrorMessage(msg);
      toast.error(msg);
    }
  }, [selectedJobId, enabledSources, candidateLimit]);

  // Run Advanced search
  const runAdvancedSearch = useCallback(async () => {
    if (!advQuery.trim()) {
      toast.error("Informe o termo de busca");
      return;
    }
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
      const body: Record<string, unknown> = {
        query: advQuery.trim(),
        sources: enabledSources,
        limit: candidateLimit,
      };

      if (advSkills.trim()) {
        body.skills = advSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (advLocation.trim()) {
        body.location = advLocation.trim();
      }
      if (advExperience) {
        body.experienceLevel = advExperience;
      }
      if (advRemoteOnly) {
        body.remoteOnly = true;
      }
      if (selectedJobId) {
        body.jobId = selectedJobId;
      }

      const response = await fetch("/api/sourcing/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data: HunterResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao buscar candidatos");
      }

      setPhase("extracting");
      await new Promise((resolve) => setTimeout(resolve, 800));

      setPhase("results");
      setCandidates(data.candidates);
      setHunterResult(data);

      toast.success(
        `${data.candidates.length} candidatos encontrados em ${(data.durationMs / 1000).toFixed(1)}s`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setPhase("error");
      setErrorMessage(msg);
      toast.error(msg);
    }
  }, [
    advQuery,
    advSkills,
    advLocation,
    advExperience,
    advRemoteOnly,
    enabledSources,
    candidateLimit,
    selectedJobId,
  ]);

  // Import selected candidates
  const importSelected = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos um candidato para importar");
      return;
    }
    if (!selectedJobId) {
      toast.error("Nenhuma vaga selecionada para importação");
      return;
    }

    setIsImporting(true);
    try {
      const selectedCandidates = candidates.filter((c) =>
        selectedIds.has(c.id)
      );

      const response = await fetch("/api/sourcing/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: selectedCandidates,
          jobId: selectedJobId,
          tags: ["hunter-ai"],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `${data.imported ?? selectedCandidates.length} candidato(s) importado(s) com sucesso!`
        );
      } else {
        toast.error(data.error || "Falha ao importar candidatos");
      }
    } catch {
      toast.error("Erro de conexão ao importar candidatos");
    } finally {
      setIsImporting(false);
    }
  }, [selectedIds, candidates, selectedJobId]);

  const allSelected =
    candidates.length > 0 && selectedIds.size === candidates.length;

  const isSearchingOrExtracting =
    phase === "searching" || phase === "extracting";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ============================================ */}
      {/* Header Section */}
      {/* ============================================ */}
      <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Crosshair className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Hunter AI
                <Badge className="bg-white/20 text-white hover:bg-white/20 border-white/30 text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              </h1>
              <p className="text-sm text-violet-100">
                Busca inteligente de candidatos com inteligência artificial
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Job Selector Bar */}
      {/* ============================================ */}
      <div className="border-b bg-background px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <JobSelector
            jobId={jobId}
            jobTitle={jobTitle}
            selectedJobId={selectedJobId}
            onJobSelect={handleJobSelect}
          />
        </div>
      </div>

      {/* ============================================ */}
      {/* Main Content */}
      {/* ============================================ */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col h-full"
        >
          {/* Tab bar */}
          <div className="border-b px-6 pt-4">
            <div className="max-w-6xl mx-auto">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="auto" disabled={isSearchingOrExtracting}>
                  <Bot className="h-4 w-4 mr-2" />
                  Auto IA
                </TabsTrigger>
                <TabsTrigger value="advanced" disabled={isSearchingOrExtracting}>
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Busca Avançada
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <div className="max-w-6xl mx-auto space-y-6">
                {/* ============================================ */}
                {/* Auto IA Tab */}
                {/* ============================================ */}
                <TabsContent value="auto" className="mt-0 space-y-6">
                  {/* Target Job Info Card */}
                  {selectedJob && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border p-5 bg-muted/30"
                    >
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4 text-violet-500" />
                        Vaga Alvo
                      </h3>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg">
                          {selectedJob.title}
                        </h4>
                        <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                          {selectedJob.department && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              {selectedJob.department}
                            </span>
                          )}
                          {selectedJob.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {selectedJob.location}
                            </span>
                          )}
                          {selectedJob.remote && (
                            <Badge
                              variant="outline"
                              className="text-xs gap-1"
                            >
                              <Globe className="h-3 w-3" />
                              Remoto
                            </Badge>
                          )}
                        </div>
                        {jobSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {jobSkills.slice(0, 10).map((skill: string, i: number) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {jobSkills.length > 10 && (
                              <Badge
                                variant="outline"
                                className="text-xs text-muted-foreground"
                              >
                                +{jobSkills.length - 10}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {!selectedJob && (
                    <div className="rounded-xl border border-dashed p-8 text-center bg-muted/20">
                      <Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Selecione uma vaga acima para usar a busca automática com IA
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        A IA analisará a vaga e encontrará os melhores candidatos automaticamente
                      </p>
                    </div>
                  )}

                  {/* Source Selection */}
                  <SourceSelectionCards
                    enabledSources={enabledSources}
                    onToggle={toggleSource}
                  />

                  {/* Candidate Limit */}
                  <CandidateLimitSelector
                    limit={candidateLimit}
                    onChange={setCandidateLimit}
                  />

                  <Separator />

                  {/* Launch Button (Auto mode) */}
                  {phase === "idle" && (
                    <Button
                      className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white h-12 text-base font-semibold"
                      onClick={runAutoSearch}
                      disabled={!selectedJobId || enabledSources.length === 0}
                    >
                      <Zap className="h-5 w-5 mr-2" />
                      Iniciar Busca com Hunter AI
                    </Button>
                  )}
                </TabsContent>

                {/* ============================================ */}
                {/* Advanced Search Tab */}
                {/* ============================================ */}
                <TabsContent value="advanced" className="mt-0 space-y-6">
                  {/* Query Input */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Termo de Busca</Label>
                    <Input
                      placeholder="ex: Desenvolvedor React Senior"
                      value={advQuery}
                      onChange={(e) => setAdvQuery(e.target.value)}
                    />
                  </div>

                  {/* Skills Input */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Habilidades Desejadas
                    </Label>
                    <Input
                      placeholder="ex: React, TypeScript, Node.js"
                      value={advSkills}
                      onChange={(e) => setAdvSkills(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Habilidades separadas por vírgula
                    </p>
                  </div>

                  {/* Location Input */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Localização</Label>
                    <Input
                      placeholder="ex: São Paulo, SP"
                      value={advLocation}
                      onChange={(e) => setAdvLocation(e.target.value)}
                    />
                  </div>

                  {/* Experience Level */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Nível de Experiência
                    </Label>
                    <Select value={advExperience} onValueChange={setAdvExperience}>
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer nível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer nível</SelectItem>
                        {EXPERIENCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Remote Only Toggle */}
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <Checkbox
                      id="remote-only"
                      checked={advRemoteOnly}
                      onCheckedChange={(checked) =>
                        setAdvRemoteOnly(checked === true)
                      }
                      className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                    />
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor="remote-only"
                        className="text-sm font-medium cursor-pointer"
                      >
                        <Globe className="h-4 w-4 inline mr-1 text-violet-500" />
                        Apenas candidatos remotos
                      </Label>
                    </div>
                  </div>

                  <Separator />

                  {/* Source Selection */}
                  <SourceSelectionCards
                    enabledSources={enabledSources}
                    onToggle={toggleSource}
                  />

                  {/* Candidate Limit */}
                  <CandidateLimitSelector
                    limit={candidateLimit}
                    onChange={setCandidateLimit}
                  />

                  <Separator />

                  {/* Search Button (Advanced mode) */}
                  {phase === "idle" && (
                    <Button
                      className="w-full h-12 text-base font-semibold"
                      onClick={runAdvancedSearch}
                      disabled={
                        !advQuery.trim() || enabledSources.length === 0
                      }
                    >
                      <Search className="h-5 w-5 mr-2" />
                      Buscar Candidatos
                    </Button>
                  )}
                </TabsContent>

                {/* ============================================ */}
                {/* Progress Section (shared) */}
                {/* ============================================ */}
                <AnimatePresence mode="wait">
                  {isSearchingOrExtracting && (
                    <motion.div
                      key="progress"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="rounded-xl border p-5 bg-gradient-to-br from-violet-50 to-fuchsia-50 space-y-3">
                        <ProgressPhase
                          phase="searching"
                          currentPhase={phase}
                          label="Buscando na web..."
                        >
                          <p className="text-xs text-violet-600">
                            Analisando fontes: {enabledSources.join(", ")}
                          </p>
                          <div className="mt-2 h-1.5 rounded-full bg-violet-200 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                              initial={{ width: "0%" }}
                              animate={{
                                width: phase === "extracting" ? "100%" : "60%",
                              }}
                              transition={{ duration: 2, ease: "easeInOut" }}
                            />
                          </div>
                        </ProgressPhase>

                        <ProgressPhase
                          phase="extracting"
                          currentPhase={phase}
                          label="Extraindo perfis com IA..."
                        >
                          <p className="text-xs text-violet-600">
                            Analisando {candidateLimit} perfis com inteligência
                            artificial
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

                      {/* Source badges */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {enabledSources.map((source) => (
                          <Badge
                            key={source}
                            variant="outline"
                            className="gap-1 text-xs animate-pulse"
                          >
                            {source === "linkedin" && (
                              <Linkedin className="h-3 w-3" />
                            )}
                            {source === "github" && (
                              <Github className="h-3 w-3" />
                            )}
                            {source === "indeed" && (
                              <Briefcase className="h-3 w-3" />
                            )}
                            {source === "internal" && (
                              <Globe className="h-3 w-3" />
                            )}
                            {source}
                          </Badge>
                        ))}
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          <Sparkles className="h-4 w-4 inline mr-1 text-violet-500 animate-pulse" />
                          A IA está trabalhando para encontrar os melhores
                          candidatos...
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ============================================ */}
                {/* Error State */}
                {/* ============================================ */}
                <AnimatePresence>
                  {phase === "error" && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl border border-red-200 bg-red-50 p-6 text-center"
                    >
                      <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                      <p className="text-sm font-medium text-red-700 mb-1">
                        Erro na busca de candidatos
                      </p>
                      <p className="text-xs text-red-600/80 mb-4 max-w-md mx-auto">
                        {errorMessage ||
                          "Ocorreu um erro inesperado. Tente novamente."}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetToIdle}
                        >
                          <Filter className="h-4 w-4 mr-1" />
                          Alterar Filtros
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={
                            activeTab === "auto"
                              ? runAutoSearch
                              : runAdvancedSearch
                          }
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Tentar Novamente
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ============================================ */}
                {/* Results Section */}
                {/* ============================================ */}
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
                              em{" "}
                              {(hunterResult.durationMs / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {hunterResult?.webSearchResults && (
                            <Badge
                              variant="outline"
                              className="text-xs gap-1"
                            >
                              <Globe className="h-3 w-3" />
                              {hunterResult.webSearchResults} resultados web
                            </Badge>
                          )}
                          {hunterResult?.sourceStats?.map((stat) => (
                            <Badge
                              key={stat.source}
                              variant="secondary"
                              className="text-xs"
                            >
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

                {/* ============================================ */}
                {/* Empty Results State */}
                {/* ============================================ */}
                <AnimatePresence>
                  {phase === "results" && candidates.length === 0 && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-12"
                    >
                      <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <Users className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">
                        Nenhum candidato encontrado
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                        Tente alterar as fontes de busca, ajustar os filtros ou
                        aumentar a quantidade de candidatos.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" onClick={newSearch}>
                          <Filter className="h-4 w-4 mr-2" />
                          Alterar Filtros
                        </Button>
                        <Button
                          onClick={
                            activeTab === "auto"
                              ? runAutoSearch
                              : runAdvancedSearch
                          }
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Buscar Novamente
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </ScrollArea>
        </Tabs>
      </div>

      {/* ============================================ */}
      {/* Footer (sticky bottom) */}
      {/* ============================================ */}
      {phase === "results" && candidates.length > 0 && (
        <div className="border-t bg-background px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? (
                <>
                  <span className="font-medium text-foreground">
                    {selectedIds.size}
                  </span>{" "}
                  candidato(s) selecionado(s) para importação
                </>
              ) : (
                "Selecione candidatos para importar"
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={newSearch}
                disabled={isSearchingOrExtracting}
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
                    Importar
                    {selectedIds.size > 0 && ` (${selectedIds.size})`}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
