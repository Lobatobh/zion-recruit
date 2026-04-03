"use client";

/**
 * Matching Dialog - Zion Recruit
 * Display detailed candidate-job matching analysis
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Target,
  Brain,
  Globe,
  Briefcase,
  RefreshCw,
  Award,
  MapPin,
  Star,
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MatchingDialogProps {
  candidateId: string | null;
  jobId: string | null;
  candidateName: string;
  jobTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SkillMatch {
  skill: string;
  required: boolean;
  candidateLevel: string | null;
  requiredLevel: string;
  score: number;
  gap: boolean;
}

interface MatchData {
  overallScore: number;
  breakdown: {
    skills: number;
    experience: number;
    disc: number;
    cultural: number;
    geographic: number;
    weights: {
      skills: number;
      experience: number;
      disc: number;
      cultural: number;
      geographic: number;
    };
  };
  skillMatches: SkillMatch[];
  experienceMatch: {
    yearsRequired: number;
    yearsCandidate: number;
    relevanceScore: number;
    highlights: string[];
    gaps: string[];
  };
  discMatch: {
    candidateProfile: { D: number; I: number; S: number; C: number };
    requiredProfile: { D: number; I: number; S: number; C: number } | null;
    compatibilityScore: number;
    behavioralFit: string;
    potentialFrictions: string[];
  };
  culturalMatch: {
    score: number;
    workStyleFit: string;
    teamFit: string;
    valuesAlignment: string[];
  };
  geographicMatch: {
    score: number;
    location: string;
    relocationNeeded: boolean;
    remoteWorkFit: number;
    timezoneMatch: boolean;
  };
  ranking: {
    position: number;
    totalCandidates: number;
    percentile: number;
  };
  recommendation: 'STRONG_MATCH' | 'GOOD_MATCH' | 'PARTIAL_MATCH' | 'WEAK_MATCH';
  summary: string;
  improvementSuggestions: string[];
}

const recommendationConfig = {
  STRONG_MATCH: {
    label: "Excelente Match",
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    icon: Star,
  },
  GOOD_MATCH: {
    label: "Bom Match",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    icon: CheckCircle,
  },
  PARTIAL_MATCH: {
    label: "Match Parcial",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    icon: AlertCircle,
  },
  WEAK_MATCH: {
    label: "Match Fraco",
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    icon: AlertCircle,
  },
};

export function MatchingDialog({
  candidateId,
  jobId,
  candidateName,
  jobTitle,
  open,
  onOpenChange,
}: MatchingDialogProps) {
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && candidateId && jobId) {
      fetchMatchData();
    }
  }, [open, candidateId, jobId]);

  const fetchMatchData = async () => {
    if (!candidateId || !jobId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/matching?candidateId=${candidateId}&jobId=${jobId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar análise");
      }

      setMatchData(data.match);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar análise");
      toast.error("Erro ao carregar análise de matching");
    } finally {
      setIsLoading(false);
    }
  };

  const recalculateMatch = async () => {
    if (!candidateId || !jobId) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, jobId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao recalcular");
      }

      setMatchData(data.match);
      toast.success("Matching recalculado com sucesso");
    } catch (err) {
      toast.error("Erro ao recalcular matching");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Análise de Matching</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        ) : error ? (
          <div className="p-6 flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={fetchMatchData}>
              Tentar novamente
            </Button>
          </div>
        ) : matchData ? (
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">Análise de Matching</h2>
                  <p className="text-muted-foreground">
                    {candidateName} · {jobTitle}
                  </p>
                </div>
                <Button variant="outline" onClick={recalculateMatch} disabled={isLoading}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                  Recalcular
                </Button>
              </div>

              {/* Recommendation Banner */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-4 rounded-lg",
                  recommendationConfig[matchData.recommendation].bgColor
                )}
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const config = recommendationConfig[matchData.recommendation];
                    const Icon = config.icon;
                    return (
                      <>
                        <div className={cn("p-2 rounded-full", config.color)}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className={cn("font-semibold text-lg", config.textColor)}>
                              {config.label}
                            </span>
                            <Badge variant="secondary" className="text-sm">
                              #{matchData.ranking.position} de {matchData.ranking.totalCandidates}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {matchData.summary}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </motion.div>

              {/* Score Cards */}
              <div className="grid grid-cols-5 gap-3">
                <ScoreCard
                  label="Skills"
                  value={matchData.breakdown.skills}
                  weight={matchData.breakdown.weights.skills}
                  icon={TrendingUp}
                  color="blue"
                />
                <ScoreCard
                  label="Experiência"
                  value={matchData.breakdown.experience}
                  weight={matchData.breakdown.weights.experience}
                  icon={Briefcase}
                  color="green"
                />
                <ScoreCard
                  label="DISC"
                  value={matchData.breakdown.disc}
                  weight={matchData.breakdown.weights.disc}
                  icon={Brain}
                  color="purple"
                />
                <ScoreCard
                  label="Cultural"
                  value={matchData.breakdown.cultural}
                  weight={matchData.breakdown.weights.cultural}
                  icon={Users}
                  color="orange"
                />
                <ScoreCard
                  label="Geográfico"
                  value={matchData.breakdown.geographic}
                  weight={matchData.breakdown.weights.geographic}
                  icon={Globe}
                  color="teal"
                />
              </div>

              {/* Overall Score */}
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Score Geral</p>
                      <p className="text-4xl font-bold text-primary">{matchData.overallScore}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Percentil</p>
                      <p className="text-2xl font-semibold">{matchData.ranking.percentile}%</p>
                    </div>
                  </div>
                  <Progress value={matchData.overallScore} className="h-3 mt-3" />
                </CardContent>
              </Card>

              {/* Detailed Analysis Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Skills Analysis */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      Skills Técnicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {matchData.skillMatches.length > 0 ? (
                      matchData.skillMatches.slice(0, 6).map((skill, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {skill.gap ? (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            <span className="text-sm">{skill.skill}</span>
                          </div>
                          <Badge variant={skill.gap ? "destructive" : "secondary"} className="text-xs">
                            {skill.score}%
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma skill específica requerida</p>
                    )}
                  </CardContent>
                </Card>

                {/* Experience Analysis */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-green-500" />
                      Experiência
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Anos de experiência</span>
                      <span className="font-medium">
                        {matchData.experienceMatch.yearsCandidate} / {matchData.experienceMatch.yearsRequired}+
                      </span>
                    </div>
                    <Progress value={matchData.experienceMatch.relevanceScore} className="h-2" />
                    {matchData.experienceMatch.highlights.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-green-600 mb-1">Destaques</p>
                        <ul className="text-xs space-y-1">
                          {matchData.experienceMatch.highlights.slice(0, 2).map((h, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                              {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {matchData.experienceMatch.gaps.length > 0 && (
                      <div>
                        <p className="text-xs text-amber-600 mb-1">Gaps</p>
                        <ul className="text-xs space-y-1">
                          {matchData.experienceMatch.gaps.slice(0, 2).map((g, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* DISC Analysis */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      Perfil DISC
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      {(['D', 'I', 'S', 'C'] as const).map((type) => (
                        <div key={type} className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">{type}</div>
                          <div className="text-lg font-bold text-purple-600">
                            {matchData.discMatch.candidateProfile[type]}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium">Fit Comportamental</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {matchData.discMatch.behavioralFit}
                      </p>
                    </div>
                    {matchData.discMatch.potentialFrictions.length > 0 && (
                      <div>
                        <p className="text-xs text-amber-600 mb-1">Possíveis Fricções</p>
                        <ul className="text-xs space-y-1">
                          {matchData.discMatch.potentialFrictions.slice(0, 2).map((f, i) => (
                            <li key={i}>• {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Geographic Analysis */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-teal-500" />
                      Localização
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{matchData.geographicMatch.location}</span>
                    </div>
                    {matchData.geographicMatch.relocationNeeded && (
                      <Badge variant="outline" className="text-amber-600">
                        Mudança necessária
                      </Badge>
                    )}
                    <div>
                      <span className="text-sm text-muted-foreground">Fit para remoto:</span>
                      <Progress value={matchData.geographicMatch.remoteWorkFit} className="h-2 mt-1" />
                    </div>
                    <div className="flex items-center gap-2">
                      {matchData.geographicMatch.timezoneMatch ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-sm">
                        {matchData.geographicMatch.timezoneMatch ? "Mesmo fuso horário" : "Fusos diferentes"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Improvement Suggestions */}
              {matchData.improvementSuggestions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Sugestões de Melhoria
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid md:grid-cols-2 gap-2">
                      {matchData.improvementSuggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Award className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
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
  weight,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  weight: number;
  icon: React.ElementType;
  color: "blue" | "green" | "purple" | "orange" | "teal";
}) {
  const colorClasses = {
    blue: "text-blue-500",
    green: "text-green-500",
    purple: "text-purple-500",
    orange: "text-orange-500",
    teal: "text-teal-500",
  };

  const bgClasses = {
    blue: "bg-blue-500/10",
    green: "bg-green-500/10",
    purple: "bg-purple-500/10",
    orange: "bg-orange-500/10",
    teal: "bg-teal-500/10",
  };

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-1.5 rounded", bgClasses[color])}>
          <Icon className={cn("h-4 w-4", colorClasses[color])} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{Math.round(value)}%</div>
      <Progress value={value} className="h-1.5 mt-2" />
      <div className="text-xs text-muted-foreground mt-1">
        Peso: {Math.round(weight * 100)}%
      </div>
    </div>
  );
}
