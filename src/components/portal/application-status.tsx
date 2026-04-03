"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  MapPin,
  Building,
  CheckCircle2,
  Circle,
  ChevronDown,
  Clock,
  ArrowRightCircle,
  Calendar,
  Brain,
  CheckCircle2 as CheckIcon,
  XCircle,
  Info,
  Briefcase,
  Users,
  Sparkles,
  PartyPopper,
  Star,
  Target,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApplicationStatusProps {
  token: string;
}

interface Application {
  id: string;
  status: string;
  statusLabel: string;
  appliedAt: string;
  updatedAt: string;
  matchScore: number | null;
  rating: number | null;
  feedback: string | null;
  job: {
    id: string;
    title: string;
    department: string | null;
    location: string | null;
    type: string;
    workModel: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    company: { id: string; name: string; logo: string | null };
  };
  currentStage: { id: string; name: string; color: string } | null;
  timeline: Array<{
    id: string;
    name: string;
    color: string;
    order: number;
    isCurrent: boolean;
    isCompleted: boolean;
    isPending: boolean;
  }>;
  statusHistory: Array<{
    id: string;
    type: "STAGE_CHANGE" | "INTERVIEW" | "DISC_TEST" | "STATUS_CHANGE";
    title: string;
    description: string | null;
    date: string;
    metadata: Record<string, unknown> | null;
  }>;
  interviews: Array<{
    id: string;
    title: string;
    type: string;
    scheduledAt: string;
    duration: number;
    status: string;
    completedAt: string | null;
  }>;
  discTest: {
    id: string;
    status: string;
    completedAt: string | null;
    primaryProfile: string | null;
  } | null;
  progress: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WORK_MODEL_LABELS: Record<string, string> = {
  REMOTE: "Remoto",
  HYBRID: "Híbrido",
  ONSITE: "Presencial",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "CLT",
  PART_TIME: "Part-time",
  CONTRACT: "PJ",
  INTERNSHIP: "Estágio",
  FREELANCE: "Freelancer",
};

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMinutes < 1) return "agora mesmo";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
  if (diffWeeks < 5) return `há ${diffWeeks} semana${diffWeeks > 1 ? "s" : ""}`;
  return `há ${diffMonths} ${diffMonths > 1 ? "meses" : "mês"}`;
}

function formatDateBR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type FilterType = "all" | "active" | "finished";

