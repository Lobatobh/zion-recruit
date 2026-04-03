"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Sector,
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
import { CHART_COLORS } from "@/lib/analytics/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  Target,
  Users,
  TrendingUp,
  Award,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SourceChartProps {
  data?: {
    metrics: Array<{
      source: string;
      applications: number;
      hires: number;
      conversionRate: number;
      avgTimeToHire: number;
    }>;
    pieChart: Array<{
      name: string;
      value: number;
      hires: number;
      conversionRate: number;
      fill?: string;
    }>;
    barChart: Array<{
      name: string;
      applications: number;
      hires: number;
      conversionRate: number;
    }>;
  };
}

// ─── Color Helpers ───────────────────────────────────────────────────────────

function lightenColor(hsl: string, amount: number): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hsl;
  const h = parseInt(match[1]);
  const s = parseInt(match[2]);
  const l = Math.min(95, parseInt(match[3]) + amount);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function withAlpha(hsl: string, alpha: number): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hsl;
  return `hsla(${match[1]}, ${match[2]}%, ${match[3]}%, ${alpha})`;
}

// ─── Donut Active Shape ──────────────────────────────────────────────────────

interface ActiveShapePayload {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: {
    name: string;
    value: number;
    hires: number;
    conversionRate: number;
  };
  percent: number;
}

function ActiveDonutShape(props: ActiveShapePayload) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
  } = props;

  const extendedOuter = outerRadius + 12;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={extendedOuter}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
        style={{
          filter: `drop-shadow(0 0 8px ${withAlpha(fill, 0.5)})`,
          cursor: "pointer",
        }}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={extendedOuter - 2}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={withAlpha(fill, 0.3)}
        style={{ cursor: "pointer" }}
      />
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fill="currentColor"
        fontSize={18}
        fontWeight={700}
        className="fill-foreground"
      >
        {payload.value}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fill="currentColor"
        fontSize={11}
        className="fill-muted-foreground"
      >
        {payload.name}
      </text>
    </g>
  );
}

// ─── Custom Pie Label ────────────────────────────────────────────────────────

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
  index: number;
}

function renderCustomLabel(props: PieLabelProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, index } =
    props;
  if (percent < 0.04) return null;

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const lineEndX = cx + (outerRadius + 8) * Math.cos(-midAngle * RADIAN);
  const lineEndY = cy + (outerRadius + 8) * Math.sin(-midAngle * RADIAN);

  const color = CHART_COLORS.palette[index % CHART_COLORS.palette.length];

  return (
    <g>
      <line
        x1={lineEndX}
        y1={lineEndY}
        x2={x - (x > cx ? 6 : -6)}
        y2={y}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.5}
      />
      <circle cx={lineEndX} cy={lineEndY} r={2} fill={color} fillOpacity={0.7} />
      <text
        x={x + (x > cx ? 4 : -4)}
        y={y}
        textAnchor={x > cx ? "start" : "end"}
        fill="currentColor"
        fontSize={11}
        fontWeight={500}
        className="fill-foreground"
      >
        {name}
      </text>
      <text
        x={x + (x > cx ? 4 : -4)}
        y={y + 14}
        textAnchor={x > cx ? "start" : "end"}
        fill="currentColor"
        fontSize={10}
        className="fill-muted-foreground"
      >
        {(percent * 100).toFixed(1)}%
      </text>
    </g>
  );
}

// ─── Custom Donut Tooltip ────────────────────────────────────────────────────

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      name: string;
      value: number;
      hires: number;
      conversionRate: number;
    };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 p-4 shadow-2xl backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: d.value }}
        />
        <span className="text-sm font-semibold">{d.name}</span>
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-6 text-xs">
          <span className="text-muted-foreground">Candidaturas</span>
          <span className="font-medium">{d.value}</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-xs">
          <span className="text-muted-foreground">Contratações</span>
          <span className="font-medium">{d.hires}</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-xs">
          <span className="text-muted-foreground">Conversão</span>
          <span
            className="font-medium"
            style={{
              color:
                d.conversionRate > 20
                  ? "hsl(160, 84%, 39%)"
                  : d.conversionRate > 10
                    ? "hsl(45, 93%, 47%)"
                    : "hsl(0, 84%, 60%)",
            }}
          >
            {d.conversionRate}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Bar Tooltip ──────────────────────────────────────────────────────

