"use client";

import * as React from "react";
import {
  Users,
  Briefcase,
  UserCheck,
  Calendar,
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

// ---------------------------------------------------------------------------
// Animated Counter Hook
// ---------------------------------------------------------------------------
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = 0;

    function step(timestamp: number) {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      // easeOutExpo for a snappy feel
      const eased = 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(startValue + (target - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    }

    requestAnimationFrame(step);
  }, [target, duration]);

  return count;
}

// ---------------------------------------------------------------------------
// Sparkline Generation
// ---------------------------------------------------------------------------
function generateSparklineData(
  value: number,
  trend: number | undefined,
  points = 7
) {
  const data: number[] = [];
  const baseValue = value / (1 + (trend ?? 0) / 100);

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const trendEffect = (trend ?? 0) / 100 * progress * baseValue;
    const noise = (Math.sin(i * 2.5 + value * 0.1) * 0.12 + Math.cos(i * 1.7 + value * 0.3) * 0.08) * baseValue;
    const point = baseValue + trendEffect + noise;
    data.push(Math.max(0, Math.round(point * 10) / 10));
  }

  // Ensure last point is close to the actual value
  data[points - 1] = value;

  return data.map((v, i) => ({ v, i }));
}

// ---------------------------------------------------------------------------
// Color Themes
// ---------------------------------------------------------------------------
interface ColorTheme {
  bg: string;
  iconBg: string;
  iconText: string;
  gradientStart: string;
  gradientEnd: string;
  stroke: string;
}

const THEMES: Record<string, ColorTheme> = {
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconBg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    iconText: "text-white",
    gradientStart: "#34d399",
    gradientEnd: "#059669",
    stroke: "#10b981",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    iconBg: "bg-gradient-to-br from-amber-400 to-amber-600",
    iconText: "text-white",
    gradientStart: "#fbbf24",
    gradientEnd: "#d97706",
    stroke: "#f59e0b",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    iconBg: "bg-gradient-to-br from-rose-400 to-rose-600",
    iconText: "text-white",
    gradientStart: "#fb7185",
    gradientEnd: "#e11d48",
    stroke: "#f43f5e",
  },
  sky: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    iconBg: "bg-gradient-to-br from-sky-400 to-sky-600",
    iconText: "text-white",
    gradientStart: "#38bdf8",
    gradientEnd: "#0284c7",
    stroke: "#0ea5e9",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    iconBg: "bg-gradient-to-br from-violet-400 to-violet-600",
    iconText: "text-white",
    gradientStart: "#a78bfa",
    gradientEnd: "#7c3aed",
    stroke: "#8b5cf6",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    iconBg: "bg-gradient-to-br from-orange-400 to-orange-600",
    iconText: "text-white",
    gradientStart: "#fb923c",
    gradientEnd: "#ea580c",
    stroke: "#f97316",
  },
};

// ---------------------------------------------------------------------------
// Trend Pill Badge
// ---------------------------------------------------------------------------
function TrendPill({ trend }: { trend?: number }) {
  if (trend === undefined || trend === null) return null;

  const isPositive = trend > 0;
  const isNegative = trend < 0;
  const isZero = trend === 0;

  const TrendIcon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown;

  const pillClass = isZero
    ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
    : isPositive
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
    : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400";

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${pillClass}`}
    >
      <TrendIcon className="h-3 w-3" />
      {trend > 0 ? "+" : ""}
      {trend}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sparkline Mini Chart
// ---------------------------------------------------------------------------
function MiniSparkline({
  data,
  colorStart,
  colorEnd,
  stroke,
}: {
  data: { v: number; i: number }[];
  colorStart: string;
  colorEnd: string;
  stroke: string;
}) {
  const id = React.useId();

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={`sparkGrad-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorStart} stopOpacity={0.35} />
              <stop offset="100%" stopColor={colorEnd} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            fill={`url(#sparkGrad-${id})`}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
interface KPICardConfig {
  title: string;
  value: number;
  trend?: number;
  subValue?: string;
  icon: React.ElementType;
  colorTheme: string;
  delay: number;
}

