"use client";

/**
 * Stage Column Component - Zion Recruit
 * Column for a pipeline stage in the kanban board
 */

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PipelineStageWithCandidates } from "@/types/pipeline";
import { CandidateCard } from "./candidate-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { usePipelineStore } from "@/stores/pipeline-store";
import { toast } from "sonner";

interface StageColumnProps {
  stage: PipelineStageWithCandidates;
  isOver?: boolean;
  searchQuery?: string;
}

export function StageColumn({ stage, isOver, searchQuery }: StageColumnProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { openAddCandidate, openAddStage, setEditingStage, deleteStage } = usePipelineStore();

  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: stage.id,
    data: {
      type: "STAGE",
      stage,
    },
  });

  const isDropTarget = isOver || isDroppableOver;

  const filteredCandidates = useMemo(() => {
    if (!searchQuery) return stage.candidates;
    const query = searchQuery.toLowerCase();
    return stage.candidates.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
    );
  }, [stage.candidates, searchQuery]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-muted/30 rounded-lg border border-border/50 min-w-[280px] max-w-[320px] w-[280px] sm:w-[300px]",
        "transition-all duration-200",
        isDropTarget && "ring-2 ring-primary/50 border-primary/50 bg-primary/5"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/50">
        {/* Color indicator */}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: stage.color }}
        />

        {/* Stage name */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1 flex-1 text-left"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <h3 className="font-semibold text-sm truncate">{stage.name}</h3>
        </button>

        {/* Candidate count */}
        <Badge variant="secondary" className="text-xs font-medium">
          <Users className="h-3 w-3 mr-1" />
          {stage.candidates.length}
        </Badge>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => openAddCandidate()}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={() => {
                  setEditingStage(stage);
                  openAddStage();
                }}
              >
                Editar etapa
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (confirm(`Excluir etapa "${stage.name}"? Todos os candidatos serão mantidos.`)) {
                    deleteStage(stage.id);
                    toast.success(`Etapa "${stage.name}" excluída`);
                  }
                }}
              >
                Excluir etapa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Candidates List */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ScrollArea className="flex-1 h-[calc(100vh-280px)] max-h-[600px]">
              <div className="p-2 space-y-2">
                <SortableContext
                  items={filteredCandidates.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence mode="popLayout">
                    {filteredCandidates.map((candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        stageColor={stage.color}
                      />
                    ))}
                  </AnimatePresence>
                </SortableContext>

                {/* Empty state */}
                {filteredCandidates.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "Nenhum candidato encontrado" : "Nenhum candidato"}
                    </p>
                    {!searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs"
                        onClick={() => openAddCandidate()}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    )}
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add candidate button (visible when collapsed) */}
      {isCollapsed && stage.candidates.length > 0 && (
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => openAddCandidate()}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}
