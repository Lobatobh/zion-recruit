"use client";

import { useEffect, useState, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useCandidatesStore } from "@/stores/candidates-store";
import {
  CandidateWithRelations,
  CandidateStatus,
  candidateStatusOptions,
  candidateStatusConfig,
  getMatchScoreColorClass,
  formatCandidateDate,
} from "@/types/candidate";
import { Job } from "@/types/job";
import { CandidateForm } from "./candidate-form";
import { CandidateProfilePanel } from "./candidate-profile-panel";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowUpDown,
  Loader2,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Get initials for avatar
function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Candidate card for mobile view
function CandidateCard({
  candidate,
  onView,
  onEdit,
  onDelete,
}: {
  candidate: CandidateWithRelations;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusConfig = candidateStatusConfig[candidate.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(candidate.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium truncate">{candidate.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {candidate.email}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Perfil Completo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {candidate.job?.title}
            </Badge>
            <Badge className={`text-xs ${statusConfig.color} ${statusConfig.bgColor}`}>
              {statusConfig.label}
            </Badge>
          </div>

          {candidate.matchScore !== null && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Match:</span>
              <Badge className={`text-xs ${getMatchScoreColorClass(candidate.matchScore)}`}>
                {candidate.matchScore}%
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatCandidateDate(candidate.createdAt)}
            </span>
            {candidate._count?.notes && candidate._count.notes > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {candidate._count.notes} notas
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function CandidatesList() {
  const {
    candidates,
    total,
    page,
    isLoading,
    filters,
    isNewCandidateDialogOpen,
    isDeletingCandidate,
    viewingCandidate,
    fetchCandidates,
    createCandidate,
    deleteCandidate,
    setFilters,
    setPage,
    openNewCandidateDialog,
    closeNewCandidateDialog,
    openDeleteCandidateDialog,
    closeDeleteCandidateDialog,
    openCandidateDetail,
    closeCandidateDetail,
  } = useCandidatesStore();

  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileCandidateId, setProfileCandidateId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);

  // Debounced search
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setFilters({ search: value || undefined });
  }, 300);

  // Fetch jobs for filter dropdown
  useEffect(() => {
    const loadJobs = async () => {
      try {
        const response = await fetch("/api/vacancies?limit=50");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.vacancies) {
            setJobs(data.vacancies);
          }
        }
      } catch (error) {
        console.error("Error fetching jobs for filter:", error);
      }
    };
    loadJobs();
  }, []);

  // Fetch candidates on mount and when filters change
  useEffect(() => {
    fetchCandidates().catch((error) => {
      console.error("Error fetching candidates:", error);
      toast.error("Erro ao carregar candidatos");
    });
  }, [fetchCandidates, filters]);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };

  // Handle create candidate
  const handleCreateCandidate = async (data: any) => {
    setIsCreating(true);
    try {
      await createCandidate(data);
      toast.success("Candidato criado com sucesso!");
      closeNewCandidateDialog();
    } catch (error) {
      toast.error("Erro ao criar candidato");
    } finally {
      setIsCreating(false);
    }
  };

  // Handle delete candidate
  const handleDeleteCandidate = async () => {
    if (!isDeletingCandidate) return;

    setIsDeleting(true);
    try {
      const success = await deleteCandidate(isDeletingCandidate.id);
      if (success) {
        toast.success("Candidato excluído");
      } else {
        toast.error("Erro ao excluir candidato");
      }
    } catch (error) {
      toast.error("Erro ao excluir candidato");
    } finally {
      setIsDeleting(false);
      closeDeleteCandidateDialog();
    }
  };

  // Handle sort
  const handleSort = (sortBy: "name" | "matchScore" | "createdAt" | "status") => {
    setFilters({
      sortBy,
      sortOrder: filters.sortBy === sortBy && filters.sortOrder === "desc" ? "asc" : "desc",
    });
  };

  // Open edit dialog for a candidate
  const handleEditCandidate = (candidate: CandidateWithRelations) => {
    setEditingCandidateId(candidate.id);
    setProfileCandidateId(candidate.id);
    setIsProfileOpen(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Candidatos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os candidatos do seu processo seletivo
          </p>
        </div>
        <Button onClick={openNewCandidateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Candidato
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Job Filter */}
            <Select
              value={filters.jobId || "ALL"}
              onValueChange={(value) =>
                setFilters({ jobId: value === "ALL" ? undefined : value })
              }
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Todas as vagas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as vagas</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={filters.status || "ALL"}
              onValueChange={(value) =>
                setFilters({ status: value as CandidateStatus | "ALL" })
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                {candidateStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} candidato{total !== 1 ? "s" : ""} encontrado
          {total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && candidates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum candidato encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece adicionando candidatos ao seu processo seletivo
            </p>
            <Button onClick={openNewCandidateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Candidato
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Desktop Table View */}
      {!isLoading && candidates.length > 0 && (
        <div className="hidden lg:block">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Nome
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-center">
                    <button
                      onClick={() => handleSort("matchScore")}
                      className="flex items-center gap-1 hover:text-foreground mx-auto"
                    >
                      Match
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Status
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("createdAt")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Data
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate, index) => {
                  const statusConfig = candidateStatusConfig[candidate.status] || {
                    label: candidate.status,
                    color: "text-gray-700",
                    bgColor: "bg-gray-100",
                  };
                  return (
                    <motion.tr
                      key={candidate.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.03 }}
                      className="group cursor-pointer hover:bg-muted/50 border-b transition-colors"
                      onClick={() => {
                        setProfileCandidateId(candidate.id);
                        setIsProfileOpen(true);
                      }}
                    >
                      <TableCell className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(candidate.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{candidate.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="p-4 text-muted-foreground">
                        {candidate.email}
                      </TableCell>
                      <TableCell className="p-4">
                        <Badge variant="outline" className="text-xs">
                          {candidate.job?.title}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4">
                        {candidate.pipelineStage ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: candidate.pipelineStage.color }}
                            />
                            <span className="text-sm">
                              {candidate.pipelineStage.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Não definida
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="p-4 text-center">
                        {candidate.matchScore !== null ? (
                          <Badge
                            className={getMatchScoreColorClass(candidate.matchScore)}
                          >
                            {candidate.matchScore}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="p-4">
                        <Badge
                          className={`${statusConfig.color} ${statusConfig.bgColor}`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4 text-muted-foreground">
                        {formatCandidateDate(candidate.createdAt)}
                      </TableCell>
                      <TableCell className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setProfileCandidateId(candidate.id);
                                setIsProfileOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCandidate(candidate);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteCandidateDialog(candidate);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Mobile Card View */}
      {!isLoading && candidates.length > 0 && (
        <div className="lg:hidden space-y-4">
          {candidates.map((candidate, index) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <CandidateCard
                candidate={candidate}
                onView={() => {
                  setProfileCandidateId(candidate.id);
                  setIsProfileOpen(true);
                }}
                onEdit={() => handleEditCandidate(candidate)}
                onDelete={() => openDeleteCandidateDialog(candidate)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && candidates.length > 0 && total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {Math.ceil(total / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / 20)}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* New/Edit Candidate Dialog */}
      <Dialog open={isNewCandidateDialogOpen || !!editingCandidateId} onOpenChange={(open) => {
        if (!open) {
          closeNewCandidateDialog();
          setEditingCandidateId(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCandidateId ? "Editar Candidato" : "Novo Candidato"}
            </DialogTitle>
            <DialogDescription>
              {editingCandidateId
                ? "Atualize os dados do candidato"
                : "Adicione um novo candidato ao processo seletivo"}
            </DialogDescription>
          </DialogHeader>
          <CandidateForm
            key={editingCandidateId || "new"}
            jobs={jobs}
            onSubmit={handleCreateCandidate}
            onCancel={() => {
              closeNewCandidateDialog();
              setEditingCandidateId(null);
            }}
            isLoading={isCreating}
          />
        </DialogContent>
      </Dialog>

      {/* Candidate Profile Panel */}
      <CandidateProfilePanel
        candidateId={profileCandidateId}
        open={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setProfileCandidateId(null);
        }}
        onEdit={(id) => {
          setIsProfileOpen(false);
          handleEditCandidate({ id } as CandidateWithRelations);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!isDeletingCandidate}
        onOpenChange={(open) => !open && closeDeleteCandidateDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir candidato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong>{isDeletingCandidate?.name}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCandidate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
