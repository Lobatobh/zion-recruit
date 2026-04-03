"use client";

/**
 * DISC Report View — Zion Recruit
 * Premium full report view shown after completing the DISC test.
 * Comprehensive candidate profile with AI analysis, score visualizations,
 * and detailed behavioral insights. All text in pt-BR.
 */

import { useState, useMemo, lazy, Suspense, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Printer,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Users,
  MessageSquare,
  Crown,
  Sparkles,
  Target,
  Zap,
  Heart,
  Activity,
  Lightbulb,
  BookOpen,
  FileText,
  ChevronRight,
  XCircle,
  GraduationCap,
  ListChecks,
  Flame,
  Timer,
} from "lucide-react";
import {
  getProfileDescription,
  getComboProfile,
  getFactorColors,
} from "@/lib/disc/profiles";
import { DISCFactor } from "@/lib/disc/questions";

// Lazy-load Recharts to avoid SSR issues
const LazyRadarChart = lazy(() =>
  import("recharts").then((mod) => ({
    default: mod.RadarChart,
  }))
);
const LazyPolarGrid = lazy(() =>
  import("recharts").then((mod) => ({ default: mod.PolarGrid }))
);
const LazyPolarAngleAxis = lazy(() =>
  import("recharts").then((mod) => ({ default: mod.PolarAngleAxis }))
);
const LazyPolarRadiusAxis = lazy(() =>
  import("recharts").then((mod) => ({ default: mod.PolarRadiusAxis }))
);
const LazyRadar = lazy(() =>
  import("recharts").then((mod) => ({ default: mod.Radar }))
);
const LazyResponsiveContainer = lazy(() =>
  import("recharts").then((mod) => ({ default: mod.ResponsiveContainer }))
);

// ============================================
// Types
// ============================================

interface DiscReportViewProps {
  testId: string;
  candidate: {
    name: string;
    email: string;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    job?: { title: string } | null;
  };
  scores: { D: number; I: number; S: number; C: number };
  primaryProfile: "D" | "I" | "S" | "C";
  secondaryProfile: "D" | "I" | "S" | "C" | null;
  profileCombo: string;
  aiAnalysis?: string | null;
  aiStrengths?: string | null;
  aiWeaknesses?: string | null;
  aiWorkStyle?: string | null;
  jobFitScore?: number | null;
  jobFitDetails?: string | null;
  completedAt?: string | null;
  sentAt?: string | null;
}

interface ParsedWorkStyle {
  alerts?: string[];
  developmentPlan?: string[];
  teamDynamics?: string;
  stressTriggers?: string[];
  motivationalFactors?: string[];
  communicationTips?: string;
  leadershipStyle?: string;
  workStyle?: string;
}

// ============================================
// Constants
// ============================================

const DISC_COLOR_MAP: Record<string, string> = {
  D: "#EF4444",
  I: "#F59E0B",
  S: "#22C55E",
  C: "#3B82F6",
};

const DISC_LABEL_MAP: Record<string, string> = {
  D: "Dominância",
  I: "Influência",
  S: "Estabilidade",
  C: "Conformidade",
};

const DISC_PROFILE_NAME_MAP: Record<string, string> = {
  D: "Dominância — O Dominador",
  I: "Influência — O Persuasor",
  S: "Estabilidade — O Apoiador",
  C: "Conformidade — O Analista",
};

const DISC_ICON_MAP: Record<string, typeof Zap> = {
  D: Zap,
  I: Star,
  S: Shield,
  C: Target,
};

// ============================================
// Helper Functions
// ============================================

function getJobFitColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

