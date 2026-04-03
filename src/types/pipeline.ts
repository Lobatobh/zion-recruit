/**
 * Pipeline Types - Zion Recruit
 * TypeScript interfaces for Pipeline Kanban Board
 */

import { Candidate, PipelineStage } from "@prisma/client";

// Stage colors available for pipeline stages
export const STAGE_COLORS = [
  { name: "Gray", value: "#6B7280" },
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Lime", value: "#84CC16" },
  { name: "Green", value: "#22C55E" },
  { name: "Emerald", value: "#10B981" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Sky", value: "#0EA5E9" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Purple", value: "#A855F7" },
  { name: "Fuchsia", value: "#D946EF" },
  { name: "Pink", value: "#EC4899" },
  { name: "Rose", value: "#F43F5E" },
] as const;

// Default stages for new organizations
export const DEFAULT_STAGES = [
  { name: "Novo", color: "#6B7280", order: 0 },
  { name: "Triagem", color: "#3B82F6", order: 1 },
  { name: "Entrevista", color: "#F59E0B", order: 2 },
  { name: "Teste Técnico", color: "#8B5CF6", order: 3 },
  { name: "Final", color: "#06B6D4", order: 4 },
  { name: "Oferta", color: "#22C55E", order: 5 },
] as const;

// Candidate with stage information for the kanban board
export interface CandidateWithStage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  portfolio: string | null;
  photo: string | null;
  matchScore: number | null;
  status: string;
  createdAt: Date;
  pipelineStageId: string | null;
  job: {
    id: string;
    title: string;
    department: string | null;
  } | null;
  pipelineStage: {
    id: string;
    name: string;
    color: string;
  } | null;
}

// Stage with candidates for the kanban board
export interface PipelineStageWithCandidates extends Omit<PipelineStage, 'candidates'> {
  candidates: CandidateWithStage[];
  _count?: {
    candidates: number;
  };
}

// API response for pipeline stages
export interface PipelineStagesResponse {
  stages: PipelineStageWithCandidates[];
  total: number;
}

// Create stage input
export interface CreateStageInput {
  name: string;
  color?: string;
}

// Update stage input
export interface UpdateStageInput {
  name?: string;
  color?: string;
  order?: number;
}

// Move candidate input
export interface MoveCandidateInput {
  stageId: string;
}

// Drag and drop types
export interface DragItem {
  type: "CANDIDATE";
  candidate: CandidateWithStage;
  sourceStageId: string;
}

export interface DropResult {
  candidateId: string;
  sourceStageId: string;
  targetStageId: string;
}

// Pipeline view filters
export interface PipelineFilters {
  jobId?: string;
  search?: string;
  minScore?: number;
}

// Match score helpers
export function getMatchScoreColor(score: number | null): string {
  if (score === null) return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  if (score >= 70) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 50) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

export function getMatchScoreLabel(score: number | null): string {
  if (score === null) return "Não avaliado";
  if (score >= 70) return "Excelente";
  if (score >= 50) return "Bom";
  return "Baixo";
}

export function getMatchScoreBgClass(score: number | null): string {
  if (score === null) return "";
  if (score >= 70) return "border-l-green-500";
  if (score >= 50) return "border-l-yellow-500";
  return "border-l-red-500";
}

// Stage color helpers
export function getStageColorWithBg(color: string): string {
  return `bg-[${color}]`;
}

export function getStageColorBorder(color: string): string {
  return `border-l-[${color}]`;
}

// Format date helper
export function formatAppliedDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `${days} dias`;
  if (days < 30) return `${Math.floor(days / 7)} semanas`;
  return `${Math.floor(days / 30)} meses`;
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
