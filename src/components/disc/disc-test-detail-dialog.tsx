"use client";

/**
 * DISC Test Detail Dialog - Zion Recruit
 * Premium redesign with gradient header, animated gauges, radar chart, and AI analysis
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  Briefcase,
  Star,
  TrendingUp,
  Loader2,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  Calendar,
  Zap,
  Shield,
  Target,
  BarChart3,
  X,
  Sparkles,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
  GraduationCap,
  ChevronRight,
  Award,
  Users,
  Building2,
  Link2,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photo: string | null;
  matchScore: number | null;
  city: string | null;
  state: string | null;
  job: {
    id: string;
    title: string;
    city: string | null;
    state: string | null;
    discProfileRequired: string | null;
  };
}

interface DiscTest {
  id: string;
  status: string;
  sentAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  profileD: number | null;
  profileI: number | null;
  profileS: number | null;
  profileC: number | null;
  primaryProfile: string | null;
  secondaryProfile: string | null;
  jobFitScore: number | null;
  jobFitDetails: string | null;
  aiAnalysis: string | null;
  aiStrengths: string | null;
  aiWeaknesses: string | null;
  aiWorkStyle: string | null;
  candidate: Candidate;
  createdAt: string;
}

interface DiscTestDetailDialogProps {
  test: DiscTest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GAUGE_COLORS: Record<string, string> = {
  D: "#EF4444",
  I: "#F59E0B",
  S: "#22C55E",
  C: "#3B82F6",
};

const GAUGE_BG: Record<string, string> = {
  D: "rgba(239, 68, 68, 0.12)",
  I: "rgba(245, 158, 11, 0.12)",
  S: "rgba(34, 197, 94, 0.12)",
  C: "rgba(59, 130, 246, 0.12)",
};

const profileColors: Record<string, { bg: string; text: string; light: string; gradient: string }> = {
  D: {
    bg: "bg-red-500",
    text: "text-red-600",
    light: "bg-red-50 dark:bg-red-900/20",
    gradient: "from-red-500 to-red-600",
  },
  I: {
    bg: "bg-amber-500",
    text: "text-amber-600",
    light: "bg-amber-50 dark:bg-amber-900/20",
    gradient: "from-amber-500 to-amber-600",
  },
  S: {
    bg: "bg-green-500",
    text: "text-green-600",
    light: "bg-green-50 dark:bg-green-900/20",
    gradient: "from-green-500 to-green-600",
  },
  C: {
    bg: "bg-blue-500",
    text: "text-blue-600",
    light: "bg-blue-50 dark:bg-blue-900/20",
    gradient: "from-blue-500 to-blue-600",
  },
};

const profileDescriptions: Record<string, { title: string; description: string; icon: typeof Zap }> = {
  D: {
    title: "Dominância",
    description: "Foco em resultados, direto, decisivo",
    icon: Zap,
  },
  I: {
    title: "Influência",
    description: "Entusiasta, otimista, colaborativo",
    icon: Star,
  },
  S: {
    title: "Estabilidade",
    description: "Paciente, confiável, busca harmonia",
    icon: Shield,
  },
  C: {
    title: "Conformidade",
    description: "Analítico, preciso, detalhista",
    icon: Target,
  },
};

const RADAR_LABELS: Record<string, string> = {
  D: "Dominância",
  I: "Influência",
  S: "Estabilidade",
  C: "Conformidade",
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; icon: typeof Clock }> = {
  PENDING: { label: "Pendente", bg: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: Clock },
  SENT: { label: "Enviado", bg: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: Send },
  STARTED: { label: "Iniciado", bg: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: Loader2 },
  COMPLETED: { label: "Concluído", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: CheckCircle },
  EXPIRED: { label: "Expirado", bg: "bg-red-500/20 text-red-300 border-red-500/30", icon: AlertCircle },
};

// ─── Animation Variants ─────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};



// ─── Sub-components ──────────────────────────────────────────────────────────

function GaugeCircle({
  score,
  factor,
  index,
}: {
  score: number;
  factor: string;
  index: number;
}) {
  const color = GAUGE_COLORS[factor];
  const bgColor = GAUGE_BG[factor];
  const desc = profileDescriptions[factor];
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      custom={index}
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center"
    >
      <div className="relative w-28 h-28 sm:w-32 sm:h-32">
        {/* Background glow */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-25"
          style={{ backgroundColor: color }}
        />
        {/* SVG gauge */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth="8"
          />
          {/* Progress arc */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{
              duration: 1.4,
              delay: index * 0.15,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl sm:text-3xl font-bold"
            style={{ color }}
          >
            {score}%
          </span>
          <span className="text-xs text-muted-foreground font-medium mt-0.5">{factor}</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="font-semibold text-sm">{desc.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc.description}</p>
      </div>
    </motion.div>
  );
}

function ScoreCircleLight({
  score,
  size = 100,
  strokeWidth = 8,
  color,
  label,
  delay = 0,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label?: string;
  delay?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-20"
        style={{ backgroundColor: color }}
      />
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted/50"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: 1.2,
            delay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}%
        </span>
        {label && (
          <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

function TimelineStep({
  icon: Icon,
  label,
  date,
  color,
  isCompleted,
  isLast,
  index,
}: {
  icon: typeof Clock;
  label: string;
  date: string;
  color: string;
  isCompleted: boolean;
  isLast: boolean;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="flex gap-4"
    >
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: index * 0.15 + 0.2,
            type: "spring",
            stiffness: 300,
          }}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg",
            isCompleted ? color : "bg-muted/50"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              isCompleted ? "text-white" : "text-muted-foreground"
            )}
          />
        </motion.div>
        {!isLast && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 40 }}
            transition={{ delay: index * 0.15 + 0.4, duration: 0.4 }}
            className="w-0.5 bg-gradient-to-b from-muted-foreground/30 to-transparent my-1"
          />
        )}
      </div>
      {/* Content */}
      <div className="pb-6">
        <p className={cn("text-sm font-medium", isCompleted ? "" : "text-muted-foreground")}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
      </div>
    </motion.div>
  );
}

