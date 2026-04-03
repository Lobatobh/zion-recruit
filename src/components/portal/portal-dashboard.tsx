"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  Calendar,
  FileText,
  MessageSquare,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Star,
  ArrowRight,
  Building2,
  MapPin,
  Target,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApplicationStatus } from "./application-status";
import { InterviewSchedule } from "./interview-schedule";
import { PortalMessages } from "./messages";
import { ProfileEditor } from "./profile-editor";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PortalDashboardProps {
  token: string;
  onLogout: () => void;
}

interface CandidateData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  resumeUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  photo?: string;
  status: string;
  createdAt: string;
}

interface Application {
  id: string;
  job: {
    id: string;
    title: string;
    department?: string;
    location?: string;
    type: string;
    workModel?: string;
    company: {
      id: string;
      name: string;
      logo?: string;
    };
  };
  status: string;
  statusLabel: string;
  pipelineStage?: {
    id: string;
    name: string;
    color: string;
  };
  matchScore?: number;
  appliedAt: string;
  hasInterviews: boolean;
  hasDiscTest: boolean;
  timeline: Array<{
    id: string;
    name: string;
    color: string;
    order: number;
    isCurrent: boolean;
    isCompleted: boolean;
    isPending: boolean;
  }>;
}

interface Interview {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  scheduledAt: string;
  duration: number;
  timezone: string;
  meetingUrl?: string;
  meetingProvider?: string;
  location?: string;
  status: string;
  statusLabel: string;
  interviewerName?: string;
  jobTitle: string;
}

interface Tenant {
  id: string;
  name: string;
  logo?: string;
}

interface PortalData {
  candidate: CandidateData;
  applications: Application[];
  upcomingInterviews: Interview[];
  tenant: Tenant;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  APPLIED: "Candidatado",
  SCREENING: "Em Triagem",
  INTERVIEWING: "Em Entrevista",
  DISC_TEST: "Avaliação DISC",
  OFFERED: "Proposta Enviada",
  HIRED: "Contratado",
  REJECTED: "Não Selecionado",
};

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    APPLIED: "bg-sky-500",
    SCREENING: "bg-amber-500",
    INTERVIEWING: "bg-violet-500",
    DISC_TEST: "bg-orange-500",
    OFFERED: "bg-teal-500",
    HIRED: "bg-emerald-500",
    REJECTED: "bg-rose-500",
  };
  return colors[status] || "bg-gray-500";
}

function getStatusLabel(status: string) {
  return statusLabels[status] || status.replace(/_/g, " ");
}

