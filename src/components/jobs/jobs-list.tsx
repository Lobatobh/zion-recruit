"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Copy,
  Archive,
  Trash2,
  Briefcase,
  MapPin,
  Users,
  Clock,
  ChevronUp,
  ChevronDown,
  Eye,
  Link2,
  CheckCircle2,
  Filter,
  X,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Inbox,
  RefreshCw,
  Send,
  ArchiveRestore,
  Loader2,
  AlertTriangle,
  TrendingUp,
  FileText,
  Crosshair,
} from "lucide-react";
import { useJobsStore } from "@/stores/jobs-store";
import {
  JobWithCandidates,
  JobStatus,
  getJobStatusLabel,
  getJobTypeLabel,
  formatSalary,
  Job,
  SortField,
} from "@/types/job";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { JobDetailDialog } from "./job-detail-dialog";
import { NewJobDialog, EditJobDialog } from "./new-job-dialog";

// ============================================
// Status Colors
// ============================================

const statusColors: Record<JobStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  PUBLISHED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  PAUSED: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  CLOSED: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  ARCHIVED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

// ============================================
// KPI Cards
// ============================================

function KPICards() {
  const { stats, isLoading, filters, setFilters } = useJobsStore();

  const cards = [
    {
      label: "Total Vagas",
      value: stats?.totalJobs ?? 0,
      icon: Briefcase,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Publicadas",
      value: stats?.publishedJobs ?? 0,
      icon: Send,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      filter: "PUBLISHED" as JobStatus,
    },
    {
      label: "Rascunho",
      value: stats?.draftJobs ?? 0,
      icon: FileText,
      color: "text-gray-600 dark:text-gray-400",
      bg: "bg-gray-100 dark:bg-gray-800",
      filter: "DRAFT" as JobStatus,
    },
    {
      label: "Total Candidatos",
      value: stats?.totalCandidates ?? 0,
      icon: Users,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-100 dark:bg-violet-900/30",
    },
    {
      label: "Média por Vaga",
      value: stats?.avgCandidatesPerJob ?? 0,
      icon: TrendingUp,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
  ];

  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-0 shadow-sm",
            card.filter && filters.status === card.filter
              ? "ring-2 ring-primary"
              : ""
          )}
          onClick={() => {
            if (card.filter) {
              setFilters({
                status: filters.status === card.filter ? "ALL" : card.filter,
              });
            }
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  card.bg
                )}
              >
                <card.icon className={cn("h-5 w-5", card.color)} />
              </div>
              <span className="text-2xl font-bold">{card.value}</span>
            </div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {card.label}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// KPI Skeleton
// ============================================

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

// ============================================
// Sort Header
// ============================================

function SortableHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: "asc" | "desc";
  onSort: (field: SortField) => void;
}) {
  return (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => onSort(field)}
    >
      {label}
      {sortField === field && (
        sortDir === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )
      )}
    </button>
  );
}

// ============================================
// Job Status Badge (clickable)
// ============================================

function JobStatusBadge({
  status,
  onClick,
}: {
  status: JobStatus;
  onClick?: () => void;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "cursor-pointer hover:opacity-80 transition-opacity",
        statusColors[status]
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title="Clique para alterar status"
    >
      {getJobStatusLabel(status)}
    </Badge>
  );
}

// ============================================
// Table Row
// ============================================