function AiSkeletonCard() {
  return (
    <div className="rounded-xl border p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-md" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function DiscTestDetailDialog({
  test,
  open,
  onOpenChange,
  onUpdated,
}: DiscTestDetailDialogProps) {
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // ─── Helpers ────────────────────────────────────────────────────────────

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTestUrl = () => {
    if (!test) return "";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${baseUrl}/?view=disc-test&testId=${test.id}`;
  };

  const copyTestLink = async () => {
    const url = getTestUrl();
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência");
  };

  const sendTest = async () => {
    if (!test) return;
    setSending(true);
    try {
      const response = await fetch("/api/disc/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: test.candidate.id,
          sendEmail: true,
          sendWhatsapp: false,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao enviar teste");
      toast.success(data.message);
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar teste");
    } finally {
      setSending(false);
    }
  };

  // ─── Derived data ──────────────────────────────────────────────────────

  const scores = useMemo(
    () => ({
      D: test?.profileD || 0,
      I: test?.profileI || 0,
      S: test?.profileS || 0,
      C: test?.profileC || 0,
    }),
    [test]
  );

  const radarData = useMemo(
    () => [
      { factor: RADAR_LABELS.D, value: scores.D, fullMark: 100 },
      { factor: RADAR_LABELS.I, value: scores.I, fullMark: 100 },
      { factor: RADAR_LABELS.S, value: scores.S, fullMark: 100 },
      { factor: RADAR_LABELS.C, value: scores.C, fullMark: 100 },
    ],
    [scores]
  );

  const statusCfg = test ? STATUS_CONFIG[test.status] || STATUS_CONFIG.PENDING : STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.icon;
  const primaryColor = test?.primaryProfile ? profileColors[test.primaryProfile] : null;
  const primaryDesc = test?.primaryProfile ? profileDescriptions[test.primaryProfile] : null;
  const radarColor = primaryColor
    ? GAUGE_COLORS[test.primaryProfile!]
    : "#a855f7";

  const parsedStrengths = useMemo(() => {
    if (!test?.aiStrengths) return [];
    try {
      return JSON.parse(test.aiStrengths) as string[];
    } catch {
      return [];
    }
  }, [test?.aiStrengths]);

  const parsedWeaknesses = useMemo(() => {
    if (!test?.aiWeaknesses) return [];
    try {
      return JSON.parse(test.aiWeaknesses) as string[];
    } catch {
      return [];
    }
  }, [test?.aiWeaknesses]);

  const hasAiData = test?.aiAnalysis || test?.aiStrengths || test?.aiWeaknesses || test?.aiWorkStyle;

  // ─── Early return ───────────────────────────────────────────────────────

  if (!test) return null;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl max-h-[92vh]">
        <DialogTitle className="sr-only">
          Teste DISC - {test.candidate.name}
        </DialogTitle>

        {/* ── Gradient Header ─────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 pt-6 pb-8">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          {/* Candidate info */}
          <div className="relative flex items-start gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-white/30 shadow-xl">
              <AvatarImage src={test.candidate.photo || undefined} />
              <AvatarFallback className="text-lg bg-white/20 text-white font-semibold">
                {getInitials(test.candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">
                {test.candidate.name}
              </h2>
              <p className="text-sm text-white/70 truncate">
                {test.candidate.email}
              </p>
              <div className="flex items-center gap-3 mt-2 text-sm text-white/60">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {test.candidate.job?.title || "Sem vaga"}
                </span>
                {(test.candidate.city || test.candidate.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[test.candidate.city, test.candidate.state].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
            </div>

            {/* Status + Job Fit */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge
                variant="outline"
                className={cn("border text-xs font-medium backdrop-blur-sm", statusCfg.bg)}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusCfg.label}
              </Badge>
              {test.jobFitScore !== null && test.status === "COMPLETED" && (
                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
                  <Star className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                  <span className="text-sm font-bold text-white">{test.jobFitScore}%</span>
                  <span className="text-xs text-white/60">Job Fit</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs Content ────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab bar with subtle style */}
          <div className="px-6 pt-4 bg-muted/30 border-b">
            <TabsList className="bg-muted/60 h-10 p-1 rounded-lg">
              <TabsTrigger
                value="overview"
                className="rounded-md text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="rounded-md text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <BarChart3 className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                Perfil DISC
              </TabsTrigger>
              <TabsTrigger
                value="analysis"
                className="rounded-md text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                Análise IA
              </TabsTrigger>
              <TabsTrigger
                value="jobfit"
                className="rounded-md text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Briefcase className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                Detalhes Vaga
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="max-h-[55vh]">
            {/* ── Tab 1: Visão Geral ──────────────────────────────────────── */}
            <TabsContent value="overview" className="p-6 mt-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  {/* Status Timeline */}
                  <div className="rounded-xl border bg-card p-5">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Linha do Tempo
                    </h3>
                    <div className="ml-1">
                      <TimelineStep
                        icon={Calendar}
                        label="Teste Criado"
                        date={formatDate(test.createdAt)}
                        color="bg-gray-500"
                        isCompleted={true}
                        isLast={!test.sentAt}
                        index={0}
                      />
                      {test.sentAt && (
                        <TimelineStep
                          icon={Send}
                          label="Teste Enviado"
                          date={formatDateShort(test.sentAt)}
                          color="bg-blue-500"
                          isCompleted={true}
                          isLast={!test.startedAt}
                          index={1}
                        />
                      )}
                      {test.startedAt && (
                        <TimelineStep
                          icon={Loader2}
                          label="Teste Iniciado"
                          date={formatDateShort(test.startedAt)}
                          color="bg-amber-500"
                          isCompleted={true}
                          isLast={!test.completedAt}
                          index={2}
                        />
                      )}
                      {test.completedAt && (
                        <TimelineStep
                          icon={CheckCircle}
                          label="Teste Concluído"
                          date={formatDateShort(test.completedAt)}
                          color="bg-emerald-500"
                          isCompleted={true}
                          isLast={true}
                          index={3}
                        />
                      )}
                    </div>
                  </div>

                  {/* Test Link (PENDING / SENT) */}
                  {(test.status === "PENDING" || test.status === "SENT") && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="rounded-xl border bg-card p-5 space-y-4"
                    >
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Link do Teste
                      </h3>
                      <div className="flex gap-2">
                        <Input
                          value={getTestUrl()}
                          readOnly
                          className="text-xs font-mono bg-muted/50"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={copyTestLink}
                          className="shrink-0 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => window.open(getTestUrl(), "_blank")}
                          className="shrink-0 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={sendTest}
                          disabled={sending}
                          className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-shadow"
                        >
                          {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Mail className="h-4 w-4 mr-2" />
                          )}
                          Enviar por Email
                        </Button>
                        <Button variant="outline" disabled className="shrink-0">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">WhatsApp</span>
                          <span className="sm:hidden">WApp</span>
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Quick Stats (COMPLETED) */}
                  {test.status === "COMPLETED" && (
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      {/* Primary Profile Card */}
                      <motion.div
                        variants={fadeInUp}
                        custom={0}
                        className="rounded-xl border bg-card p-5 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Brain className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            Perfil Principal
                          </span>
                        </div>
                        {primaryColor && primaryDesc && test.primaryProfile ? (
                          <div className="flex items-center gap-4">
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{
                                delay: 0.3,
                                type: "spring",
                                stiffness: 200,
                              }}
                              className={cn(
                                "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-2xl shadow-lg",
                                primaryColor.gradient
                              )}
                            >
                              {test.primaryProfile}
                            </motion.div>
                            <div>
                              <p className="font-bold text-lg">{primaryDesc.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {primaryDesc.description}
                              </p>
                              {test.secondaryProfile && (
                                <Badge
                                  variant="outline"
                                  className="mt-1.5 text-xs"
                                >
                                  + {test.secondaryProfile}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Perfil não disponível</p>
                        )}
                      </motion.div>

                      {/* Job Fit Score Card */}
                      <motion.div
                        variants={fadeInUp}
                        custom={1}
                        className="rounded-xl border bg-card p-5 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            Job Fit Score
                          </span>
                        </div>
                        <div className="flex items-center gap-5">
                          {test.jobFitScore !== null ? (
                            <>
                              <ScoreCircleLight
                                score={test.jobFitScore}
                                size={88}
                                strokeWidth={7}
                                color={
                                  test.jobFitScore >= 70
                                    ? "#10b981"
                                    : test.jobFitScore >= 50
                                      ? "#f59e0b"
                                      : "#ef4444"
                                }
                                label="Compatibilidade"
                                delay={0.4}
                              />
                              <div>
                                <Badge
                                  className={
                                    test.jobFitScore >= 70
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                                      : test.jobFitScore >= 50
                                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
                                        : "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20"
                                  }
                                  variant="outline"
                                >
                                  {test.jobFitScore >= 70
                                    ? "Alta Compatibilidade"
                                    : test.jobFitScore >= 50
                                      ? "Compatibilidade Moderada"
                                      : "Possível Gap"}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Compatibilidade do perfil com a vaga
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-2 text-center flex-1">
                              <Briefcase className="h-8 w-8 text-muted-foreground/40 mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Análise de Job Fit não disponível
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* ── Tab 2: Perfil DISC ──────────────────────────────────────── */}
            <TabsContent value="profile" className="p-6 mt-0">
              <AnimatePresence mode="wait">
                {test.status !== "COMPLETED" ? (
                  <motion.div
                    key="profile-empty"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-5">
                      <Brain className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Perfil Indisponível</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      O perfil DISC será exibido após a conclusão do teste pelo candidato
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="profile-data"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-8"
                  >
                    {/* Gauge Circles */}
                    <div className="rounded-xl border bg-card p-6">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Distribuição dos Fatores
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {(["D", "I", "S", "C"] as const).map((factor, i) => (
                          <GaugeCircle
                            key={factor}
                            score={scores[factor]}
                            factor={factor}
                            index={i}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Radar Chart */}
                    <div className="rounded-xl border bg-card p-6">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Visualização Radar
                      </h3>
                      <div className="h-72 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                            <PolarGrid
                              stroke="hsl(var(--muted-foreground))"
                              strokeOpacity={0.15}
                            />
                            <PolarAngleAxis
                              dataKey="factor"
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 100]}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                              axisLine={false}
                            />
                            <Radar
                              name="Perfil"
                              dataKey="value"
                              stroke={radarColor}
                              fill={radarColor}
                              fillOpacity={0.2}
                              strokeWidth={2}
                              animationDuration={1200}
                              animationEasing="ease-out"
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Profile Combination */}
                    {test.primaryProfile && test.secondaryProfile && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="rounded-xl border bg-card p-6"
                      >
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          Combinação de Perfil
                        </h3>
                        <div className="flex items-center justify-center gap-4">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                            className={cn(
                              "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-2xl shadow-lg",
                              profileColors[test.primaryProfile]?.gradient
                            )}
                          >
                            {test.primaryProfile}
                          </motion.div>
                          <motion.span
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.75 }}
                            className="text-2xl font-bold text-muted-foreground"
                          >
                            +
                          </motion.span>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                            className={cn(
                              "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-2xl shadow-lg",
                              profileColors[test.secondaryProfile]?.gradient
                            )}
                          >
                            {test.secondaryProfile}
                          </motion.div>
                        </div>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1 }}
                          className="text-center mt-4 text-sm text-muted-foreground"
                        >
                          {profileDescriptions[test.primaryProfile]?.description} combinado com{" "}
                          {profileDescriptions[test.secondaryProfile]?.description}
                        </motion.p>
                      </motion.div>
                    )}

                    {/* Job Fit Details (in Profile tab) */}
                    {test.jobFitDetails && test.jobFitScore !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="rounded-xl border bg-card p-6"
                      >
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Detalhes do Job Fit
                        </h3>
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                          <ScoreCircleLight
                            score={test.jobFitScore}
                            size={96}
                            strokeWidth={7}
                            color={
                              test.jobFitScore >= 70
                                ? "#10b981"
                                : test.jobFitScore >= 50
                                  ? "#f59e0b"
                                  : "#ef4444"
                            }
                            delay={0.7}
                          />
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed flex-1">
                            {test.jobFitDetails}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* ── Tab 3: Análise IA ───────────────────────────────────────── */}
            <TabsContent value="analysis" className="p-6 mt-0">
              <AnimatePresence mode="wait">
                {test.status !== "COMPLETED" ? (
                  <motion.div
                    key="ai-empty"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-5">
                      <Sparkles className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Análise Indisponível</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      A análise da IA será gerada após a conclusão do teste
                    </p>
                  </motion.div>
                ) : !hasAiData ? (
                  <motion.div
                    key="ai-loading"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Análise IA em Processamento
                      </span>
                    </div>
                    <AiSkeletonCard />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <AiSkeletonCard />
                      <AiSkeletonCard />
                    </div>
                    <AiSkeletonCard />
                  </motion.div>
                ) : (
                  <motion.div
                    key="ai-data"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                  >
                    {/* AI General Analysis */}
                    {test.aiAnalysis && (
                      <motion.div
                        variants={fadeInUp}
                        custom={0}
                        className="rounded-xl border bg-gradient-to-br from-violet-500/[0.03] to-purple-500/[0.03] p-5"
                      >
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                            <Brain className="h-4 w-4 text-white" />
                          </div>
                          <h4 className="font-semibold">Análise Geral</h4>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {test.aiAnalysis}
                        </p>
                      </motion.div>
                    )}

                    {/* Strengths + Weaknesses */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Strengths */}
                      {parsedStrengths.length > 0 && (
                        <motion.div
                          variants={fadeInUp}
                          custom={1}
                          className="rounded-xl border bg-gradient-to-br from-emerald-500/[0.03] to-green-500/[0.03] p-5"
                        >
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-sm">
                              <ThumbsUp className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="font-semibold">Pontos Fortes</h4>
                          </div>
                          <div className="space-y-2">
                            {parsedStrengths.map((strength, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.06 }}
                                className="flex items-start gap-2.5"
                              >
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <ChevronRight className="h-3 w-3 text-emerald-500" />
                                </div>
                                <span className="text-sm text-muted-foreground">{strength}</span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Weaknesses / Development Areas */}
                      {parsedWeaknesses.length > 0 && (
                        <motion.div
                          variants={fadeInUp}
                          custom={2}
                          className="rounded-xl border bg-gradient-to-br from-amber-500/[0.03] to-yellow-500/[0.03] p-5"
                        >
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-sm">
                              <AlertTriangle className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="font-semibold">Áreas de Desenvolvimento</h4>
                          </div>
                          <div className="space-y-2">
                            {parsedWeaknesses.map((weakness, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + i * 0.06 }}
                                className="flex items-start gap-2.5"
                              >
                                <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <ChevronRight className="h-3 w-3 text-amber-500" />
                                </div>
                                <span className="text-sm text-muted-foreground">{weakness}</span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Work Style */}
                    {test.aiWorkStyle && (
                      <motion.div
                        variants={fadeInUp}
                        custom={3}
                        className="rounded-xl border bg-gradient-to-br from-sky-500/[0.03] to-blue-500/[0.03] p-5"
                      >
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm">
                            <GraduationCap className="h-4 w-4 text-white" />
                          </div>
                          <h4 className="font-semibold">Estilo de Trabalho</h4>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {test.aiWorkStyle}
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* ── Tab 4: Detalhes da Vaga ──────────────────────────────────── */}
            <TabsContent value="jobfit" className="p-6 mt-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key="jobfit"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-6"
                >
                  {/* Job Info Header */}
                  <div className="rounded-xl border bg-card p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">
                          {test.candidate.job?.title || "Vaga não atribuída"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {[
                              test.candidate.job?.city,
                              test.candidate.job?.state,
                            ]
                              .filter(Boolean)
                              .join(", ") || "Remoto"}
                          </span>
                          {test.candidate.job?.discProfileRequired && (
                            <Badge
                              variant="outline"
                              className="text-xs border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-300"
                            >
                              Perfil desejado: {test.candidate.job.discProfileRequired}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {test.status !== "COMPLETED" ? (
                    /* Pending state */
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-5">
                        <Briefcase className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                      <h3 className="font-semibold text-lg mb-1">
                        Aguardando Conclusão
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        A análise detalhada de compatibilidade com a vaga será exibida após a conclusão do teste
                      </p>
                    </div>
                  ) : test.jobFitScore === null ? (
                    /* No job fit data */
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-5">
                        <Target className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                      <h3 className="font-semibold text-lg mb-1">
                        Análise de Vaga Indisponível
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Não foi possível gerar a análise de compatibilidade. Verifique se a vaga possui perfil DISC configurado.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Job Fit Score Hero */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-xl border bg-gradient-to-br from-muted/50 to-muted/20 p-6"
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                          <ScoreCircleLight
                            score={test.jobFitScore}
                            size={120}
                            strokeWidth={9}
                            color={
                              test.jobFitScore >= 70
                                ? "#10b981"
                                : test.jobFitScore >= 50
                                  ? "#f59e0b"
                                  : "#ef4444"
                            }
                            label="Job Fit"
                            delay={0.3}
                          />
                          <div className="flex-1 text-center sm:text-left">
                            <h3 className="font-bold text-xl mb-1">
                              {test.jobFitScore >= 70
                                ? "Excelente Compatibilidade"
                                : test.jobFitScore >= 50
                                  ? "Compatibilidade Moderada"
                                  : "Compatibilidade Baixa"}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {test.jobFitScore >= 70
                                ? "O perfil comportamental do candidato apresenta alta aderência aos requisitos da vaga, indicando forte potencial de adaptação e desempenho."
                                : test.jobFitScore >= 50
                                  ? "O candidato apresenta compatibilidade parcial com a vaga. Há pontos de convergência significativos, mas podem existir desafios em algumas áreas."
                                  : "O perfil do candidato apresenta divergências relevantes em relação à vaga. Recomenda-se avaliar se os gaps são críticos para a posição."}
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Profile Comparison */}
                      {test.candidate.job?.discProfileRequired && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="rounded-xl border bg-card p-5"
                        >
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Comparação de Perfil
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Required profile */}
                            <div className="rounded-lg border p-4 bg-muted/30">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Perfil Desejado
                              </p>
                              <div className="flex items-center gap-2">
                                {test.candidate.job.discProfileRequired.split("").map((char) => {
                                  const upper = char.toUpperCase();
                                  if (["D", "I", "S", "C"].includes(upper)) {
                                    const col = profileColors[upper];
                                    return (
                                      <span
                                        key={char}
                                        className={cn(
                                          "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shadow-md",
                                          col?.gradient
                                        )}
                                      >
                                        {upper}
                                      </span>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                            {/* Actual profile */}
                            <div className="rounded-lg border p-4 bg-muted/30">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Perfil do Candidato
                              </p>
                              <div className="flex items-center gap-2">
                                {test.primaryProfile && (
                                  <>
                                    <span
                                      className={cn(
                                        "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shadow-md",
                                        profileColors[test.primaryProfile]?.gradient
                                      )}
                                    >
                                      {test.primaryProfile}
                                    </span>
                                    {test.secondaryProfile && (
                                      <span
                                        className={cn(
                                          "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shadow-md",
                                          profileColors[test.secondaryProfile]?.gradient
                                        )}
                                      >
                                        {test.secondaryProfile}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* DISC Factor Match */}
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="rounded-xl border bg-card p-5"
                      >
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Pontuação por Fator
                        </h3>
                        <div className="space-y-3">
                          {(["D", "I", "S", "C"] as const).map((factor, i) => {
                            const score = scores[factor];
                            const color = GAUGE_COLORS[factor];
                            const desc = profileDescriptions[factor];
                            return (
                              <motion.div
                                key={factor}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + i * 0.08 }}
                                className="space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs"
                                      style={{ backgroundColor: color }}
                                    >
                                      {factor}
                                    </span>
                                    <span className="text-sm font-medium">
                                      {desc.title}
                                    </span>
                                  </div>
                                  <span className="text-sm font-bold" style={{ color }}>
                                    {score}%
                                  </span>
                                </div>
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${score}%` }}
                                    transition={{
                                      duration: 0.8,
                                      delay: 0.6 + i * 0.1,
                                      ease: [0.25, 0.46, 0.45, 0.94],
                                    }}
                                  />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>

                      {/* Job Fit Details Text */}
                      {test.jobFitDetails && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          className="rounded-xl border bg-card p-5"
                        >
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Recomendações
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {test.jobFitDetails}
                          </p>
                        </motion.div>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
