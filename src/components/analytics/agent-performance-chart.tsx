"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_COLORS, formatDuration } from "@/lib/analytics/charts";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Clock,
  Zap,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

// ─── Props Interface ───────────────────────────────────────────────

interface AgentPerformanceChartProps {
  data?: {
    metrics: Array<{
      agentId: string;
      agentType: string;
      agentName: string;
      totalRuns: number;
      successRate: number;
      avgDuration: number;
      totalTokensUsed: number;
      lastRunAt: string | null;
      errorRate: number;
    }>;
    performanceChart: Array<{
      name: string;
      totalRuns: number;
      successRate: number;
      errorRate: number;
      avgDuration: number;
      fill?: string;
    }>;
    tokensChart: Array<{
      name: string;
      tokens: number;
      fill?: string;
    }>;
  };
}

// ─── Color Helpers ─────────────────────────────────────────────────

const ACCENT_COLORS = [
  { solid: "#3b82f6", light: "rgba(59,130,246,0.12)", glow: "rgba(59,130,246,0.25)" },
  { solid: "#10b981", light: "rgba(16,185,129,0.12)", glow: "rgba(16,185,129,0.25)" },
  { solid: "#f59e0b", light: "rgba(245,158,11,0.12)", glow: "rgba(245,158,11,0.25)" },
  { solid: "#8b5cf6", light: "rgba(139,92,246,0.12)", glow: "rgba(139,92,246,0.25)" },
  { solid: "#ec4899", light: "rgba(236,72,153,0.12)", glow: "rgba(236,72,153,0.25)" },
  { solid: "#06b6d4", light: "rgba(6,182,212,0.12)", glow: "rgba(6,182,212,0.25)" },
  { solid: "#84cc16", light: "rgba(132,204,22,0.12)", glow: "rgba(132,204,22,0.25)" },
  { solid: "#ef4444", light: "rgba(239,68,68,0.12)", glow: "rgba(239,68,68,0.25)" },
];

function getColor(index: number) {
  return ACCENT_COLORS[index % ACCENT_COLORS.length];
}

function getSuccessColor(rate: number): string {
  if (rate >= 80) return "#10b981";
  if (rate >= 60) return "#f59e0b";
  return "#ef4444";
}

function getSuccessGradient(rate: number): string {
  if (rate >= 80) return "from-emerald-500 to-teal-400";
  if (rate >= 60) return "from-amber-500 to-yellow-400";
  return "from-red-500 to-rose-400";
}

// ─── Animated Circular Progress ────────────────────────────────────

function CircularGauge({
  value,
  size = 80,
  strokeWidth = 6,
  color,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = React.useState(circumference);
  const strokeColor = color || getSuccessColor(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (value / 100) * circumference);
    }, 100);
    return () => clearTimeout(timer);
  }, [value, circumference]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Animated progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
            filter: `drop-shadow(0 0 6px ${strokeColor}40)`,
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: strokeColor }}
        >
          {value.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ─── Stat Pill ─────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  accentColor,
  subValue,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accentColor: { solid: string; light: string; glow: string };
  subValue?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative flex items-center gap-3 rounded-xl px-4 py-3 backdrop-blur-xl border"
      style={{
        background: `linear-gradient(135deg, ${accentColor.light}, rgba(255,255,255,0.06))`,
        borderColor: `${accentColor.solid}18`,
        boxShadow: `0 4px 24px ${accentColor.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-lg w-10 h-10 shrink-0"
        style={{
          background: `linear-gradient(135deg, ${accentColor.solid}, ${accentColor.solid}cc)`,
          boxShadow: `0 2px 8px ${accentColor.glow}`,
        }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p
            className="text-lg font-bold tabular-nums leading-tight"
            style={{ color: accentColor.solid }}
          >
            {value}
          </p>
          {subValue && (
            <span className="text-[10px] text-muted-foreground">{subValue}</span>
          )}
        </div>
      </div>
      {/* Shine effect */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 55%, transparent 60%)`,
        }}
      />
    </motion.div>
  );
}

