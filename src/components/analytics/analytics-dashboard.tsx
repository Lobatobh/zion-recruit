"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Users,
  Bot,
  RefreshCw,
  Sparkles,
  Send,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  MessageCircle,
} from "lucide-react";
import { DateRangePicker } from "./date-range-picker";
import { ExportButton } from "./export-button";
import { OverviewCards } from "./overview-cards";
import { PipelineFunnel } from "./pipeline-funnel";
import { SourceChart } from "./source-chart";
import { TimeToHireChart } from "./time-to-hire-chart";
import { AgentPerformanceChart } from "./agent-performance-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

interface OverviewData {
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
}

interface PipelineMetrics {
  stageName: string;
  stageOrder: number;
  candidatesCount: number;
  conversionRate: number;
  dropOffRate: number;
}

interface PipelineData {
  metrics: PipelineMetrics[];
  funnel: Array<{
    name: string;
    value: number;
    conversionRate?: number;
    fill?: string;
  }>;
  barChart: Array<{
    name: string;
    conversion: number;
    dropoff: number;
    candidates: number;
  }>;
}

interface SourceMetrics {
  source: string;
  applications: number;
  hires: number;
  conversionRate: number;
  avgTimeToHire: number;
}

interface SourceData {
  metrics: SourceMetrics[];
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
}

interface TimeToHireData {
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
}

interface AgentMetricsItem {
  agentId: string;
  agentType: string;
  agentName: string;
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  totalTokensUsed: number;
  lastRunAt: string | null;
  errorRate: number;
}

interface AgentPerformanceData {
  metrics: AgentMetricsItem[];
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
}

interface AIInsight {
  summary: string;
  highlights: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  alerts: Array<{
    severity: "warning" | "danger";
    title: string;
    description: string;
    suggestion: string;
  }>;
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
  }>;
  predictions: Array<{
    metric: string;
    currentValue: number;
    predictedValue: number;
    confidence: number;
    trend: "up" | "down" | "stable";
  }>;
  score: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ============================================
// Sub-components
// ============================================

