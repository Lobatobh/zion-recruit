import { create } from "zustand";
import { toast } from "sonner";
import {
  Job,
  JobWithCandidates,
  JobFilters,
  CreateJobInput,
  UpdateJobInput,
  JobKPIStats,
  PaginationInfo,
  FiltersMeta,
  SortField,
  JobStatus,
  PipelineStageSummary,
} from "@/types/job";

interface JobsState {
  // Data
  jobs: JobWithCandidates[];
  selectedJob: (Job & { pipeline?: PipelineStageSummary[] }) | null;
  total: number;

  // Stats & Meta
  stats: JobKPIStats | null;
  pagination: PaginationInfo;
  filtersMeta: FiltersMeta;

  // UI State
  isLoading: boolean;
  error: string | null;
  filters: JobFilters;
  sortField: SortField;
  sortDir: "asc" | "desc";

  // Dialog State
  isNewJobDialogOpen: boolean;
  editingJob: Job | null;
  isDeletingJob: Job | null;
  isArchivingJob: Job | null;
  isDetailOpen: boolean;

  // Bulk Actions
  selectedIds: Set<string>;
  isBulkAction: boolean;

  // Actions
  fetchJobs: () => Promise<void>;
  fetchJob: (id: string) => Promise<void>;
  createJob: (data: CreateJobInput) => Promise<Job | null>;
  updateJob: (id: string, data: UpdateJobInput) => Promise<Job | null>;
  deleteJob: (id: string) => Promise<boolean>;
  duplicateJob: (id: string) => Promise<Job | null>;
  toggleJobStatus: (id: string) => Promise<void>;
  bulkAction: (action: string, ids: string[]) => Promise<boolean>;

  // Filter & Sort Actions
  setFilters: (filters: Partial<JobFilters>) => void;
  resetFilters: () => void;
  setSorting: (field: SortField) => void;
  setPage: (page: number) => void;

  // Dialog Actions
  openNewJobDialog: () => void;
  closeNewJobDialog: () => void;
  openEditJobDialog: (job: Job) => void;
  closeEditJobDialog: () => void;
  openDeleteJobDialog: (job: Job) => void;
  closeDeleteJobDialog: () => void;
  openArchiveJobDialog: (job: Job) => void;
  closeArchiveJobDialog: () => void;
  openDetailDialog: (job: JobWithCandidates) => void;
  closeDetailDialog: () => void;

