"use client";

import { type Variants } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type LucideIcon } from "lucide-react";

// ============================================
// INTERFACES
// ============================================

export interface ClientContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  isPrimary: boolean;
}

export interface ClientNotification {
  id: string;
  channel: "email" | "whatsapp" | "both";
  status: "sent" | "failed" | "pending";
  sentAt: string;
  eventType?: string;
  message?: string;
  recipientName?: string;
}

export interface ClientEvent {
  id: string;
  eventType: string;
  title?: string;
  description?: string;
  createdAt: string;
  candidateName?: string;
  jobName?: string;
  notifications?: ClientNotification[];
}

export interface ClientDetail {
  id: string;
  name: string;
  cnpj?: string;
  tradeName?: string;
  legalNature?: string;
  foundingDate?: string;
  companySize?: string;
  shareCapital?: string;
  registration?: string;
  companyEmail?: string;
  companyPhone?: string;
  mainActivity?: string;
  status?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  address?: string;
  industry?: string;
  website?: string;
  notes?: string;
  logoUrl?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contacts?: ClientContact[];
  stats?: {
    totalJobs: number;
    activeJobs: number;
    totalCandidates: number;
    contactsCount: number;
    notificationsSent: number;
    lastEventAt?: string;
  };
  notificationSettings?: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    frequency: "immediate" | "daily" | "weekly";
    aiTone: "professional" | "casual" | "formal";
    eventTypes: string[];
  };
}

export interface ClientListItem {
  id: string;
  name: string;
  cnpj?: string;
  tradeName?: string;
  industry?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  city?: string;
  state?: string;
  stats?: {
    totalJobs: number;
    activeJobs: number;
    totalCandidates: number;
    contactsCount: number;
    notificationsSent: number;
    lastEventAt?: string;
  };
  notificationSettings?: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
  };
  contacts?: ClientContact[];
}

export interface JobItem {
  id: string;
  title: string;
  department?: string;
  status: string;
  location?: string;
  candidatesCount?: number;
}

// ============================================
// CONSTANTS
// ============================================

export const EVENT_LABELS: Record<string, string> = {
  CANDIDATE_NEW: "Novo Candidato",
  CANDIDATE_SCREENING: "Triagem",
  CANDIDATE_INTERVIEW: "Entrevista",
  CANDIDATE_OFFER: "Proposta Enviada",
  CANDIDATE_HIRED: "Contratação",
  CANDIDATE_REJECTED: "Candidato Recusado",
  CANDIDATE_WITHDRAWN: "Candidato Desistiu",
  INTERVIEW_SCHEDULED: "Entrevista Agendada",
  INTERVIEW_COMPLETED: "Entrevista Concluída",
  INTERVIEW_CANCELLED: "Entrevista Cancelada",
  INTERVIEW_NO_SHOW: "No-show",
  DISC_TEST_SENT: "Teste DISC Enviado",
  DISC_TEST_COMPLETED: "Teste DISC Concluído",
  DISC_PROFILE_READY: "Perfil DISC Pronto",
  JOB_PUBLISHED: "Vaga Publicada",
  JOB_CLOSED: "Vaga Encerrada",
  JOB_PAUSED: "Vaga Pausada",
  WEEKLY_SUMMARY: "Resumo Semanal",
  MANUAL_UPDATE: "Atualização Manual",
};

export function getEventColor(eventType: string): string {
  if (eventType.startsWith("CANDIDATE_")) return "bg-emerald-500";
  if (eventType.startsWith("INTERVIEW_")) return "bg-amber-500";
  if (eventType.startsWith("DISC_")) return "bg-violet-500";
  if (eventType.startsWith("JOB_")) return "bg-teal-500";
  if (eventType === "WEEKLY_SUMMARY") return "bg-sky-500";
  if (eventType === "MANUAL_UPDATE") return "bg-sky-500";
  return "bg-gray-500";
}

export function getEventTextColor(eventType: string): string {
  if (eventType.startsWith("CANDIDATE_")) return "text-emerald-600";
  if (eventType.startsWith("INTERVIEW_")) return "text-amber-600";
  if (eventType.startsWith("DISC_")) return "text-violet-600";
  if (eventType.startsWith("JOB_")) return "text-teal-600";
  if (eventType === "WEEKLY_SUMMARY") return "text-sky-600";
  if (eventType === "MANUAL_UPDATE") return "text-sky-600";
  return "text-gray-600";
}

export function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return "Data desconhecida";
  }
}

export function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const FREQUENCY_LABELS: Record<string, string> = {
  immediate: "Imediato",
  daily: "Resumo Diário",
  weekly: "Resumo Semanal",
};

export const AI_TONE_LABELS: Record<string, string> = {
  professional: "Profissional",
  casual: "Casual",
  formal: "Formal",
};

export const ALL_EVENT_TYPES = Object.keys(EVENT_LABELS);

// Animation variants
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};
