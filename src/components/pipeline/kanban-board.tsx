"use client";

/**
 * Kanban Board Component - Zion Recruit
 * Main pipeline kanban board with drag and drop
 */

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { usePipelineStore } from "@/stores/pipeline-store";
import { StageColumn } from "./stage-column";
import { CandidateCard } from "./candidate-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CandidateWithStage, getMatchScoreColor } from "@/types/pipeline";
import { toast } from "sonner";

export function KanbanBoard() {
  const {
    stages,
    isLoading,
    error,
    filters,
    dragState,
    fetchPipeline,
    moveCandidateOptimistic,
    moveCandidate,
    setDragState,
    clearDragState,
    openAddStage,
  } = usePipelineStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch pipeline data on mount
  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // Fetch jobs for the filter dropdown
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch('/api/vacancies?limit=50');
        if (res.ok) {
          const data = await res.json();
          setJobs((data.vacancies || []).map((v: { id: string; title: string }) => ({ id: v.id, title: v.title })));
        }
      } catch {
        // Silently fail - jobs filter will remain empty
      }
    };
    fetchJobs();
  }, []);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const candidate = active.data.current?.candidate as CandidateWithStage | undefined;

    if (candidate) {
      setDragState({
        activeCandidate: candidate,
        sourceStageId: candidate.pipelineStageId || "",
      });
    }
  };

  // Handle drag over (for real-time visual feedback)
  const handleDragOver = (_event: DragOverEvent) => {
    // Could add intermediate state here for better UX
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !dragState.activeCandidate) {
      clearDragState();
      return;
    }

    const candidateId = active.id as string;
    const targetId = over.id as string;

    // Find target stage (could be a stage or another candidate)
    let targetStageId = targetId;

    // Check if dropped on a candidate, get their stage
    for (const stage of stages) {
      const candidate = stage.candidates.find((c) => c.id === targetId);
      if (candidate) {
        targetStageId = candidate.pipelineStageId || stage.id;
        break;
      }
    }

    // Verify target is a valid stage
    const targetStage = stages.find((s) => s.id === targetStageId);
    if (!targetStage) {
      clearDragState();
      return;
    }

    // Check if moved to a different stage
    if (dragState.sourceStageId !== targetStageId) {
      // Optimistic update
      moveCandidateOptimistic(candidateId, dragState.sourceStageId, targetStageId);

      // API call
      try {
        await moveCandidate(candidateId, targetStageId);
        toast.success(`Candidato movido para "${targetStage.name}"`);
      } catch (error) {
        toast.error("Erro ao mover candidato");
        // Revert handled in store
      }
    }

    clearDragState();
  };

  // Scroll controls
  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Loading state
  if (isLoading && stages.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[500px] w-[300px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[400px] text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => fetchPipeline()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar candidatos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Todas as vagas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as vagas</SelectItem>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchPipeline()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-4 ml-auto">
          <Badge variant="secondary" className="text-sm">
            {stages.length} etapas
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {stages.reduce((acc, s) => acc + s.candidates.length, 0)} candidatos
          </Badge>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 relative">
        {/* Scroll Controls (Desktop) */}
        <div className="hidden lg:flex absolute left-0 top-0 bottom-0 z-10 items-center pointer-events-none">
          <Button
            variant="secondary"
            size="icon"
            className="pointer-events-auto ml-2 shadow-md"
            onClick={() => handleScroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="hidden lg:flex absolute right-0 top-0 bottom-0 z-10 items-center pointer-events-none">
          <Button
            variant="secondary"
            size="icon"
            className="pointer-events-auto mr-2 shadow-md"
            onClick={() => handleScroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Container */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={scrollContainerRef}
            className="flex gap-4 p-4 overflow-x-auto h-full"
            style={{ scrollBehavior: "smooth" }}
          >
            {/* Stage Columns */}
            <AnimatePresence mode="popLayout">
              {stages.map((stage) => (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <StageColumn stage={stage} searchQuery={searchQuery} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add Stage Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-shrink-0"
            >
              <button
                onClick={() => openAddStage()}
                className="flex flex-col items-center justify-center w-[280px] h-[120px] rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2 group-hover:bg-primary/10 transition-colors">
                  <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Nova etapa
                </span>
              </button>
            </motion.div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {dragState.activeCandidate && (
              <div className="rotate-3 scale-105 shadow-xl">
                <CandidateCard
                  candidate={dragState.activeCandidate}
                  stageColor={
                    stages.find((s) => s.id === dragState.sourceStageId)?.color || "#6B7280"
                  }
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
