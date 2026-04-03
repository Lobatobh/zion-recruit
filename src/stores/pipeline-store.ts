/**
 * Pipeline Store - Zion Recruit
 * Zustand store for pipeline kanban board state management
 */

import { create } from "zustand";
import {
  PipelineStageWithCandidates,
  CandidateWithStage,
  PipelineFilters,
  CreateStageInput,
  UpdateStageInput,
} from "@/types/pipeline";

interface DragState {
  activeCandidate: CandidateWithStage | null;
  sourceStageId: string | null;
}

interface PipelineState {
  // Data
  stages: PipelineStageWithCandidates[];
  totalCandidates: number;

  // UI State
  isLoading: boolean;
  error: string | null;
  filters: PipelineFilters;

  // Drag State
  dragState: DragState;

  // Dialog State
  selectedCandidate: CandidateWithStage | null;
  isCandidateDetailOpen: boolean;
  isAddCandidateOpen: boolean;
  isAddStageOpen: boolean;
  editingStage: PipelineStageWithCandidates | null;

  // Actions - Data
  setStages: (stages: PipelineStageWithCandidates[]) => void;
  addStage: (stage: PipelineStageWithCandidates) => void;
  updateStage: (stageId: string, updates: Partial<PipelineStageWithCandidates>) => void;
  removeStage: (stageId: string) => void;

  // Actions - Candidate Movement (Optimistic Updates)
  moveCandidateOptimistic: (
    candidateId: string,
    sourceStageId: string,
    targetStageId: string
  ) => void;
  revertCandidateMove: (
    candidateId: string,
    originalStageId: string,
    originalIndex: number
  ) => void;

  // Actions - UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: PipelineFilters) => void;
  resetFilters: () => void;

  // Actions - Drag
  setDragState: (dragState: DragState) => void;
  clearDragState: () => void;

  // Actions - Dialogs
  setSelectedCandidate: (candidate: CandidateWithStage | null) => void;
  openCandidateDetail: (candidate: CandidateWithStage) => void;
  closeCandidateDetail: () => void;
  openAddCandidate: () => void;
  closeAddCandidate: () => void;
  openAddStage: () => void;
  closeAddStage: () => void;
  setEditingStage: (stage: PipelineStageWithCandidates | null) => void;

  // Async Actions
  fetchPipeline: () => Promise<void>;
  createStage: (input: CreateStageInput) => Promise<void>;
  updateStageData: (stageId: string, input: UpdateStageInput) => Promise<void>;
  deleteStage: (stageId: string) => Promise<void>;
  moveCandidate: (candidateId: string, targetStageId: string) => Promise<void>;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  // Initial State
  stages: [],
  totalCandidates: 0,
  isLoading: false,
  error: null,
  filters: {},
  dragState: {
    activeCandidate: null,
    sourceStageId: null,
  },
  selectedCandidate: null,
  isCandidateDetailOpen: false,
  isAddCandidateOpen: false,
  isAddStageOpen: false,
  editingStage: null,

  // Data Actions
  setStages: (stages) => set({ stages, totalCandidates: stages.reduce((acc, s) => acc + s.candidates.length, 0) }),

  addStage: (stage) => set((state) => ({
    stages: [...state.stages, stage].sort((a, b) => a.order - b.order),
  })),

  updateStage: (stageId, updates) => set((state) => ({
    stages: state.stages.map((s) =>
      s.id === stageId ? { ...s, ...updates } : s
    ),
  })),

  removeStage: (stageId) => set((state) => ({
    stages: state.stages.filter((s) => s.id !== stageId),
  })),

  // Optimistic Candidate Movement
  moveCandidateOptimistic: (candidateId, sourceStageId, targetStageId) => {
    set((state) => {
      const newStages = [...state.stages];
      let candidate: CandidateWithStage | null = null;

      // Find and remove candidate from source stage
      for (let i = 0; i < newStages.length; i++) {
        const stage = newStages[i];
        const candidateIndex = stage.candidates.findIndex(
          (c) => c.id === candidateId
        );

        if (candidateIndex !== -1) {
          candidate = stage.candidates[candidateIndex];
          newStages[i] = {
            ...stage,
            candidates: stage.candidates.filter((c) => c.id !== candidateId),
          };
          break;
        }
      }

      // Add candidate to target stage
      if (candidate) {
        for (let i = 0; i < newStages.length; i++) {
          if (newStages[i].id === targetStageId) {
            const updatedCandidate = {
              ...candidate,
              pipelineStageId: targetStageId,
              pipelineStage: {
                id: targetStageId,
                name: newStages[i].name,
                color: newStages[i].color,
              },
            };
            newStages[i] = {
              ...newStages[i],
              candidates: [updatedCandidate, ...newStages[i].candidates],
            };
            break;
          }
        }
      }

      return { stages: newStages };
    });
  },

  revertCandidateMove: (candidateId, originalStageId, _originalIndex) => {
    // This would need more complex logic to track original position
    // For simplicity, we'll refetch the pipeline
    get().fetchPipeline();
  },

  // UI Actions
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  setFilters: (filters) => set({ filters }),

  resetFilters: () => set({ filters: {} }),

  // Drag Actions
  setDragState: (dragState) => set({ dragState }),

  clearDragState: () =>
    set({
      dragState: {
        activeCandidate: null,
        sourceStageId: null,
      },
    }),

  // Dialog Actions
  setSelectedCandidate: (candidate) => set({ selectedCandidate: candidate }),

  openCandidateDetail: (candidate) =>
    set({
      selectedCandidate: candidate,
      isCandidateDetailOpen: true,
    }),

  closeCandidateDetail: () =>
    set({
      isCandidateDetailOpen: false,
      selectedCandidate: null,
    }),

  openAddCandidate: () => set({ isAddCandidateOpen: true }),
  closeAddCandidate: () => set({ isAddCandidateOpen: false }),

  openAddStage: () => set({ isAddStageOpen: true }),
  closeAddStage: () => set({ isAddStageOpen: false }),

  setEditingStage: (stage) => set({ editingStage: stage }),

  // Async Actions
  fetchPipeline: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (filters.jobId) params.set("jobId", filters.jobId);
      if (filters.search) params.set("search", filters.search);
      if (filters.minScore) params.set("minScore", filters.minScore.toString());

      const response = await fetch(`/api/pipeline?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Falha ao carregar pipeline");
      }

      const data = await response.json();
      set({
        stages: data.stages,
        totalCandidates: data.total,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erro desconhecido",
        isLoading: false,
      });
    }
  },

  createStage: async (input) => {
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao criar etapa");
      }

      const { stage } = await response.json();
      get().addStage({
        ...stage,
        candidates: [],
      });
    } catch (error) {
      throw error;
    }
  },

  updateStageData: async (stageId, input) => {
    try {
      const response = await fetch(`/api/pipeline/${stageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao atualizar etapa");
      }

      const { stage } = await response.json();
      get().updateStage(stageId, stage);
    } catch (error) {
      throw error;
    }
  },

  deleteStage: async (stageId) => {
    try {
      const response = await fetch(`/api/pipeline/${stageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao excluir etapa");
      }

      get().removeStage(stageId);
    } catch (error) {
      throw error;
    }
  },

  moveCandidate: async (candidateId, targetStageId) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}/stage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: targetStageId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao mover candidato");
      }

      // The optimistic update should already be applied
      // Just return success
    } catch (error) {
      // Revert optimistic update on failure
      get().fetchPipeline();
      throw error;
    }
  },
}));
