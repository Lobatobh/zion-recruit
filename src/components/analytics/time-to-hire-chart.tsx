"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CHART_COLORS } from "@/lib/analytics/charts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Zap,
  Hourglass,
} from "lucide-react";

// ─── Props ───────────────────────────────────────────────────────────
interface TimeToHireChartProps {
  data?: {
    metrics: {
      averageDays: number;
      medianDays: number;
      minDays: number;
      maxDays: number;
      trend: number;
    };
    lineChart: Array<{
      date: string;
      averageDays: number;
      hires: number;
    }>;
  };
}

// ─── Animated Counter Hook ───────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = React.useState(0);
  const prefersReduced = React.useRef(false);

  React.useEffect(() => {
    prefersReduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  React.useEffect(() => {
    if (prefersReduced.current) {
      setCount(target);
      return;
    }

    let start = 0;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * target);
      setCount(start);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [target, duration]);

  return count;
}

// ─── Summary Stat Card ───────────────────────────────────────────────
function SummaryStat({
  label,
  value,
  icon: Icon,
  accentColor,
  accentBg,
  suffix,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  accentBg: string;
  suffix?: string;
}) {
  const animated = useAnimatedCounter(value);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 transition-all hover:border-border hover:bg-muted/50">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: accentBg }}
      >
        <Icon className="h-5 w-5" style={{ color: accentColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-xl font-bold tabular-nums leading-tight" style={{ color: accentColor }}>
          {animated}
          {suffix && (
            <span className="ml-0.5 text-sm font-medium text-muted-foreground">
              {suffix}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: { averageDays: number; hires: number };
  }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const daysEntry = payload.find((p) => p.dataKey === "averageDays");
  const hiresEntry = payload.find((p) => p.dataKey === "hires");

  return (
    <div className="rounded-xl border border-border/60 bg-background/95 px-4 py-3 shadow-xl shadow-black/10 backdrop-blur-sm">
      <p className="mb-2 text-sm font-semibold text-foreground">{label}</p>
      {daysEntry && (
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: daysEntry.color }}
          />
          <span className="text-xs text-muted-foreground">Média de Dias:</span>
          <span
            className="text-sm font-bold"
            style={{ color: daysEntry.color }}
          >
            {daysEntry.value} dias
          </span>
        </div>
      )}
      {hiresEntry && (
        <div className="mt-1 flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: hiresEntry.color }}
          />
          <span className="text-xs text-muted-foreground">Contratações:</span>
          <span
            className="text-sm font-bold"
            style={{ color: hiresEntry.color }}
          >
            {hiresEntry.value}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export function TimeToHireChart({ data }: TimeToHireChartProps) {
  // ── Loading state ──
  if (!data) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-base">Tempo até Contratação</CardTitle>
          </div>
          <CardDescription>
            Média de dias da candidatura à contratação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
            ))}
          </div>
          <div className="mt-4 h-[280px]">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Empty state ──
  if (data.lineChart.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-base">Tempo até Contratação</CardTitle>
          </div>
          <CardDescription>
            Média de dias da candidatura à contratação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[360px] flex-col items-center justify-center gap-3 text-muted-foreground">
            <Hourglass className="h-12 w-12 opacity-30" />
            <p className="text-sm">
              Nenhum dado de tempo de contratação disponível
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { metrics, lineChart } = data;
  const avgRef = metrics.averageDays;

  // Compute a nice domain for the right axis (hires)
  const maxHires = Math.max(...lineChart.map((d) => d.hires), 1);
  const hiresCeil = Math.ceil(maxHires * 1.2) || 5;

  // Compute a nice domain for the left axis (days)
  const allDays = lineChart.map((d) => d.averageDays);
  const minDaysChart = Math.min(...allDays);
  const maxDaysChart = Math.max(...allDays);
  const daysFloor = Math.max(0, Math.floor((minDaysChart - 5) / 5) * 5);
  const daysCeil = Math.ceil((maxDaysChart + 5) / 5) * 5 || 30;

  return (
    <Card className="overflow-hidden">
      {/* ── Header ── */}
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Clock className="h-4 w-4 text-emerald-500" />
              </div>
              <CardTitle className="text-base">
                Tempo até Contratação
              </CardTitle>
              <TrendBadge trend={metrics.trend} />
            </div>
            <CardDescription className="mt-1">
              Média de dias da candidatura à contratação
            </CardDescription>
          </div>
          {/* Legend */}
          <div className="hidden items-center gap-4 text-xs sm:flex">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm bg-emerald-500" />
              <span className="text-muted-foreground">Média de Dias</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm bg-blue-500" />
              <span className="text-muted-foreground">Contratações</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat
            label="Média"
            value={metrics.averageDays}
            icon={BarChart3}
            accentColor="#10b981"
            accentBg="rgba(16,185,129,0.10)"
            suffix="dias"
          />
          <SummaryStat
            label="Mediana"
            value={metrics.medianDays}
            icon={TrendingUp}
            accentColor="#3b82f6"
            accentBg="rgba(59,130,246,0.10)"
            suffix="dias"
          />
          <SummaryStat
            label="Mais Rápido"
            value={metrics.minDays}
            icon={Zap}
            accentColor="#f59e0b"
            accentBg="rgba(245,158,11,0.10)"
            suffix="dias"
          />
          <SummaryStat
            label="Mais Lento"
            value={metrics.maxDays}
            icon={Hourglass}
            accentColor="#ef4444"
            accentBg="rgba(239,68,68,0.10)"
            suffix="dias"
          />
        </div>

        {/* ── Area Chart ── */}
        <div className="h-[280px] w-full rounded-xl border border-border/40 bg-gradient-to-b from-muted/20 to-transparent p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={lineChart}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                {/* Green gradient for days */}
                <linearGradient
                  id="greenGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="60%" stopColor="#10b981" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                {/* Blue gradient for hires */}
                <linearGradient
                  id="blueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="60%" stopColor="#3b82f6" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                {/* Active dot glow filters */}
                <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feFlood floodColor="#10b981" floodOpacity="0.4" />
                  <feComposite in2="blur" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feFlood floodColor="#3b82f6" floodOpacity="0.4" />
                  <feComposite in2="blur" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Subtle grid */}
              <CartesianGrid
                strokeDasharray="3 6"
                stroke="currentColor"
                className="text-muted-foreground/20"
                vertical={false}
              />

              {/* Left Y-axis: days */}
              <YAxis
                yAxisId="left"
                domain={[daysFloor, daysCeil]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={36}
              />

              {/* Right Y-axis: hires */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, hiresCeil]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={32}
              />

              {/* X-axis */}
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                dy={4}
              />

              {/* Average reference line */}
              <ReferenceLine
                yAxisId="left"
                y={avgRef}
                stroke="#10b981"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                strokeOpacity={0.5}
              />

              {/* Custom tooltip */}
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "hsl(var(--muted-foreground))",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />

              {/* Area: Average Days (green) */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="averageDays"
                name="Média de Dias"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#greenGradient)"
                dot={{
                  r: 3,
                  fill: "#10b981",
                  stroke: "#fff",
                  strokeWidth: 1.5,
                  opacity: 0.8,
                }}
                activeDot={{
                  r: 6,
                  fill: "#10b981",
                  stroke: "#fff",
                  strokeWidth: 2,
                  filter: "url(#glowGreen)",
                }}
                animationDuration={1400}
                animationEasing="ease-out"
              />

              {/* Area: Hires (blue) */}
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="hires"
                name="Contratações"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#blueGradient)"
                dot={{
                  r: 3,
                  fill: "#3b82f6",
                  stroke: "#fff",
                  strokeWidth: 1.5,
                  opacity: 0.8,
                }}
                activeDot={{
                  r: 6,
                  fill: "#3b82f6",
                  stroke: "#fff",
                  strokeWidth: 2,
                  filter: "url(#glowBlue)",
                }}
                animationDuration={1600}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Average reference label ── */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-px w-5 bg-emerald-500/50" style={{ borderTop: "1.5px dashed #10b981" }} />
          <span>
            Média geral: <span className="font-semibold text-emerald-600">{avgRef} dias</span>
          </span>
          <span className="inline-block h-px w-5 bg-emerald-500/50" style={{ borderTop: "1.5px dashed #10b981" }} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Trend Badge ─────────────────────────────────────────────────────
function TrendBadge({ trend }: { trend: number }) {
  if (trend > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-500">
        <TrendingUp className="h-3 w-3" />
        +{trend}%
      </span>
    );
  }
  if (trend < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
        <TrendingDown className="h-3 w-3" />
        {trend}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      <Minus className="h-3 w-3" />
      0%
    </span>
  );
}
