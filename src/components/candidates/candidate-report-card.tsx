"use client";

/**
 * Candidate Report Card - Zion Recruit
 * Displays comprehensive candidate report with DISC and geographic analysis
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Brain,
  MapPin,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Briefcase,
  DollarSign,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ============================================
// Types
// ============================================

interface GeographicAnalysis {
  candidateLocation: {
    city: string | null;
    state: string | null;
    country: string | null;
  };
  jobLocation: {
    city: string | null;
    state: string | null;
    country: string | null;
    remote: boolean;
  };
  distance: string;
  relocationNeeded: boolean;
  commuteFeasible: boolean;
  recommendations: string[];
}

interface DISCComparison {
  candidateProfile: {
    D: number;
    I: number;
    S: number;
    C: number;
    primary: string;
    secondary: string;
    combo: string;
  };
  jobRequirements: {
    D: number;
    I: number;
    S: number;
    C: number;
    idealCombo: string;
  };
  fitScore: number;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
}

interface CandidateReport {
  summary: string;
  geographicAnalysis: GeographicAnalysis;
  discComparison: DISCComparison;
  overallScore: number;
  recommendation: "STRONGLY_RECOMMEND" | "RECOMMEND" | "NEUTRAL" | "NOT_RECOMMENDED";
  recommendationReason: string;
  keyStrengths: string[];
  potentialConcerns: string[];
  interviewFocus: string[];
  salaryExpectation?: {
    estimated: string;
    marketRange: string;
    recommendation: string;
  };
  nextSteps: string[];
}

interface CandidateReportCardProps {
  candidateId: string;
  jobId: string;
}

// ============================================
// Constants
// ============================================

const RECOMMENDATION_COLORS = {
  STRONGLY_RECOMMEND: "bg-green-500",
  RECOMMEND: "bg-green-400",
  NEUTRAL: "bg-yellow-500",
  NOT_RECOMMENDED: "bg-red-500",
};

const RECOMMENDATION_LABELS = {
  STRONGLY_RECOMMEND: "Fortemente Recomendado",
  RECOMMEND: "Recomendado",
  NEUTRAL: "Neutro",
  NOT_RECOMMENDED: "Não Recomendado",
};

const DISC_COLORS: Record<string, string> = {
  D: "#EF4444",
  I: "#F59E0B",
  S: "#22C55E",
  C: "#3B82F6",
};

// ============================================
// Component
// ============================================

export function CandidateReportCard({ candidateId, jobId }: CandidateReportCardProps) {
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/report`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Falha ao gerar relatório");
      }

      const data = await response.json();
      setReport(data.report);
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar relatório");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Relatório do Candidato</CardTitle>
              <CardDescription>Análise completa com IA</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateReport}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : report ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Gerar Relatório
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!report && !isLoading && (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Clique em "Gerar Relatório" para uma análise completa do candidato
            </p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {report && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Overall Score */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground">Score Geral</p>
                <p className={`text-4xl font-bold ${getScoreColor(report.overallScore)}`}>
                  {report.overallScore}%
                </p>
              </div>
              <div className="text-right">
                <Badge className={`${RECOMMENDATION_COLORS[report.recommendation]} text-white`}>
                  {RECOMMENDATION_LABELS[report.recommendation]}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2 max-w-[200px]">
                  {report.recommendationReason}
                </p>
              </div>
            </div>

            {/* Summary */}
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>Resumo</AlertTitle>
              <AlertDescription>{report.summary}</AlertDescription>
            </Alert>

            {/* Key Strengths & Concerns */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <h4 className="font-medium">Pontos Fortes</h4>
                  </div>
                  <ul className="space-y-2">
                    {report.keyStrengths.map((strength, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <h4 className="font-medium">Pontos de Atenção</h4>
                  </div>
                  <ul className="space-y-2">
                    {report.potentialConcerns.map((concern, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">•</span>
                        {concern}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* DISC Comparison */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Análise DISC
                  </span>
                  {isExpanded ? <ChevronUp /> : <ChevronDown />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4 pt-4">
                  {/* DISC Fit Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fit DISC</span>
                    <span className={`font-bold ${getScoreColor(report.discComparison.fitScore)}`}>
                      {report.discComparison.fitScore}%
                    </span>
                  </div>
                  <Progress value={report.discComparison.fitScore} className="h-2" />

                  {/* DISC Bars Comparison */}
                  <div className="space-y-3">
                    {["D", "I", "S", "C"].map((factor) => (
                      <div key={factor} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: DISC_COLORS[factor] }}>{factor}</span>
                          <span className="text-muted-foreground">
                            Candidato: {report.discComparison.candidateProfile[factor as keyof typeof report.discComparison.candidateProfile]}% | 
                            Ideal: {report.discComparison.jobRequirements[factor as keyof typeof report.discComparison.jobRequirements]}%
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Progress
                            value={report.discComparison.candidateProfile[factor as keyof typeof report.discComparison.candidateProfile]}
                            className="h-2 flex-1"
                          />
                          <Progress
                            value={report.discComparison.jobRequirements[factor as keyof typeof report.discComparison.jobRequirements]}
                            className="h-2 flex-1 opacity-50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DISC Recommendations */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-2">Recomendações DISC</p>
                    <ul className="text-sm space-y-1">
                      {report.discComparison.recommendations.map((rec, i) => (
                        <li key={i} className="text-muted-foreground">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Geographic Analysis */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">Análise Geográfica</h4>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Candidato</p>
                    <p className="text-sm">
                      {report.geographicAnalysis.candidateLocation.city || "Não informado"}, {" "}
                      {report.geographicAnalysis.candidateLocation.state || ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Vaga</p>
                    <p className="text-sm">
                      {report.geographicAnalysis.jobLocation.remote ? (
                        <Badge variant="outline">Remoto</Badge>
                      ) : (
                        <>
                          {report.geographicAnalysis.jobLocation.city || "Não informado"}, {" "}
                          {report.geographicAnalysis.jobLocation.state || ""}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  {report.geographicAnalysis.relocationNeeded && (
                    <Badge variant="secondary">Necessita relocação</Badge>
                  )}
                  {report.geographicAnalysis.commuteFeasible && (
                    <Badge variant="outline">Commute viável</Badge>
                  )}
                  <Badge variant="outline">{report.geographicAnalysis.distance}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Salary Expectation */}
            {report.salaryExpectation && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Expectativa Salarial</h4>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Estimado</p>
                      <p className="font-medium">{report.salaryExpectation.estimated}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Faixa de Mercado</p>
                      <p className="font-medium">{report.salaryExpectation.marketRange}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Recomendação</p>
                      <p className="font-medium">{report.salaryExpectation.recommendation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interview Focus */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">Foco na Entrevista</h4>
                </div>
                <ul className="space-y-2">
                  {report.interviewFocus.map((focus, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Target className="h-4 w-4 text-primary mt-0.5" />
                      {focus}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Próximos Passos</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  {report.nextSteps.map((step, i) => (
                    <li key={i} className="text-sm">{step}</li>
                  ))}
                </ol>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