function getJobFitLabel(score: number): string {
  if (score >= 70) return "Alta Compatibilidade";
  if (score >= 50) return "Compatibilidade Moderada";
  return "Possível Gap";
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function parseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getFullAddress(candidate: DiscReportViewProps["candidate"]): string {
  const parts = [candidate.city, candidate.state, candidate.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

// ============================================
// Animation Variants
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

// ============================================
// Sub-components
// ============================================

/** Animated SVG circular gauge for DISC factor scores */
function DiscGauge({
  score,
  factor,
  size = 130,
  strokeWidth = 9,
  delay = 0,
}: {
  score: number;
  factor: string;
  size?: number;
  strokeWidth?: number;
  delay?: number;
}) {
  const color = DISC_COLOR_MAP[factor];
  const label = DISC_LABEL_MAP[factor];
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const Icon = DISC_ICON_MAP[factor];

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 200 }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow background */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-20"
          style={{ backgroundColor: color }}
        />
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />
          {/* Animated progress circle */}
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
              duration: 1.4,
              delay: delay + 0.2,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="h-4 w-4 mb-1" style={{ color }} />
          <span className="text-2xl font-bold tabular-nums" style={{ color }}>
            {score}%
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">
            {factor}
          </span>
        </div>
      </div>
      <p className="text-xs font-semibold text-muted-foreground text-center">{label}</p>
    </motion.div>
  );
}

/** Animated SVG circular score gauge for Job Fit */
function JobFitGauge({
  score,
  size = 150,
  strokeWidth = 12,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const color = getJobFitColor(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-20"
        style={{ backgroundColor: color }}
      />
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="jfg-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
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
          transition={{ duration: 1.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          filter="url(#jfg-glow)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold tabular-nums"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
        >
          {score}%
        </motion.span>
      </div>
    </div>
  );
}

/** Horizontal gradient score bar */
function ScoreBar({
  factor,
  score,
  delay = 0,
}: {
  factor: string;
  score: number;
  delay?: number;
}) {
  const color = DISC_COLOR_MAP[factor];
  const label = DISC_LABEL_MAP[factor];

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: color }}
          >
            {factor}
          </div>
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>
          {score}%
        </span>
      </div>
      <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          className="h-full rounded-full relative"
          style={{
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ delay: delay + 0.3, duration: 1, ease: "easeOut" }}
        >
          {/* Inner shine */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
        </motion.div>
      </div>
    </motion.div>
  );
}

/** Radar chart with fallback skeleton */
function ReportRadarChart({
  data,
  primaryColor,
}: {
  data: { factor: string; valor: number; fullMark: number }[];
  primaryColor: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="h-[320px] flex items-center justify-center">
          <Skeleton className="h-64 w-64 rounded-full" />
        </div>
      }
    >
      <div className="h-[320px]">
        <LazyResponsiveContainer width="100%" height="100%">
          <LazyRadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
            <defs>
              <linearGradient id="rptRadarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={primaryColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.15} />
              </linearGradient>
              <filter id="rptRadarGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <LazyPolarGrid stroke="currentColor" className="text-muted/30" strokeDasharray="3 3" />
            <LazyPolarAngleAxis
              dataKey="factor"
              tick={{ fill: "#71717a", fontSize: 12, fontWeight: 600 }}
            />
            <LazyPolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: "#a1a1aa" }}
              axisLine={false}
            />
            <LazyRadar
              name="Perfil"
              dataKey="valor"
              stroke={primaryColor}
              fill="url(#rptRadarGrad)"
              strokeWidth={2.5}
              filter="url(#rptRadarGlow)"
              dot={{
                r: 5,
                fill: primaryColor,
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </LazyRadarChart>
        </LazyResponsiveContainer>
      </div>
    </Suspense>
  );
}

/** Section wrapper with animated entrance */
function ReportSection({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Main Component
// ============================================

export function DiscReportView({
  testId,
  candidate,
  scores,
  primaryProfile,
  secondaryProfile,
  profileCombo,
  aiAnalysis,
  aiStrengths,
  aiWeaknesses,
  aiWorkStyle,
  jobFitScore,
  jobFitDetails,
  completedAt,
  sentAt,
}: DiscReportViewProps) {
  // ─── Parsed data ─────────────────────────────────────────────
  const primaryDesc = getProfileDescription(primaryProfile);
  const comboDesc = getComboProfile(profileCombo);
  const colors = getFactorColors();
  const primaryColor = primaryDesc.color;
  const secondaryColor = secondaryProfile
    ? getProfileDescription(secondaryProfile).color
    : primaryColor;

  const strengths: string[] = useMemo(
    () => parseJSON<string[]>(aiStrengths, primaryDesc.strengths.slice(0, 6)),
    [aiStrengths, primaryDesc.strengths]
  );

  const weaknesses: string[] = useMemo(
    () => parseJSON<string[]>(aiWeaknesses, primaryDesc.weaknesses.slice(0, 5)),
    [aiWeaknesses, primaryDesc.weaknesses]
  );

  const workStyle: ParsedWorkStyle = useMemo(
    () => parseJSON<ParsedWorkStyle>(aiWorkStyle, {}),
    [aiWorkStyle]
  );

  const radarData = useMemo(
    () => [
      { factor: "D", valor: scores.D, fullMark: 100 },
      { factor: "I", valor: scores.I, fullMark: 100 },
      { factor: "S", valor: scores.S, fullMark: 100 },
      { factor: "C", valor: scores.C, fullMark: 100 },
    ],
    [scores]
  );

  const sortedFactors = useMemo(() => {
    return (["D", "I", "S", "C"] as const)
      .map((f) => ({ factor: f, score: scores[f] }))
      .sort((a, b) => b.score - a.score);
  }, [scores]);

  // ─── Handlers ────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ─── Active tabs ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");

  // ─── Determine which tabs have content ───────────────────────
  const hasAlerts = (workStyle.alerts?.length ?? 0) > 0;
  const hasDevPlan = (workStyle.developmentPlan?.length ?? 0) > 0;
  const hasTeamDynamics = !!workStyle.teamDynamics;
  const hasStressMotivation =
    (workStyle.stressTriggers?.length ?? 0) > 0 ||
    (workStyle.motivationalFactors?.length ?? 0) > 0;
  const hasCommunicationTips = !!workStyle.communicationTips;
  const hasLeadershipStyle = !!workStyle.leadershipStyle;
  const hasJobFit = jobFitScore !== null && jobFitScore !== undefined;

  return (
    <div className="space-y-8" id="disc-report">
      {/* ====== PRINT BUTTON (hidden in print) ====== */}
      <div className="flex justify-end print:hidden">
        <Button
          variant="outline"
          onClick={handlePrint}
          className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
        >
          <Printer className="h-4 w-4" />
          Imprimir Relatório
        </Button>
      </div>

      {/* ====== 1. REPORT HEADER — Candidate Info Card ====== */}
      <ReportSection delay={0}>
        <Card className="overflow-hidden border-0 shadow-lg print:shadow-none">
          {/* Violet gradient top accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500" />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-5">
              {/* Avatar */}
              <Avatar className="h-20 w-20 ring-3 ring-violet-200 shadow-lg shrink-0 print:ring-1">
                <AvatarFallback className="text-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold">
                  {getInitials(candidate.name)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {candidate.name}
                </h1>

                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                  {/* Email */}
                  {candidate.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-violet-500" />
                      {candidate.email}
                    </span>
                  )}
                  {/* Phone */}
                  {candidate.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-violet-500" />
                      {candidate.phone}
                    </span>
                  )}
                  {/* Location */}
                  {getFullAddress(candidate) !== "—" && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-violet-500" />
                      {getFullAddress(candidate)}
                    </span>
                  )}
                  {/* Job title */}
                  {candidate.job?.title && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-violet-500" />
                      {candidate.job.title}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  {completedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Concluído em: {formatDate(completedAt)}
                    </span>
                  )}
                  {sentAt && (
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      Enviado em: {formatDate(sentAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Report badge */}
              <div className="shrink-0 print:hidden">
                <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 px-4 py-1.5 text-xs font-semibold shadow-md">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Relatório DISC
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </ReportSection>

      {/* ====== 2. PROFILE HERO ====== */}
      <ReportSection delay={0.1}>
        <Card className="overflow-hidden border-0 shadow-lg print:shadow-none">
          {/* Gradient top bar */}
          <div
            className="h-2 w-full"
            style={{
              background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
            }}
          />
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Large animated profile badge */}
              <motion.div
                className="relative flex-shrink-0"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, duration: 0.7, type: "spring", stiffness: 150 }}
              >
                {/* Outer glow ring */}
                <div
                  className="absolute -inset-4 rounded-full opacity-20 blur-xl"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                />
                {/* Main circle */}
                <div
                  className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                >
                  <span className="text-white text-4xl sm:text-5xl font-black tracking-tight">
                    {profileCombo}
                  </span>
                </div>
                {/* Sparkle */}
                <motion.div
                  className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: "spring" }}
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </motion.div>
              </motion.div>

              {/* Profile info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                  <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: primaryColor }}>
                    {DISC_PROFILE_NAME_MAP[primaryProfile]}
                  </h2>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
                  {comboDesc?.name || primaryDesc.title}
                </p>
                <p className="text-sm text-muted-foreground/80 mt-2 leading-relaxed max-w-2xl">
                  {comboDesc?.description || primaryDesc.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                  <Badge
                    className="text-xs font-semibold border"
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor,
                      borderColor: `${primaryColor}40`,
                    }}
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Primário: {primaryProfile}
                  </Badge>
                  {secondaryProfile && (
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold"
                      style={{
                        borderColor: `${secondaryColor}60`,
                        color: secondaryColor,
                      }}
                    >
                      Secundário: {secondaryProfile}
                    </Badge>
                  )}
                  {hasJobFit && (
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold"
                      style={{
                        borderColor: `${getJobFitColor(jobFitScore!)}40`,
                        color: getJobFitColor(jobFitScore!),
                      }}
                    >
                      <Target className="h-3 w-3 mr-1" />
                      Job Fit: {jobFitScore}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </ReportSection>

      {/* ====== 3. SCORE VISUALIZATION ====== */}
      <ReportSection delay={0.2}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Circular Gauges Card */}
          <Card className="shadow-md print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-violet-600" />
                Pontuação dos Fatores DISC
              </CardTitle>
              <CardDescription>Distribuição percentual de cada fator comportamental</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 sm:gap-6 py-2">
                {(["D", "I", "S", "C"] as const).map((factor, i) => (
                  <DiscGauge
                    key={factor}
                    score={scores[factor]}
                    factor={factor}
                    size={100}
                    strokeWidth={8}
                    delay={0.3 + i * 0.12}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Radar Chart Card */}
          <Card className="shadow-md print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4 text-violet-600" />
                Visualização Radar
              </CardTitle>
              <CardDescription>Mapa comportamental completo do perfil</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportRadarChart data={radarData} primaryColor={primaryColor} />
            </CardContent>
          </Card>
        </div>

        {/* Horizontal Gradient Bars */}
        <Card className="shadow-md print:shadow-none mt-6">
          <CardContent className="p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              {sortedFactors.map((item, idx) => (
                <ScoreBar
                  key={item.factor}
                  factor={item.factor}
                  score={item.score}
                  delay={0.4 + idx * 0.1}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </ReportSection>

      {/* ====== 4. TAB SECTIONS ====== */}
      <ReportSection delay={0.3}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Scrollable tab list */}
          <div className="print:hidden">
            <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/60 p-1.5 rounded-xl">
              <TabsTrigger
                value="overview"
                className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-2"
              >
                <Brain className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="strengths"
                className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-2"
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                Pontos Fortes
              </TabsTrigger>
              <TabsTrigger
                value="weaknesses"
                className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-2"
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                Áreas de Desenvolvimento
              </TabsTrigger>
              {hasAlerts && (
                <TabsTrigger
                  value="alerts"
                  className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-2"
                >
                  <Flame className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                  Alertas
                </TabsTrigger>
              )}
              {hasDevPlan && (
                <TabsTrigger
                  value="devplan"
                  className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-2"
                >
                  <ListChecks className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                  Plano de Desenvolvimento
                </TabsTrigger>
              )}
              {hasTeamDynamics && (
                <TabsTrigger
                  value="team"
                  className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-2"
                >
                  <Users className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                  Dinâmica em Equipe
                </TabsTrigger>
              )}
              {hasStressMotivation && (
                <TabsTrigger
                  value="stress"
                  className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-2"
                >
                  <Flame className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                  Estresse e Motivação
                </TabsTrigger>
              )}
              {hasCommunicationTips && (
                <TabsTrigger
                  value="communication"
                  className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-2"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                  Comunicação
                </TabsTrigger>
              )}
              {hasLeadershipStyle && (
                <TabsTrigger
                  value="leadership"
                  className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-2"
                >
                  <Crown className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                  Liderança
                </TabsTrigger>
              )}
              {hasJobFit && (
                <TabsTrigger
                  value="jobfit"
                  className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-2"
                >
                  <Briefcase className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                  Job Fit
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* ── Tab: Visão Geral ──────────────────────────────── */}
          <TabsContent value="overview" className="mt-6">
            <Card className="shadow-md print:shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-violet-600" />
                  Visão Geral do Perfil
                </CardTitle>
                <CardDescription>
                  Análise comportamental completa baseada nos fatores DISC
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Executive Summary */}
                <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200/50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <h4 className="font-semibold text-sm text-violet-900">Resumo Executivo</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/85">
                    {aiAnalysis || primaryDesc.description}
                  </p>
                </div>

                {/* Combo Profile Description */}
                {comboDesc && (
                  <div className="rounded-xl border p-5 space-y-3 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}15` }}
                      >
                        <Crown className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                      </div>
                      <h4 className="font-semibold text-sm">
                        Perfil Combinado: {comboDesc.code} — {comboDesc.name}
                      </h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {comboDesc.description}
                    </p>
                    {comboDesc.characteristics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {comboDesc.characteristics.map((char, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs font-medium"
                            style={{ borderColor: `${primaryColor}30`, color: primaryColor }}
                          >
                            {char}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {comboDesc.idealRoles.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Cargos Ideais
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {comboDesc.idealRoles.map((role, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs font-medium bg-blue-500/10 text-blue-700 border-blue-500/20"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Leadership & Decision Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Crown className="h-4 w-4 text-violet-600" />
                      </div>
                      <h4 className="font-semibold text-sm">Estilo de Liderança</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {workStyle.leadershipStyle || primaryDesc.leadershipStyle}
                    </p>
                  </div>
                  <div className="rounded-xl border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Brain className="h-4 w-4 text-purple-600" />
                      </div>
                      <h4 className="font-semibold text-sm">Tomada de Decisão</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {primaryDesc.decisionMaking}
                    </p>
                  </div>
                </div>

                {/* Ideal Environment */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-emerald-500" />
                    <h4 className="font-semibold text-sm">Ambiente Ideal</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {primaryDesc.idealEnvironment.map((env, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs font-medium bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                      >
                        {env}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Work Style from AI */}
                {workStyle.workStyle && (
                  <div className="rounded-xl border p-4 space-y-2 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
                        <Activity className="h-3.5 w-3.5 text-sky-600" />
                      </div>
                      <h4 className="font-semibold text-sm">Estilo de Trabalho</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {workStyle.workStyle}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Pontos Fortes ────────────────────────────── */}
          <TabsContent value="strengths" className="mt-6">
            <Card className="border-green-500/20 shadow-md print:shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  Pontos Fortes
                </CardTitle>
                <CardDescription>
                  Competências e qualidades comportamentais principais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {strengths.map((strength, i) => (
                    <motion.div
                      key={i}
                      variants={fadeInUp}
                      custom={i}
                      className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/[0.03] p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      </div>
                      <span className="text-sm text-foreground/85 leading-relaxed">
                        {strength}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Áreas de Desenvolvimento ──────────────────── */}
          <TabsContent value="weaknesses" className="mt-6">
            <Card className="border-amber-500/20 shadow-md print:shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  Áreas de Desenvolvimento
                </CardTitle>
                <CardDescription>
                  Pontos de atenção para crescimento profissional
                </CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {weaknesses.map((weakness, i) => (
                    <motion.div
                      key={i}
                      variants={fadeInUp}
                      custom={i}
                      className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <span className="text-sm text-foreground/85 leading-relaxed">
                        {weakness}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Alertas ──────────────────────────────────── */}
          <TabsContent value="alerts" className="mt-6">
            <Card className="border-red-500/20 shadow-md print:shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Flame className="h-5 w-5" />
                  Alertas Comportamentais
                </CardTitle>
                <CardDescription>
                  Pontos críticos que requerem atenção especial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {(workStyle.alerts || []).map((alert, i) => (
                    <motion.div
                      key={i}
                      variants={fadeInUp}
                      custom={i}
                      className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      </div>
                      <span className="text-sm text-foreground/85 leading-relaxed">
                        {alert}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Plano de Desenvolvimento ──────────────────── */}
          <TabsContent value="devplan" className="mt-6">
            <Card className="shadow-md print:shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-violet-600">
                  <ListChecks className="h-5 w-5" />
                  Plano de Desenvolvimento
                </CardTitle>
                <CardDescription>
                  Ações recomendadas para potencializar o perfil comportamental
                </CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {(workStyle.developmentPlan || []).map((step, i) => (
                    <motion.div
                      key={i}
                      variants={fadeInUp}
                      custom={i}
                      className="flex items-start gap-4 rounded-xl border border-violet-200/50 bg-gradient-to-r from-violet-50/50 to-transparent p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground/90">{step}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-violet-400 flex-shrink-0 mt-1" />
                    </motion.div>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Dinâmica em Equipe ────────────────────────── */}
          <TabsContent value="team" className="mt-6">
            <Card className="shadow-md print:shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-violet-600">
                  <Users className="h-5 w-5" />
                  Dinâmica em Equipe
                </CardTitle>
                <CardDescription>
                  Como este perfil interage e contribui em ambientes colaborativos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Team Illustration */}
                <div className="flex items-center justify-center py-4">
                  <div className="relative">
                    {/* Background glow */}
                    <div className="absolute inset-0 rounded-full bg-violet-500/5 blur-2xl scale-150" />
                    {/* Team illustration: overlapping avatars */}
                    <div className="flex items-center justify-center gap-0">
                      {(["D", "I", "S", "C"] as const).map((f, i) => (
                        <motion.div
                          key={f}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                          className="relative"
                          style={{ marginLeft: i > 0 ? "-12px" : "0" }}
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white"
                            style={{ backgroundColor: DISC_COLOR_MAP[f] }}
                          >
                            {f}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Team Dynamics from AI */}
                {workStyle.teamDynamics && (
                  <div className="rounded-xl border p-5 bg-muted/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Users className="h-3.5 w-3.5 text-violet-600" />
                      </div>
                      <h4 className="font-semibold text-sm">Dinâmica de Equipe</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {workStyle.teamDynamics}
                    </p>
                  </div>
                )}

                {/* Fallback: team contribution from profile */}
                {!workStyle.teamDynamics && (
                  <div className="rounded-xl border p-5 bg-muted/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Users className="h-3.5 w-3.5 text-violet-600" />
                      </div>
                      <h4 className="font-semibold text-sm">Contribuição em Equipe</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {primaryDesc.teamContribution}
                    </p>
                  </div>
                )}

                {/* Work preferences */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <h4 className="font-semibold text-sm">Preferências de Trabalho</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {primaryDesc.workPreferences.map((pref, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-xs font-medium bg-muted/30"
                      >
                        {pref}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Estresse e Motivação ─────────────────────── */}
          <TabsContent value="stress" className="mt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Stress Triggers */}
              <Card className="border-red-500/20 shadow-md print:shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-600 text-base">
                    <Flame className="h-5 w-5" />
                    Gatilhos de Estresse
                  </CardTitle>
                  <CardDescription>
                    Situações que podem gerar desconforto ou pressão
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2.5"
                  >
                    {(workStyle.stressTriggers || primaryDesc.stressors).map((trigger, i) => (
                      <motion.div
                        key={i}
                        variants={fadeInUp}
                        custom={i}
                        className="flex items-start gap-3 rounded-lg border border-red-500/15 bg-red-500/[0.02] p-3"
                      >
                        <div className="h-5 w-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <XCircle className="h-3 w-3 text-red-500" />
                        </div>
                        <span className="text-sm text-foreground/85">{trigger}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </CardContent>
              </Card>

              {/* Motivational Factors */}
              <Card className="border-green-500/20 shadow-md print:shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-600 text-base">
                    <Heart className="h-5 w-5" />
                    Fatores Motivacionais
                  </CardTitle>
                  <CardDescription>
                    Elementos que estimulam o engajamento e a produtividade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2.5"
                  >
                    {(workStyle.motivationalFactors || primaryDesc.motivators).map((factor, i) => (
                      <motion.div
                        key={i}
                        variants={fadeInUp}
                        custom={i}
                        className="flex items-start gap-3 rounded-lg border border-green-500/15 bg-green-500/[0.02] p-3"
                      >
                        <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Heart className="h-3 w-3 text-green-500" />
                        </div>
                        <span className="text-sm text-foreground/85">{factor}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Tab: Comunicação ──────────────────────────────── */}
          <TabsContent value="communication" className="mt-6">
            <Card className="shadow-md print:shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-violet-600">
                  <MessageSquare className="h-5 w-5" />
                  Estilo de Comunicação
                </CardTitle>
                <CardDescription>
                  Dicas e orientações para comunicação eficaz com este perfil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Communication Tips from AI */}
                {workStyle.communicationTips && (
                  <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200/50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center">
                        <MessageSquare className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h4 className="font-semibold text-sm text-violet-900">Dicas de Comunicação</h4>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
                      {workStyle.communicationTips}
                    </p>
                  </div>
                )}

                {/* Communication Style from Profile */}
                <div className="rounded-xl border p-5 bg-muted/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${secondaryColor}15` }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" style={{ color: secondaryColor }} />
                    </div>
                    <h4 className="font-semibold text-sm">Estilo Pessoal de Comunicação</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {primaryDesc.communicationStyle}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Liderança ────────────────────────────────── */}
          <TabsContent value="leadership" className="mt-6">
            <Card className="shadow-md print:shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-violet-600">
                  <Crown className="h-5 w-5" />
                  Estilo de Liderança
                </CardTitle>
                <CardDescription>
                  Análise do potencial e abordagem de liderança deste perfil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Leadership Style from AI */}
                {workStyle.leadershipStyle && (
                  <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200/50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center">
                        <Crown className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h4 className="font-semibold text-sm text-violet-900">Análise de Liderança</h4>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
                      {workStyle.leadershipStyle}
                    </p>
                  </div>
                )}

                {/* Leadership Style from Profile */}
                <div className="rounded-xl border p-5 bg-muted/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <Crown className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                    </div>
                    <h4 className="font-semibold text-sm">Perfil de Liderança</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {primaryDesc.leadershipStyle}
                  </p>
                </div>

                {/* Decision Making */}
                <div className="rounded-xl border p-5 bg-muted/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${secondaryColor}15` }}
                    >
                      <Brain className="h-3.5 w-3.5" style={{ color: secondaryColor }} />
                    </div>
                    <h4 className="font-semibold text-sm">Tomada de Decisão</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {primaryDesc.decisionMaking}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Job Fit ──────────────────────────────────── */}
          <TabsContent value="jobfit" className="mt-6">
            <Card className="shadow-md print:shadow-none">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Briefcase className="h-5 w-5 text-violet-600" />
                  Análise de Compatibilidade com a Vaga
                </CardTitle>
                {candidate.job?.title && (
                  <CardDescription>Para a vaga: {candidate.job.title}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {hasJobFit ? (
                  <div className="space-y-6">
                    {/* Large gauge */}
                    <div className="flex flex-col items-center gap-4 py-4">
                      <JobFitGauge score={jobFitScore!} size={170} strokeWidth={13} />
                      <Badge
                        className="text-sm px-4 py-1.5"
                        style={{
                          backgroundColor: `${getJobFitColor(jobFitScore!)}15`,
                          color: getJobFitColor(jobFitScore!),
                          border: `1px solid ${getJobFitColor(jobFitScore!)}30`,
                        }}
                      >
                        {jobFitScore! >= 70 ? (
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        ) : jobFitScore! >= 50 ? (
                          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {getJobFitLabel(jobFitScore!)}
                      </Badge>
                    </div>

                    {/* Score interpretation */}
                    <div
                      className="rounded-xl border p-5 text-center"
                      style={{ borderColor: `${getJobFitColor(jobFitScore!)}20` }}
                    >
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {jobFitScore! >= 70
                          ? "O perfil comportamental do candidato apresenta alta compatibilidade com os requisitos da vaga. Este perfil tende a se destacar e entregar resultados consistentes no cargo."
                          : jobFitScore! >= 50
                            ? "O perfil apresenta compatibilidade moderada com a vaga. Há pontos de alinhamento significativos, mas podem existir desafios específicos que merecem atenção."
                            : "O perfil apresenta possíveis gaps em relação aos requisitos da vaga. Recomenda-se avaliar se as diferenças comportamentais são críticas para o sucesso no cargo."}
                      </p>
                    </div>

                    {/* Job Fit Details */}
                    {jobFitDetails && (
                      <div className="rounded-xl border border-violet-200/50 bg-gradient-to-br from-violet-50 to-purple-50 p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center">
                            <GraduationCap className="h-3.5 w-3.5 text-white" />
                          </div>
                          <h4 className="font-semibold text-sm text-violet-900">Análise Detalhada</h4>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
                          {jobFitDetails}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <Briefcase className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Análise Indisponível</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      A análise de compatibilidade com a vaga não está disponível para este teste.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ReportSection>

      {/* ====== PRINT-ONLY: Hidden tabs content ====== */}
      {/* When printing, show all tab content inline */}
      <div className="hidden print:block space-y-8">
        {/* Strengths */}
        {strengths.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Pontos Fortes
            </h3>
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">✓</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Áreas de Desenvolvimento
            </h3>
            <ul className="space-y-2">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-500 mt-0.5">⚠</span> {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Alerts */}
        {(workStyle.alerts?.length ?? 0) > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              Alertas
            </h3>
            <ul className="space-y-2">
              {workStyle.alerts!.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-red-500 mt-0.5">●</span> {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Development Plan */}
        {(workStyle.developmentPlan?.length ?? 0) > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-violet-600" />
              Plano de Desenvolvimento
            </h3>
            <ol className="space-y-2">
              {workStyle.developmentPlan!.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Stress & Motivation */}
        {hasStressMotivation && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-base font-bold mb-2 text-red-600">Gatilhos de Estresse</h3>
              <ul className="space-y-1.5">
                {(workStyle.stressTriggers || primaryDesc.stressors).map((t, i) => (
                  <li key={i} className="text-sm flex items-start gap-1.5">
                    <span className="text-red-400">✕</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-base font-bold mb-2 text-green-600">Fatores Motivacionais</h3>
              <ul className="space-y-1.5">
                {(workStyle.motivationalFactors || primaryDesc.motivators).map((f, i) => (
                  <li key={i} className="text-sm flex items-start gap-1.5">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Job Fit */}
        {hasJobFit && (
          <div className="text-center rounded-xl border p-6">
            <h3 className="text-lg font-bold mb-2">Compatibilidade com a Vaga</h3>
            <span className="text-3xl font-bold" style={{ color: getJobFitColor(jobFitScore!) }}>
              {jobFitScore}%
            </span>
            <p className="text-sm text-muted-foreground mt-1">{getJobFitLabel(jobFitScore!)}</p>
            {jobFitDetails && (
              <p className="text-sm text-muted-foreground mt-3">{jobFitDetails}</p>
            )}
          </div>
        )}
      </div>

      {/* ====== 6. FOOTER ====== */}
      <Separator className="print:border-muted-foreground/30" />
      <ReportSection delay={0.4}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium">
              Relatório gerado por <span className="text-violet-600 font-semibold">Zion Recruit IA</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(new Date().toISOString())}</span>
          </div>
          {testId && (
            <div className="print:hidden">
              <span className="font-mono text-[10px] text-muted-foreground/60">
                ID: {testId.slice(0, 8)}…
              </span>
            </div>
          )}
        </div>
      </ReportSection>
    </div>
  );
}
