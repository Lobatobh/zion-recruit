"use client";

/**
 * Interviews Page - Zion Recruit
 * Manage all scheduled interviews
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  Building2,
  MoreVertical,
  Plus,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Users,
  Phone,
  Monitor,
  Coffee,
  Star,
  ChevronLeft,
  ChevronRight,
  Bot,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { InterviewDetailDialog } from "./interview-detail-dialog";
import { NewInterviewDialog } from "./new-interview-dialog";

// Types
interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photo: string | null;
  matchScore: number | null;
}

interface Job {
  id: string;
  title: string;
  department: string | null;
}

interface Interview {
  id: string;
  title: string;
  type: string;
  description: string | null;
  scheduledAt: string;
  duration: number;
  timezone: string;
  location: string | null;
  meetingUrl: string | null;
  meetingProvider: string | null;
  status: string;
  interviewerId: string | null;
  interviewerName: string | null;
  scheduledByAI: boolean;
  feedback: string | null;
  rating: number | null;
  recommendation: string | null;
  candidate: Candidate;
  job: Job;
  createdAt: string;
}

interface InterviewsData {
  interviews: Interview[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  counts: {
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
}

const statusConfig = {
  SCHEDULED: {
    label: "Agendada",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: Calendar,
  },
  CONFIRMED: {
    label: "Confirmada",
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    icon: CheckCircle,
  },
  IN_PROGRESS: {
    label: "Em Andamento",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    icon: Play,
  },
  COMPLETED: {
    label: "Concluída",
    color: "bg-gray-500",
    textColor: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    borderColor: "border-gray-200 dark:border-gray-800",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelada",
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    icon: XCircle,
  },
  NO_SHOW: {
    label: "Não Compareceu",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: AlertCircle,
  },
  RESCHEDULED: {
    label: "Reagendada",
    color: "bg-purple-500",
    textColor: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800",
    icon: Calendar,
  },
};

const typeConfig = {
  SCREENING: { label: "Triagem", icon: User, color: "text-blue-500" },
  TECHNICAL: { label: "Técnica", icon: Monitor, color: "text-green-500" },
  BEHAVIORAL: { label: "Comportamental", icon: Coffee, color: "text-purple-500" },
  CULTURAL: { label: "Cultural", icon: Users, color: "text-pink-500" },
  FINAL: { label: "Final", icon: Star, color: "text-yellow-500" },
  PHONE: { label: "Telefônica", icon: Phone, color: "text-cyan-500" },
  VIDEO: { label: "Vídeo", icon: Video, color: "text-indigo-500" },
  ONSITE: { label: "Presencial", icon: MapPin, color: "text-orange-500" },
};

export function InterviewsPage() {
  const [data, setData] = useState<InterviewsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"upcoming" | "past" | "all">("upcoming");
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newInterviewOpen, setNewInterviewOpen] = useState(false);

  const fetchInterviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (typeFilter !== "all") {
        params.append("type", typeFilter);
      }
      if (viewMode === "upcoming") {
        params.append("upcoming", "true");
      } else if (viewMode === "past") {
        params.append("past", "true");
      }

      params.append("limit", "50");

      const response = await fetch(`/api/interviews?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao carregar entrevistas");
      }

      setData(result);
    } catch (error) {
      toast.error("Erro ao carregar entrevistas");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, viewMode]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const filteredInterviews = data?.interviews.filter((interview) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        interview.candidate.name.toLowerCase().includes(query) ||
        interview.candidate.email.toLowerCase().includes(query) ||
        interview.job.title.toLowerCase().includes(query) ||
        interview.title.toLowerCase().includes(query)
      );
    }
    return true;
  }) || [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (dateStr: string) => {
    const date = new Date(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const getDateLabel = (dateStr: string) => {
    if (isToday(dateStr)) return "Hoje";
    if (isTomorrow(dateStr)) return "Amanhã";
    return formatDate(dateStr);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleInterviewClick = (interview: Interview) => {
    setSelectedInterview(interview);
    setDetailOpen(true);
  };

  const handleInterviewUpdated = () => {
    fetchInterviews();
    setDetailOpen(false);
  };

  // Group interviews by date
  const groupedInterviews = filteredInterviews.reduce((groups, interview) => {
    const dateKey = new Date(interview.scheduledAt).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(interview);
    return groups;
  }, {} as Record<string, Interview[]>);

  return (
    <div className="h-full flex flex-col p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Entrevistas</h1>
          <p className="text-muted-foreground">
            Gerencie todas as entrevistas agendadas
          </p>
        </div>
        <Button onClick={() => setNewInterviewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Entrevista
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agendadas</p>
                <p className="text-2xl font-bold">
                  {data?.counts.byStatus.SCHEDULED || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmadas</p>
                <p className="text-2xl font-bold">
                  {data?.counts.byStatus.CONFIRMED || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/20">
                <CheckCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold">
                  {data?.counts.byStatus.COMPLETED || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                <Bot className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agendadas por IA</p>
                <p className="text-2xl font-bold">
                  {filteredInterviews.filter((i) => i.scheduledByAI).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por candidato, vaga..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
          <TabsList>
            <TabsTrigger value="upcoming">Próximas</TabsTrigger>
            <TabsTrigger value="past">Realizadas</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="SCHEDULED">Agendada</SelectItem>
            <SelectItem value="CONFIRMED">Confirmada</SelectItem>
            <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
            <SelectItem value="COMPLETED">Concluída</SelectItem>
            <SelectItem value="CANCELLED">Cancelada</SelectItem>
            <SelectItem value="NO_SHOW">Não Compareceu</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="SCREENING">Triagem</SelectItem>
            <SelectItem value="TECHNICAL">Técnica</SelectItem>
            <SelectItem value="BEHAVIORAL">Comportamental</SelectItem>
            <SelectItem value="CULTURAL">Cultural</SelectItem>
            <SelectItem value="FINAL">Final</SelectItem>
            <SelectItem value="PHONE">Telefônica</SelectItem>
            <SelectItem value="VIDEO">Vídeo</SelectItem>
            <SelectItem value="ONSITE">Presencial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma entrevista encontrada</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== "all" || typeFilter !== "all"
              ? "Tente ajustar os filtros de busca"
              : "Comece agendando uma nova entrevista"}
          </p>
          <Button onClick={() => setNewInterviewOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Entrevista
          </Button>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-6 px-6 lg:-mx-8 lg:px-8">
          <div className="space-y-6">
            {Object.entries(groupedInterviews).map(([dateKey, interviews]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {getDateLabel(interviews[0].scheduledAt)}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {interviews.length} {interviews.length === 1 ? "entrevista" : "entrevistas"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {interviews.map((interview) => {
                      const config = statusConfig[interview.status as keyof typeof statusConfig] || statusConfig.SCHEDULED;
                      const typeConf = typeConfig[interview.type as keyof typeof typeConfig] || typeConfig.SCREENING;
                      const StatusIcon = config.icon;
                      const TypeIcon = typeConf.icon;

                      return (
                        <motion.div
                          key={interview.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          onClick={() => handleInterviewClick(interview)}
                          className={cn(
                            "p-4 rounded-lg border cursor-pointer transition-all",
                            "hover:shadow-md hover:border-primary/20",
                            config.borderColor
                          )}
                        >
                          <div className="flex items-start gap-4">
                            {/* Time */}
                            <div className="text-center min-w-[60px]">
                              <p className="text-lg font-bold">{formatTime(interview.scheduledAt)}</p>
                              <p className="text-xs text-muted-foreground">
                                {interview.duration} min
                              </p>
                            </div>

                            {/* Divider */}
                            <div className={cn("w-1 rounded-full", config.color)} />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium truncate">{interview.candidate.name}</h4>
                                    {interview.scheduledByAI && (
                                      <Badge variant="outline" className="text-xs">
                                        <Bot className="h-3 w-3 mr-1" />
                                        IA
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {interview.job.title}
                                    {interview.job.department && ` · ${interview.job.department}`}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Badge className={cn("text-xs", config.bgColor, config.textColor)}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {config.label}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <TypeIcon className={cn("h-3 w-3", typeConf.color)} />
                                  {typeConf.label}
                                </div>
                                {interview.meetingUrl && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Video className="h-3 w-3" />
                                    {interview.meetingProvider || "Vídeo"}
                                  </div>
                                )}
                                {interview.location && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {interview.location}
                                  </div>
                                )}
                                {interview.interviewerName && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    {interview.interviewerName}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Avatar */}
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={interview.candidate.photo || undefined} />
                              <AvatarFallback>
                                {getInitials(interview.candidate.name)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Dialogs */}
      <InterviewDetailDialog
        interview={selectedInterview}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleInterviewUpdated}
      />
      <NewInterviewDialog
        open={newInterviewOpen}
        onOpenChange={setNewInterviewOpen}
        onCreated={fetchInterviews}
      />
    </div>
  );
}
