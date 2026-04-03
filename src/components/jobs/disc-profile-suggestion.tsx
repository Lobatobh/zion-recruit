"use client";

/**
 * DISC Profile Suggestion Card - Zion Recruit
 * Displays AI-suggested DISC profile for a job
 * Uses discProfileRequired field (JSON string) from the Job model
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Brain, Users, Briefcase, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================
// Types
// ============================================

interface DISCProfileData {
  D: number;
  I: number;
  S: number;
  C: number;
}

interface JobDISCData {
  discProfileRequired: string | null;
}

interface DISCProfileSuggestionCardProps {
  job: JobDISCData;
  isLoading?: boolean;
  compact?: boolean;
}

// ============================================
// Constants
// ============================================

const DISC_COLORS: Record<string, string> = {
  D: "#EF4444",
  I: "#F59E0B",
  S: "#22C55E",
  C: "#3B82F6",
};

const DISC_NAMES: Record<string, string> = {
  D: "Dominância",
  I: "Influência",
  S: "Estabilidade",
  C: "Conformidade",
};

const DISC_ICONS: Record<string, string> = {
  D: "🎯",
  I: "💡",
  S: "🤝",
  C: "📊",
};

const COMBO_DESCRIPTIONS: Record<string, { name: string; description: string }> = {
  DI: { name: "Iniciador", description: "Líder dinâmico que inspira equipes" },
  DS: { name: "Realizador", description: "Determinado com estabilidade" },
  DC: { name: "Desafiador", description: "Estrategista analítico" },
  ID: { name: "Promotor", description: "Persuasivo e orientado a resultados" },
  IS: { name: "Conselheiro", description: "Comunicador empático" },
  IC: { name: "Avaliador", description: "Criativo e analítico" },
  SD: { name: "Coordenador", description: "Líder confiável e consistente" },
  SI: { name: "Harmonizador", description: "Construtor de equipes" },
  SC: { name: "Especialista", description: "Especialista detalhista" },
  CD: { name: "Perfeccionista", description: "Analítico exigente" },
  CI: { name: "Praticante", description: "Comunicador técnico" },
  CS: { name: "Perfeccionista", description: "Preciso e paciente" },
};

// ============================================
// Helper Functions
// ============================================

function parseDISCProfile(jsonString: string | null): DISCProfileData | null {
  if (!jsonString) return null;
  try {
    const data = JSON.parse(jsonString);
    if (data.D !== undefined && data.I !== undefined && data.S !== undefined && data.C !== undefined) {
      return { D: data.D, I: data.I, S: data.S, C: data.C };
    }
    return null;
  } catch {
    return null;
  }
}

function getIntensity(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Muito Alto", color: "text-red-600" };
  if (score >= 60) return { label: "Alto", color: "text-orange-600" };
  if (score >= 40) return { label: "Médio", color: "text-yellow-600" };
  return { label: "Baixo", color: "text-green-600" };
}

// ============================================
// Components
// ============================================

function DISCBar({
  factor,
  score,
  isPrimary,
  isSecondary,
}: {
  factor: string;
  score: number;
  isPrimary?: boolean;
  isSecondary?: boolean;
}) {
  const intensity = getIntensity(score);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{DISC_ICONS[factor]}</span>
          <span className="font-medium text-sm">{DISC_NAMES[factor]}</span>
          {isPrimary && (
            <Badge variant="default" className="text-[10px] px-1 py-0 h-4">
              Primário
            </Badge>
          )}
          {isSecondary && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
              Secundário
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${intensity.color}`}>{score}%</span>
          <span className="text-xs text-muted-foreground">{intensity.label}</span>
        </div>
      </div>
      <div className="relative">
        <Progress
          value={score}
          className="h-2"
          style={{ backgroundColor: `${DISC_COLORS[factor]}20` }}
        />
        <div
          className="absolute top-0 left-0 h-2 rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: DISC_COLORS[factor] }}
        />
      </div>
    </div>
  );
}

function DISCChart({ profile }: { profile: DISCProfileData }) {
  const factors = ["D", "I", "S", "C"] as const;
  
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {[25, 50, 75, 100].map((r) => (
          <circle
            key={r}
            cx="50" cy="50" r={r * 0.4}
            fill="none" stroke="currentColor" strokeOpacity="0.1"
            className="text-muted-foreground"
          />
        ))}
        {factors.map((_, i) => {
          const angle = (i * 90 - 90) * (Math.PI / 180);
          return (
            <line
              key={i}
              x1="50" y1="50"
              x2={50 + 40 * Math.cos(angle)} y2={50 + 40 * Math.sin(angle)}
              stroke="currentColor" strokeOpacity="0.1"
              className="text-muted-foreground"
            />
          );
        })}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          points={factors.map((f, i) => {
            const angle = (i * 90 - 90) * (Math.PI / 180);
            const value = profile[f] / 100;
            return `${50 + value * 40 * Math.cos(angle)},${50 + value * 40 * Math.sin(angle)}`;
          }).join(" ")}
          fill="url(#discGradient)" stroke="url(#discGradient)" strokeWidth="2"
        />
        <defs>
          <linearGradient id="discGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {factors.map((f, i) => {
          const angle = (i * 90 - 90) * (Math.PI / 180);
          return (
            <text
              key={f}
              x={50 + 48 * Math.cos(angle)} y={50 + 48 * Math.sin(angle)}
              textAnchor="middle" dominantBaseline="middle"
              fill={DISC_COLORS[f]} className="text-xs font-bold"
            >
              {f}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function DISCProfileSuggestionCard({
  job,
  isLoading = false,
  compact = false,
}: DISCProfileSuggestionCardProps) {
  const profile = useMemo(() => parseDISCProfile(job.discProfileRequired), [job.discProfileRequired]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Perfil DISC ainda não analisado</p>
          <p className="text-xs text-muted-foreground mt-1">Crie ou atualize a vaga para gerar a sugestão</p>
        </CardContent>
      </Card>
    );
  }

  const sortedFactors = Object.entries(profile).sort(([, a], [, b]) => b - a).map(([f]) => f);
  const primaryFactor = sortedFactors[0];
  const secondaryFactor = sortedFactors[1];
  const combo = primaryFactor + secondaryFactor;
  const comboInfo = COMBO_DESCRIPTIONS[combo];

  if (compact) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Perfil DISC Ideal</span>
            </div>
            {comboInfo && <Badge variant="secondary">{combo}</Badge>}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["D", "I", "S", "C"] as const).map((factor) => (
              <TooltipProvider key={factor}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="text-center p-2 rounded-lg cursor-pointer"
                      style={{ backgroundColor: `${DISC_COLORS[factor]}15` }}
                    >
                      <div className="text-lg font-bold" style={{ color: DISC_COLORS[factor] }}>
                        {profile[factor]}
                      </div>
                      <div className="text-xs text-muted-foreground">{factor}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{DISC_NAMES[factor]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-primary" />
                Perfil DISC Ideal
              </CardTitle>
              <CardDescription>Sugestão baseada em análise de IA</CardDescription>
            </div>
            {comboInfo && (
              <div className="text-right">
                <Badge
                  className="text-base px-3 py-1"
                  style={{ background: `linear-gradient(135deg, ${DISC_COLORS[primaryFactor]}, ${DISC_COLORS[secondaryFactor]})` }}
                >
                  {combo} - {comboInfo.name}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">{comboInfo.description}</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <DISCChart profile={profile} />
            <div className="space-y-3">
              {(["D", "I", "S", "C"] as const).map((factor) => (
                <DISCBar
                  key={factor}
                  factor={factor}
                  score={profile[factor]}
                  isPrimary={factor === primaryFactor}
                  isSecondary={factor === secondaryFactor}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function DISCBadge({ profile: profileJson }: { profile: string | null }) {
  const data = parseDISCProfile(profileJson);

  if (!data) {
    return <Badge variant="outline" className="text-muted-foreground">DISC não definido</Badge>;
  }

  const sorted = Object.entries(data).sort(([, a], [, b]) => b - a).slice(0, 2).map(([f]) => f);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className="cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${DISC_COLORS[sorted[0]]}, ${DISC_COLORS[sorted[1]]})` }}
          >
            D:{data.D} I:{data.I} S:{data.S} C:{data.C}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-0.5">
            <p style={{ color: DISC_COLORS.D }}>D: {DISC_NAMES.D} - {data.D}%</p>
            <p style={{ color: DISC_COLORS.I }}>I: {DISC_NAMES.I} - {data.I}%</p>
            <p style={{ color: DISC_COLORS.S }}>S: {DISC_NAMES.S} - {data.S}%</p>
            <p style={{ color: DISC_COLORS.C }}>C: {DISC_NAMES.C} - {data.C}%</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
