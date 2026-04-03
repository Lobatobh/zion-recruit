"use client";

/**
 * Interview Scheduler - Zion Recruit
 * Component for scheduling and managing interviews
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  Briefcase,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  CalendarPlus,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ============================================
// Types
// ============================================

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  job?: {
    id: string;
    title: string;
    department?: string;
  };
}

interface InterviewSchedulerProps {
  candidate: Candidate;
  onScheduled?: (interview: { id: string; scheduledAt: Date }) => void;
  trigger?: React.ReactNode;
}

interface TimeSlot {
  date: string;
  slots: string[];
}

// ============================================
// Component
// ============================================

export function InterviewScheduler({ candidate, onScheduled, trigger }: InterviewSchedulerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  // Form state
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [duration, setDuration] = useState<number>(60);
  const [interviewerEmail, setInterviewerEmail] = useState<string>("");
  const [interviewers, setInterviewers] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [createMeetLink, setCreateMeetLink] = useState(true);
  const [sendNotification, setSendNotification] = useState(true);

  // Generate available slots on mount
  useEffect(() => {
    generateSlots();
  }, []);

  const generateSlots = () => {
    const slots: TimeSlot[] = [];
    const now = new Date();

    for (let i = 1; i <= 14; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const timeSlots: string[] = [];
      for (let hour = 9; hour < 18; hour++) {
        // Skip past times for today
        if (i === 1 && hour <= now.getHours()) continue;

        timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
        timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
      }

      if (timeSlots.length > 0) {
        slots.push({
          date: date.toISOString().split("T")[0],
          slots: timeSlots,
        });
      }
    }

    setAvailableSlots(slots);
  };

  const handleAddInterviewer = () => {
    if (interviewerEmail && !interviewers.includes(interviewerEmail)) {
      setInterviewers([...interviewers, interviewerEmail]);
      setInterviewerEmail("");
    }
  };

  const handleRemoveInterviewer = (email: string) => {
    setInterviewers(interviewers.filter((e) => e !== email));
  };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Selecione data e horário");
      return;
    }

    setIsScheduling(true);

    try {
      const startTime = new Date(`${selectedDate}T${selectedTime}:00`);

      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          startTime: startTime.toISOString(),
          durationMinutes: duration,
          interviewerEmails: interviewers,
          notes,
          createMeetLink,
          sendNotification,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao agendar entrevista");
      }

      toast.success("Entrevista agendada com sucesso!");

      if (data.calendarEvent?.hangoutLink) {
        toast.info(`Google Meet: ${data.calendarEvent.hangoutLink}`, {
          duration: 10000,
        });
      }

      onScheduled?.(data.interview);
      setIsOpen(false);

      // Reset form
      setSelectedDate("");
      setSelectedTime("");
      setInterviewers([]);
      setNotes("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao agendar entrevista");
    } finally {
      setIsScheduling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <CalendarPlus className="h-4 w-4 mr-2" />
            Agendar Entrevista
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendar Entrevista
          </DialogTitle>
          <DialogDescription>
            Agende uma entrevista com {candidate.name} para a vaga {candidate.job?.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Candidate Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{candidate.name}</p>
              <p className="text-sm text-muted-foreground">{candidate.email}</p>
            </div>
            {candidate.job && (
              <Badge variant="outline">
                <Briefcase className="h-3 w-3 mr-1" />
                {candidate.job.title}
              </Badge>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Data</Label>
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma data" />
              </SelectTrigger>
              <SelectContent>
                {availableSlots.map((slot) => (
                  <SelectItem key={slot.date} value={slot.date}>
                    {formatDate(slot.date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label>Horário</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedDate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um horário" />
              </SelectTrigger>
              <SelectContent>
                {selectedDate &&
                  availableSlots
                    .find((s) => s.date === selectedDate)
                    ?.slots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duração</Label>
            <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1h 30min</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interviewers */}
          <div className="space-y-2">
            <Label>Entrevistadores</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@empresa.com"
                value={interviewerEmail}
                onChange={(e) => setInterviewerEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddInterviewer()}
              />
              <Button type="button" variant="outline" onClick={handleAddInterviewer}>
                Adicionar
              </Button>
            </div>
            {interviewers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {interviewers.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      onClick={() => handleRemoveInterviewer(email)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Observações sobre a entrevista..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="meet-link"
                checked={createMeetLink}
                onCheckedChange={(checked) => setCreateMeetLink(checked as boolean)}
              />
              <label htmlFor="meet-link" className="text-sm flex items-center gap-2 cursor-pointer">
                <Video className="h-4 w-4" />
                Criar link do Google Meet
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="send-notification"
                checked={sendNotification}
                onCheckedChange={(checked) => setSendNotification(checked as boolean)}
              />
              <label htmlFor="send-notification" className="text-sm flex items-center gap-2 cursor-pointer">
                <Send className="h-4 w-4" />
                Enviar notificação ao candidato
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSchedule} disabled={isScheduling || !selectedDate || !selectedTime}>
              {isScheduling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Agendar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