function HealthScoreCircle({
  score,
  size = 80,
}: {
  score: number;
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeDasharray={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{score}</span>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <ArrowUpRight className="h-4 w-4 text-green-500" />;
  if (trend === "down")
    return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-yellow-500" />;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const color =
    confidence >= 80
      ? "bg-green-500"
      : confidence >= 60
        ? "bg-yellow-500"
        : "bg-red-500";
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {confidence}%
      </span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const config = {
    high: {
      label: "Alta",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    medium: {
      label: "Média",
      className:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    low: {
      label: "Baixa",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
  };
  const c = config[priority];
  return <Badge variant="outline" className={cn("text-xs font-medium", c.className)}>{c.label}</Badge>;
}

// ============================================
// Container animation variants
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// ============================================
// Main Component
// ============================================

export function AnalyticsDashboard() {
  const { data: session, status } = useSession();
  const tenantId = session?.user?.tenantId || "";

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [refreshKey, setRefreshKey] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState("overview");

  // Data states
  const [overview, setOverview] = React.useState<OverviewData | null>(null);
  const [pipeline, setPipeline] = React.useState<PipelineData | null>(null);
  const [sources, setSources] = React.useState<SourceData | null>(null);
  const [timeToHire, setTimeToHire] = React.useState<TimeToHireData | null>(null);
  const [agentPerformance, setAgentPerformance] =
    React.useState<AgentPerformanceData | null>(null);

  const [loading, setLoading] = React.useState({
    overview: false,
    pipeline: false,
    sources: false,
    timeToHire: false,
    agentPerformance: false,
  });

  // AI states
  const [aiInsights, setAiInsights] = React.useState<AIInsight | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [chatLoading, setChatLoading] = React.useState(false);
  const [showInsights, setShowInsights] = React.useState(true);

  // ---- Fetch data functions ----

  const fetchOverview = React.useCallback(async () => {
    setLoading((l) => ({ ...l, overview: true }));
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.set("endDate", dateRange.to.toISOString());
      const response = await fetch(`/api/analytics/overview?${params}`);
      const data = await response.json();
      if (data.success) setOverview(data.data);
      else toast.error(data.error || "Erro ao buscar métricas gerais");
    } catch {
      toast.error("Erro de conexão ao buscar métricas gerais");
    } finally {
      setLoading((l) => ({ ...l, overview: false }));
    }
  }, [dateRange]);

  const fetchPipeline = React.useCallback(async () => {
    setLoading((l) => ({ ...l, pipeline: true }));
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.set("endDate", dateRange.to.toISOString());
      const response = await fetch(`/api/analytics/pipeline?${params}`);
      const data = await response.json();
      if (data.success) setPipeline(data.data);
      else toast.error(data.error || "Erro ao buscar métricas do pipeline");
    } catch {
      toast.error("Erro de conexão ao buscar métricas do pipeline");
    } finally {
      setLoading((l) => ({ ...l, pipeline: false }));
    }
  }, [dateRange]);

  const fetchSources = React.useCallback(async () => {
    setLoading((l) => ({ ...l, sources: true }));
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.set("endDate", dateRange.to.toISOString());
      const response = await fetch(`/api/analytics/sources?${params}`);
      const data = await response.json();
      if (data.success) setSources(data.data);
      else toast.error(data.error || "Erro ao buscar métricas de fontes");
    } catch {
      toast.error("Erro de conexão ao buscar métricas de fontes");
    } finally {
      setLoading((l) => ({ ...l, sources: false }));
    }
  }, [dateRange]);

  const fetchTimeToHire = React.useCallback(async () => {
    setLoading((l) => ({ ...l, timeToHire: true }));
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.set("endDate", dateRange.to.toISOString());
      const response = await fetch(`/api/analytics/time-to-hire?${params}`);
      const data = await response.json();
      if (data.success) setTimeToHire(data.data);
      else toast.error(data.error || "Erro ao buscar métricas de tempo de contratação");
    } catch {
      toast.error("Erro de conexão ao buscar tempo de contratação");
    } finally {
      setLoading((l) => ({ ...l, timeToHire: false }));
    }
  }, [dateRange]);

  const fetchAgentPerformance = React.useCallback(async () => {
    setLoading((l) => ({ ...l, agentPerformance: true }));
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.set("endDate", dateRange.to.toISOString());
      const response = await fetch(`/api/analytics/agent-performance?${params}`);
      const data = await response.json();
      if (data.success) setAgentPerformance(data.data);
      else toast.error(data.error || "Erro ao buscar performance dos agentes");
    } catch {
      toast.error("Erro de conexão ao buscar performance dos agentes");
    } finally {
      setLoading((l) => ({ ...l, agentPerformance: false }));
    }
  }, [dateRange]);

  // ---- AI functions ----

  const fetchAIInsights = React.useCallback(async () => {
    if (!overview || !pipeline || !sources || !timeToHire || !agentPerformance) return;
    setAiLoading(true);
    try {
      const response = await fetch("/api/analytics/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overview, pipeline, sources, timeToHire, agentPerformance, dateRange }),
      });
      const data = await response.json();
      if (data.success) {
        setAiInsights(data.data);
      } else {
        toast.error(data.error || "Erro ao gerar insights com IA");
      }
    } catch {
      toast.error("Erro de conexão ao gerar insights com IA");
    } finally {
      setAiLoading(false);
    }
  }, [overview, pipeline, sources, timeToHire, agentPerformance, dateRange]);

  const sendChatMessage = React.useCallback(
    async (message: string) => {
      const userMsg: ChatMessage = {
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMsg]);
      setChatLoading(true);
      setChatInput("");

      try {
        const response = await fetch("/api/analytics/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            context: { overview, pipeline, sources, timeToHire, agentPerformance },
            history: chatMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await response.json();
        if (data.success) {
          const aiMsg: ChatMessage = {
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, aiMsg]);
        } else {
          const errMsg: ChatMessage = {
            role: "assistant",
            content: "Desculpe, não consegui processar sua pergunta. Tente novamente.",
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, errMsg]);
        }
      } catch {
        const errMsg: ChatMessage = {
          role: "assistant",
          content: "Erro de conexão. Verifique sua internet e tente novamente.",
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errMsg]);
      } finally {
        setChatLoading(false);
      }
    },
    [overview, pipeline, sources, timeToHire, agentPerformance, chatMessages],
  );

  // ---- Effects ----

  // Fetch all data on mount and when date range / refresh changes
  const allDataReady = overview && pipeline && sources && timeToHire && agentPerformance;

  React.useEffect(() => {
    if (!tenantId) return;
    fetchOverview();
    fetchPipeline();
    fetchSources();
    fetchTimeToHire();
    fetchAgentPerformance();
  }, [fetchOverview, fetchPipeline, fetchSources, fetchTimeToHire, fetchAgentPerformance, refreshKey, tenantId]);

  // Auto-fetch AI insights when all data is loaded
  React.useEffect(() => {
    if (allDataReady) {
      fetchAIInsights();
    }
  }, [allDataReady, fetchAIInsights]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  // ---- Loading state ----

  if (status === "loading") {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded bg-white/20" />
              <Skeleton className="h-7 w-48 bg-white/20" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-36 bg-white/20" />
              <Skeleton className="h-9 w-24 bg-white/20" />
              <Skeleton className="h-9 w-9 bg-white/20" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Unauthorized state ----

  if (!session || !tenantId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Acesso Negado</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Faça login para acessar o painel de analytics.
        </p>
      </div>
    );
  }

  // ---- Quick actions for chat ----

  const quickActions = [
    "Qual o gargalo do pipeline?",
    "Melhor fonte de candidatos?",
    "Previsão de contratações",
  ];

  // ---- Render ----

  return (
    <div className="flex flex-col h-full">
      {/* ============================================= */}
      {/* Header Bar - Gradient                         */}
      {/* ============================================= */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row sm:h-16 items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-0">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-white" />
            <h1 className="text-2xl font-semibold text-white">Analytics AI</h1>
            <Badge className="bg-white/20 text-white border-white/30 text-xs font-medium">
              IA
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <ExportButton dateRange={dateRange} />
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-9 w-9"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              className="bg-white text-emerald-700 hover:bg-white/90 font-medium shadow-sm text-sm h-9"
              onClick={() => fetchAIInsights()}
              disabled={aiLoading || !allDataReady}
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              Gerar Insights IA
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================= */}
      {/* Main Content                                  */}
      {/* ============================================= */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* ============================================= */}
        {/* AI Insights Hero Panel                        */}
        {/* ============================================= */}
        <AnimatePresence>
          {showInsights && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden mb-6"
            >
              {aiLoading && !aiInsights ? (
                /* Loading skeleton for AI insights */
                <Card className="border-2 border-transparent bg-gradient-to-br from-white to-muted/30 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex flex-col items-center gap-2">
                        <Skeleton className="h-20 w-20 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    </div>
                    <Separator className="my-5" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="h-5 w-28" />
                          <Skeleton className="h-16 w-full rounded-lg" />
                          <Skeleton className="h-16 w-full rounded-lg" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : aiInsights ? (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-white to-emerald-50/50 dark:from-background dark:to-emerald-950/20 shadow-lg overflow-hidden">
                    <CardContent className="p-4 sm:p-6">
                      {/* Top section: Score + Summary + Toggle */}
                      <motion.div
                        variants={itemVariants}
                        className="flex flex-col sm:flex-row items-start gap-5"
                      >
                        {/* Health Score */}
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <HealthScoreCircle score={aiInsights.score} size={88} />
                          <span className="text-xs text-muted-foreground font-medium">
                            Saúde Geral
                          </span>
                        </div>

                        {/* Summary */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Lightbulb className="h-4 w-4 text-emerald-600" />
                            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                              Resumo da IA
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {aiInsights.summary}
                          </p>
                        </div>

                        {/* Collapse button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 self-start"
                          onClick={() => setShowInsights(false)}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                      </motion.div>

                      <Separator className="my-5" />

                      {/* Grid of 4 sections */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {/* Highlights */}
                        {aiInsights.highlights.length > 0 && (
                          <motion.div variants={itemVariants} className="space-y-2.5">
                            <div className="flex items-center gap-1.5">
                              <Target className="h-4 w-4 text-green-600" />
                              <h4 className="text-sm font-semibold">Destaques</h4>
                            </div>
                            <div className="space-y-2">
                              {aiInsights.highlights.map((h, i) => (
                                <motion.div
                                  key={i}
                                  variants={itemVariants}
                                  className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20 p-3"
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="text-base mt-0.5">{h.icon}</span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-green-800 dark:text-green-300">
                                        {h.title}
                                      </p>
                                      <p className="text-xs text-green-700/70 dark:text-green-400/70 mt-0.5">
                                        {h.description}
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {/* Alerts */}
                        {aiInsights.alerts.length > 0 && (
                          <motion.div variants={itemVariants} className="space-y-2.5">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                              <h4 className="text-sm font-semibold">Alertas</h4>
                            </div>
                            <div className="space-y-2">
                              {aiInsights.alerts.map((a, i) => (
                                <motion.div
                                  key={i}
                                  variants={itemVariants}
                                  className={cn(
                                    "rounded-lg border p-3",
                                    a.severity === "danger"
                                      ? "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20"
                                      : "border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20",
                                  )}
                                >
                                  <p
                                    className={cn(
                                      "text-xs font-semibold",
                                      a.severity === "danger"
                                        ? "text-red-800 dark:text-red-300"
                                        : "text-amber-800 dark:text-amber-300",
                                    )}
                                  >
                                    {a.title}
                                  </p>
                                  <p
                                    className={cn(
                                      "text-xs mt-0.5",
                                      a.severity === "danger"
                                        ? "text-red-700/70 dark:text-red-400/70"
                                        : "text-amber-700/70 dark:text-amber-400/70",
                                    )}
                                  >
                                    {a.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    💡 {a.suggestion}
                                  </p>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {/* Recommendations */}
                        {aiInsights.recommendations.length > 0 && (
                          <motion.div variants={itemVariants} className="space-y-2.5">
                            <div className="flex items-center gap-1.5">
                              <Lightbulb className="h-4 w-4 text-blue-600" />
                              <h4 className="text-sm font-semibold">Recomendações</h4>
                            </div>
                            <div className="space-y-2">
                              {aiInsights.recommendations.map((r, i) => (
                                <motion.div
                                  key={i}
                                  variants={itemVariants}
                                  className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-3"
                                >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <PriorityBadge priority={r.priority} />
                                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 truncate">
                                      {r.title}
                                    </p>
                                  </div>
                                  <p className="text-xs text-blue-700/70 dark:text-blue-400/70">
                                    {r.description}
                                  </p>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {/* Predictions */}
                        {aiInsights.predictions.length > 0 && (
                          <motion.div variants={itemVariants} className="space-y-2.5">
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="h-4 w-4 text-purple-600" />
                              <h4 className="text-sm font-semibold">Predições</h4>
                            </div>
                            <div className="space-y-2">
                              {aiInsights.predictions.map((p, i) => (
                                <motion.div
                                  key={i}
                                  variants={itemVariants}
                                  className="rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 p-3"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-semibold text-purple-800 dark:text-purple-300">
                                      {p.metric}
                                    </p>
                                    <TrendIcon trend={p.trend} />
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-purple-700/70 dark:text-purple-400/70">
                                    <span>
                                      {p.currentValue} →{" "}
                                      <span className="font-semibold text-purple-800 dark:text-purple-300">
                                        {p.predictedValue}
                                      </span>
                                    </span>
                                  </div>
                                  <ConfidenceBar confidence={p.confidence} />
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Insights collapsed - show expand button */}
        <AnimatePresence>
          {!showInsights && aiInsights && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 flex justify-center"
            >
              <Button
                variant="outline"
                className="gap-2 text-sm"
                onClick={() => setShowInsights(true)}
              >
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Mostrar Insights da IA
                <ChevronDown className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No insights yet - show prompt */}
        {!aiInsights && !aiLoading && allDataReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <Card className="border-dashed border-2 border-muted-foreground/20">
              <CardContent className="p-6 text-center">
                <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  Insights da IA disponíveis
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em &quot;Gerar Insights IA&quot; para análise inteligente dos seus dados
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ============================================= */}
        {/* KPI Overview Cards                             */}
        {/* ============================================= */}
        <div className="mb-6">
          <OverviewCards data={overview} />
        </div>

        {/* ============================================= */}
        {/* Tabbed Content                                 */}
        {/* ============================================= */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="recruitment" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Recrutamento</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Agentes IA</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <PipelineFunnel data={pipeline} />
              <SourceChart data={sources} />
            </div>
            <TimeToHireChart data={timeToHire} />
          </TabsContent>

          {/* Recruitment Tab */}
          <TabsContent value="recruitment" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <PipelineFunnel data={pipeline} />
              <SourceChart data={sources} />
            </div>
            <TimeToHireChart data={timeToHire} />

            <Card>
              <CardHeader>
                <CardTitle>Resumo do Funil de Recrutamento</CardTitle>
                <CardDescription>
                  Métricas principais do seu pipeline de recrutamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading.overview ? (
                  <div className="grid gap-4 md:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Total de Candidatos
                      </p>
                      <p className="text-2xl font-bold">
                        {overview?.totalCandidates || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Vagas Ativas</p>
                      <p className="text-2xl font-bold">
                        {overview?.activeJobs || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Contratações no Período
                      </p>
                      <p className="text-2xl font-bold">
                        {overview?.totalHired || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Entrevistas Pendentes
                      </p>
                      <p className="text-2xl font-bold">
                        {overview?.pendingInterviews || 0}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Agents Tab */}
          <TabsContent value="agents" className="space-y-4">
            <AgentPerformanceChart data={agentPerformance} />

            <Card>
              <CardHeader>
                <CardTitle>Resumo dos Agentes de IA</CardTitle>
                <CardDescription>
                  Visão geral da performance de todos os agentes de IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading.agentPerformance ? (
                  <div className="grid gap-4 md:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Agentes Ativos
                      </p>
                      <p className="text-2xl font-bold">
                        {overview?.activeAgents || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total de Tarefas</p>
                      <p className="text-2xl font-bold">
                        {overview?.totalTasks || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Tarefas Concluídas
                      </p>
                      <p className="text-2xl font-bold">
                        {overview?.completedTasks || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Taxa de Sucesso
                      </p>
                      <p className="text-2xl font-bold">
                        {overview?.taskSuccessRate || 0}%
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ============================================= */}
      {/* Floating AI Chat Button                        */}
      {/* ============================================= */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Chat Panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed bottom-20 right-6 w-[calc(100vw-3rem)] sm:w-96 max-h-[500px] bg-background border rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 text-white shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    <span className="font-semibold">Zion Analytics AI</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-8 w-8"
                    onClick={() => setChatOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {chatMessages.length === 0 && (
                  <div className="text-center text-muted-foreground py-6">
                    <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Pergunte sobre seus dados de recrutamento</p>
                    {/* Quick action buttons */}
                    <div className="flex flex-col gap-2 mt-4">
                      {quickActions.map((action) => (
                        <Button
                          key={action}
                          variant="outline"
                          size="sm"
                          className="text-xs justify-start h-auto py-2 px-3"
                          onClick={() => sendChatMessage(action)}
                          disabled={chatLoading}
                        >
                          <MessageCircle className="h-3 w-3 mr-1.5 shrink-0" />
                          {action}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn("mb-3", msg.role === "user" ? "text-right" : "text-left")}
                  >
                    <div
                      className={cn(
                        "inline-block rounded-lg px-3 py-2 text-sm max-w-[85%] text-left whitespace-pre-wrap",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analisando dados...</span>
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (chatInput.trim() && !chatLoading) {
                      sendChatMessage(chatInput.trim());
                    }
                  }}
                >
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Pergunte sobre seus dados..."
                      className="text-sm"
                      disabled={chatLoading}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!chatInput.trim() || chatLoading}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            size="icon"
            onClick={() => setChatOpen(!chatOpen)}
          >
            {chatOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Bot className="h-6 w-6 text-white" />
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
