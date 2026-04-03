"use client";

/**
 * DISC Management Page - Zion Recruit (Premium Edition)
 * Gerenciamento avançado de testes DISC com visual pipeline e radar de time
 */

import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Send,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Eye,
  MapPin,
  Briefcase,
  Star,
  TrendingUp,
  Users,
  Loader2,
  Filter,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DiscTestDetailDialog } from "./disc-test-detail-dialog";
import { DiscSendTestDialog } from "./disc-send-test-dialog";

// Lazy-loaded Recharts Radar
const RadarChartLazy = lazy(() =>
  import("recharts").then((mod) => ({
    default: ({
      data,
      avgData,
    }: {
      data: { candidate: string; D: number; I: number; S: number; C: number }[];
      avgData: { dimension: string; score: number }[];
    }) => {
      const {
        RadarChart: RC,
        PolarGrid,
        PolarAngleAxis,
        PolarRadiusAxis,
        Radar,
        ResponsiveContainer,
        Legend,
        Tooltip,
      } = mod;
      return (
        <ResponsiveContainer width="100%" height={380}>
          <RC data={avgData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid
              stroke="rgba(139, 92, 246, 0.15)"
              strokeDasharray="3 3"
            />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: "#7c3aed", fontSize: 13, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#a78bfa", fontSize: 10 }}
              axisLine={false}
            />
            {/* Individual profiles as translucent overlays */}
            {data.slice(0, 12).map((entry, idx) => (
              <Radar
                key={entry.candidate}
                name={entry.candidate}
                dataKey="D"
                data={[{ D: entry.D, I: entry.I, S: entry.S, C: entry.C }]}
                stroke="transparent"
                fill="rgba(139, 92, 246, 0.06)"
                fillOpacity={1}
                isAnimationActive={false}
              />
            ))}
            {/* Average radar */}
            <Radar
              name="Média do Time"
              dataKey="score"
              stroke="#8b5cf6"
              fill="url(#radarGradient)"
              fillOpacity={0.35}
              strokeWidth={2.5}
              dot={{ r: 5, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
              animationDuration={1200}
            />
            <Legend
              wrapperStyle={{ paddingTop: 16 }}
              formatter={(value: string) => (
                <span style={{ color: "#7c3aed", fontSize: 12 }}>{value}</span>
              )}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(139,92,246,0.2)",
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 8px 32px rgba(139,92,246,0.12)",
              }}
              formatter={(value: number) => [`${value}%`, ""]}
              labelStyle={{ color: "#7c3aed", fontWeight: 600 }}
            />
            <defs>
              <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.1} />
              </radialGradient>
            </defs>
          </RC>
        </ResponsiveContainer>
      );
    },
  }))
);

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
  candidate: Candidate;
  createdAt: string;
}

interface DiscStats {
  total: number;
  pending: number;
  sent: number;
  started: number;
  completed: number;
  avgJobFit: number | null;
}

// ─── Configs ─────────────────────────────────────────────────────────────────

const statusConfig: Record<
  string,
  {
    label: string;
    color: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    icon: typeof Clock;
    gradient: string;
  }
> = {
  PENDING: {
    label: "Pendente",
    color: "bg-gray-500",
    textColor: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: Clock,
    gradient: "from-gray-400 to-gray-500",
  },
  SENT: {
    label: "Enviado",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Send,
    gradient: "from-blue-400 to-blue-600",
  },
  STARTED: {
    label: "Iniciado",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    icon: RefreshCw,
    gradient: "from-yellow-400 to-amber-500",
  },
  COMPLETED: {
    label: "Concluído",
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: CheckCircle,
    gradient: "from-emerald-400 to-green-500",
  },
  EXPIRED: {
    label: "Expirado",
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: AlertCircle,
    gradient: "from-red-400 to-rose-500",
  },
};

