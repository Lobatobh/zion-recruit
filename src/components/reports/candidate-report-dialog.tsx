"use client";

/**
 * Candidate Report Dialog - Zion Recruit
 * Display comprehensive candidate report
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Star,
  Target,
  Brain,
  Globe,
  MapPin,
  Briefcase,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CandidateReportDialogProps {
  candidateId: string | null;
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReportData {
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    linkedin: string | null;
    portfolio: string | null;
    photo: string | null;
    resumeUrl: string | null;
    summary: string;
  };
  job: {
    id: string;
    title: string;
    department: string | null;
    location: string | null;
    workModel: string;
  };
  analysis: {
    overallScore: number;
    skillsMatch: number;
    experienceMatch: number;
    discFit: number;
    culturalFit: number;
    strengths: string[];
    weaknesses: string[];
    riskFactors: string[];
  };
  discProfile?: {
    primaryProfile: string;
    secondaryProfile: string | null;
    profileDescription: string;
    workStyle: string;
    communicationStyle: string;
    leadershipStyle: string;
    idealEnvironment: string[];
    jobFitScore: number;
    jobFitAnalysis: string;
  };
  geographic?: {
    location: string;
    relocationNeeded: boolean;
    remoteWorkSuitability: number;
    timezoneCompatibility: string;
    commuteAnalysis?: string;
  };
  recommendation: {
    recommendation: "HIGHLY_RECOMMENDED" | "RECOMMENDED" | "NEUTRAL" | "NOT_RECOMMENDED";
    confidence: number;
    reasoning: string;
    onboardingNotes: string[];
    interviewFocus: string[];
    salaryExpectation?: {
      min: number;
      max: number;
      currency: string;
    };
  };
  comparison?: {
    rank: number;
    totalCandidates: number;
    percentile: number;
    advantages: string[];
    gaps: string[];
  };
  reportSummary: string;
  generatedAt: string;
}

const recommendationConfig = {
  HIGHLY_RECOMMENDED: {
    label: "Altamente Recomendado",
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    icon: Star,
  },
  RECOMMENDED: {
    label: "Recomendado",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    icon: CheckCircle,
  },
  NEUTRAL: {
    label: "Neutro",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    icon: AlertCircle,
  },
  NOT_RECOMMENDED: {
    label: "Não Recomendado",
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    icon: XCircle,
  },
};

export function CandidateReportDialog({
  candidateId,
  jobId,
  open,
  onOpenChange,
}: CandidateReportDialogProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && candidateId && jobId) {
      fetchReport();
    }
  }, [open, candidateId, jobId]);

  const fetchReport = async () => {
    if (!candidateId || !jobId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/reports?candidateId=${candidateId}&jobId=${jobId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar relatório");
      }

      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar relatório");
      toast.error("Erro ao carregar relatório");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!report) return;
    toast.success("Relatório sendo preparado para download...");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Relatório do Candidato</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-6 flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={fetchReport}>
              Tentar novamente
            </Button>
          </div>
        ) : report ? (
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={report.candidate.photo || undefined} />
                    <AvatarFallback className="text-lg">
                      {getInitials(report.candidate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">{report.candidate.name}</h2>
                    <p className="text-muted-foreground">{report.candidate.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{report.job.title}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              {/* Recommendation Banner */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-4 rounded-lg",
                  recommendationConfig[report.recommendation.recommendation].bgColor
                )}
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const config = recommendationConfig[report.recommendation.recommendation];
                    const Icon = config.icon;
                    return (
                      <>
                        <div className={cn("p-2 rounded-full", config.color)}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-semibold", config.textColor)}>
                              {config.label}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {report.recommendation.confidence}% confiança
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {report.recommendation.reasoning}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </motion.div>

              {/* Score Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <ScoreCard label="Score Geral" value={report.analysis.overallScore} icon={Target} color="primary" />
                <ScoreCard label="Skills" value={report.analysis.skillsMatch} icon={TrendingUp} color="blue" />
                <ScoreCard label="Experiência" value={report.analysis.experienceMatch} icon={Briefcase} color="green" />
                <ScoreCard label="DISC Fit" value={report.analysis.discFit} icon={Brain} color="purple" />
                <ScoreCard label="Cultural" value={report.analysis.culturalFit} icon={Users} color="orange" />
              </div>

              {/* Main Content Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Strengths & Weaknesses */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Análise de Pontos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-green-600 mb-2">Pontos Fortes</h4>
                        <ul className="space-y-1">
                          {report.analysis.strengths.map((strength, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium text-amber-600 mb-2">Pontos de Atenção</h4>
                        <ul className="space-y-1">
                          {report.analysis.weaknesses.map((weakness, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* DISC Profile */}
                  {report.discProfile && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          Perfil DISC
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-500">{report.discProfile.primaryProfile}</Badge>
                          {report.discProfile.secondaryProfile && (
                            <Badge variant="outline">{report.discProfile.secondaryProfile}</Badge>
                          )}
                          <Badge variant="secondary" className="ml-auto">
                            Fit: {report.discProfile.jobFitScore}%
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {report.discProfile.profileDescription}
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Estilo de trabalho:</span>
                            <p className="font-medium">{report.discProfile.workStyle}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Comunicação:</span>
                            <p className="font-medium">{report.discProfile.communicationStyle}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Comparison */}
                  {report.comparison && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Comparativo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-3xl font-bold">#{report.comparison.rank}</span>
                            <span className="text-muted-foreground"> de {report.comparison.totalCandidates}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-primary">{report.comparison.percentile}%</span>
                            <p className="text-xs text-muted-foreground">percentil</p>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-xs font-medium text-green-600 mb-1">Vantagens</h4>
                            <ul className="text-sm space-y-1">
                              {report.comparison.advantages.map((adv, i) => (
                                <li key={i}>• {adv}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-amber-600 mb-1">Gaps</h4>
                            <ul className="text-sm space-y-1">
                              {report.comparison.gaps.map((gap, i) => (
                                <li key={i}>• {gap}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Geographic */}
                  {report.geographic && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Análise Geográfica
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{report.geographic.location}</span>
                        </div>
                        {report.geographic.relocationNeeded && (
                          <Badge variant="outline" className="text-amber-600">
                            Mudança necessária
                          </Badge>
                        )}
                        <div>
                          <span className="text-sm text-muted-foreground">Adequação ao remoto:</span>
                          <Progress value={report.geographic.remoteWorkSuitability} className="h-2 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Interview Focus */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Foco da Entrevista
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {report.recommendation.interviewFocus.map((focus, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            {focus}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Salary Expectation */}
                  {report.recommendation.salaryExpectation && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Expectativa Salarial
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {report.recommendation.salaryExpectation.min.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: report.recommendation.salaryExpectation.currency,
                          })}
                          {" - "}
                          {report.recommendation.salaryExpectation.max.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: report.recommendation.salaryExpectation.currency,
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Onboarding Notes */}
              {report.recommendation.onboardingNotes.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Notas para Onboarding</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid md:grid-cols-2 gap-2">
                      {report.recommendation.onboardingNotes.map((note, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Report Summary */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <h3 className="font-semibold mb-2">Resumo do Relatório</h3>
                  <p className="text-sm text-muted-foreground">{report.reportSummary}</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Gerado em: {new Date(report.generatedAt).toLocaleString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// Score Card Component
function ScoreCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "primary" | "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    primary: "text-primary",
    blue: "text-blue-500",
    green: "text-green-500",
    purple: "text-purple-500",
    orange: "text-orange-500",
  };

  const bgClasses = {
    primary: "bg-primary/10",
    blue: "bg-blue-500/10",
    green: "bg-green-500/10",
    purple: "bg-purple-500/10",
    orange: "bg-orange-500/10",
  };

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-1.5 rounded", bgClasses[color])}>
          <Icon className={cn("h-4 w-4", colorClasses[color])} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}%</div>
      <Progress value={value} className="h-1.5 mt-2" />
    </div>
  );
}
