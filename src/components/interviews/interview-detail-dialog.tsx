"use client";

/**
 * Interview Detail Dialog - Zion Recruit
 * View and manage interview details
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  Building2,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Star,
  Bot,
  FileText,
  Edit,
  Trash2,
  Mail,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Send,
  Brain,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  strengths: string | null;
  weaknesses: string | null;
  followUpNotes: string | null;
  cancelReason: string | null;
  candidate: Candidate;
  job: Job;
}

interface InterviewDetailDialogProps {
  interview: Interview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

const statusConfig = {
  SCHEDULED: { label: "Agendada", color: "bg-blue-500", textColor: "text-blue-600" },
  CONFIRMED: { label: "Confirmada", color: "bg-green-500", textColor: "text-green-600" },
  IN_PROGRESS: { label: "Em Andamento", color: "bg-yellow-500", textColor: "text-yellow-600" },
  COMPLETED: { label: "Concluída", color: "bg-gray-500", textColor: "text-gray-600" },
  CANCELLED: { label: "Cancelada", color: "bg-red-500", textColor: "text-red-600" },
  NO_SHOW: { label: "Não Compareceu", color: "bg-orange-500", textColor: "text-orange-600" },
  RESCHEDULED: { label: "Reagendada", color: "bg-purple-500", textColor: "text-purple-600" },
};

const typeConfig = {
  SCREENING: "Triagem",
  TECHNICAL: "Técnica",
  BEHAVIORAL: "Comportamental",
  CULTURAL: "Cultural",
  FINAL: "Final",
  PHONE: "Telefônica",
  VIDEO: "Vídeo",
  ONSITE: "Presencial",
};

export function InterviewDetailDialog({
  interview,
  open,
  onOpenChange,
  onUpdated,
}: InterviewDetailDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingDISC, setIsSendingDISC] = useState(false);
  const [feedback, setFeedback] = useState(interview?.feedback || "");
  const [rating, setRating] = useState(interview?.rating || 0);
  const [recommendation, setRecommendation] = useState(interview?.recommendation || "");
  const [cancelReason, setCancelReason] = useState("");
  const [discSent, setDiscSent] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const updateStatus = async (newStatus: string) => {
    if (!interview) return;

    setIsUpdating(true);
    try {
      const response = await fetch("/api/interviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: interview.id,
          status: newStatus,
          cancelReason: newStatus === "CANCELLED" ? cancelReason : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar status");
      }

      toast.success("Status atualizado com sucesso");
      onUpdated();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    } finally {
      setIsUpdating(false);
    }
  };

  const saveFeedback = async () => {
    if (!interview) return;

    setIsUpdating(true);
    try {
      const response = await fetch("/api/interviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: interview.id,
          feedback,
          rating,
          recommendation,
          status: "COMPLETED",
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar feedback");
      }

      toast.success("Feedback salvo com sucesso");
      onUpdated();
    } catch (error) {
      toast.error("Erro ao salvar feedback");
    } finally {
      setIsUpdating(false);
    }
  };

  const sendDISCTest = async () => {
    if (!interview) return;

    setIsSendingDISC(true);
    try {
      const response = await fetch("/api/disc/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: interview.candidate.id,
          sendEmail: true,
          sendWhatsapp: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar teste DISC");
      }

      setDiscSent(true);
      toast.success(`Teste DISC enviado para ${interview.candidate.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar teste DISC");
    } finally {
      setIsSendingDISC(false);
    }
  };

  if (!interview) return null;

  const config = statusConfig[interview.status as keyof typeof statusConfig] || statusConfig.SCHEDULED;
  const canConfirm = interview.status === "SCHEDULED";
  const canStart = interview.status === "CONFIRMED" || interview.status === "SCHEDULED";
  const canComplete = interview.status === "IN_PROGRESS" || interview.status === "CONFIRMED" || interview.status === "SCHEDULED";
  const canCancel = interview.status !== "COMPLETED" && interview.status !== "CANCELLED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhes da Entrevista</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[85vh]">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={interview.candidate.photo || undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(interview.candidate.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{interview.candidate.name}</h2>
                  <p className="text-muted-foreground">{interview.candidate.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={cn("text-xs", config.color, "text-white")}>
                      {config.label}
                    </Badge>
                    {interview.scheduledByAI && (
                      <Badge variant="outline" className="text-xs">
                        <Bot className="h-3 w-3 mr-1" />
                        Agendado por IA
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reagendar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Lembrete
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Enviar WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Date & Time */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data</p>
                      <p className="font-medium">{formatDate(interview.scheduledAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Horário</p>
                      <p className="font-medium">
                        {formatTime(interview.scheduledAt)} ({interview.timezone})
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Vaga</p>
                      <p className="font-medium">{interview.job.title}</p>
                      {interview.job.department && (
                        <p className="text-xs text-muted-foreground">
                          {interview.job.department}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <p className="font-medium">
                        {typeConfig[interview.type as keyof typeof typeConfig] || interview.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Duração: {interview.duration} min
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Meeting Info */}
            {(interview.meetingUrl || interview.location) && (
              <Card>
                <CardContent className="pt-4">
                  {interview.meetingUrl && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Video className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Link da Reunião</p>
                          <p className="text-sm font-medium truncate max-w-[200px]">
                            {interview.meetingUrl}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" asChild>
                        <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Entrar
                        </a>
                      </Button>
                    </div>
                  )}
                  {interview.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Local</p>
                        <p className="font-medium">{interview.location}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Interviewer */}
            {interview.interviewerName && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Entrevistador</p>
                      <p className="font-medium">{interview.interviewerName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {canConfirm && (
                <Button
                  variant="outline"
                  onClick={() => updateStatus("CONFIRMED")}
                  disabled={isUpdating}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar
                </Button>
              )}
              {canStart && (
                <Button
                  onClick={() => updateStatus("IN_PROGRESS")}
                  disabled={isUpdating}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar
                </Button>
              )}
              {canComplete && (
                <Button
                  variant="default"
                  onClick={() => updateStatus("COMPLETED")}
                  disabled={isUpdating}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Concluir
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (cancelReason || confirm("Tem certeza que deseja cancelar esta entrevista?")) {
                      updateStatus("CANCELLED");
                    }
                  }}
                  disabled={isUpdating}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>

            <Separator />

            {/* Feedback Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Feedback da Entrevista
              </h3>

              {/* Rating */}
              <div>
                <Label className="text-sm">Avaliação</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          star <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <div>
                <Label className="text-sm">Recomendação</Label>
                <Select value={recommendation} onValueChange={setRecommendation}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione uma recomendação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hire">✅ Contratar</SelectItem>
                    <SelectItem value="no_hire">❌ Não Contratar</SelectItem>
                    <SelectItem value="maybe">🤔 Talvez</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Feedback Text */}
              <div>
                <Label className="text-sm">Anotações</Label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Adicione suas observações sobre a entrevista..."
                  className="mt-2"
                  rows={4}
                />
              </div>

              <Button onClick={saveFeedback} disabled={isUpdating}>
                <Send className="h-4 w-4 mr-2" />
                Salvar Feedback
              </Button>
            </div>

            {/* Existing Feedback */}
            {interview.feedback && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Feedback Registrado</CardTitle>
                </CardHeader>
                <CardContent>
                  {interview.rating && (
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-4 w-4",
                            star <= interview.rating!
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          )}
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{interview.feedback}</p>
                </CardContent>
              </Card>
            )}

            {/* DISC Test Section - Show after interview is completed */}
            {(interview.status === "COMPLETED" || discSent) && (
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Teste DISC
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    O teste DISC avalia o perfil comportamental do candidato e sua aderência à vaga.
                  </p>
                  
                  {discSent ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Teste DISC enviado!</span>
                    </div>
                  ) : (
                    <Button
                      onClick={sendDISCTest}
                      disabled={isSendingDISC}
                      className="w-full"
                    >
                      {isSendingDISC ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Teste DISC
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
