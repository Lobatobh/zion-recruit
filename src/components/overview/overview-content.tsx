"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigation } from "@/lib/navigation-context";
import {
  RefreshCw,
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileText,
  Target,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface OverviewStats {
  activeJobs: number;
  totalCandidates: number;
  inProcess: number;
  hiredThisMonth: number;
  previousMonth: {
    activeJobs: number;
    totalCandidates: number;
    inProcess: number;
    hiredThisMonth: number;
  };
}

interface RecentJob {
  id: string;
  title: string;
  department: string;
  candidates: number;
  status: string;
  location?: string;
}

interface RecentCandidate {
  id: string;
  name: string;
  jobTitle: string;
  stage: string;
  stageColor: string;
  matchScore: number | null;
  timeAgo: string;
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  count: number;
  order: number;
}

interface OverviewData {
  stats: OverviewStats;
  recentJobs: RecentJob[];
  recentCandidates: RecentCandidate[];
  pipelineStages: PipelineStage[];
  tenant: {
    id: string;
    name: string;
    plan: string;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function StatCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  change?: number;
  trend?: "up" | "down";
  icon: React.ElementType;
  color: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold">{value}</p>
              {change !== undefined && (
                <div className="flex items-center gap-1 text-sm">
                  {trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                  )}
                  <span className={trend === "up" ? "text-emerald-500" : "text-red-500"}>
                    {Math.abs(change)}%
                  </span>
                  <span className="text-muted-foreground">vs mês anterior</span>
                </div>
              )}
            </div>
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="h-6 w-6" style={{ color }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}

export function OverviewContent() {
  const { navigate } = useNavigation();
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch("/api/overview", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching overview:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Não foi possível carregar os dados</p>
          <Button variant="outline" className="mt-4" onClick={fetchOverview}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const statsConfig = [
    {
      title: "Vagas Ativas",
      value: data.stats.activeJobs,
      change: data.stats.previousMonth.activeJobs > 0
        ? Math.round(((data.stats.activeJobs - data.stats.previousMonth.activeJobs) / data.stats.previousMonth.activeJobs) * 100)
        : 0,
      trend: data.stats.activeJobs >= data.stats.previousMonth.activeJobs ? "up" as const : "down" as const,
      icon: Briefcase,
      color: "#3B82F6",
    },
    {
      title: "Candidatos",
      value: data.stats.totalCandidates,
      change: data.stats.previousMonth.totalCandidates > 0
        ? Math.round(((data.stats.totalCandidates - data.stats.previousMonth.totalCandidates) / data.stats.previousMonth.totalCandidates) * 100)
        : 0,
      trend: data.stats.totalCandidates >= data.stats.previousMonth.totalCandidates ? "up" as const : "down" as const,
      icon: Users,
      color: "#10B981",
    },
    {
      title: "Em Processo",
      value: data.stats.inProcess,
      change: data.stats.previousMonth.inProcess > 0
        ? Math.round(((data.stats.inProcess - data.stats.previousMonth.inProcess) / data.stats.previousMonth.inProcess) * 100)
        : 0,
      trend: data.stats.inProcess >= data.stats.previousMonth.inProcess ? "up" as const : "down" as const,
      icon: Clock,
      color: "#F59E0B",
    },
    {
      title: "Contratados",
      value: data.stats.hiredThisMonth,
      change: data.stats.previousMonth.hiredThisMonth > 0
        ? Math.round(((data.stats.hiredThisMonth - data.stats.previousMonth.hiredThisMonth) / data.stats.previousMonth.hiredThisMonth) * 100)
        : 0,
      trend: data.stats.hiredThisMonth >= data.stats.previousMonth.hiredThisMonth ? "up" as const : "down" as const,
      icon: CheckCircle2,
      color: "#8B5CF6",
    },
  ];

  const totalPipelineCount = data.pipelineStages.reduce((sum, s) => sum + s.count, 0);

  return (
    <motion.div
      className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo ao {data.tenant?.name || "Zion Recruit"}! Aqui está o resumo do seu recrutamento.
          </p>
        </div>
        <Button variant="outline" onClick={fetchOverview} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsConfig.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: "Nova Vaga", icon: Briefcase, action: () => navigate("jobs", { action: "new" }) },
                { label: "Candidatos", icon: Users, action: () => navigate("candidates") },
                { label: "Pipeline", icon: Activity, action: () => navigate("pipeline") },
                { label: "Entrevistas", icon: Calendar, action: () => navigate("interviews") },
                { label: "Relatórios", icon: FileText, action: () => navigate("reports") },
                { label: "Analytics", icon: Target, action: () => navigate("analytics") },
              ].map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="h-auto flex-col gap-2 p-4"
                  onClick={action.action}
                >
                  <action.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Jobs */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vagas Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("jobs")}>
                Ver todas →
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma vaga cadastrada</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate("jobs", { action: "new" })}
                    >
                      Criar primeira vaga
                    </Button>
                  </div>
                ) : (
                  data.recentJobs.slice(0, 5).map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => navigate("jobs", { jobId: job.id })}
                    >
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-sm text-muted-foreground">{job.department}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={job.status === "PUBLISHED" ? "default" : "secondary"}>
                          {job.status === "PUBLISHED" ? "Publicada" : "Rascunho"}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">{job.candidates} candidatos</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pipeline Overview */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pipeline</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("pipeline")}>
                Ver →
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.pipelineStages.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Pipeline vazio</p>
                  </div>
                ) : (
                  data.pipelineStages.slice(0, 6).map((stage) => (
                    <div key={stage.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span>{stage.name}</span>
                        </div>
                        <span className="font-medium">{stage.count}</span>
                      </div>
                      <Progress
                        value={totalPipelineCount > 0 ? (stage.count / totalPipelineCount) * 100 : 0}
                        className="h-2"
                        style={{
                          backgroundColor: `${stage.color}20`,
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
              {totalPipelineCount > 0 && (
                <div className="mt-4 pt-3 border-t flex justify-between text-sm">
                  <span className="text-muted-foreground">Total no pipeline</span>
                  <span className="font-bold">{totalPipelineCount}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Candidates */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Candidatos Recentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("candidates")}>
              Ver todos →
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentCandidates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Nenhum candidato cadastrado</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("candidates")}>
                  <Users className="h-4 w-4 mr-2" />
                  Ver candidatos
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.recentCandidates.slice(0, 6).map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium"
                      style={{ backgroundColor: `${candidate.stageColor}20`, color: candidate.stageColor }}
                    >
                      {candidate.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{candidate.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{candidate.jobTitle}</p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        style={{ borderColor: candidate.stageColor, color: candidate.stageColor }}
                      >
                        {candidate.stage}
                      </Badge>
                      {candidate.matchScore !== null && (
                        <p className="text-xs text-muted-foreground mt-1">{candidate.matchScore}% match</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