function KPICard({ title, value, trend, subValue, icon: Icon, colorTheme, delay }: KPICardConfig) {
  const theme = THEMES[colorTheme];
  const animatedValue = useAnimatedCounter(value);
  const sparkData = React.useMemo(
    () => generateSparklineData(value, trend),
    [value, trend]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card
        className={`group relative overflow-hidden border-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 ${theme.bg}`}
      >
        {/* Decorative top-right gradient orb */}
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20"
          style={{
            background: `linear-gradient(135deg, ${theme.gradientStart}, ${theme.gradientEnd})`,
          }}
        />

        <CardContent className="relative p-4 pb-2 sm:p-5 sm:pb-3">
          {/* Header row: title + icon */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-muted-foreground truncate">
                {title}
              </p>
            </div>

            {/* Gradient icon circle */}
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm ${theme.iconBg}`}
            >
              <Icon className={`h-4.5 w-4.5 ${theme.iconText}`} strokeWidth={2.2} />
            </div>
          </div>

          {/* Value + trend row */}
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">
                {animatedValue.toLocaleString("pt-BR")}
              </span>
              {subValue && (
                <p className="mt-0.5 text-[12px] leading-tight text-muted-foreground truncate">
                  {subValue}
                </p>
              )}
            </div>
            <TrendPill trend={trend} />
          </div>

          {/* Sparkline */}
          <div className="mt-2">
            <MiniSparkline
              data={sparkData}
              colorStart={theme.gradientStart}
              colorEnd={theme.gradientEnd}
              stroke={theme.stroke}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton Cards
// ---------------------------------------------------------------------------
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3 sm:gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-sm">
          <CardContent className="p-4 pb-2 sm:p-5 sm:pb-3">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="space-y-1.5">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-md" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="mt-2">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface OverviewCardsProps {
  data?: {
    totalCandidates: number;
    candidateTrend: number;
    totalJobs: number;
    activeJobs: number;
    totalHired: number;
    hireTrend: number;
    totalInterviews: number;
    pendingInterviews: number;
    activeAgents: number;
    totalTasks: number;
    completedTasks: number;
    taskSuccessRate: number;
  };
}

// ---------------------------------------------------------------------------
// OverviewCards Component
// ---------------------------------------------------------------------------
export function OverviewCards({ data }: OverviewCardsProps) {
  if (!data) {
    return <LoadingSkeleton />;
  }

  const cardsConfig: KPICardConfig[] = [
    {
      title: "Total Candidatos",
      value: data.totalCandidates,
      trend: data.candidateTrend,
      subValue: undefined,
      icon: Users,
      colorTheme: "emerald",
      delay: 0,
    },
    {
      title: "Vagas Ativas",
      value: data.activeJobs,
      trend: undefined,
      subValue: `${data.totalJobs} total`,
      icon: Briefcase,
      colorTheme: "amber",
      delay: 0.07,
    },
    {
      title: "Contratações",
      value: data.totalHired,
      trend: data.hireTrend,
      subValue: "neste período",
      icon: UserCheck,
      colorTheme: "rose",
      delay: 0.14,
    },
    {
      title: "Entrevistas",
      value: data.pendingInterviews,
      trend: undefined,
      subValue: `${data.totalInterviews} agendadas`,
      icon: Calendar,
      colorTheme: "sky",
      delay: 0.21,
    },
    {
      title: "Tarefas IA",
      value: data.completedTasks,
      trend: data.taskSuccessRate,
      subValue: `de ${data.totalTasks} total`,
      icon: Bot,
      colorTheme: "violet",
      delay: 0.28,
    },
    {
      title: "Agentes Ativos",
      value: data.activeAgents,
      trend: undefined,
      subValue: "em execução",
      icon: Bot,
      colorTheme: "orange",
      delay: 0.35,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3 sm:gap-4">
      {cardsConfig.map((card, index) => (
        <KPICard key={index} {...card} />
      ))}
    </div>
  );
}
