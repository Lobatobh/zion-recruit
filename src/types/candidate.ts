import { z } from "zod";

// Enums matching Prisma schema
export const CandidateStatusSchema = z.enum([
  "SOURCED",
  "APPLIED",
  "SCREENING",
  "INTERVIEWING",
  "DISC_TEST",
  "OFFERED",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
  "NO_RESPONSE",
]);

export type CandidateStatus = z.infer<typeof CandidateStatusSchema>;

// Parsed data types (from AI resume parsing)
export interface ParsedSkill {
  name: string;
  level?: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface ParsedExperience {
  company?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  years?: number;
}

export interface ParsedEducation {
  institution?: string;
  degree: string;
  field?: string;
  year?: string;
}

export interface ParsedLanguage {
  name: string;
  level?: "basic" | "intermediate" | "advanced" | "native";
}

// Match details type
export interface MatchDetails {
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  overallScore: number;
  reasons?: string[];
  strengths?: string[];
  gaps?: string[];
}

// Candidate interface (from database)
export interface Candidate {
  id: string;
  tenantId: string;
  jobId: string | null;
  pipelineStageId: string | null;
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  portfolio: string | null;
  resumeUrl: string | null;
  resumeText: string | null;
  photo: string | null;
  parsedSkills: string | null;
  parsedExperience: string | null;
  parsedEducation: string | null;
  aiSummary: string | null;
  matchScore: number | null;
  matchDetails: string | null;
  status: CandidateStatus;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

// Candidate with relations
export interface CandidateWithRelations extends Candidate {
  job?: {
    id: string;
    title: string;
    department: string | null;
  };
  pipelineStage?: {
    id: string;
    name: string;
    color: string;
    order: number;
  } | null;
  notes?: Note[];
  _count?: {
    notes: number;
  };
}

export interface Note {
  id: string;
  candidateId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string | null;
    email: string;
  };
}

// Activity type for timeline
export interface CandidateActivity {
  id: string;
  type: ActivityType;
  description: string;
  metadata?: string | null;
  createdAt: string;
  member?: {
    user: {
      name: string | null;
      email: string;
    };
  } | null;
}

export type ActivityType =
  | "CANDIDATE_APPLIED"
  | "CANDIDATE_MOVED"
  | "CANDIDANT_RATED"
  | "NOTE_ADDED"
  | "EMAIL_SENT"
  | "STATUS_CHANGED"
  | "AI_ANALYZED";

// Create candidate schema
export const createCandidateSchema = z.object({
  jobId: z.string().optional().nullable(),
  name: z.string().min(1, "Nome é obrigatório").max(200),
  email: z.string().email("Email inválido"),
  phone: z.string().max(50).optional().nullable(),
  linkedin: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  portfolio: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  resumeText: z.string().optional().nullable(),
  resumeBase64: z.string().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

// Update candidate schema (partial)
export const updateCandidateSchema = createCandidateSchema.partial().extend({
  status: CandidateStatusSchema.optional(),
  pipelineStageId: z.string().optional().nullable(),
});

export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;

// Candidate filters
export interface CandidateFilters {
  jobId?: string;
  status?: CandidateStatus | "ALL";
  stageId?: string;
  search?: string;
  minScore?: number;
  sortBy?: "name" | "matchScore" | "createdAt" | "status";
  sortOrder?: "asc" | "desc";
}

// Candidate list response
export interface CandidatesListResponse {
  candidates: CandidateWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

// Candidate API responses
export interface CandidateApiResponse {
  candidate: CandidateWithRelations;
}

// Parse resume response
export interface ParseResumeResponse {
  success: boolean;
  data?: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    skills: ParsedSkill[];
    experience: ParsedExperience[];
    education: ParsedEducation[];
    languages: ParsedLanguage[];
    summary?: string;
    confidence: number;
  };
  error?: string;
}

// Match score response
export interface MatchScoreResponse {
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  reasons?: string[];
  strengths?: string[];
  gaps?: string[];
  colorClass: string;
  label: string;
}

// Form select options
export const candidateStatusOptions: {
  value: CandidateStatus;
  label: string;
}[] = [
  { value: "SOURCED", label: "Sourced" },
  { value: "APPLIED", label: "Aplicou" },
  { value: "SCREENING", label: "Triagem" },
  { value: "INTERVIEWING", label: "Entrevistando" },
  { value: "DISC_TEST", label: "Teste DISC" },
  { value: "OFFERED", label: "Oferta Enviada" },
  { value: "HIRED", label: "Contratado" },
  { value: "REJECTED", label: "Rejeitado" },
  { value: "WITHDRAWN", label: "Desistiu" },
  { value: "NO_RESPONSE", label: "Sem Resposta" },
];

// Status colors and labels
export const candidateStatusConfig: Record<
  CandidateStatus,
  { label: string; color: string; bgColor: string }
> = {
  SOURCED: {
    label: "Sourced",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
  },
  APPLIED: {
    label: "Aplicou",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  },
  SCREENING: {
    label: "Triagem",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  INTERVIEWING: {
    label: "Entrevistando",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  DISC_TEST: {
    label: "Teste DISC",
    color: "text-pink-700",
    bgColor: "bg-pink-100",
  },
  OFFERED: {
    label: "Oferta Enviada",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  HIRED: {
    label: "Contratado",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  REJECTED: {
    label: "Rejeitado",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  WITHDRAWN: {
    label: "Desistiu",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
  NO_RESPONSE: {
    label: "Sem Resposta",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
};

// Activity type config for timeline
export const activityTypeConfig: Record<
  ActivityType,
  { label: string; icon: string; color: string }
> = {
  CANDIDATE_APPLIED: {
    label: "Candidatura",
    icon: "FileText",
    color: "text-blue-500",
  },
  CANDIDATE_MOVED: {
    label: "Movido de etapa",
    icon: "ArrowRight",
    color: "text-amber-500",
  },
  CANDIDANT_RATED: {
    label: "Avaliado",
    icon: "Star",
    color: "text-yellow-500",
  },
  NOTE_ADDED: {
    label: "Nota adicionada",
    icon: "MessageSquare",
    color: "text-green-500",
  },
  EMAIL_SENT: {
    label: "Email enviado",
    icon: "Mail",
    color: "text-purple-500",
  },
  STATUS_CHANGED: {
    label: "Status alterado",
    icon: "RefreshCw",
    color: "text-indigo-500",
  },
  AI_ANALYZED: {
    label: "Análise IA",
    icon: "Sparkles",
    color: "text-cyan-500",
  },
};

// Helper functions
export function getCandidateStatusLabel(status: CandidateStatus): string {
  return candidateStatusConfig[status]?.label || status;
}

export function getCandidateStatusColor(status: CandidateStatus): string {
  return candidateStatusConfig[status]?.color || "text-gray-700";
}

export function getCandidateStatusBgColor(status: CandidateStatus): string {
  return candidateStatusConfig[status]?.bgColor || "bg-gray-100";
}

export function getMatchScoreColorClass(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-100";
  if (score >= 60) return "text-blue-600 bg-blue-100";
  if (score >= 40) return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
}

export function getMatchScoreLabelClass(score: number): string {
  if (score >= 80) return "Excelente Match";
  if (score >= 60) return "Bom Match";
  if (score >= 40) return "Match Parcial";
  return "Baixo Match";
}

export function getMatchScoreRingColor(score: number): string {
  if (score >= 80) return "stroke-green-500";
  if (score >= 60) return "stroke-blue-500";
  if (score >= 40) return "stroke-yellow-500";
  return "stroke-red-500";
}

// Parse JSON fields safely
export function parseJsonField<T>(jsonString: string | null): T | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

// Format date for display
export function formatCandidateDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

// Format relative time
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return formatCandidateDate(dateString);
}