function isApplicationFinished(app: Application): boolean {
  return ["HIRED", "REJECTED"].includes(app.status);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Small SVG ring that shows match score */
function MatchScoreRing({
  score,
  size = 44,
  strokeWidth = 4,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? "text-emerald-500"
      : score >= 60
        ? "text-amber-500"
        : "text-rose-500";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn("stroke-current", color)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <span
        className={cn(
          "absolute text-[10px] font-bold",
          color
        )}
      >
        {score}%
      </span>
    </div>
  );
}

/** Horizontal pipeline stepper (desktop) */
function PipelineStepper({
  timeline,
  progress,
}: {
  timeline: Application["timeline"];
  progress: number;
}) {
  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground min-w-[36px] text-right">
          {progress}%
        </span>
      </div>

      {/* Desktop: horizontal stepper */}
      <div className="hidden md:block">
        <div className="relative flex items-start justify-between">
          {/* Connecting line background */}
          <div className="absolute top-4 left-5 right-5 h-0.5 bg-gray-200 dark:bg-gray-700" />
          {/* Completed path line */}
          <motion.div
            className="absolute top-4 left-5 h-0.5 bg-emerald-500"
            initial={{ width: 0 }}
            animate={{
              width: timeline.length > 1
                ? `${((timeline.filter((s) => s.isCompleted || s.isCurrent).length - 1) / (timeline.length - 1)) * (100 - 10)}%`
                : "0%",
            }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          />

          {timeline.map((stage, index) => (
            <motion.div
              key={stage.id}
              className="relative flex flex-col items-center z-10"
              style={{ width: `${100 / timeline.length}%` }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.1,
                ease: "easeOut",
              }}
            >
              {/* Circle */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  stage.isCompleted
                    ? "bg-emerald-500 border-emerald-500"
                    : stage.isCurrent
                      ? "border-2 bg-white dark:bg-gray-900"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                )}
                style={
                  stage.isCurrent && stage.color
                    ? { borderColor: stage.color }
                    : undefined
                }
              >
                {stage.isCompleted ? (
                  <CheckIcon className="w-4 h-4 text-white" />
                ) : stage.isCurrent ? (
                  <motion.div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color || "#3B82F6" }}
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ) : (
                  <Circle className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                )}
              </div>

              {/* Pulse ring for current stage */}
              {stage.isCurrent && (
                <motion.div
                  className="absolute top-0 w-8 h-8 rounded-full border-2 opacity-0"
                  style={{ borderColor: stage.color || "#3B82F6" }}
                  animate={{
                    opacity: [0.6, 0],
                    scale: [1, 1.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
              )}

              {/* Stage name */}
              <span
                className={cn(
                  "text-[10px] mt-2 text-center leading-tight max-w-[80px] font-medium",
                  stage.isCurrent
                    ? "text-foreground"
                    : stage.isCompleted
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                )}
              >
                {stage.name}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile: vertical stepper */}
      <div className="md:hidden space-y-3 pl-1">
        {timeline.map((stage, index) => (
          <motion.div
            key={stage.id}
            className="relative flex items-center gap-3"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.35,
              delay: index * 0.08,
              ease: "easeOut",
            }}
          >
            {/* Connector line */}
            {index > 0 && (
              <div
                className={cn(
                  "absolute left-[11px] top-[-16px] w-0.5 h-4",
                  timeline[index - 1].isCompleted
                    ? "bg-emerald-500"
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            )}

            {/* Circle */}
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0",
                stage.isCompleted
                  ? "bg-emerald-500 border-emerald-500"
                  : stage.isCurrent
                    ? "bg-white dark:bg-gray-900"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              )}
              style={
                stage.isCurrent && stage.color
                  ? { borderColor: stage.color }
                  : undefined
              }
            >
              {stage.isCompleted ? (
                <CheckIcon className="w-3 h-3 text-white" />
              ) : stage.isCurrent ? (
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stage.color || "#3B82F6" }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ) : (
                <Circle className="w-2 h-2 text-gray-300 dark:text-gray-600" />
              )}
            </div>

            <span
              className={cn(
                "text-sm font-medium",
                stage.isCurrent
                  ? "text-foreground"
                  : stage.isCompleted
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
              )}
            >
              {stage.name}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Status history timeline item */
function HistoryEvent({
  event,
  index,
}: {
  event: Application["statusHistory"][0];
  index: number;
}) {
  const config = useMemo(() => {
    switch (event.type) {
      case "STAGE_CHANGE":
        return {
          icon: ArrowRightCircle,
          accent: "text-emerald-500",
          bgAccent: "bg-emerald-500/10",
          lineColor: "bg-emerald-300 dark:bg-emerald-700",
        };
      case "INTERVIEW":
        return {
          icon: Calendar,
          accent: "text-violet-500",
          bgAccent: "bg-violet-500/10",
          lineColor: "bg-violet-300 dark:bg-violet-700",
        };
      case "DISC_TEST":
        return {
          icon: Brain,
          accent: "text-amber-500",
          bgAccent: "bg-amber-500/10",
          lineColor: "bg-amber-300 dark:bg-amber-700",
        };
      case "STATUS_CHANGE":
        if (
          event.title.toLowerCase().includes("contratad") ||
          event.metadata?.status === "HIRED"
        ) {
          return {
            icon: CheckIcon,
            accent: "text-emerald-500",
            bgAccent: "bg-emerald-500/10",
            lineColor: "bg-emerald-300 dark:bg-emerald-700",
            isHired: true,
          };
        }
        if (
          event.title.toLowerCase().includes("não") ||
          event.metadata?.status === "REJECTED"
        ) {
          return {
            icon: XCircle,
            accent: "text-rose-500",
            bgAccent: "bg-rose-500/10",
            lineColor: "bg-rose-300 dark:bg-rose-700",
            isRejected: true,
          };
        }
        return {
          icon: Info,
          accent: "text-sky-500",
          bgAccent: "bg-sky-500/10",
          lineColor: "bg-sky-300 dark:bg-sky-700",
        };
      default:
        return {
          icon: Info,
          accent: "text-gray-500",
          bgAccent: "bg-gray-500/10",
          lineColor: "bg-gray-300 dark:bg-gray-700",
        };
    }
  }, [event]);

  const IconComp = config.icon;

  return (
    <motion.div
      className="relative flex gap-3 pb-4 last:pb-0"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
    >
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            config.bgAccent
          )}
        >
          <IconComp className={cn("w-4 h-4", config.accent)} />
        </div>
        {index < 5 && (
          <div
            className={cn(
              "w-0.5 flex-1 mt-1",
              config.lineColor,
              "opacity-50"
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pt-1 pb-1">
        <p className="text-sm font-medium text-foreground">{event.title}</p>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {event.description}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelativeDate(event.date)}
        </p>
      </div>
    </motion.div>
  );
}

/** Celebratory HIRED card */
function HiredCelebrationCard({
  jobTitle,
  companyName,
}: {
  jobTitle: string;
  companyName: string;
}) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, type: "spring" }}
    >
      {/* Sparkle particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-white/60"
          style={{
            top: `${15 + (i % 3) * 30}%`,
            left: `${10 + (i % 4) * 25}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
            y: [0, -20, -40],
          }}
          transition={{
            duration: 2.5,
            delay: i * 0.3,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      <div className="relative z-10 flex items-center gap-3 mb-3">
        <motion.div
          className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <PartyPopper className="w-7 h-7" />
        </motion.div>
        <div>
          <h3 className="text-xl font-bold">Parabéns! Você foi contratado!</h3>
          <p className="text-white/80 text-sm">{companyName}</p>
        </div>
      </div>

      <p className="text-white/90 text-sm leading-relaxed">
        Você foi selecionado(a) para a vaga de{" "}
        <span className="font-semibold">{jobTitle}</span>. A equipe está muito
        feliz com a sua contratação!
      </p>

      <div className="flex items-center gap-2 mt-4">
        <Sparkles className="w-4 h-4" />
        <Star className="w-4 h-4 fill-current" />
        <Star className="w-4 h-4 fill-current" />
        <Star className="w-4 h-4 fill-current" />
        <Star className="w-4 h-4 fill-current" />
      </div>
    </motion.div>
  );
}

/** Gentle rejection card */
function RejectionCard({ jobTitle }: { jobTitle: string }) {
  return (
    <motion.div
      className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center flex-shrink-0">
          <XCircle className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <h3 className="font-semibold text-rose-700 dark:text-rose-400">
            Não foi desta vez
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Infelizmente, nesta oportunidade optamos por outro candidato(a) para
            a vaga de <span className="font-medium">{jobTitle}</span>. No
            entanto, seu perfil permanecerá em nosso banco de talentos para
            futuras oportunidades.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function ApplicationSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 flex-1 rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ApplicationStatus({ token }: ApplicationStatusProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [token]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/portal/applications", {
        headers: { "x-portal-token": token },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setApplications(data.applications);
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = useMemo(() => {
    switch (filter) {
      case "active":
        return applications.filter((a) => !isApplicationFinished(a));
      case "finished":
        return applications.filter((a) => isApplicationFinished(a));
      default:
        return applications;
    }
  }, [applications, filter]);

  const activeCount = applications.filter(
    (a) => !isApplicationFinished(a)
  ).length;
  const finishedCount = applications.filter((a) =>
    isApplicationFinished(a)
  ).length;

  // ── Empty state ──
  if (!loading && applications.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardContent className="py-16 text-center">
            <motion.div
              className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <FileText className="w-8 h-8 text-muted-foreground" />
            </motion.div>
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma candidatura ainda
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Confira nossas vagas disponíveis e candidate-se!
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Minhas Candidaturas</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe o progresso de suas candidaturas
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-3 py-1 text-sm"
        >
          {applications.length} candidatura{applications.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2">
        {(
          [
            { key: "all", label: "Todas" },
            { key: "active", label: "Em Andamento", count: activeCount },
            { key: "finished", label: "Finalizadas", count: finishedCount },
          ] as const
        ).map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full text-xs",
              filter === f.key &&
                "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.count !== undefined && (
              <span className="ml-1.5 opacity-70">({f.count})</span>
            )}
          </Button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <ApplicationSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Application cards */}
      <AnimatePresence mode="wait">
        {!loading && filteredApplications.length === 0 && (
          <motion.div
            key="empty-filter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">
                  Nenhuma candidatura{" "}
                  {filter === "active" ? "em andamento" : "finalizada"}.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!loading &&
          filteredApplications.map((app, appIndex) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{
                duration: 0.4,
                delay: appIndex * 0.08,
                ease: "easeOut",
              }}
            >
              <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 sm:p-6 space-y-5">
                  {/* ── Application Header ── */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="text-lg font-bold leading-tight truncate">
                        {app.job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5" />
                          {app.job.company.name}
                        </span>
                        {app.job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {app.job.location}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Candidatado em {formatDateBR(app.appliedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {app.matchScore !== null && (
                        <MatchScoreRing score={app.matchScore} />
                      )}
                      {app.currentStage && (
                        <Badge
                          className="text-white border-0"
                          style={{
                            backgroundColor: app.currentStage.color || "#6B7280",
                          }}
                        >
                          {app.currentStage.name}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* ── HIRED Celebration ── */}
                  {app.status === "HIRED" && (
                    <HiredCelebrationCard
                      jobTitle={app.job.title}
                      companyName={app.job.company.name}
                    />
                  )}

                  {/* ── Rejection Card ── */}
                  {app.status === "REJECTED" && (
                    <RejectionCard jobTitle={app.job.title} />
                  )}

                  {/* ── Pipeline Progress ── */}
                  {app.timeline.length > 0 && (
                    <div className="rounded-xl bg-muted/40 p-4">
                      <PipelineStepper
                        timeline={app.timeline}
                        progress={app.progress}
                      />
                    </div>
                  )}

                  {/* ── Status History (collapsible) ── */}
                  {app.statusHistory.length > 0 && (
                    <Collapsible
                      open={expandedHistory === app.id}
                      onOpenChange={(open) =>
                        setExpandedHistory(open ? app.id : null)
                      }
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
                        <span className="text-sm font-semibold flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          Histórico de Atualizações
                        </span>
                        <motion.div
                          animate={{
                            rotate: expandedHistory === app.id ? 180 : 0,
                          }}
                          transition={{ duration: 0.25 }}
                        >
                          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </motion.div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="space-y-0 max-h-80 overflow-y-auto pl-1 custom-scrollbar">
                          {app.statusHistory.map((event, idx) => (
                            <HistoryEvent
                              key={event.id}
                              event={event}
                              index={idx}
                            />
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  <Separator />

                  {/* ── Quick Info Grid ── */}
                  <div className="grid grid-cols-2 gap-3">
                    {app.currentStage && (
                      <InfoPill
                        icon={Target}
                        label="Etapa Atual"
                        value={app.currentStage.name}
                        color="text-emerald-600 dark:text-emerald-400"
                        bgColor="bg-emerald-50 dark:bg-emerald-950"
                      />
                    )}
                    {app.job.workModel && (
                      <InfoPill
                        icon={Users}
                        label="Modelo"
                        value={
                          WORK_MODEL_LABELS[app.job.workModel] ||
                          app.job.workModel
                        }
                        color="text-violet-600 dark:text-violet-400"
                        bgColor="bg-violet-50 dark:bg-violet-950"
                      />
                    )}
                    {app.job.type && (
                      <InfoPill
                        icon={Briefcase}
                        label="Tipo"
                        value={
                          JOB_TYPE_LABELS[app.job.type] || app.job.type
                        }
                        color="text-sky-600 dark:text-sky-400"
                        bgColor="bg-sky-50 dark:bg-sky-950"
                      />
                    )}
                    {app.job.salaryMin && app.job.salaryMax ? (
                      <InfoPill
                        icon={Star}
                        label="Salário"
                        value={`${formatCurrency(app.job.salaryMin)} - ${formatCurrency(app.job.salaryMax)}`}
                        color="text-amber-600 dark:text-amber-400"
                        bgColor="bg-amber-50 dark:bg-amber-950"
                      />
                    ) : (
                      <InfoPill
                        icon={Star}
                        label="Salário"
                        value="A combinar"
                        color="text-amber-600 dark:text-amber-400"
                        bgColor="bg-amber-50 dark:bg-amber-950"
                      />
                    )}
                  </div>

                  {/* ── Action Buttons ── */}
                  {(app.discTest?.status === "PENDING" ||
                    app.discTest?.status === "SENT" ||
                    app.discTest?.status === "STARTED" ||
                    (app.interviews.length > 0 &&
                      app.interviews.some(
                        (i) => i.status === "SCHEDULED" || i.status === "CONFIRMED"
                      ))) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {app.discTest &&
                        ["PENDING", "SENT", "STARTED"].includes(
                          app.discTest.status
                        ) && (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                          >
                            <Brain className="w-4 h-4 mr-1.5" />
                            Realizar Teste DISC
                          </Button>
                        )}
                      {app.interviews
                        .filter(
                          (i) =>
                            i.status === "SCHEDULED" ||
                            i.status === "CONFIRMED"
                        )
                        .map((interview) => (
                          <Button
                            key={interview.id}
                            size="sm"
                            variant="outline"
                            className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950"
                          >
                            <Calendar className="w-4 h-4 mr-1.5" />
                            Ver Entrevista
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Info Pill ───────────────────────────────────────────────────────────────

function InfoPill({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-3.5 py-2.5 flex items-center gap-2.5",
        bgColor
      )}
    >
      <Icon className={cn("w-4 h-4 flex-shrink-0", color)} />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground leading-none">
          {label}
        </p>
        <p className={cn("text-sm font-semibold truncate mt-0.5", color)}>
          {value}
        </p>
      </div>
    </div>
  );
}
