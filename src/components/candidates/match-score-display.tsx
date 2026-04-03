"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  getMatchScoreColorClass,
  getMatchScoreLabelClass,
  getMatchScoreRingColor,
  MatchDetails,
} from "@/types/candidate";
import { CheckCircle, XCircle, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface MatchScoreDisplayProps {
  score: number | null;
  details?: MatchDetails | null;
  showBreakdown?: boolean;
  compact?: boolean;
  onRecalculate?: () => void;
  isLoading?: boolean;
}

// Circular progress component
function CircularProgress({
  value,
  size = 120,
  strokeWidth = 10,
  className = "",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          className="stroke-muted"
          fill="none"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <motion.circle
          className={getMatchScoreRingColor(value)}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <motion.span
            className="text-3xl font-bold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            {value}
          </motion.span>
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>
    </div>
  );
}

// Score bar component
function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function MatchScoreDisplay({
  score,
  details,
  showBreakdown = true,
  compact = false,
  onRecalculate,
  isLoading = false,
}: MatchScoreDisplayProps) {
  const colorClass = useMemo(() => {
    if (score === null) return "";
    return getMatchScoreColorClass(score);
  }, [score]);

  const label = useMemo(() => {
    if (score === null) return "Não calculado";
    return getMatchScoreLabelClass(score);
  }, [score]);

  // Get score bar colors
  const getBarColor = (value: number) => {
    if (value >= 80) return "bg-green-500";
    if (value >= 60) return "bg-blue-500";
    if (value >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {score !== null ? (
          <>
            <Badge className={colorClass}>
              {score}%
            </Badge>
            <span className="text-xs text-muted-foreground">{label}</span>
          </>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Sem score
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Match Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        {score !== null ? (
          <div className="space-y-6">
            {/* Circular Score */}
            <div className="flex justify-center">
              <CircularProgress value={score} />
            </div>

            {/* Label */}
            <div className="text-center">
              <Badge className={`${colorClass} text-sm`}>{label}</Badge>
            </div>

            {/* Breakdown */}
            {showBreakdown && details && (
              <div className="space-y-4 pt-4 border-t">
                <ScoreBar
                  label="Skills"
                  value={details.skillsScore}
                  color={getBarColor(details.skillsScore)}
                />
                <ScoreBar
                  label="Experiência"
                  value={details.experienceScore}
                  color={getBarColor(details.experienceScore)}
                />
                <ScoreBar
                  label="Educação"
                  value={details.educationScore}
                  color={getBarColor(details.educationScore)}
                />
              </div>
            )}

            {/* Strengths */}
            {details?.strengths && details.strengths.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Pontos Fortes
                </h4>
                <ul className="space-y-1">
                  {details.strengths.map((strength, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-green-500 mt-0.5">•</span>
                      {strength}
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gaps */}
            {details?.gaps && details.gaps.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-amber-500" />
                  Lacunas
                </h4>
                <ul className="space-y-1">
                  {details.gaps.map((gap, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-amber-500 mt-0.5">•</span>
                      {gap}
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recalculate button */}
            {onRecalculate && (
              <div className="pt-4 border-t">
                <button
                  onClick={onRecalculate}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <Sparkles className={`h-4 w-4 ${isLoading ? "animate-pulse" : ""}`} />
                  {isLoading ? "Recalculando..." : "Recalcular com IA"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Score ainda não calculado</p>
            {onRecalculate && (
              <button
                onClick={onRecalculate}
                disabled={isLoading}
                className="mt-4 flex items-center justify-center gap-2 text-sm text-primary hover:underline disabled:opacity-50 mx-auto"
              >
                <Sparkles className={`h-4 w-4 ${isLoading ? "animate-pulse" : ""}`} />
                {isLoading ? "Calculando..." : "Calcular Score"}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
