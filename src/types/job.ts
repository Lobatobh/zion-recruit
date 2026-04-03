import { z } from "zod";

// Enums matching Prisma schema
export const JobTypeSchema = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "FREELANCE",
]);

export const JobStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "CLOSED",
  "ARCHIVED",
]);

export const ContractTypeSchema = z.enum(["CLT", "PJ", "CONTRACTOR", "INTERNSHIP"]);
export const WorkModelSchema = z.enum(["REMOTE", "HYBRID", "ONSITE"]);
export const SalaryTypeSchema = z.enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);

export type JobType = z.infer<typeof JobTypeSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type ContractType = z.infer<typeof ContractTypeSchema>;
export type WorkModel = z.infer<typeof WorkModelSchema>;
export type SalaryType = z.infer<typeof SalaryTypeSchema>;

// Pipeline stage summary for inline display
export interface PipelineStageSummary {
  name: string;
  color: string;
  count: number;
}

// Job interface (from database - aligned with Prisma schema)
export interface Job {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  department: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  type: JobType;
  contractType: ContractType | null;
  workModel: WorkModel | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: SalaryType | null;
  currency: string;
  description: string;
  requirements: string;
  benefits: string | null;
  status: JobStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  isPublic: boolean;
  publicSlug: string | null;
  viewsCount: number;
  applicationsCount: number;
  aiSummary: string | null;
  aiParsedSkills: string | null;
  aiParsedKeywords: string | null;
  aiParsedSeniority: string | null;
  discProfileRequired: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  candidatesCount?: number;
  pipeline?: PipelineStageSummary[];
}

// Job with candidates count (from list)
export interface JobWithCandidates extends Job {
  candidatesCount: number;
}

// KPI Stats
export interface JobKPIStats {
  totalJobs: number;
  publishedJobs: number;
  draftJobs: number;
  closedJobs: number;
  totalCandidates: number;
  avgCandidatesPerJob: number;
}

// Pagination
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Available filters metadata
export interface FiltersMeta {
  departments: string[];
}

// Create job schema
export const createJobSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200, "Título muito longo"),
  department: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  type: JobTypeSchema.default("FULL_TIME"),
  contractType: ContractTypeSchema.default("CLT"),
  workModel: WorkModelSchema.default("REMOTE"),
  remote: z.boolean().default(false),
  salaryMin: z.number().min(0).optional().nullable(),
  salaryMax: z.number().min(0).optional().nullable(),
  salaryType: SalaryTypeSchema.default("MONTHLY"),
  currency: z.string().default("BRL"),
  description: z.string().min(1, "Descrição é obrigatória"),
  requirements: z.string().min(1, "Requisitos são obrigatórios"),
  benefits: z.string().optional().nullable(),
  status: JobStatusSchema.default("DRAFT"),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

// Update job schema (partial)
export const updateJobSchema = createJobSchema.partial();

export type UpdateJobInput = z.infer<typeof updateJobSchema>;

// Job filters
export interface JobFilters {
  status?: JobStatus | "ALL";
  department?: string;
  type?: JobType | "ALL";
  search?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortDir?: "asc" | "desc";
}

// Sort options
export type SortField = "title" | "createdAt" | "updatedAt" | "status" | "candidatesCount";

// Form select options
export const jobTypeOptions: { value: JobType; label: string }[] = [
  { value: "FULL_TIME", label: "Tempo Integral" },
  { value: "PART_TIME", label: "Meio Período" },
  { value: "CONTRACT", label: "Contrato" },
  { value: "INTERNSHIP", label: "Estágio" },
  { value: "FREELANCE", label: "Freelance" },
];

export const jobStatusOptions: { value: JobStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "PUBLISHED", label: "Publicada" },
  { value: "PAUSED", label: "Pausada" },
  { value: "CLOSED", label: "Fechada" },
  { value: "ARCHIVED", label: "Arquivada" },
];

export const contractTypeOptions: { value: ContractType; label: string }[] = [
  { value: "CLT", label: "CLT" },
  { value: "PJ", label: "PJ" },
  { value: "CONTRACTOR", label: "Contratante" },
  { value: "INTERNSHIP", label: "Estágio" },
];

export const workModelOptions: { value: WorkModel; label: string }[] = [
  { value: "REMOTE", label: "Remoto" },
  { value: "HYBRID", label: "Híbrido" },
  { value: "ONSITE", label: "Presencial" },
];

// Helper functions
export function getJobStatusLabel(status: JobStatus): string {
  const map: Record<JobStatus, string> = {
    DRAFT: "Rascunho",
    PUBLISHED: "Publicada",
    PAUSED: "Pausada",
    CLOSED: "Fechada",
    ARCHIVED: "Arquivada",
  };
  return map[status] || status;
}

export function getJobTypeLabel(type: JobType): string {
  const option = jobTypeOptions.find((opt) => opt.value === type);
  return option?.label || type;
}

export function getContractTypeLabel(type: ContractType): string {
  const option = contractTypeOptions.find((opt) => opt.value === type);
  return option?.label || type;
}

export function getWorkModelLabel(model: WorkModel): string {
  const option = workModelOptions.find((opt) => opt.value === model);
  return option?.label || model;
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string = "BRL"
): string | null {
  if (!min && !max) return null;

  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  }

  if (min) {
    return `A partir de ${formatter.format(min)}`;
  }

  if (max) {
    return `Até ${formatter.format(max)}`;
  }

  return null;
}

// Status cycle for quick toggle
const STATUS_CYCLE: JobStatus[] = ["DRAFT", "PUBLISHED", "PAUSED", "CLOSED"];
export function getNextStatus(current: JobStatus): JobStatus | null {
  const idx = STATUS_CYCLE.indexOf(current);
  if (idx === -1) return null;
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}