// ─── Agent Performance Card ────────────────────────────────────────

function AgentCard({
  agent,
  index,
}: {
  agent: {
    agentId: string;
    agentType: string;
    agentName: string;
    totalRuns: number;
    successRate: number;
    avgDuration: number;
    totalTokensUsed: number;
    lastRunAt: string | null;
    errorRate: number;
  };
  index: number;
}) {
  const color = getColor(index);
  const successColor = getSuccessColor(agent.successRate);
  const [hovered, setHovered] = React.useState(false);

  const formatTimestamp = (dateStr: string | null) => {
    if (!dateStr) return "Nunca executado";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `Há ${diffMins}min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    if (diffDays < 7) return `Há ${diffDays}d`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative"
    >
      {/* Animated gradient border on hover */}
      <div
        className="absolute -inset-[1px] rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: hovered
            ? `conic-gradient(from 0deg, ${color.solid}, ${color.solid}66, ${color.solid})`
            : "transparent",
          animation: hovered ? "spin 3s linear infinite" : "none",
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Card content */}
      <div
        className="relative rounded-xl border bg-card/80 backdrop-blur-sm p-5 transition-all duration-300 group-hover:shadow-lg"
        style={{
          boxShadow: hovered ? `0 8px 32px ${color.glow}` : "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex items-center justify-center rounded-lg w-9 h-9 shrink-0 text-sm font-bold"
              style={{
                background: color.light,
                color: color.solid,
              }}
            >
              {agent.agentName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate">
                {agent.agentName}
              </h3>
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 font-medium mt-0.5"
                style={{
                  backgroundColor: color.light,
                  color: color.solid,
                  borderColor: `${color.solid}20`,
                }}
              >
                {agent.agentType}
              </Badge>
            </div>
          </div>
        </div>

        {/* Circular gauge + stats */}
        <div className="flex items-center gap-4 mb-4">
          <CircularGauge value={agent.successRate} size={72} strokeWidth={5} />

          <div className="flex-1 space-y-2.5">
            {/* Executions */}
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Execuções</span>
              <span className="text-xs font-semibold ml-auto tabular-nums">
                {agent.totalRuns}
              </span>
            </div>
            {/* Avg duration */}
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Duração média</span>
              <span className="text-xs font-semibold ml-auto tabular-nums">
                {formatDuration(agent.avgDuration)}
              </span>
            </div>
            {/* Tokens */}
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Tokens</span>
              <span className="text-xs font-semibold ml-auto tabular-nums">
                {agent.totalTokensUsed.toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        {/* Error rate bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-[11px] text-muted-foreground">Taxa de Erro</span>
            </div>
            <span
              className="text-[11px] font-semibold tabular-nums"
              style={{ color: agent.errorRate > 10 ? "#ef4444" : "#6b7280" }}
            >
              {agent.errorRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(agent.errorRate * 5, 100)}%` }}
              transition={{ duration: 0.8, delay: 0.3 + index * 0.08, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background:
                  agent.errorRate > 10
                    ? "linear-gradient(90deg, #ef4444, #f87171)"
                    : "linear-gradient(90deg, #6b7280, #9ca3af)",
              }}
            />
          </div>
        </div>

        {/* Footer: last run */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
          <Zap className="w-3 h-3 text-muted-foreground/60" />
          <span className="text-[10px] text-muted-foreground/70">
            Última execução: {formatTimestamp(agent.lastRunAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Token Bar (animated) ─────────────────────────────────────────

function TokenBar({
  name,
  tokens,
  maxTokens,
  color,
  index,
}: {
  name: string;
  tokens: number;
  maxTokens: number;
  color: { solid: string; light: string; glow: string };
  index: number;
}) {
  const percentage = maxTokens > 0 ? (tokens / maxTokens) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
      className="group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color.solid, boxShadow: `0 0 6px ${color.glow}` }}
          />
          <span className="text-sm font-medium truncate">{name}</span>
        </div>
        <span
          className="text-sm font-bold tabular-nums ml-2"
          style={{ color: color.solid }}
        >
          {tokens.toLocaleString("pt-BR")}
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted/40 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 0.9,
            delay: 0.2 + index * 0.07,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="h-full rounded-full relative"
          style={{
            background: `linear-gradient(90deg, ${color.solid}, ${color.solid}aa)`,
            boxShadow: `0 0 12px ${color.glow}`,
          }}
        >
          {/* Inner shine */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 60%)",
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Empty / Loading States ────────────────────────────────────────

function LoadingState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance dos Agentes de IA</CardTitle>
        <CardDescription>Tarefas concluídas, taxa de sucesso e uso de tokens</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 flex-1 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance dos Agentes de IA</CardTitle>
        <CardDescription>Tarefas concluídas, taxa de sucesso e uso de tokens</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-3">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Activity className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium">Nenhum dado de performance disponível</p>
          <p className="text-xs text-muted-foreground/70">
            Os dados aparecerão quando os agentes de IA forem executados
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function AgentPerformanceChart({ data }: AgentPerformanceChartProps) {
  const [activeTab, setActiveTab] = React.useState<string>("cards");

  if (!data) return <LoadingState />;
  if (data.metrics.length === 0) return <EmptyState />;

  // Calculate summary stats
  const totalRuns = data.metrics.reduce((sum, m) => sum + m.totalRuns, 0);
  const avgSuccessRate =
    data.metrics.length > 0
      ? data.metrics.reduce((sum, m) => sum + m.successRate, 0) /
        data.metrics.length
      : 0;
  const totalTokens = data.metrics.reduce(
    (sum, m) => sum + m.totalTokensUsed,
    0
  );

  // Max tokens for bar chart scaling
  const maxTokens = Math.max(...data.tokensChart.map((t) => t.tokens), 1);

  return (
    <Card className="overflow-hidden">
      {/* Gradient accent top bar */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500" />

      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Activity className="w-4 h-4 text-white" />
              </div>
              Performance dos Agentes de IA
            </CardTitle>
            <CardDescription className="mt-1">
              Tarefas concluídas, taxa de sucesso e uso de tokens
            </CardDescription>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-auto"
          >
            <TabsList className="h-9">
              <TabsTrigger value="cards" className="text-xs px-3 gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                Agentes
              </TabsTrigger>
              <TabsTrigger value="tokens" className="text-xs px-3 gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Tokens
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* ── Summary Stats Bar ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatPill
            icon={Activity}
            label="Total Execuções"
            value={totalRuns.toLocaleString("pt-BR")}
            accentColor={ACCENT_COLORS[0]}
          />
          <StatPill
            icon={CheckCircle2}
            label="Taxa de Sucesso"
            value={`${avgSuccessRate.toFixed(1)}%`}
            accentColor={ACCENT_COLORS[1]}
            subValue="média geral"
          />
          <StatPill
            icon={Cpu}
            label="Tokens Consumidos"
            value={totalTokens.toLocaleString("pt-BR")}
            accentColor={ACCENT_COLORS[4]}
          />
        </div>

        {/* ── Tab Content ────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === "cards" ? (
            <motion.div
              key="cards-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                {data.metrics.map((agent, index) => (
                  <AgentCard key={agent.agentId} agent={agent} index={index} />
                ))}
              </div>
              {/* Custom scrollbar styles */}
              <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(139,92,246,0.2);
                  border-radius: 999px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(139,92,246,0.4);
                }
              `}</style>
            </motion.div>
          ) : (
            <motion.div
              key="tokens-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar"
            >
              {data.tokensChart.map((item, index) => (
                <TokenBar
                  key={item.name}
                  name={item.name}
                  tokens={item.tokens}
                  maxTokens={maxTokens}
                  color={getColor(index)}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