function formatDateBR(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateShortBR(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calculateProfileCompletion(candidate: CandidateData): number {
  const fields = [
    "name",
    "email",
    "phone",
    "linkedin",
    "github",
    "portfolio",
    "resumeUrl",
    "city",
    "state",
    "country",
  ];
  const completed = fields.filter((field) => {
    const value = candidate[field as keyof CandidateData];
    return value && value.toString().trim().length > 0;
  });
  return Math.round((completed.length / fields.length) * 100);
}

// ─── Overview Stat Card ──────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconBg,
  iconColor,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
  iconBg: string;
  iconColor: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <Card className="relative overflow-hidden">
        {/* Decorative gradient orb */}
        <div
          className={cn(
            "absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.07]",
            iconBg.replace("bg-", "bg-")
          )}
        />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className={cn("p-2.5 rounded-xl", iconBg)}>
              <Icon className={cn("w-5 h-5", iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PortalDashboard({ token, onLogout }: PortalDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchPortalData();
  }, [token]);

  const fetchPortalData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/portal/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (response.ok) {
        setData(result);
      } else {
        setError(result.error || "Falha ao carregar dados do portal");
      }
    } catch {
      setError("Falha ao carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="text-center space-y-4">
          <motion.div
            className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <p className="text-muted-foreground text-sm">
            Carregando seu portal...
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Erro</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {error || "Falha ao carregar dados"}
              </p>
            </div>
            <Button onClick={onLogout} className="bg-emerald-600 hover:bg-emerald-700">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { candidate, applications, upcomingInterviews, tenant } = data;
  const profileCompletion = calculateProfileCompletion(candidate);
  const pendingReview = applications.filter(
    (a) => a.status === "APPLIED"
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* ── Header ── */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {tenant.logo ? (
                <img
                  src={tenant.logo}
                  alt={tenant.name}
                  className="h-9 w-9 rounded-lg"
                />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                  {tenant.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="font-semibold text-base">{tenant.name}</h1>
                <p className="text-[11px] text-muted-foreground">
                  Portal do Candidato
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Bem-vindo, {candidate.name.split(" ")[0]}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6 bg-white dark:bg-gray-900 border p-1 rounded-xl h-auto">
            <TabsTrigger
              value="overview"
              className="py-2.5 rounded-lg data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-900 dark:data-[state=active]:text-emerald-300"
            >
              <Briefcase className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger
              value="applications"
              className="py-2.5 rounded-lg data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-900 dark:data-[state=active]:text-emerald-300"
            >
              <FileText className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Candidaturas</span>
            </TabsTrigger>
            <TabsTrigger
              value="interviews"
              className="py-2.5 rounded-lg data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-900 dark:data-[state=active]:text-emerald-300"
            >
              <Calendar className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Entrevistas</span>
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="py-2.5 rounded-lg data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-900 dark:data-[state=active]:text-emerald-300"
            >
              <MessageSquare className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Mensagens</span>
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="py-2.5 rounded-lg data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-900 dark:data-[state=active]:text-emerald-300"
            >
              <User className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Meu Perfil</span>
            </TabsTrigger>
          </TabsList>

          {/* ════════════════════ Overview Tab ════════════════════ */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={FileText}
                label="Total de Candidaturas"
                value={applications.length}
                subtitle={`${pendingReview} candidaturas aguardando análise`}
                iconBg="bg-emerald-100 dark:bg-emerald-900"
                iconColor="text-emerald-600 dark:text-emerald-400"
                delay={0}
              />
              <StatCard
                icon={Calendar}
                label="Entrevistas Agendadas"
                value={upcomingInterviews.length}
                subtitle={
                  upcomingInterviews.length > 0
                    ? `Próxima: ${formatDateShortBR(upcomingInterviews[0].scheduledAt)}`
                    : undefined
                }
                iconBg="bg-violet-100 dark:bg-violet-900"
                iconColor="text-violet-600 dark:text-violet-400"
                delay={0.08}
              />
              <StatCard
                icon={Target}
                label="Status Atual"
                value={getStatusLabel(candidate.status)}
                iconBg="bg-amber-100 dark:bg-amber-900"
                iconColor="text-amber-600 dark:text-amber-400"
                delay={0.16}
              />
              <StatCard
                icon={BarChart3}
                label="Perfil Completo"
                value={`${profileCompletion}%`}
                iconBg="bg-sky-100 dark:bg-sky-900"
                iconColor="text-sky-600 dark:text-sky-400"
                delay={0.24}
              />
            </div>

            {/* Active Applications */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Candidaturas Ativas
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                      onClick={() => setActiveTab("applications")}
                    >
                      Ver Todas
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {applications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nenhuma candidatura ativa</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {applications.slice(0, 3).map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border flex items-center justify-center flex-shrink-0 shadow-sm">
                              <Briefcase className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {app.job.title}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {app.job.company.name}
                                </span>
                                {app.job.location && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {app.job.location}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                            {app.matchScore != null && (
                              <div className="text-right hidden sm:block">
                                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                  {app.matchScore}% compatibilidade
                                </p>
                              </div>
                            )}
                            <Badge
                              className="text-white border-0 text-xs"
                              style={{
                                backgroundColor:
                                  app.pipelineStage?.color || "#6B7280",
                              }}
                            >
                              {app.pipelineStage?.name ||
                                app.statusLabel ||
                                "Candidatado"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Interviews */}
            {upcomingInterviews.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-violet-500" />
                        Próximas Entrevistas
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950"
                        onClick={() => setActiveTab("interviews")}
                      >
                        Ver Todas
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upcomingInterviews.slice(0, 2).map((interview) => (
                        <div
                          key={interview.id}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900 flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">
                                {interview.title}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {interview.jobTitle}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <p className="text-sm font-medium">
                              {formatDateBR(interview.scheduledAt)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(interview.scheduledAt)} •{" "}
                              {interview.duration} min
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <Card className="cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hover:shadow-md group">
                  <CardContent
                    className="p-5 flex items-center gap-4"
                    onClick={() => setActiveTab("profile")}
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm">Atualizar Perfil</h3>
                      <p className="text-xs text-muted-foreground">
                        Mantenha suas informações atualizadas
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0" />
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.58 }}
              >
                <Card className="cursor-pointer hover:border-violet-300 dark:hover:border-violet-700 transition-all hover:shadow-md group">
                  <CardContent
                    className="p-5 flex items-center gap-4"
                    onClick={() => setActiveTab("messages")}
                  >
                    <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm">
                        Falar com Recrutador
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Envie uma mensagem para a equipe
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0" />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* ════════════════════ Applications Tab ════════════════════ */}
          <TabsContent value="applications" className="mt-6">
            <ApplicationStatus token={token} />
          </TabsContent>

          {/* ════════════════════ Interviews Tab ════════════════════ */}
          <TabsContent value="interviews" className="mt-6">
            <InterviewSchedule
              token={token}
              initialInterviews={upcomingInterviews}
            />
          </TabsContent>

          {/* ════════════════════ Messages Tab ════════════════════ */}
          <TabsContent value="messages" className="mt-6">
            <PortalMessages
              token={token}
              candidateId={candidate.id}
              tenantId={tenant.id}
            />
          </TabsContent>

          {/* ════════════════════ Profile Tab ════════════════════ */}
          <TabsContent value="profile" className="mt-6">
            <ProfileEditor token={token} candidate={candidate} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