  // Bulk Actions
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Utility Actions
  setSelectedJob: (job: (Job & { pipeline?: PipelineStageSummary[] }) | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialFilters: JobFilters = {
  status: "ALL",
  department: undefined,
  type: "ALL",
  search: undefined,
  page: 1,
  pageSize: 20,
  sortField: "createdAt",
  sortDir: "desc",
};

const initialPagination: PaginationInfo = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
};

const initialState = {
  jobs: [],
  selectedJob: null,
  total: 0,
  stats: null,
  pagination: initialPagination,
  filtersMeta: { departments: [] },
  isLoading: false,
  error: null,
  filters: initialFilters,
  sortField: "createdAt" as SortField,
  sortDir: "desc" as "asc" | "desc",
  isNewJobDialogOpen: false,
  editingJob: null,
  isDeletingJob: null,
  isArchivingJob: null,
  isDetailOpen: false,
  selectedIds: new Set<string>(),
  isBulkAction: false,
};

export const useJobsStore = create<JobsState>((set, get) => ({
  ...initialState,

  // Fetch all jobs with KPIs
  fetchJobs: async () => {
    const { filters, sortField, sortDir } = get();
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== "ALL") {
        params.append("status", filters.status);
      }
      if (filters.search) {
        params.append("search", filters.search);
      }
      if (filters.department) {
        params.append("department", filters.department);
      }
      if (filters.type && filters.type !== "ALL") {
        params.append("type", filters.type);
      }
      params.append("page", String(filters.page || 1));
      params.append("pageSize", String(filters.pageSize || 20));
      params.append("sortField", sortField);
      params.append("sortDir", sortDir);

      const response = await fetch(`/api/vacancies?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const data = await response.json();
      set({
        jobs: data.jobs,
        total: data.pagination.total,
        stats: data.stats,
        pagination: data.pagination,
        filtersMeta: data.filters,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching jobs:", error);
      set({
        error: "Erro ao carregar vagas. Tente novamente.",
        isLoading: false,
      });
    }
  },

  // Fetch single job
  fetchJob: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/vacancies/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job");
      }

      const data = await response.json();
      set({ selectedJob: data.job, isLoading: false });
    } catch (error) {
      console.error("Error fetching job:", error);
      set({
        error: "Erro ao carregar vaga. Tente novamente.",
        isLoading: false,
      });
    }
  },

  // Create job
  createJob: async (data: CreateJobInput) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/vacancies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create job");
      }

      const result = await response.json();

      // Refresh jobs list (clear any errors from the refresh - creation itself succeeded)
      await get().fetchJobs();
      set({ isNewJobDialogOpen: false, isLoading: false, error: null });

      toast.success(`Vaga "${data.title}" criada com sucesso!`);

      return result.job;
    } catch (error) {
      console.error("Error creating job:", error);
      const message = error instanceof Error ? error.message : "Erro ao criar vaga";
      set({ error: message, isLoading: false });
      toast.error(message);
      return null;
    }
  },

  // Update job
  updateJob: async (id: string, data: UpdateJobInput) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/vacancies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update job");
      }

      const result = await response.json();

      // Refresh jobs list
      await get().fetchJobs();
      set({ editingJob: null, isLoading: false, error: null });

      toast.success("Vaga atualizada com sucesso!");

      return result.job;
    } catch (error) {
      console.error("Error updating job:", error);
      const message = error instanceof Error ? error.message : "Erro ao atualizar vaga";
      set({ error: message, isLoading: false });
      toast.error(message);
      return null;
    }
  },

  // Delete job
  deleteJob: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/vacancies/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete job");
      }

      // Refresh jobs list
      await get().fetchJobs();
      set({ isDeletingJob: null, isLoading: false });

      toast.success("Vaga excluída com sucesso!");

      return true;
    } catch (error) {
      console.error("Error deleting job:", error);
      const message = error instanceof Error ? error.message : "Erro ao excluir vaga";
      set({ error: message, isLoading: false });
      toast.error(message);
      return false;
    }
  },

  // Duplicate job
  duplicateJob: async (id: string) => {
    const { jobs } = get();
    const jobToDuplicate = jobs.find((j) => j.id === id);

    if (!jobToDuplicate) {
      set({ error: "Vaga não encontrada" });
      return null;
    }

    return get().createJob({
      title: `${jobToDuplicate.title} (Cópia)`,
      department: jobToDuplicate.department,
      location: jobToDuplicate.location,
      type: jobToDuplicate.type,
      contractType: jobToDuplicate.contractType || undefined,
      workModel: jobToDuplicate.workModel || undefined,
      remote: jobToDuplicate.remote,
      salaryMin: jobToDuplicate.salaryMin,
      salaryMax: jobToDuplicate.salaryMax,
      currency: jobToDuplicate.currency,
      description: jobToDuplicate.description,
      requirements: jobToDuplicate.requirements,
      benefits: jobToDuplicate.benefits,
      status: "DRAFT",
    });
  },

  // Toggle job status
  toggleJobStatus: async (id: string) => {
    const { jobs, fetchJobs } = get();
    const job = jobs.find((j) => j.id === id);
    if (!job) return;

    const statusCycle: JobStatus[] = ["DRAFT", "PUBLISHED", "PAUSED", "CLOSED"];
    const currentIdx = statusCycle.indexOf(job.status);
    if (currentIdx === -1) return;

    const nextStatus = statusCycle[(currentIdx + 1) % statusCycle.length];

    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/vacancies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (response.ok) {
        await fetchJobs();
      }
    } catch {
      set({ error: "Erro ao alterar status", isLoading: false });
    }
  },

  // Bulk action
  bulkAction: async (action: string, ids: string[]) => {
    set({ isBulkAction: true, error: null });

    try {
      const response = await fetch("/api/vacancies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute bulk action");
      }

      await get().fetchJobs();
      set({ selectedIds: new Set(), isBulkAction: false });
      return true;
    } catch (error) {
      console.error("Error in bulk action:", error);
      set({
        error: "Erro ao executar ação em lote",
        isBulkAction: false,
      });
      return false;
    }
  },

  // Filter Actions
  setFilters: (newFilters: Partial<JobFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters, page: 1 },
    }));
  },

  resetFilters: () => {
    set({ filters: initialFilters });
  },

  // Sort
  setSorting: (field: SortField) => {
    const { sortField, sortDir } = get();
    if (sortField === field) {
      set({ sortDir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      set({ sortField: field, sortDir: "desc" });
    }
  },

  // Pagination
  setPage: (page: number) => {
    set((state) => ({
      filters: { ...state.filters, page },
    }));
  },

  // Dialog Actions
  openNewJobDialog: () => set({ isNewJobDialogOpen: true }),
  closeNewJobDialog: () => set({ isNewJobDialogOpen: false }),
  openEditJobDialog: (job: Job) => set({ editingJob: job }),
  closeEditJobDialog: () => set({ editingJob: null }),
  openDeleteJobDialog: (job: Job) => set({ isDeletingJob: job }),
  closeDeleteJobDialog: () => set({ isDeletingJob: null }),
  openArchiveJobDialog: (job: Job) => set({ isArchivingJob: job }),
  closeArchiveJobDialog: () => set({ isArchivingJob: null }),
  openDetailDialog: () => set({ isDetailOpen: true }),
  closeDetailDialog: () => set({ isDetailOpen: false, selectedJob: null }),

  // Bulk selection
  toggleSelect: (id: string) => {
    set((state) => {
      const newSet = new Set(state.selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedIds: newSet };
    });
  },

  selectAll: () => {
    const { jobs } = get();
    set({ selectedIds: new Set(jobs.map((j) => j.id)) });
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  // Utility
  setSelectedJob: (job) => set({ selectedJob: job }),
  clearError: () => set({ error: null }),
  reset: () => set(initialState),
}));