const profileColors: Record<string, { bg: string; shadow: string; text: string }> = {
  D: { bg: "bg-red-500", shadow: "shadow-red-500/50", text: "text-red-500" },
  I: { bg: "bg-amber-500", shadow: "shadow-amber-500/50", text: "text-amber-500" },
  S: { bg: "bg-green-500", shadow: "shadow-green-500/50", text: "text-green-500" },
  C: { bg: "bg-blue-500", shadow: "shadow-blue-500/50", text: "text-blue-500" },
};

const discProfileHex: Record<string, string> = {
  D: "#EF4444",
  I: "#F59E0B",
  S: "#22C55E",
  C: "#3B82F6",
};

// ─── Animation variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.97,
    transition: { duration: 0.2 },
  },
};

const cardHover = {
  scale: 1.015,
  transition: { duration: 0.2, ease: "easeOut" },
};

// ─── Mini circular progress ──────────────────────────────────────────────────

function CircularProgress({
  value,
  size = 36,
  strokeWidth = 3,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color =
    value >= 70 ? "#22c55e" : value >= 50 ? "#eab308" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span
        className="absolute text-[10px] font-bold"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  icon: Icon,
  accentColor,
  accentBg,
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  accentColor: string;
  accentBg: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={itemVariants}
      custom={delay}
      whileHover={cardHover}
      className="relative overflow-hidden rounded-xl border border-white/50 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-lg transition-shadow duration-300"
    >
      <div className="p-4 flex items-center gap-3">
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
            accentBg
          )}
        >
          <Icon className={cn("w-5 h-5", accentColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-xl font-bold tracking-tight truncate">{value}</p>
        </div>
      </div>
      {/* Decorative corner gradient orb */}
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}

// ─── Progress Dots ───────────────────────────────────────────────────────────

function ProgressDots({
  answered,
  total,
}: {
  answered: number;
  total: number;
}) {
  if (total <= 0) return null;
  const percentage = Math.round((answered / total) * 100);
  const displayDots = Math.min(total, 20);
  const filledDots = Math.round((answered / total) * displayDots);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: displayDots }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-500",
              i < filledDots
                ? "bg-gradient-to-r from-violet-500 to-purple-500"
                : "bg-muted-foreground/15"
            )}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground font-medium tabular-nums ml-1">
        {percentage}%
      </span>
    </div>
  );
}

// ─── Pipeline Column ─────────────────────────────────────────────────────────