function BarTooltip({
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
  if (!active || !payload?.length) return null;
  const convEntry = payload.find((p) => p.dataKey === "conversionRate");
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 p-4 shadow-2xl backdrop-blur-sm min-w-[180px]">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div className="grid gap-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
        {convEntry && (
          <div className="mt-1.5 border-t border-border/50 pt-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Conversão</span>
            <span className="font-semibold">{convEntry.value}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Gradient Definitions ────────────────────────────────────────────────────

function ChartGradientDefs({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <defs>
      {data.map((_, index) => {
        const color = CHART_COLORS.palette[index % CHART_COLORS.palette.length];
        return (
          <linearGradient
            key={`donut-grad-${index}`}
            id={`donut-gradient-${index}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={lightenColor(color, 18)} stopOpacity={1} />
          </linearGradient>
        );
      })}
    </defs>
  );
}

function BarGradientDefs() {
  return (
    <defs>
      <linearGradient id="bar-grad-applications" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={CHART_COLORS.palette[0]} stopOpacity={0.85} />
        <stop offset="100%" stopColor={lightenColor(CHART_COLORS.palette[0], 15)} stopOpacity={1} />
      </linearGradient>
      <linearGradient id="bar-grad-hires" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={CHART_COLORS.palette[1]} stopOpacity={0.85} />
        <stop offset="100%" stopColor={lightenColor(CHART_COLORS.palette[1], 15)} stopOpacity={1} />
      </linearGradient>
    </defs>
  );
}

// ─── Center Label ────────────────────────────────────────────────────────────

function CenterLabel({ total }: { total: number }) {
  return (
    <g>
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize={28}
        fontWeight={800}
        className="fill-foreground"
      >
        {total}
      </text>
      <text
        x="50%"
        y="58%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize={11}
        fontWeight={500}
        className="fill-muted-foreground"
      >
        Total Candidaturas
      </text>
    </g>
  );
}

// ─── Conversion Badge Helper ─────────────────────────────────────────────────

function ConversionBadge({ rate }: { rate: number }) {
  const color =
    rate > 20
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      : rate > 10
        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
        : "bg-red-500/10 text-red-500 border-red-500/20";

  const icon =
    rate > 20 ? (
      <ArrowUpRight className="h-3 w-3" />
    ) : rate > 10 ? (
      <Minus className="h-3 w-3" />
    ) : (
      <ArrowDownRight className="h-3 w-3" />
    );

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${color}`}
    >
      {icon}
      {rate}%
    </span>
  );
}

// ─── Source Effectiveness Table ──────────────────────────────────────────────

function SourceEffectivenessTable({
  metrics,
}: {
  metrics: SourceChartProps["data"]["metrics"];
}) {
  if (!metrics || metrics.length === 0) return null;

  const bestSource = metrics.reduce((best, m) =>
    m.conversionRate > best.conversionRate ? m : best
  , metrics[0]);

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border/50 bg-muted/20">
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
        <Target className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Efetividade por Fonte
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                Fonte
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> Candidaturas
                </span>
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Award className="h-3 w-3" /> Contratações
                </span>
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Taxa Conversão
                </span>
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Tempo Médio
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => {
              const isBest = m.source === bestSource.source;
              return (
                <tr
                  key={i}
                  className={`border-b border-border/20 transition-colors last:border-0 ${
                    isBest
                      ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                      : "hover:bg-muted/30"
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            CHART_COLORS.palette[i % CHART_COLORS.palette.length],
                        }}
                      />
                      <span className="font-medium truncate max-w-[140px]">{m.source}</span>
                      {isBest && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border-emerald-500/20 shrink-0"
                        >
                          TOP
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {m.applications}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {m.hires}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ConversionBadge rate={m.conversionRate} />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {m.avgTimeToHire}d
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Conversion Rate Labels for Bar Chart ────────────────────────────────────

interface ConvLabelProps {
  x?: number;
  y?: number;
  width?: number;
  value?: number;
}

function ConversionLabel(props: ConvLabelProps) {
  const { x = 0, y = 0, width = 0, value = 0 } = props;
  return (
    <text
      x={x + width + 8}
      y={y + 16}
      fontSize={11}
      fontWeight={600}
      fill="currentColor"
      className="fill-muted-foreground"
      textAnchor="start"
    >
      {value}%
    </text>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SourceChart({ data }: SourceChartProps) {
  const [view, setView] = React.useState<"donut" | "bar">("donut");
  const [activeIndex, setActiveIndex] = React.useState(-1);

  // Donut total count
  const totalCandidaturas = data?.pieChart.reduce((sum, d) => sum + d.value, 0) ?? 0;

  if (!data) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Eficiência por Fonte</CardTitle>
              <CardDescription>
                Candidaturas e contratações por fonte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-[340px] flex items-center justify-center">
              <div className="space-y-3 w-full px-4">
                <Skeleton className="h-4 w-48 mx-auto" />
                <Skeleton className="h-[220px] w-[220px] rounded-full mx-auto" />
                <Skeleton className="h-12 w-64 mx-auto" />
              </div>
            </div>
            <Skeleton className="h-[200px] w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.barChart.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Eficiência por Fonte</CardTitle>
              <CardDescription>
                Candidaturas e contratações por fonte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[340px] flex items-center justify-center text-muted-foreground">
            Nenhum dado de fonte disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Eficiência por Fonte</CardTitle>
            <CardDescription>
              Candidaturas e contratações por fonte
            </CardDescription>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as "donut" | "bar")}>
            <TabsList className="grid w-[180px] grid-cols-2 h-8">
              <TabsTrigger value="donut" className="text-xs gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-border" />
                Rosca
              </TabsTrigger>
              <TabsTrigger value="bar" className="text-xs gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-border" />
                Barras
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart Area */}
        <div className="h-[340px]">
          {view === "donut" ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartGradientDefs data={data.pieChart} />
                <Pie
                  data={data.pieChart}
                  cx="50%"
                  cy="45%"
                  innerRadius={75}
                  outerRadius={115}
                  paddingAngle={3}
                  dataKey="value"
                  activeIndex={activeIndex}
                  activeShape={(props: ActiveShapePayload) => (
                    <ActiveDonutShape {...props} />
                  )}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(-1)}
                  label={renderCustomLabel}
                  labelLine={false}
                  strokeWidth={0}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {data.pieChart.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#donut-gradient-${index})`}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                <CenterLabel total={totalCandidaturas} />
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.barChart}
                layout="vertical"
                margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                barCategoryGap="20%"
              >
                <BarGradientDefs />
                <CartesianGrid
                  strokeDasharray="3 3"
                  strokeOpacity={0.08}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={{ strokeOpacity: 0.1 }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  className="text-xs"
                  width={110}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<BarTooltip />}
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                />
                <Bar
                  dataKey="applications"
                  name="Candidaturas"
                  fill="url(#bar-grad-applications)"
                  radius={[0, 6, 6, 0]}
                  animationBegin={0}
                  animationDuration={900}
                  animationEasing="ease-out"
                  barSize={18}
                />
                <Bar
                  dataKey="hires"
                  name="Contratações"
                  fill="url(#bar-grad-hires)"
                  radius={[0, 6, 6, 0]}
                  animationBegin={200}
                  animationDuration={900}
                  animationEasing="ease-out"
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut Legend */}
        {view === "donut" && (
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {data.pieChart.map((entry, index) => {
              const color =
                CHART_COLORS.palette[index % CHART_COLORS.palette.length];
              const pct =
                totalCandidaturas > 0
                  ? ((entry.value / totalCandidaturas) * 100).toFixed(1)
                  : "0.0";
              return (
                <div
                  key={`legend-${index}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50 cursor-default"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 6px ${withAlpha(color, 0.4)}`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium leading-tight">
                      {entry.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {entry.value} · {pct}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bar Legend */}
        {view === "bar" && (
          <div className="mt-2 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-6 rounded-sm"
                style={{
                  background: `linear-gradient(90deg, ${CHART_COLORS.palette[0]}dd, ${lightenColor(CHART_COLORS.palette[0], 15)})`,
                }}
              />
              <span className="text-xs text-muted-foreground">Candidaturas</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-6 rounded-sm"
                style={{
                  background: `linear-gradient(90deg, ${CHART_COLORS.palette[1]}dd, ${lightenColor(CHART_COLORS.palette[1], 15)})`,
                }}
              />
              <span className="text-xs text-muted-foreground">Contratações</span>
            </div>
          </div>
        )}

        {/* Source Effectiveness Table */}
        <SourceEffectivenessTable metrics={data.metrics} />
      </CardContent>
    </Card>
  );
}
