import { create } from "zustand";
import {
  Candidate,
  CandidateWithRelations,
  CandidateFilters,
  CreateCandidateInput,
  UpdateCandidateInput,
  Note,
  CandidateActivity,
  MatchDetails,
} from "@/types/candidate";

interface CandidatesState {
  // Data
  candidates: CandidateWithRelations[];
  selectedCandidate: CandidateWithRelations | null;
  total: number;
  page: number;
  pageSize: number;

  // UI State
  isLoading: boolean;
  error: string | null;
  filters: CandidateFilters;

  // Dialog State
  isNewCandidateDialogOpen: boolean;
  editingCandidate: Candidate | null;
  isDeletingCandidate: Candidate | null;
  viewingCandidate: CandidateWithRelations | null;

  // Candidate details
  candidateNotes: Note[];
  candidateActivities: CandidateActivity[];
  matchDetails: MatchDetails | null;

  // Actions
  fetchCandidates: () => Promise<void>;
  fetchCandidate: (id: string) => Promise<void>;
  createCandidate: (data: CreateCandidateInput) => Promise<Candidate | null>;
  updateCandidate: (id: string, data: UpdateCandidateInput) => Promise<Candidate | null>;
  deleteCandidate: (id: string) => Promise<boolean>;

  // Notes Actions
  fetchNotes: (candidateId: string) => Promise<void>;
  addNote: (candidateId: string, content: string) => Promise<Note | null>;
  deleteNote: (candidateId: string, noteId: string) => Promise<boolean>;

  // Timeline Actions
  fetchActivities: (candidateId: string) => Promise<void>;

  // Match Score Actions
  fetchMatchScore: (candidateId: string) => Promise<void>;
  recalculateMatchScore: (candidateId: string) => Promise<boolean>;

