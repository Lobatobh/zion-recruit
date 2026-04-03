"use client";

/**
 * Candidate Card Component - Zion Recruit
 * Draggable card for candidates in the kanban board
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  GripVertical,
  Eye,
  MessageSquare,
  XCircle,
  Mail,
} from "lucide-react";
import { CandidateWithStage, getMatchScoreColor, getMatchScoreLabel, formatAppliedDate, getInitials } from "@/types/pipeline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePipelineStore } from "@/stores/pipeline-store";
import { toast } from "sonner";

interface CandidateCardProps {
  candidate: CandidateWithStage;
  stageColor: string;
}

export function CandidateCard({ candidate, stageColor }: CandidateCardProps) {
  const openCandidateDetail = usePipelineStore((state) => state.openCandidateDetail);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: candidate.id,
    data: {
      type: "CANDIDATE",
      candidate,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeftColor: stageColor,
  };

  const scoreColor = getMatchScoreColor(candidate.matchScore);
  const scoreLabel = getMatchScoreLabel(candidate.matchScore);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.8 : 1, scale: isDragging ? 1.02 : 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative bg-card rounded-lg border border-border shadow-sm",
        "hover:shadow-md hover:border-border/80 transition-all duration-200",
        "border-l-4",
        isDragging && "shadow-lg ring-2 ring-primary/20 z-50 cursor-grabbing"
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="p-3 pl-10">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={candidate.photo || undefined} alt={candidate.name} />
            <AvatarFallback className="text-xs font-medium">
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium text-sm truncate">{candidate.name}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {candidate.email}
                </p>
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="sr-only">Ações</span>
                    <span className="h-4 w-4">⋯</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openCandidateDetail(candidate); }}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info("Funcionalidade em breve"); }}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Notas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    if (candidate.email) {
                      navigator.clipboard.writeText(candidate.email);
                      toast.success("E-mail copiado!");
                    } else {
                      toast.error("E-mail não disponível");
                    }
                  }}>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar email
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Rejeitar ${candidate.name}?`)) {
                        toast.success(`${candidate.name} rejeitado`);
                      }
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeitar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Job */}
        {candidate.job && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground truncate">
              {candidate.job.title}
              {candidate.job.department && ` • ${candidate.job.department}`}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          {/* Match Score Badge */}
          <Badge
            variant="secondary"
            className={cn("text-xs font-medium", scoreColor)}
          >
            {candidate.matchScore !== null ? `${candidate.matchScore}%` : "N/A"}
            <span className="ml-1 hidden sm:inline">{scoreLabel}</span>
          </Badge>

          {/* Applied Date */}
          <span className="text-xs text-muted-foreground">
            {formatAppliedDate(candidate.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
