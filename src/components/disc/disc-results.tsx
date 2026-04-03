"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import {
  Printer,
  Briefcase,
  Users,
  Target,
  TrendingUp,
  Crown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MessageSquare,
  ShieldCheck,
  Brain,
  Zap,
  Heart,
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DISCFactor } from "@/lib/disc/questions";
import {
  getProfileDescription,
  getComboProfile,
  getFactorColors,
} from "@/lib/disc/profiles";

// ============================================
// Types
// ============================================

interface DiscResultsProps {
  testId: string;
  scores: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
  primaryProfile: DISCFactor;
  secondaryProfile: DISCFactor | null;
  profileCombo: string;
  aiAnalysis?: string | null;
  aiStrengths?: string | null;
  aiWeaknesses?: string | null;
  aiWorkStyle?: string | null;
  jobFitScore?: number | null;
  jobFitDetails?: string | null;
  candidateName?: string;
  jobTitle?: string;
}

// ============================================
// Constants
// ============================================

const DISC_LABEL_MAP: Record<string, string> = {
  D: "Dominância",
  I: "Influência",
  S: "Estabilidade",
  C: "Conformidade",
};

const DISC_COLOR_MAP: Record<string, string> = {
  D: "#EF4444",
  I: "#F59E0B",
  S: "#22C55E",
  C: "#3B82F6",
};

const DISC_PROFILE_NAME_MAP: Record<string, string> = {
  D: "Dominante",
  I: "Influente",
  S: "Estável",
  C: "Consciente",
};

// ============================================
// Helper Functions
// ============================================

function getJobFitColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

function getJobFitBadgeProps(score: number): {
  label: string;
  variant: "default" | "secondary" | "destructive";
  icon: React.ReactNode;
} {
  if (score >= 70) {
    return {
      label: "Alta Compatibilidade",
      variant: "default",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }
  if (score >= 50) {
    return {
      label: "Compatibilidade Moderada",
      variant: "secondary",
      icon: <AlertTriangle className="h-4 w-4" />,
    };
  }
  return {
    label: "Possível Gap",
    variant: "destructive",
    icon: <XCircle className="h-4 w-4" />,
  };
}

// ============================================
// Sub-components
// ============================================

function AnimatedScoreCircle({
  score,
  size = 140,
  strokeWidth = 10,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getJobFitColor(score);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 300);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Glow filter */}
        <defs>
          <filter id="score-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background circle */}
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (animatedScore / 100) * circumference}
          className="transition-all duration-[1.4s] ease-out"
          filter="url(#score-glow)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
        >
          {score}%
        </motion.span>
      </div>
    </div>
  );
}

interface CustomBarTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      name: string;
      value: number;
      color: string;
    };
  }>;
}