function PipelineColumn({
  title,
  status,
  tests,
  onTestClick,
  onSendTest,
  sendingTestId,
  config,
}: {
  title: string;
  status: string;
  tests: DiscTest[];
  onTestClick: (t: DiscTest) => void;
  onSendTest: (candidateId: string, testId: string) => void;
  sendingTestId: string | null;
  config: (typeof statusConfig)[string];
}) {
  const Icon = config.icon;

  return (
    <div className="flex flex-col min-w-[300px] max-w-[340px] w-full shrink-0">
      {/* Column header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b-2",
          "bg-gradient-to-r",
          config.gradient,
          "text-white"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs">
          {tests.length}
        </Badge>
      </div>

      {/* Column content */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-420px)] rounded-b-xl border border-t-0 bg-muted/30">
        <div className="p-2 space-y-2 min-h-[120px]">
          {tests.length === 0 && (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
              Nenhum teste
            </div>
          )}
          {tests.map((test, idx) => (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={cardHover}
              onClick={() => onTestClick(test)}
              className={cn(
                "p-3 rounded-lg border bg-white/90 backdrop-blur-sm cursor-pointer",
                "hover:shadow-md hover:border-violet-300/40 transition-all duration-200"
              )}
            >
              <div className="flex items-start gap-2.5">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={test.candidate.photo || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(test.candidate.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {test.candidate.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {test.candidate.job?.title || "Sem vaga"}
                  </p>
                  {/* Profile badges for completed */}
                  {test.status === "COMPLETED" && test.primaryProfile && (
                    <div className="flex gap-1 mt-1.5">
                      {["D", "I", "S", "C"].map((p) => (
                        <span
                          key={p}
                          className={cn(
                            "w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white transition-all",
                            test.primaryProfile === p
                              ? cn(profileColors[p].bg, "shadow-md", profileColors[p].shadow)
                              : "bg-gray-200 text-gray-500"
                          )}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Send action for pending */}
                {status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 shrink-0 text-violet-600 hover:text-violet-700 hover:bg-violet-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendTest(test.candidate.id, test.id);
                    }}
                    disabled={sendingTestId === test.id}
                  >
                    {sendingTestId === test.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DiscManagementPage() {
  const [tests, setTests] = useState<DiscTest[]>([]);
  const [stats, setStats] = useState<DiscStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTest, setSelectedTest] = useState<DiscTest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"lista" | "pipeline">("lista");
  const [radarOpen, setRadarOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const fetchTests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/disc?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar testes");
      }

      setTests(data.tests || []);

      const total = data.tests?.length || 0;
      const completed = data.tests?.filter((t: DiscTest) => t.status === "COMPLETED").length || 0;
      const completedTests = data.tests?.filter((t: DiscTest) => t.status === "COMPLETED" && t.jobFitScore) || [];
      const avgJobFit = completedTests.length > 0
        ? Math.round(completedTests.reduce((acc: number, t: DiscTest) => acc + (t.jobFitScore || 0), 0) / completedTests.length)
        : null;

      setStats({
        total,
        pending: data.tests?.filter((t: DiscTest) => t.status === "PENDING").length || 0,
        sent: data.tests?.filter((t: DiscTest) => t.status === "SENT").length || 0,
        started: data.tests?.filter((t: DiscTest) => t.status === "STARTED").length || 0,
        completed,
        avgJobFit,
      });
    } catch (error) {
      console.error("Error fetching DISC tests:", error);
      toast.error("Erro ao carregar testes DISC");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const filteredTests = tests.filter((test) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        test.candidate.name.toLowerCase().includes(query) ||
        test.candidate.email.toLowerCase().includes(query) ||
        test.candidate.job?.title?.toLowerCase().includes(query) ||
        false
      );
    }
    return true;
  });

  const pipelineTests = useMemo(() => {
    if (statusFilter !== "all") return null;
    return {
      PENDING: filteredTests.filter((t) => t.status === "PENDING"),
      SENT: filteredTests.filter((t) => t.status === "SENT"),
      STARTED: filteredTests.filter((t) => t.status === "STARTED"),
      COMPLETED: filteredTests.filter((t) => t.status === "COMPLETED"),
    };
  }, [filteredTests, statusFilter]);

  const sendTest = async (candidateId: string, testId: string) => {
    setSendingTestId(testId);
    try {
      const response = await fetch("/api/disc/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, sendEmail: true, sendWhatsapp: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar teste");
      }

      toast.success(data.message);
      fetchTests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar teste");
    } finally {
      setSendingTestId(null);
    }
  };

  const handleTestClick = (test: DiscTest) => {
    setSelectedTest(test);
    setDetailOpen(true);
  };

  // DISC distribution for KPI #6
  const discDistribution = useMemo(() => {
    const completedTests = tests.filter(
      (t) => t.status === "COMPLETED" && t.primaryProfile
    );
    const counts: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
    completedTests.forEach((t) => {
      if (t.primaryProfile && counts[t.primaryProfile] !== undefined) {
        counts[t.primaryProfile]++;
      }
    });
    return counts;
  }, [tests]);

  const totalProfiles = Object.values(discDistribution).reduce((a, b) => a + b, 0);

  // Radar data
  const radarData = useMemo(() => {
    const completedTests = tests.filter(
      (t) =>
        t.status === "COMPLETED" &&
        t.profileD !== null &&
        t.profileI !== null &&
        t.profileS !== null &&
        t.profileC !== null
    );

    if (completedTests.length === 0) return { individual: [], average: [] };

    const avgD = Math.round(completedTests.reduce((s, t) => s + (t.profileD || 0), 0) / completedTests.length);
    const avgI = Math.round(completedTests.reduce((s, t) => s + (t.profileI || 0), 0) / completedTests.length);
    const avgS = Math.round(completedTests.reduce((s, t) => s + (t.profileS || 0), 0) / completedTests.length);
    const avgC = Math.round(completedTests.reduce((s, t) => s + (t.profileC || 0), 0) / completedTests.length);

    return {
      individual: completedTests.map((t) => ({
        candidate: t.candidate.name.split(" ")[0],
        D: t.profileD || 0,
        I: t.profileI || 0,
        S: t.profileS || 0,
        C: t.profileC || 0,
      })),
      average: [
        { dimension: "D", score: avgD },
        { dimension: "I", score: avgI },
        { dimension: "S", score: avgS },
        { dimension: "C", score: avgC },
      ],
    };
  }, [tests]);

  const jobFitColor =
    stats?.avgJobFit != null
      ? stats.avgJobFit >= 70
        ? "text-emerald-600"
        : stats.avgJobFit >= 50
          ? "text-yellow-600"
          : "text-red-500"
      : "text-muted-foreground";

  const jobFitBg =
    stats?.avgJobFit != null
      ? stats.avgJobFit >= 70
        ? "bg-emerald-500/10"
        : stats.avgJobFit >= 50
          ? "bg-yellow-500/10"
          : "bg-red-500/10"
      : "bg-muted";

  return (
    <div className="h-full flex flex-col">
      {/* ─── Sticky Gradient Header ──────────────────────────────────── */}
      <div className="sticky top-0 z-30 shrink-0">
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-5 lg:px-8 lg:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                {/* Animated pulse ring */}
                <span className="absolute -inset-1 rounded-xl border-2 border-white/30 animate-ping" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Testes DISC
                </h1>
                <p className="text-sm text-white/75">
                  Avaliação comportamental avançada
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] bg-white/15 border-white/20 text-white text-sm backdrop-blur-sm hover:bg-white/25 transition-colors">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-white/70" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="SENT">Enviado</SelectItem>
                  <SelectItem value="STARTED">Iniciado</SelectItem>
                  <SelectItem value="COMPLETED">Concluído</SelectItem>
                  <SelectItem value="EXPIRED">Expirado</SelectItem>
                </SelectContent>
              </Select>

              {/* View toggle */}
              <div className="flex rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 p-0.5">
                <button
                  onClick={() => setViewMode("lista")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    viewMode === "lista"
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                  Lista
                </button>
                <button
                  onClick={() => setViewMode("pipeline")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    viewMode === "pipeline"
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Pipeline
                </button>
              </div>

              {/* Send Test Button */}
              <Button
                size="sm"
                className="bg-white text-violet-700 hover:bg-white/90 font-semibold shadow-lg transition-all duration-200"
                onClick={() => setSendDialogOpen(true)}
              >
                <Send className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Enviar Teste</span>
              </Button>

              {/* Refresh */}
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/15 border-white/20 text-white hover:bg-white/25 backdrop-blur-sm transition-colors"
                onClick={fetchTests}
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>

        {/* Search bar below gradient header */}
        <div className="bg-white border-b px-6 lg:px-8 py-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por candidato, e-mail, vaga..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/40 border-transparent focus:border-violet-300 focus:ring-violet-200"
            />
          </div>
        </div>
      </div>

      {/* ─── Scrollable Content ──────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <div className="p-6 lg:p-8 space-y-6">
          {/* ─── KPI Cards ────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[88px] rounded-xl" />
              ))}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* 1. Total de Testes */}
              <KPICard
                label="Total de Testes"
                value={stats?.total ?? 0}
                icon={Users}
                accentColor="text-violet-600"
                accentBg="bg-violet-100"
              />
              {/* 2. Pendentes */}
              <KPICard
                label="Pendentes"
                value={stats?.pending ?? 0}
                icon={Clock}
                accentColor="text-amber-600"
                accentBg="bg-amber-100"
              />
              {/* 3. Enviados */}
              <KPICard
                label="Enviados"
                value={stats?.sent ?? 0}
                icon={Send}
                accentColor="text-blue-600"
                accentBg="bg-blue-100"
              />
              {/* 4. Concluídos */}
              <KPICard
                label="Concluídos"
                value={stats?.completed ?? 0}
                icon={CheckCircle}
                accentColor="text-emerald-600"
                accentBg="bg-emerald-100"
              />
              {/* 5. Job Fit Médio */}
              <motion.div
                variants={itemVariants}
                whileHover={cardHover}
                className="relative overflow-hidden rounded-xl border border-white/50 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-4 flex items-center gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                      jobFitBg
                    )}
                  >
                    <Star className={cn("w-5 h-5", jobFitColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">
                      Job Fit Médio
                    </p>
                    <p className={cn("text-xl font-bold tracking-tight", jobFitColor)}>
                      {stats?.avgJobFit != null ? `${stats.avgJobFit}%` : "—"}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* 6. Distribuição DISC */}
              <motion.div
                variants={itemVariants}
                whileHover={cardHover}
                className="relative overflow-hidden rounded-xl border border-white/50 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-violet-100">
                      <BarChart3 className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Distribuição DISC
                    </p>
                  </div>
                  {totalProfiles > 0 ? (
                    <div className="flex h-3 rounded-full overflow-hidden bg-muted/40">
                      {(["D", "I", "S", "C"] as const).map((p) => {
                        const pct =
                          totalProfiles > 0
                            ? (discDistribution[p] / totalProfiles) * 100
                            : 0;
                        if (pct === 0) return null;
                        return (
                          <motion.div
                            key={p}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                            className="h-full relative group"
                            style={{ backgroundColor: discProfileHex[p] }}
                          >
                            {/* Tooltip on hover */}
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              {p}: {discDistribution[p]}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-3 rounded-full bg-muted/40" />
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── Pipeline View ───────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {viewMode === "pipeline" && !isLoading && pipelineTests && (
              <motion.div
                key="pipeline-view"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
              >
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-4 min-w-max">
                    <PipelineColumn
                      title="Pendente"
                      status="PENDING"
                      tests={pipelineTests.PENDING}
                      onTestClick={handleTestClick}
                      onSendTest={sendTest}
                      sendingTestId={sendingTestId}
                      config={statusConfig.PENDING}
                    />
                    <PipelineColumn
                      title="Enviado"
                      status="SENT"
                      tests={pipelineTests.SENT}
                      onTestClick={handleTestClick}
                      onSendTest={sendTest}
                      sendingTestId={sendingTestId}
                      config={statusConfig.SENT}
                    />
                    <PipelineColumn
                      title="Iniciado"
                      status="STARTED"
                      tests={pipelineTests.STARTED}
                      onTestClick={handleTestClick}
                      onSendTest={sendTest}
                      sendingTestId={sendingTestId}
                      config={statusConfig.STARTED}
                    />
                    <PipelineColumn
                      title="Concluído"
                      status="COMPLETED"
                      tests={pipelineTests.COMPLETED}
                      onTestClick={handleTestClick}
                      onSendTest={sendTest}
                      sendingTestId={sendingTestId}
                      config={statusConfig.COMPLETED}
                    />
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Lista View ──────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {viewMode === "lista" &&
              (isLoading ? (
                <motion.div
                  key="list-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </motion.div>
              ) : filteredTests.length === 0 ? (
                <motion.div
                  key="list-empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center text-center py-20 px-4"
                >
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="relative mb-6"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                      <Brain className="w-10 h-10 text-violet-400" />
                    </div>
                    <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-violet-200 to-purple-200 opacity-30 blur-xl" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhum teste DISC encontrado
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {searchQuery || statusFilter !== "all"
                      ? "Tente ajustar os filtros de busca para encontrar o que procura."
                      : "Os testes DISC são criados automaticamente quando candidatos avançam para a etapa de avaliação comportamental no pipeline de recrutamento."}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="list-content"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredTests.map((test) => {
                      const config =
                        statusConfig[test.status as keyof typeof statusConfig] ||
                        statusConfig.PENDING;
                      const StatusIcon = config.icon;

                      // Determine progress dots state
                      let progressAnswered = 0;
                      let progressTotal = 0;
                      if (test.status === "COMPLETED") {
                        progressAnswered = 20;
                        progressTotal = 20;
                      } else if (test.status === "STARTED") {
                        // Estimate based on time elapsed since started
                        progressAnswered = 8;
                        progressTotal = 20;
                      } else if (test.status === "SENT") {
                        progressAnswered = 0;
                        progressTotal = 20;
                      }

                      return (
                        <motion.div
                          key={test.id}
                          layout
                          variants={itemVariants}
                          whileHover={{
                            scale: 1.01,
                            boxShadow:
                              "0 8px 30px rgba(139, 92, 246, 0.1)",
                            transition: { duration: 0.2 },
                          }}
                          onClick={() => handleTestClick(test)}
                          className={cn(
                            "p-4 rounded-xl border bg-white/80 backdrop-blur-sm cursor-pointer",
                            "hover:bg-white transition-all duration-200",
                            "hover:border-violet-300/40",
                            config.borderColor
                          )}
                        >
                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <Avatar className="h-12 w-12 shrink-0 ring-2 ring-white shadow-sm">
                              <AvatarImage
                                src={test.candidate.photo || undefined}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 font-semibold">
                                {getInitials(test.candidate.name)}
                              </AvatarFallback>
                            </Avatar>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-sm truncate">
                                    {test.candidate.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {test.candidate.job?.title || "Sem vaga"}
                                  </p>
                                </div>
                                <Badge
                                  className={cn(
                                    "text-[10px] font-medium shrink-0 bg-gradient-to-r text-white",
                                    config.gradient
                                  )}
                                >
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {config.label}
                                </Badge>
                              </div>

                              {/* Profile DISC badges + Job Fit (completed) */}
                              {test.status === "COMPLETED" &&
                                test.primaryProfile && (
                                  <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-muted-foreground font-medium">
                                        Perfil:
                                      </span>
                                      <div className="flex gap-1">
                                        {["D", "I", "S", "C"].map((p) => (
                                          <span
                                            key={p}
                                            className={cn(
                                              "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300",
                                              test.primaryProfile === p
                                                ? cn(
                                                    profileColors[p].bg,
                                                    "shadow-lg",
                                                    profileColors[p].shadow
                                                  )
                                                : "bg-gray-200/80 text-gray-400"
                                            )}
                                          >
                                            {p}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Secondary profile badge */}
                                    {test.secondaryProfile && (
                                      <span className="text-[10px] text-muted-foreground">
                                        Secundário:{" "}
                                        <span
                                          className={cn(
                                            "font-semibold",
                                            profileColors[test.secondaryProfile]
                                              ?.text || "text-muted-foreground"
                                          )}
                                        >
                                          {test.secondaryProfile}
                                        </span>
                                      </span>
                                    )}

                                    {test.jobFitScore !== null && (
                                      <div className="flex items-center gap-1.5">
                                        <CircularProgress
                                          value={test.jobFitScore}
                                          size={30}
                                          strokeWidth={2.5}
                                        />
                                        <span className="text-[10px] text-muted-foreground">
                                          Job Fit
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                              {/* Progress dots for non-completed */}
                              {test.status !== "COMPLETED" &&
                                test.status !== "PENDING" &&
                                test.status !== "EXPIRED" && (
                                  <div className="mt-2">
                                    <ProgressDots
                                      answered={progressAnswered}
                                      total={progressTotal}
                                    />
                                  </div>
                                )}

                              {/* Location & dates row */}
                              <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground flex-wrap">
                                <div className="flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" />
                                  {test.candidate.job?.city || "Remoto"}
                                  {test.candidate.job?.state &&
                                    `, ${test.candidate.job.state}`}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {test.candidate.city || "Não informado"}
                                  {test.candidate.state &&
                                    `, ${test.candidate.state}`}
                                </div>
                                {test.candidate.matchScore !== null && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-5 px-1.5 font-medium"
                                  >
                                    <Target className="w-2.5 h-2.5 mr-0.5" />
                                    {test.candidate.matchScore}%
                                  </Badge>
                                )}
                                {test.sentAt && (
                                  <span className="hidden sm:inline">
                                    Enviado: {formatDate(test.sentAt)}
                                  </span>
                                )}
                                {test.completedAt && (
                                  <span className="hidden sm:inline">
                                    Concluído: {formatDate(test.completedAt)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              {test.status === "PENDING" && (
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-500/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendTest(test.candidate.id, test.id);
                                  }}
                                  disabled={sendingTestId === test.id}
                                >
                                  {sendingTestId === test.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Send className="h-4 w-4 mr-1" />
                                      Enviar
                                    </>
                                  )}
                                </Button>
                              )}
                              {test.status === "SENT" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-violet-200 text-violet-600 hover:bg-violet-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendTest(test.candidate.id, test.id);
                                  }}
                                  disabled={sendingTestId === test.id}
                                >
                                  {sendingTestId === test.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Reenviar
                                    </>
                                  )}
                                </Button>
                              )}
                              {test.status === "COMPLETED" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Relatório
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              ))}
          </AnimatePresence>

          {/* ─── Team DISC Radar Section ─────────────────────────────── */}
          {!isLoading &&
            tests.length > 0 &&
            radarData.individual.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="rounded-xl border bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden"
              >
                {/* Collapsible header */}
                <button
                  onClick={() => setRadarOpen(!radarOpen)}
                  className="w-full flex items-center justify-between p-4 lg:p-5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                      <Zap className="w-4.5 h-4.5 text-violet-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-foreground">
                        Distribuição DISC do Time
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Visualização radar dos perfis comportamentais •{" "}
                        {radarData.individual.length} perfis concluídos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] border-violet-200 text-violet-600 bg-violet-50"
                    >
                      D • I • S • C
                    </Badge>
                    {radarOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Radar chart */}
                <AnimatePresence>
                  {radarOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-5 lg:px-6 lg:pb-6">
                        {/* Legend row */}
                        <div className="flex items-center gap-4 mb-4 flex-wrap">
                          {(["D", "I", "S", "C"] as const).map((p) => (
                            <div
                              key={p}
                              className="flex items-center gap-1.5"
                            >
                              <div
                                className="w-3 h-3 rounded-full shadow-sm"
                                style={{ backgroundColor: discProfileHex[p] }}
                              />
                              <span className="text-xs text-muted-foreground font-medium">
                                {p === "D"
                                  ? "Dominância"
                                  : p === "I"
                                    ? "Influência"
                                    : p === "S"
                                      ? "Estabilidade"
                                      : "Conformidade"}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Chart */}
                        <div className="bg-gradient-to-b from-violet-50/50 to-transparent rounded-xl p-4 border border-violet-100/50">
                          <Suspense
                            fallback={
                              <div className="flex items-center justify-center h-[380px]">
                                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                              </div>
                            }
                          >
                            <RadarChartLazy
                              data={radarData.individual}
                              avgData={radarData.average}
                            />
                          </Suspense>
                        </div>

                        {/* Average scores summary */}
                        <div className="grid grid-cols-4 gap-3 mt-4">
                          {radarData.average.map((item) => (
                            <div
                              key={item.dimension}
                              className="text-center p-2 rounded-lg bg-muted/30"
                            >
                              <span
                                className="text-lg font-bold"
                                style={{
                                  color: discProfileHex[item.dimension],
                                }}
                              >
                                {item.score}%
                              </span>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {item.dimension === "D"
                                  ? "Dominância"
                                  : item.dimension === "I"
                                    ? "Influência"
                                    : item.dimension === "S"
                                      ? "Estabilidade"
                                      : "Conformidade"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
        </div>
      </ScrollArea>

      {/* ─── Detail Dialog ──────────────────────────────────────────── */}
      <DiscTestDetailDialog
        test={selectedTest}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={fetchTests}
      />

      {/* Send Test Dialog */}
      <DiscSendTestDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        onTestSent={fetchTests}
      />
    </div>
  );
}
