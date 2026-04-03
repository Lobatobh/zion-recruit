"use client";

/**
 * Schedule Interview Dialog - Zion Recruit
 * Schedule interviews with candidates
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Mail,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ScheduleDialogProps {
  candidateId: string | null;
  jobId: string | null;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled?: () => void;
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  reason?: string;
}

interface ScheduleData {
  schedule: {
    id: string;
    candidateId: string;
    jobId: string;
    type: 'SCREENING' | 'TECHNICAL' | 'BEHAVIORAL' | 'FINAL';
    scheduledAt: string;
    duration: number;
    timezone: string;
    status: string;
    meetingUrl: string;
  };
  proposedSlots: TimeSlot[];
  message: string;
  calendarEventCreated: boolean;
  inviteSent: boolean;
}

const interviewTypes = [
  { value: 'SCREENING', label: 'Triagem', duration: 30, description: 'Conversa inicial para conhecer o candidato' },
  { value: 'TECHNICAL', label: 'Técnica', duration: 60, description: 'Avaliação de habilidades técnicas' },
  { value: 'BEHAVIORAL', label: 'Comportamental', duration: 45, description: 'Avaliação de fit cultural e comportamental' },
  { value: 'FINAL', label: 'Final', duration: 60, description: 'Entrevista final com decisão' },
];

export function ScheduleDialog({
  candidateId,
  jobId,
  candidateName,
  candidateEmail,
  jobTitle,
  open,
  onOpenChange,
  onScheduled,
}: ScheduleDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [interviewType, setInterviewType] = useState<'SCREENING' | 'TECHNICAL' | 'BEHAVIORAL' | 'FINAL'>('SCREENING');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [scheduleResult, setScheduleResult] = useState<ScheduleData | null>(null);
  
  // Available slots
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Load available slots when dialog opens or interview type changes
  useEffect(() => {
    if (open && candidateId && jobId) {
      loadAvailableSlots();
    }
  }, [open, candidateId, jobId, interviewType]);

  const loadAvailableSlots = async () => {
    if (!candidateId || !jobId) return;

    setSlotsLoading(true);
    try {
      const duration = interviewTypes.find(t => t.value === interviewType)?.duration || 60;
      const response = await fetch(
        `/api/scheduling?candidateId=${candidateId}&jobId=${jobId}&duration=${duration}`
      );
      const data = await response.json();

      if (response.ok && data.slots) {
        setAvailableSlots(data.slots);
      }
    } catch (err) {
      console.error('Error loading slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!candidateId || !jobId || !selectedSlot) {
      toast.error("Selecione um horário para a entrevista");
      return;
    }

    setIsScheduling(true);
    try {
      const response = await fetch("/api/scheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          jobId,
          interviewType,
          duration: interviewTypes.find(t => t.value === interviewType)?.duration || 60,
          scheduledAt: selectedSlot,
          customMessage: customMessage || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao agendar entrevista");
      }

      setScheduleResult(data);
      toast.success("Entrevista agendada com sucesso!");
      
      if (onScheduled) {
        onScheduled();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao agendar entrevista");
    } finally {
      setIsScheduling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const groupSlotsByDate = (slots: TimeSlot[]) => {
    const grouped: Record<string, TimeSlot[]> = {};
    
    slots.forEach(slot => {
      const dateKey = new Date(slot.start).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(slot);
    });

    return grouped;
  };

  const getDateLabel = (dateKey: string) => {
    const date = new Date(dateKey);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Amanhã';
    }
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedSlot(null);
      setCustomMessage('');
      setScheduleResult(null);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Agendar Entrevista</DialogTitle>
        </DialogHeader>

        {scheduleResult ? (
          // Success State
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Entrevista Agendada!</h2>
              <p className="text-muted-foreground mb-6">
                A entrevista foi agendada e o convite foi enviado para {candidateEmail}
              </p>
            </motion.div>

            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {formatDate(scheduleResult.schedule.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Horário</p>
                      <p className="font-medium">
                        {formatTime(scheduleResult.schedule.scheduledAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Link da Reunião</p>
                    <a 
                      href={scheduleResult.schedule.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      {scheduleResult.schedule.meetingUrl}
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Mensagem enviada:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {scheduleResult.message}
                  </p>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => handleOpenChange(false)}>
                    Fechar
                  </Button>
                  <Button>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Lembrete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Scheduling Form
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-xl font-bold">Agendar Entrevista</h2>
                <p className="text-muted-foreground">
                  {candidateName} · {jobTitle}
                </p>
              </div>

              {/* Interview Type Selection */}
              <div>
                <Label className="text-base font-medium">Tipo de Entrevista</Label>
                <RadioGroup
                  value={interviewType}
                  onValueChange={(v) => setInterviewType(v as typeof interviewType)}
                  className="grid grid-cols-2 gap-3 mt-3"
                >
                  {interviewTypes.map((type) => (
                    <div key={type.value} className="relative">
                      <RadioGroupItem
                        value={type.value}
                        id={type.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={type.value}
                        className={cn(
                          "flex flex-col p-3 rounded-lg border cursor-pointer",
                          "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        )}
                      >
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {type.duration} min
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Time Slots */}
              <div>
                <Label className="text-base font-medium">Selecione um Horário</Label>
                
                {slotsLoading ? (
                  <div className="mt-3 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="mt-3 p-6 text-center border rounded-lg">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      Nenhum horário disponível para os próximos dias
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-4 max-h-64 overflow-y-auto">
                    {Object.entries(groupSlotsByDate(availableSlots)).map(([dateKey, slots]) => (
                      <div key={dateKey}>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          {getDateLabel(dateKey)}
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {slots.slice(0, 8).map((slot, i) => (
                            <Button
                              key={i}
                              variant={selectedSlot === slot.start ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedSlot(slot.start)}
                              className={cn(
                                "h-auto py-2",
                                !slot.available && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={!slot.available}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(slot.start)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Message */}
              <div>
                <Label className="text-base font-medium">
                  Mensagem Personalizada (opcional)
                </Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Adicione instruções especiais para o candidato..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Summary */}
              {selectedSlot && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {formatDate(selectedSlot)} às {formatTime(selectedSlot)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {interviewTypes.find(t => t.value === interviewType)?.label} · {
                            interviewTypes.find(t => t.value === interviewType)?.duration
                          } minutos
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSchedule}
                  disabled={!selectedSlot || isScheduling}
                >
                  {isScheduling ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Agendando...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Confirmar Agendamento
                    </>
                  )}
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