function JobTableRow({
  job,
  index,
  isSelected,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onView,
  onStatusToggle,
  onCopyLink,
}: {
  job: JobWithCandidates;
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onView: () => void;
  onStatusToggle: () => void;
  onCopyLink: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await onCopyLink();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "group hover:bg-muted/50 border-b transition-colors",
        isSelected && "bg-primary/5"
      )}
    >
      {/* Checkbox */}
      <TableCell className="p-3 w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>

      {/* Title + Department */}
      <TableCell className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate cursor-pointer hover:text-primary transition-colors" onClick={onView}>
              {job.title}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {job.department && (
                <span className="text-sm text-muted-foreground truncate">
                  {job.department}
                </span>
              )}
              {salary && (
                <span className="text-sm text-muted-foreground font-medium">
                  {salary}
                </span>
              )}
            </div>
          </div>
        </div>
      </TableCell>

      {/* Location + Work Model */}
      <TableCell className="p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="text-sm truncate max-w-[140px]">
            {job.location || "Não definido"}
          </span>
        </div>
        {job.workModel && (
          <Badge variant="outline" className="mt-1 text-xs">
            {job.workModel === "REMOTE"
              ? "Remoto"
              : job.workModel === "HYBRID"
              ? "Híbrido"
              : "Presencial"}
          </Badge>
        )}
      </TableCell>

      {/* Status (clickable toggle) */}
      <TableCell className="p-3">
        <JobStatusBadge status={job.status} onClick={onStatusToggle} />
      </TableCell>

      {/* Type */}
      <TableCell className="p-3">
        <Badge variant="outline" className="text-xs">
          {getJobTypeLabel(job.type)}
        </Badge>
      </TableCell>

      {/* Candidates */}
      <TableCell className="p-3">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{job.candidatesCount}</span>
        </div>
      </TableCell>

      {/* Created */}
      <TableCell className="p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <Clock className="h-4 w-4" />
          <span>
            {formatDistanceToNow(new Date(job.createdAt), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="p-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onView}>
              <Eye className="mr-2 h-4 w-4" />
              Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="text-violet-600 focus:text-violet-600"
            >
              <Crosshair className="mr-2 h-4 w-4" />
              Hunter AI
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopyLink}>
              {copied ? (
                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              {copied ? "Link Copiado!" : "Copiar Link"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {job.status !== "ARCHIVED" ? (
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Arquivar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={async () => {
                  const store = useJobsStore.getState();
                  await store.bulkAction("restore", [job.id]);
                  toast.success("Vaga restaurada!");
                }}
              >
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Restaurar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </motion.tr>
  );
}

// ============================================
// Mobile Card
// ============================================

function JobCard({
  job,
  isSelected,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onView,
  onStatusToggle,
}: {
  job: JobWithCandidates;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onView: () => void;
  onStatusToggle: () => void;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 }}
    >
      <Card
        className={cn(
          "group hover:shadow-md transition-all border cursor-pointer",
          isSelected && "ring-2 ring-primary"
        )}
        onClick={onView}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{job.title}</div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    {job.department && <span>{job.department}</span>}
                    {job.department && job.location && <span>•</span>}
                    {job.location && <span>{job.location}</span>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onView(); }}
                      className="text-violet-600 focus:text-violet-600"
                    >
                      <Crosshair className="mr-2 h-4 w-4" />
                      Hunter AI
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                      <Archive className="mr-2 h-4 w-4" />
                      Arquivar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <JobStatusBadge status={job.status} onClick={(e) => { e.stopPropagation(); onStatusToggle(); }} />
                <Badge variant="outline">{getJobTypeLabel(job.type)}</Badge>
                {salary && (
                  <span className="text-sm text-muted-foreground">{salary}</span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{job.candidatesCount} candidatos</span>
                  </div>
                </div>
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(job.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function JobsListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// Empty State
// ============================================

function EmptyState({ onNewJob, hasFilters }: { onNewJob: () => void; hasFilters: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          {hasFilters ? (
            <Filter className="h-12 w-12 text-muted-foreground" />
          ) : (
            <Inbox className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Briefcase className="h-4 w-4" />
        </div>
      </div>
      <h3 className="mt-6 text-lg font-semibold">
        {hasFilters ? "Nenhuma vaga encontrada" : "Nenhuma vaga criada"}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {hasFilters
          ? "Tente ajustar os filtros para encontrar as vagas que procura."
          : "Comece criando sua primeira vaga para atrair os melhores talentos."}
      </p>
      {!hasFilters && (
        <div className="flex gap-3 mt-6">
          <Button onClick={onNewJob}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeira Vaga
          </Button>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// Pagination
// ============================================

function Pagination() {
  const { pagination, setPage } = useJobsStore();
  const { page, totalPages, total } = pagination;

  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  const delta = 2;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - delta && i <= page + delta)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Mostrando {(page - 1) * pagination.pageSize + 1}-
        {Math.min(page * pagination.pageSize, total)} de {total} vagas
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-2 text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={page === p ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Bulk Action Bar
// ============================================

function BulkActionBar() {
  const { selectedIds, clearSelection, selectAll, jobs, bulkAction, isBulkAction, fetchJobs } =
    useJobsStore();

  if (selectedIds.size === 0) return null;

  const ids = Array.from(selectedIds);

  const handleBulk = async (action: string, label: string) => {
    const ok = await bulkAction(action, ids);
    if (ok) {
      toast.success(`${label} com sucesso!`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-primary text-primary-foreground"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {selectedIds.size} selecionada{selectedIds.size > 1 ? "s" : ""}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary-foreground/20 h-8"
          onClick={selectAll}
        >
          Selecionar todas ({jobs.length})
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary-foreground/20 h-8"
          onClick={clearSelection}
        >
          Limpar
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary-foreground/20 h-8"
          disabled={isBulkAction}
          onClick={() => handleBulk("publish", "Vagas publicadas")}
        >
          {isBulkAction ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
          Publicar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary-foreground/20 h-8"
          disabled={isBulkAction}
          onClick={() => handleBulk("close", "Vagas fechadas")}
        >
          {isBulkAction ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
          Fechar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary-foreground/20 h-8"
          disabled={isBulkAction}
          onClick={() => handleBulk("archive", "Vagas arquivadas")}
        >
          {isBulkAction ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Archive className="h-4 w-4 mr-1" />}
          Arquivar
        </Button>
        <Separator orientation="vertical" className="h-6 bg-primary-foreground/30 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          className="text-red-200 hover:bg-red-500/30 h-8"
          disabled={isBulkAction}
          onClick={() => handleBulk("delete", "Vagas excluídas")}
        >
          {isBulkAction ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
          Excluir
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================
// Job Detail Dialog Wrapper (connects to store)
// ============================================

function JobDetailDialogWrapper() {
  const { selectedJob, isDetailOpen, closeDetailDialog, openEditJobDialog, openDeleteJobDialog } = useJobsStore();

  return (
    <JobDetailDialog
      job={selectedJob}
      open={isDetailOpen}
      onOpenChange={(open) => {
        if (!open) closeDetailDialog();
      }}
      onEdit={(job) => {
        closeDetailDialog();
        setTimeout(() => openEditJobDialog(job), 100);
      }}
      onDelete={(job) => {
        closeDetailDialog();
        setTimeout(() => openDeleteJobDialog(job), 100);
      }}
    />
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function JobsList() {
  const {
    jobs,
    isLoading,
    error,
    filters,
    filtersMeta,
    stats,
    fetchJobs,
    setFilters,
    resetFilters,
    setSorting,
    sortField,
    sortDir,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    openNewJobDialog,
    openEditJobDialog,
    deleteJob,
    duplicateJob,
    toggleJobStatus,
    isDeletingJob,
    isArchivingJob,
    openDeleteJobDialog,
    closeDeleteJobDialog,
    openArchiveJobDialog,
    closeArchiveJobDialog,
    openDetailDialog,
    fetchJob,
  } = useJobsStore();

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch on mount and filter changes
  useEffect(() => {
    fetchJobs();
  }, [filters.status, filters.department, filters.type, filters.page, filters.pageSize, sortField, sortDir]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSearch = useCallback(
    (value: string) => {
      if (searchTimeout) clearTimeout(searchTimeout);
      const timeout = setTimeout(() => {
        setFilters({ search: value || undefined });
        fetchJobs();
      }, 300);
      setSearchTimeout(timeout);
    },
    [searchTimeout, setFilters, fetchJobs]
  );

  const handleEdit = (job: JobWithCandidates) => openEditJobDialog(job);

  const handleDuplicate = async (job: JobWithCandidates) => {
    toast.promise(duplicateJob(job.id), {
      loading: "Duplicando vaga...",
      success: "Vaga duplicada com sucesso!",
      error: "Erro ao duplicar vaga",
    });
  };

  const handleArchive = (job: JobWithCandidates) => openArchiveJobDialog(job);

  const handleDelete = async () => {
    if (!isDeletingJob) return;
    const success = await deleteJob(isDeletingJob.id);
    if (success) toast.success("Vaga excluída com sucesso!");
  };

  const handleArchiveConfirm = async () => {
    if (!isArchivingJob) return;
    const store = useJobsStore.getState();
    const ok = await store.bulkAction("archive", [isArchivingJob.id]);
    if (ok) {
      toast.success("Vaga arquivada com sucesso!");
      closeArchiveJobDialog();
    }
  };

  const handleView = async (job: JobWithCandidates) => {
    await fetchJob(job.id);
    openDetailDialog();
  };

  const handleCopyLink = async () => {
    if (!useJobsStore.getState().selectedJob?.publicSlug) {
      // Generate public link first
      toast.info("Gerando link público...");
      return false;
    }
    const link = `${window.location.origin}/careers/${useJobsStore.getState().selectedJob?.publicSlug}`;
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
    return true;
  };

  const hasActiveFilters =
    filters.status !== "ALL" ||
    filters.department ||
    filters.type !== "ALL" ||
    filters.search;

  const allSelected = jobs.length > 0 && selectedIds.size === jobs.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vagas</h1>
          <p className="text-muted-foreground">
            Gerencie suas vagas e acompanhe candidatos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchJobs()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button onClick={openNewJobDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Vaga
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards />

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar vagas por título, departamento ou localização..."
              className="pl-9"
              defaultValue={filters.search || ""}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={resetFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-3 p-4 rounded-lg border bg-muted/30">
                {/* Status Filter */}
                <Select
                  value={filters.status || "ALL"}
                  onValueChange={(value) =>
                    setFilters({ status: value as JobStatus | "ALL" })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos Status</SelectItem>
                    <SelectItem value="DRAFT">Rascunho</SelectItem>
                    <SelectItem value="PUBLISHED">Publicada</SelectItem>
                    <SelectItem value="PAUSED">Pausada</SelectItem>
                    <SelectItem value="CLOSED">Fechada</SelectItem>
                    <SelectItem value="ARCHIVED">Arquivada</SelectItem>
                  </SelectContent>
                </Select>

                {/* Department Filter */}
                <Select
                  value={filters.department || "ALL"}
                  onValueChange={(value) =>
                    setFilters({
                      department: value === "ALL" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos Departamentos</SelectItem>
                    {filtersMeta.departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Type Filter */}
                <Select
                  value={filters.type || "ALL"}
                  onValueChange={(value) =>
                    setFilters({ type: value as JobStatus | "ALL" })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos Tipos</SelectItem>
                    <SelectItem value="FULL_TIME">Tempo Integral</SelectItem>
                    <SelectItem value="PART_TIME">Meio Período</SelectItem>
                    <SelectItem value="CONTRACT">Contrato</SelectItem>
                    <SelectItem value="INTERNSHIP">Estágio</SelectItem>
                    <SelectItem value="FREELANCE">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar />

      {/* Content */}
      {isLoading && !jobs.length ? (
        <JobsListSkeleton />
      ) : jobs.length === 0 ? (
        <EmptyState onNewJob={openNewJobDialog} hasFilters={!!hasActiveFilters} />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-3 w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() =>
                        allSelected ? clearSelection() : selectAll()
                      }
                    />
                  </TableHead>
                  <TableHead className="p-3">
                    <SortableHeader
                      label="Vaga"
                      field="title"
                      sortField={sortField}
                      sortDir={sortDir}
                      onSort={setSorting}
                    />
                  </TableHead>
                  <TableHead className="p-3">Localização</TableHead>
                  <TableHead className="p-3">Status</TableHead>
                  <TableHead className="p-3">Tipo</TableHead>
                  <TableHead className="p-3">
                    <SortableHeader
                      label="Candidatos"
                      field="candidatesCount"
                      sortField={sortField}
                      sortDir={sortDir}
                      onSort={setSorting}
                    />
                  </TableHead>
                  <TableHead className="p-3">
                    <SortableHeader
                      label="Criado"
                      field="createdAt"
                      sortField={sortField}
                      sortDir={sortDir}
                      onSort={setSorting}
                    />
                  </TableHead>
                  <TableHead className="p-3 w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job, index) => (
                  <JobTableRow
                    key={job.id}
                    job={job}
                    index={index}
                    isSelected={selectedIds.has(job.id)}
                    onToggleSelect={() => toggleSelect(job.id)}
                    onEdit={() => handleEdit(job)}
                    onDuplicate={() => handleDuplicate(job)}
                    onArchive={() => handleArchive(job)}
                    onDelete={() => openDeleteJobDialog(job)}
                    onView={() => handleView(job)}
                    onStatusToggle={() => toggleJobStatus(job.id)}
                    onCopyLink={handleCopyLink}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-3 md:hidden">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSelected={selectedIds.has(job.id)}
                onToggleSelect={() => toggleSelect(job.id)}
                onEdit={() => handleEdit(job)}
                onDuplicate={() => handleDuplicate(job)}
                onArchive={() => handleArchive(job)}
                onDelete={() => openDeleteJobDialog(job)}
                onView={() => handleView(job)}
                onStatusToggle={() => toggleJobStatus(job.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          <Pagination />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!isDeletingJob}
        onOpenChange={(open) => !open && closeDeleteJobDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir vaga
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente a vaga &quot;
              {isDeletingJob?.title}&quot;? Esta ação não pode ser desfeita e todos
              os dados associados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog
        open={!!isArchivingJob}
        onOpenChange={(open) => !open && closeArchiveJobDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-500" />
              Arquivar vaga
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja arquivar a vaga &quot;{isArchivingJob?.title}&quot;? Ela
              ficará invisível na listagem principal, mas poderá ser restaurada
              a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Job Detail Dialog */}
      <JobDetailDialogWrapper />

      {/* New & Edit Job Dialogs */}
      <NewJobDialog />
      <EditJobDialog />
    </div>
  );
}
