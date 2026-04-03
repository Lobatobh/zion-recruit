"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_COLORS } from "@/lib/analytics/charts";
import { ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PipelineData {
  name: string;
  value: number;
  conversionRate?: number;
  fill?: string;
}

interface PipelineFunnelProps {
  data?: {
    metrics: Array<{
      stageName: string;
      stageOrder: number;
      candidatesCount: number;
      conversionRate: number;
      dropOffRate: number;
    }>;
    funnel: PipelineData[];
    barChart: Array<{
      name: string;
      conversion: number;
      dropoff: number;
      candidates: number;
    }>;
  };
}

/* ─────────────────────────────────────────────
   Custom Funnel Stage Component
   ───────────────────────────────────────────── */

interface FunnelStageProps {
  stage: PipelineData;
  index: number;
  total: number;
  previousValue: number;
  metricsEntry?: {
    stageName: string;
    stageOrder: number;
    candidatesCount: number;
    conversionRate: number;
    dropOffRate: number;
  };
}

function FunnelStage({
  stage,
  index,
  total,
  previousValue,
  metricsEntry,
}: FunnelStageProps) {
  const maxValue = stage.value; // The value for width calculation is the stage itself
  // We use funnel[0].value (the first/top stage) as 100%
  // But since we don't have access to funnel[0] here, we use the stage value relative to some max
  // Actually the parent will pass widthPercent. Let me rethink.

  // The parent controls width via the widthPercent prop
  return null;
}

/* ─────────────────────────────────────────────
   Drop-off Indicator
   ───────────────────────────────────────────── */

function DropOffIndicator({
  dropOffRate,
  dropped,
}: {
  dropOffRate: number;
  dropped: number;
}) {
  if (dropOffRate <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="flex items-center justify-center gap-1.5 py-1"
    >
      <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent via-red-300 to-transparent" />
      <div className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
        <TrendingDown className="w-3 h-3" />
        <span>
          -{dropped} ({dropOffRate.toFixed(0)}%)
        </span>
      </div>
      <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent via-red-300 to-transparent" />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Chevron Connector
   ───────────────────────────────────────────── */

function ChevronConnector() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex justify-center py-0.5"
    >
      <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Custom Funnel View
   ───────────────────────────────────────────── */

function CustomFunnelView({
  data,
}: {
  data: PipelineFunnelProps["data"];
}) {
  if (!data) return null;

  const { funnel, metrics } = data;
  const topValue = funnel.length > 0 ? funnel[0].value : 1;

  return (
    <div className="space-y-0 py-2">
      {funnel.map((stage, index) => {
        const metricsEntry = metrics.find(
          (m) => m.stageName === stage.name
        );
        const previousStage = index > 0 ? funnel[index - 1] : null;
        const dropped = previousStage
          ? previousStage.value - stage.value
          : 0;
        const dropOffRate = metricsEntry?.dropOffRate ?? 0;
        const conversionRate = metricsEntry?.conversionRate ?? 0;
        const widthPercent = Math.max(
          (stage.value / topValue) * 100,
          18
        );
        const color = stage.fill || CHART_COLORS.palette[index % CHART_COLORS.palette.length];

        return (
          <React.Fragment key={`funnel-stage-${index}`}>
            {index > 0 && (
              <>
                <DropOffIndicator
                  dropOffRate={dropOffRate}
                  dropped={dropped}
                />
                <ChevronConnector />
              </>
            )}

            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{
                duration: 0.5,
                delay: index * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex flex-col items-center"
            >
              {/* Stage row container */}
              <div className="flex items-center w-full justify-center gap-2">
                {/* Left label — stage name */}
                <div className="w-[100px] text-right shrink-0 hidden sm:block">
                  <span className="text-xs font-medium text-muted-foreground truncate block">
                    {stage.name}
                  </span>
                </div>

                {/* Trapezoid bar */}
                <div
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{
                    width: `${widthPercent}%`,
                    minWidth: "160px",
                    height: "52px",
                  }}
                >
                  {/* Gradient background with clip-path trapezoid */}
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.12,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                      clipPath:
                        funnel.length === 1
                          ? "inset(0)"
                          : index === 0
                            ? "polygon(0 0, 100% 0, 96% 100%, 4% 100%)"
                            : index === funnel.length - 1
                              ? "polygon(4% 0, 96% 0, 100% 100%, 0 100%)"
                              : "polygon(2% 0, 98% 0, 96% 100%, 4% 100%)",
                      borderRadius: "6px",
                    }}
                  >
                    {/* Subtle inner shimmer */}
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
                      }}
                    />
                    {/* Subtle bottom highlight */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1/3 opacity-10"
                      style={{
                        background: `linear-gradient(to top, rgba(0,0,0,0.3), transparent)`,
                      }}
                    />
                  </motion.div>

                  {/* Centered content: candidate count */}
                  <div className="relative z-10 flex items-center gap-2">
                    {/* Mobile label */}
                    <span className="text-[11px] font-medium text-white/80 sm:hidden">
                      {stage.name}
                    </span>
                    <span className="text-lg font-bold text-white drop-shadow-sm">
                      {stage.value.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-[10px] text-white/70 font-medium hidden md:inline">
                      candidatos
                    </span>
                  </div>
                </div>

                {/* Right side — conversion badge */}
                <div className="w-[80px] shrink-0 flex justify-start hidden sm:flex">
                  {conversionRate > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.12 + 0.4,
                      }}
                    >
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 font-semibold gap-0.5"
                        style={{
                          backgroundColor: `${color}18`,
                          color: color,
                          borderColor: `${color}30`,
                        }}
                      >
                        <TrendingUp className="w-2.5 h-2.5" />
                        {conversionRate.toFixed(0)}%
                      </Badge>
                    </motion.div>
                  ) : (
                    <div className="w-[60px]" />
                  )}
                </div>
              </div>
            </motion.div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Custom Bar Chart Tooltip
   ───────────────────────────────────────────── */

function BarChartTooltip({
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
  }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-background border border-border rounded-xl shadow-xl p-3 min-w-[180px]">
      <p className="font-semibold text-sm mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground">
                {entry.name}
              </span>
            </div>
            <span className="text-xs font-semibold">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Premium Bar View
   ───────────────────────────────────────────── */

function PremiumBarView({
  data,
}: {
  data: PipelineFunnelProps["data"];
}) {
  if (!data) return null;

  const { barChart } = data;
  const avgConversion =
    barChart.length > 0
      ? barChart.reduce((sum, d) => sum + d.conversion, 0) / barChart.length
      : 0;

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={barChart}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          barCategoryGap="20%"
        >
          {/* Gradient definitions */}
          <defs>
            {barChart.map((_, index) => (
              <linearGradient
                key={`conv-grad-${index}`}
                id={`convGradient-${index}`}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop
                  offset="0%"
                  stopColor={CHART_COLORS.palette[0]}
                  stopOpacity={1}
                />
                <stop
                  offset="100%"
                  stopColor={CHART_COLORS.palette[1]}
                  stopOpacity={0.7}
                />
              </linearGradient>
            ))}
            {barChart.map((_, index) => (
              <linearGradient
                key={`drop-grad-${index}`}
                id={`dropGradient-${index}`}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop
                  offset="0%"
                  stopColor={CHART_COLORS.palette[7]}
                  stopOpacity={0.8}
                />
                <stop
                  offset="100%"
                  stopColor={CHART_COLORS.palette[7]}
                  stopOpacity={0.3}
                />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted"
            horizontal={false}
          />
          <XAxis
            type="number"
            className="text-xs"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            dataKey="name"
            type="category"
            className="text-xs"
            width={90}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip content={<BarChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
          <ReferenceLine
            x={avgConversion}
            stroke={CHART_COLORS.palette[3]}
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: `Média: ${avgConversion.toFixed(0)}%`,
              position: "top",
              fill: CHART_COLORS.palette[3],
              fontSize: 10,
              fontWeight: 600,
            }}
          />
          <Bar
            dataKey="conversion"
            name="Conversão %"
            radius={[0, 6, 6, 0]}
            maxBarSize={24}
            isAnimationActive
          >
            {barChart.map((_, index) => (
              <Cell
                key={`conv-cell-${index}`}
                fill={`url(#convGradient-${index})`}
              />
            ))}
          </Bar>
          <Bar
            dataKey="dropoff"
            name="Evasão %"
            radius={[0, 6, 6, 0]}
            maxBarSize={24}
            isAnimationActive
          >
            {barChart.map((_, index) => (
              <Cell
                key={`drop-cell-${index}`}
                fill={`url(#dropGradient-${index})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Funnel Legend
   ───────────────────────────────────────────── */

function FunnelLegend({ funnel }: { funnel: PipelineData[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: funnel.length * 0.12 + 0.2 }}
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-4 pt-3 border-t border-border/50"
    >
      {funnel.map((stage, index) => {
        const color =
          stage.fill ||
          CHART_COLORS.palette[index % CHART_COLORS.palette.length];
        return (
          <div key={`legend-${index}`} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-[11px] text-muted-foreground">
              {stage.name}
            </span>
          </div>
        );
      })}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main Pipeline Funnel Component
   ───────────────────────────────────────────── */

export function PipelineFunnel({ data }: PipelineFunnelProps) {
  const [view, setView] = React.useState<"funnel" | "bar">("funnel");

  /* Loading skeleton */
  if (!data) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Conversão do Funil</CardTitle>
          <CardDescription>Taxas de conversão por etapa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[340px] flex items-center justify-center">
            <div className="space-y-3 w-full px-4">
              <Skeleton className="h-4 w-32" />
              <div className="space-y-2">
                {[0.95, 0.8, 0.65, 0.5, 0.35].map((w, i) => (
                  <Skeleton
                    key={i}
                    className="h-[44px] mx-auto rounded-md"
                    style={{ width: `${w * 100}%` }}
                  />
                ))}
              </div>
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* Empty state */
  if (data.funnel.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversão do Funil</CardTitle>
          <CardDescription>Taxas de conversão por etapa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[340px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Minus className="w-8 h-8 opacity-40" />
            <p className="text-sm">Nenhum dado de pipeline disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCandidates = data.funnel[0]?.value ?? 0;
  const hiredCandidates =
    data.funnel.length > 0
      ? data.funnel[data.funnel.length - 1].value
      : 0;
  const overallConversion =
    totalCandidates > 0
      ? ((hiredCandidates / totalCandidates) * 100).toFixed(1)
      : "0";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Conversão do Funil</CardTitle>
            <CardDescription className="mt-0.5">
              Taxas de conversão por etapa
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {/* Summary stats */}
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                <strong className="text-foreground">
                  {totalCandidates.toLocaleString("pt-BR")}
                </strong>{" "}
                inscritos
              </span>
              <span className="text-border">|</span>
              <span>
                <strong className="text-foreground">
                  {hiredCandidates.toLocaleString("pt-BR")}
                </strong>{" "}
                contratados
              </span>
              <span className="text-border">|</span>
              <span>
                Conversão global:{" "}
                <strong className="text-emerald-600">{overallConversion}%</strong>
              </span>
            </div>
            <Tabs
              value={view}
              onValueChange={(v) => setView(v as "funnel" | "bar")}
            >
              <TabsList className="grid w-[140px] grid-cols-2 h-8">
                <TabsTrigger value="funnel" className="text-xs px-2">
                  Funil
                </TabsTrigger>
                <TabsTrigger value="bar" className="text-xs px-2">
                  Barras
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <AnimatePresence mode="wait">
          {view === "funnel" ? (
            <motion.div
              key="funnel-view"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="min-h-[340px] flex items-center justify-center">
                <div className="w-full max-w-[640px]">
                  <CustomFunnelView data={data} />
                  <FunnelLegend funnel={data.funnel} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="bar-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              <PremiumBarView data={data} />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