function CustomBarTooltip({ active, payload }: CustomBarTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-xl">
      <p className="text-sm font-semibold" style={{ color: data.payload.color }}>
        {DISC_LABEL_MAP[data.payload.name] || data.payload.name}
      </p>
      <p className="text-sm text-muted-foreground">
        <span className="font-bold text-foreground">{data.value}%</span> do perfil
      </p>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function DiscResults({
  testId,
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
  candidateName,
  jobTitle,
}: DiscResultsProps) {
  const primaryDesc = getProfileDescription(primaryProfile);
  const comboDesc = getComboProfile(profileCombo);
  const colors = getFactorColors();

  // Prepare radar chart data
  const radarData = useMemo(
    () => [
      { fator: "D", valor: scores.D, fullMark: 100 },
      { fator: "I", valor: scores.I, fullMark: 100 },
      { fator: "S", valor: scores.S, fullMark: 100 },
      { fator: "C", valor: scores.C, fullMark: 100 },
    ],
    [scores]
  );

  // Prepare bar chart data
  const barData = useMemo(
    () => [
      { name: "D", value: scores.D, color: colors.D },
      { name: "I", value: scores.I, color: colors.I },
      { name: "S", value: scores.S, color: colors.S },
      { name: "C", value: scores.C, color: colors.C },
    ],
    [scores, colors]
  );

  // Parse AI data
  const strengths: string[] = aiStrengths
    ? JSON.parse(aiStrengths)
    : primaryDesc.strengths.slice(0, 5);
  const weaknesses: string[] = aiWeaknesses
    ? JSON.parse(aiWeaknesses)
    : primaryDesc.weaknesses.slice(0, 3);

  // Job fit badge props
  const jobFitBadge = jobFitScore !== null && jobFitScore !== undefined
    ? getJobFitBadgeProps(jobFitScore)
    : null;

  const handlePrint = () => {
    window.print();
  };

  // Sort factors by score descending for hero display
  const sortedFactors = useMemo(() => {
    return (["D", "I", "S", "C"] as DISCFactor[])
      .map((f) => ({ factor: f, score: scores[f] }))
      .sort((a, b) => b.score - a.score);
  }, [scores]);

  // Factor color for profile hero gradient
  const primaryColor = primaryDesc.color;
  const secondaryColor = secondaryProfile
    ? getProfileDescription(secondaryProfile).color
    : primaryColor;

  return (
    <div className="space-y-6" id="disc-results">
      {/* ====== Header Section ====== */}
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Resultado da Avaliação DISC
          </h2>
          {candidateName && (
            <p className="text-muted-foreground mt-1">
              {candidateName}
              {jobTitle && (
                <>
                  {" "}
                  &bull; <span className="font-medium">{jobTitle}</span>
                </>
              )}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="w-fit">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </motion.div>

      {/* ====== Profile Hero Card ====== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 200 }}
      >
        <Card className="overflow-hidden border-0 shadow-lg">
          {/* Gradient top bar */}
          <div
            className="h-1.5 w-full"
            style={{
              background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
            }}
          />
          <CardContent className="pt-6 pb-6">
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
                  className="absolute -inset-3 rounded-full opacity-20 blur-xl"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                />
                {/* Main circle */}
                <div
                  className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                >
                  <span className="text-white text-3xl font-black tracking-tight">
                    {profileCombo}
                  </span>
                </div>
                {/* Small sparkle */}
                <motion.div
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: "spring" }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                </motion.div>
              </motion.div>

              {/* Profile info */}
              <div className="flex-1 text-center md:text-left">
                <h3
                  className="text-2xl font-bold"
                  style={{ color: primaryColor }}
                >
                  {comboDesc?.name || primaryDesc.title}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {aiAnalysis
                    ? aiAnalysis.slice(0, 180) + (aiAnalysis.length > 180 ? "..." : "")
                    : primaryDesc.description.slice(0, 180) + "..."}
                </p>
                <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                  <Badge
                    className="text-xs font-semibold"
                    style={{
                      backgroundColor: `${primaryColor}18`,
                      color: primaryColor,
                      borderColor: `${primaryColor}40`,
                    }}
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Primário: {DISC_PROFILE_NAME_MAP[primaryProfile]}
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
                      Secundário: {DISC_PROFILE_NAME_MAP[secondaryProfile]}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Job Fit Score */}
              {jobFitScore !== null && jobFitScore !== undefined && (
                <motion.div
                  className="flex flex-col items-center gap-2 flex-shrink-0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Compatibilidade com a Vaga
                  </p>
                  <AnimatedScoreCircle score={jobFitScore} size={110} strokeWidth={9} />
                  {jobFitBadge && (
                    <Badge variant={jobFitBadge.variant} className="text-xs gap-1">
                      {jobFitBadge.icon}
                      {jobFitBadge.label}
                    </Badge>
                  )}
                </motion.div>
              )}
            </div>

            {/* Factor score bars */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sortedFactors.map((item, idx) => (
                <motion.div
                  key={item.factor}
                  className="relative rounded-lg border p-3 bg-muted/30"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.08, duration: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-sm font-bold"
                      style={{ color: DISC_COLOR_MAP[item.factor] }}
                    >
                      {item.factor}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {item.score}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: DISC_COLOR_MAP[item.factor] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score}%` }}
                      transition={{ delay: 0.6 + idx * 0.1, duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    {DISC_LABEL_MAP[item.factor]}
                  </p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ====== Charts Section (2-column grid) ====== */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Radar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Visualização do Perfil
              </CardTitle>
              <CardDescription>Distribuição dos fatores DISC</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                    <defs>
                      <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={secondaryColor} stopOpacity={0.2} />
                      </linearGradient>
                      <filter id="radarGlow">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <PolarGrid
                      stroke="currentColor"
                      className="text-muted/40"
                      strokeDasharray="3 3"
                    />
                    <PolarAngleAxis
                      dataKey="fator"
                      tick={{
                        fill: "#71717a",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                      tickFormatter={(value: string) => DISC_LABEL_MAP[value] || value}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 9, fill: "#a1a1aa" }}
                      axisLine={false}
                    />
                    <Radar
                      name="Perfil"
                      dataKey="valor"
                      stroke={primaryColor}
                      fill="url(#radarGradient)"
                      strokeWidth={2.5}
                      filter="url(#radarGlow)"
                      dot={{
                        r: 5,
                        fill: primaryColor,
                        stroke: "#ffffff",
                        strokeWidth: 2,
                      }}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Horizontal Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" />
                Pontuação por Fator
              </CardTitle>
              <CardDescription>
                Porcentagem de cada fator comportamental
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                    barCategoryGap="30%"
                  >
                    <defs>
                      {barData.map((entry) => (
                        <linearGradient
                          key={`grad-${entry.name}`}
                          id={`barGrad-${entry.name}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                          <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 6"
                      horizontal={false}
                      className="text-muted/30"
                    />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#a1a1aa" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={30}
                      tick={{ fontSize: 14, fontWeight: 700, fill: "#71717a" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                    <Bar
                      dataKey="value"
                      radius={[0, 6, 6, 0]}
                      animationDuration={1000}
                      animationEasing="ease-out"
                      barSize={28}
                    >
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#barGrad-${entry.name})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Factor legend */}
              <div className="flex flex-wrap gap-3 mt-2 px-2">
                {barData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {entry.name} ({entry.value}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ====== Tabs Section ====== */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <Target className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="strengths" className="text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />
              Pontos Fortes
            </TabsTrigger>
            <TabsTrigger value="workstyle" className="text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />
              Estilo de Trabalho
            </TabsTrigger>
            <TabsTrigger value="jobfit" className="text-xs sm:text-sm">
              <Briefcase className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />
              Job Fit
            </TabsTrigger>
          </TabsList>

          {/* --- Tab 1: Visão Geral --- */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Visão Geral do Perfil
                </CardTitle>
                <CardDescription>
                  Análise comportamental completa baseada nos fatores DISC
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* AI Analysis or fallback description */}
                <div className="rounded-xl bg-muted/40 p-4 border">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {aiAnalysis || primaryDesc.description}
                  </p>
                </div>

                {/* Leadership & Decision grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}15` }}
                      >
                        <Crown className="h-4 w-4" style={{ color: primaryColor }} />
                      </div>
                      <h4 className="font-semibold text-sm">Estilo de Liderança</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {primaryDesc.leadershipStyle}
                    </p>
                  </div>

                  <div className="rounded-xl border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${secondaryColor}15` }}
                      >
                        <Brain className="h-4 w-4" style={{ color: secondaryColor }} />
                      </div>
                      <h4 className="font-semibold text-sm">Tomada de Decisão</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {primaryDesc.decisionMaking}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Ideal Environment */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <h4 className="font-semibold text-sm">Ambiente Ideal</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {primaryDesc.idealEnvironment.map((env, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs font-medium bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20"
                      >
                        {env}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Combo characteristics if available */}
                {comboDesc && comboDesc.characteristics.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <h4 className="font-semibold text-sm">
                          Características do Perfil {comboDesc.code}
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {comboDesc.characteristics.map((char, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs font-medium"
                            style={{
                              borderColor: `${primaryColor}30`,
                              color: primaryColor,
                            }}
                          >
                            {char}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Ideal roles if combo available */}
                {comboDesc && comboDesc.idealRoles.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-blue-500" />
                        <h4 className="font-semibold text-sm">Cargos Ideais</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
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
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Tab 2: Pontos Fortes --- */}
          <TabsContent value="strengths" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Strengths */}
              <Card className="border-green-500/20 bg-green-500/[0.02]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                    Pontos Fortes
                  </CardTitle>
                  <CardDescription>
                    Competências e qualidades principais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {strengths.map((strength: string, i: number) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.3 }}
                      >
                        <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        </div>
                        <span className="text-sm text-foreground/85 leading-relaxed">
                          {strength}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Weaknesses / Development Areas */}
              <Card className="border-amber-500/20 bg-amber-500/[0.02]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    Áreas de Desenvolvimento
                  </CardTitle>
                  <CardDescription>
                    Pontos de atenção para crescimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {weaknesses.map((weakness: string, i: number) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.3 }}
                      >
                        <div className="h-5 w-5 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        </div>
                        <span className="text-sm text-foreground/85 leading-relaxed">
                          {weakness}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* --- Tab 3: Estilo de Trabalho --- */}
          <TabsContent value="workstyle" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Estilo de Trabalho e Comunicação
                </CardTitle>
                <CardDescription>
                  Como este perfil se comporta no ambiente profissional
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Work Style */}
                <div className="rounded-xl border p-4 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <Activity className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                    </div>
                    <h4 className="font-semibold text-sm">Estilo de Trabalho</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {aiWorkStyle || primaryDesc.communicationStyle}
                  </p>
                </div>

                {/* Communication Style */}
                <div className="rounded-xl border p-4 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${secondaryColor}15` }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" style={{ color: secondaryColor }} />
                    </div>
                    <h4 className="font-semibold text-sm">Estilo de Comunicação</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {primaryDesc.communicationStyle}
                  </p>
                </div>

                {/* Team Contribution */}
                <div className="rounded-xl border p-4 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-violet-500/10">
                      <Users className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                    <h4 className="font-semibold text-sm">Contribuição em Equipe</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {primaryDesc.teamContribution}
                  </p>
                </div>

                <Separator />

                {/* Motivators & Stressors grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Motivators */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-green-500" />
                      <h4 className="font-semibold text-sm">Motivadores</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {primaryDesc.motivators.map((m, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs font-medium bg-green-500/5 text-green-700 border-green-500/20"
                        >
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Stressors */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <h4 className="font-semibold text-sm">Estressores</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {primaryDesc.stressors.map((s, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs font-medium bg-red-500/5 text-red-600 border-red-500/20"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Tab 4: Job Fit --- */}
          <TabsContent value="jobfit" className="space-y-4">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Análise de Compatibilidade com a Vaga
                </CardTitle>
                {jobTitle && (
                  <CardDescription>Para a vaga: {jobTitle}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {jobFitScore !== null && jobFitScore !== undefined ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="jobfit-content"
                      className="space-y-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Animated circular score */}
                      <div className="flex items-center justify-center py-4">
                        <AnimatedScoreCircle score={jobFitScore} size={160} strokeWidth={12} />
                      </div>

                      {/* Compatibility badge */}
                      <div className="flex items-center justify-center">
                        {jobFitBadge && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6, type: "spring" }}
                          >
                            <Badge
                              variant={jobFitBadge.variant}
                              className="text-sm px-4 py-1.5 gap-1.5"
                            >
                              {jobFitBadge.icon}
                              {jobFitBadge.label}
                            </Badge>
                          </motion.div>
                        )}
                      </div>

                      {/* Score interpretation */}
                      <div
                        className="rounded-xl border p-4 text-center"
                        style={{
                          borderColor: `${getJobFitColor(jobFitScore)}30`,
                          backgroundColor: `${getJobFitColor(jobFitScore)}05`,
                        }}
                      >
                        <p className="text-sm text-muted-foreground">
                          {jobFitScore >= 70
                            ? "Este candidato demonstra alta compatibilidade com os requisitos da vaga. O perfil comportamental está bem alinhado com as demandas da posição."
                            : jobFitScore >= 50
                            ? "Este candidato apresenta compatibilidade moderada com a vaga. Algumas competências estão alinhadas, mas podem haver áreas que necessitam de adaptação."
                            : "Este candidato pode apresentar desafios significativos em relação à vaga. O perfil comportamental difere consideravelmente dos requisitos da posição."}
                        </p>
                      </div>

                      {/* Job fit details */}
                      {jobFitDetails && (
                        <motion.div
                          className="rounded-xl border bg-muted/30 p-4"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8, duration: 0.3 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <h4 className="font-semibold text-sm">
                              Análise Detalhada
                            </h4>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                            {jobFitDetails}
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  /* Empty state */
                  <motion.div
                    className="flex flex-col items-center justify-center py-12 space-y-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-medium text-muted-foreground">
                        Nenhuma análise de compatibilidade disponível
                      </p>
                      <p className="text-sm text-muted-foreground/70">
                        A análise de Job Fit pode ser gerada quando uma vaga específica for atribuída ao candidato.
                      </p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