  // Filter Actions
  setFilters: (filters: Partial<CandidateFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;

  // Dialog Actions
  openNewCandidateDialog: () => void;
  closeNewCandidateDialog: () => void;
  openEditCandidateDialog: (candidate: Candidate) => void;
  closeEditCandidateDialog: () => void;
  openDeleteCandidateDialog: (candidate: Candidate) => void;
  closeDeleteCandidateDialog: () => void;
  openCandidateDetail: (candidate: CandidateWithRelations) => void;
  closeCandidateDetail: () => void;

  // Utility Actions
  setSelectedCandidate: (candidate: CandidateWithRelations | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialFilters: CandidateFilters = {
  jobId: undefined,
  status: "ALL",
  stageId: undefined,
  search: undefined,
  minScore: undefined,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const initialState = {
  candidates: [],
  selectedCandidate: null,
  total: 0,
  page: 1,
  pageSize: 20,
  isLoading: false,
  error: null,
  filters: initialFilters,
  isNewCandidateDialogOpen: false,
  editingCandidate: null,
  isDeletingCandidate: null,
  viewingCandidate: null,
  candidateNotes: [],
  candidateActivities: [],
  matchDetails: null,
};

export const useCandidatesStore = create<CandidatesState>((set, get) => ({
  ...initialState,

  // Fetch all candidates
  fetchCandidates: async () => {
    const { filters, page, pageSize } = get();
    const safePage = page ?? 1;
    const safePageSize = pageSize ?? 20;
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (filters.jobId) {
        params.append("jobId", filters.jobId);
      }
      if (filters.status && filters.status !== "ALL") {
        params.append("status", filters.status);
      }
      if (filters.stageId) {
        params.append("stageId", filters.stageId);
      }
      if (filters.search) {
        params.append("search", filters.search);
      }
      if (filters.minScore) {
        params.append("minScore", filters.minScore.toString());
      }
      if (filters.sortBy) {
        params.append("sortBy", filters.sortBy);
      }
      if (filters.sortOrder) {
        params.append("sortOrder", filters.sortOrder);
      }
      params.append("page", safePage.toString());
      params.append("pageSize", safePageSize.toString());

      const response = await fetch(`/api/candidates?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch candidates");
      }

      const data = await response.json();
      set({
        candidates: data.candidates,
        total: data.total ?? 0,
        page: data.page ?? safePage,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching candidates:", error);
      set({
        error: "Erro ao carregar candidatos. Tente novamente.",
        isLoading: false,
      });
    }
  },

  // Fetch single candidate
  fetchCandidate: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/candidates/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch candidate");
      }

      const data = await response.json();
      set({ selectedCandidate: data.candidate, isLoading: false });
    } catch (error) {
      console.error("Error fetching candidate:", error);
      set({
        error: "Erro ao carregar candidato. Tente novamente.",
        isLoading: false,
      });
    }
  },

  // Create candidate
  createCandidate: async (data: CreateCandidateInput) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create candidate");
      }

      const result = await response.json();

      // Refresh candidates list
      await get().fetchCandidates();
      set({ isNewCandidateDialogOpen: false, isLoading: false });

      return result.candidate;
    } catch (error) {
      console.error("Error creating candidate:", error);
      set({
        error:
          error instanceof Error ? error.message : "Erro ao criar candidato",
        isLoading: false,
      });
      return null;
    }
  },

  // Update candidate
  updateCandidate: async (id: string, data: UpdateCandidateInput) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/candidates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update candidate");
      }

      const result = await response.json();

      // Refresh candidates list
      await get().fetchCandidates();
      set({ editingCandidate: null, isLoading: false });

      return result.candidate;
    } catch (error) {
      console.error("Error updating candidate:", error);
      set({
        error:
          error instanceof Error ? error.message : "Erro ao atualizar candidato",
        isLoading: false,
      });
      return null;
    }
  },

  // Delete candidate
  deleteCandidate: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/candidates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete candidate");
      }

      // Refresh candidates list
      await get().fetchCandidates();
      set({ isDeletingCandidate: null, isLoading: false });

      return true;
    } catch (error) {
      console.error("Error deleting candidate:", error);
      set({
        error:
          error instanceof Error ? error.message : "Erro ao excluir candidato",
        isLoading: false,
      });
      return false;
    }
  },

  // Fetch notes for a candidate
  fetchNotes: async (candidateId: string) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}/notes`);
      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      const data = await response.json();
      set({ candidateNotes: data.notes || [] });
    } catch (error) {
      console.error("Error fetching notes:", error);
      set({ candidateNotes: [] });
    }
  },

  // Add note to a candidate
  addNote: async (candidateId: string, content: string) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to add note");
      }

      const data = await response.json();

      // Refresh notes
      await get().fetchNotes(candidateId);

      return data.note;
    } catch (error) {
      console.error("Error adding note:", error);
      return null;
    }
  },

  // Delete note
  deleteNote: async (candidateId: string, noteId: string) => {
    try {
      const response = await fetch(
        `/api/candidates/${candidateId}/notes/${noteId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      // Refresh notes
      await get().fetchNotes(candidateId);

      return true;
    } catch (error) {
      console.error("Error deleting note:", error);
      return false;
    }
  },

  // Fetch activities for a candidate
  fetchActivities: async (candidateId: string) => {
    try {
      const response = await fetch(
        `/api/candidates/${candidateId}/activities`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }

      const data = await response.json();
      set({ candidateActivities: data.activities || [] });
    } catch (error) {
      console.error("Error fetching activities:", error);
      set({ candidateActivities: [] });
    }
  },

  // Fetch match score
  fetchMatchScore: async (candidateId: string) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}/match`);
      if (!response.ok) {
        throw new Error("Failed to fetch match score");
      }

      const data = await response.json();
      set({ matchDetails: data });
    } catch (error) {
      console.error("Error fetching match score:", error);
      set({ matchDetails: null });
    }
  },

  // Recalculate match score
  recalculateMatchScore: async (candidateId: string) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}/match`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to recalculate match score");
      }

      const data = await response.json();
      set({ matchDetails: data });

      // Refresh candidates list to show new score
      await get().fetchCandidates();

      return true;
    } catch (error) {
      console.error("Error recalculating match score:", error);
      return false;
    }
  },

  // Filter Actions
  setFilters: (filters: Partial<CandidateFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      page: 1, // Reset to first page when filters change
    }));
  },

  resetFilters: () => {
    set({ filters: initialFilters, page: 1 });
  },

  setPage: (page: number) => {
    set({ page });
  },

  // Dialog Actions
  openNewCandidateDialog: () => {
    set({ isNewCandidateDialogOpen: true });
  },

  closeNewCandidateDialog: () => {
    set({ isNewCandidateDialogOpen: false });
  },

  openEditCandidateDialog: (candidate: Candidate) => {
    set({ editingCandidate: candidate });
  },

  closeEditCandidateDialog: () => {
    set({ editingCandidate: null });
  },

  openDeleteCandidateDialog: (candidate: Candidate) => {
    set({ isDeletingCandidate: candidate });
  },

  closeDeleteCandidateDialog: () => {
    set({ isDeletingCandidate: null });
  },

  openCandidateDetail: (candidate: CandidateWithRelations) => {
    set({ viewingCandidate: candidate });
  },

  closeCandidateDetail: () => {
    set({
      viewingCandidate: null,
      candidateNotes: [],
      candidateActivities: [],
      matchDetails: null,
    });
  },

  // Utility Actions
  setSelectedCandidate: (candidate: CandidateWithRelations | null) => {
    set({ selectedCandidate: candidate });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));
