"use client";

/**
 * New Interview Dialog - Zion Recruit
 * Create a new interview manually
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  Search,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photo: string | null;
  matchScore: number | null;
  job: {
    id: string;
    title: string;
  };
}

interface NewInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const interviewTypes = [
  { value: "SCREENING", label: "Triagem", duration: 30 },
  { value: "TECHNICAL", label: "Técnica", duration: 60 },
  { value: "BEHAVIORAL", label: "Comportamental", duration: 45 },
  { value: "CULTURAL", label: "Cultural", duration: 45 },
  { value: "FINAL", label: "Final", duration: 60 },
  { value: "PHONE", label: "Telefônica", duration: 30 },
  { value: "VIDEO", label: "Vídeo", duration: 45 },
  { value: "ONSITE", label: "Presencial", duration: 60 },
];

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30",
];

export function NewInterviewDialog({
  open,
  onOpenChange,
  onCreated,
}: NewInterviewDialogProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [interviewType, setInterviewType] = useState("SCREENING");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [interviewerName, setInterviewerName] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch candidates when dialog opens
  useEffect(() => {
    if (open) {
      fetchCandidates();
    }
  }, [open]);

  // Update duration when type changes
  useEffect(() => {
    const type = interviewTypes.find((t) => t.value === interviewType);
    if (type) {
      setDuration(type.duration);
    }
  }, [interviewType]);

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/candidates?limit=50");
      const data = await response.json();

      if (response.ok) {
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      toast.error("Erro ao carregar candidatos");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCandidates = candidates.filter((candidate) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      candidate.name.toLowerCase().includes(query) ||
      candidate.email.toLowerCase().includes(query) ||
      candidate.job?.title?.toLowerCase().includes(query)
    );
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmit = async () => {
    if (!selectedCandidate || !selectedDate || !selectedTime) {
      toast.error("Selecione um candidato, data e horário");
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          jobId: selectedCandidate.job.id,
          type: interviewType,
          scheduledAt: scheduledAt.toISOString(),
          duration,
          location: location || undefined,
          meetingUrl: meetingUrl || undefined,
          interviewerName: interviewerName || undefined,
          description: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar entrevista");
      }

      toast.success("Entrevista agendada com sucesso!");
      
      // Reset form
      setSelectedCandidate(null);
      setSearchQuery("");
      setInterviewType("SCREENING");
      setSelectedDate(new Date());
      setSelectedTime("09:00");
      setLocation("");
      setMeetingUrl("");
      setInterviewerName("");
      setNotes("");

      onCreated();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar entrevista");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Nova Entrevista</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh]">
          <div className="p-6 space-y-6">
            {/* Candidate Selection */}
            <div className="space-y-2">
              <Label>Candidato</Label>
              {selectedCandidate ? (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedCandidate.photo || undefined} />
                      <AvatarFallback>
                        {getInitials(selectedCandidate.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedCandidate.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCandidate.job?.title || 'Sem vaga'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCandidate(null)}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar candidato..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="h-48 border rounded-lg">
                    {isLoading ? (
                      <div className="p-4 space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-12" />
                        ))}
                      </div>
                    ) : filteredCandidates.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Nenhum candidato encontrado
                      </div>
                    ) : (
                      <div className="p-2">
                        {filteredCandidates.map((candidate) => (
                          <button
                            key={candidate.id}
                            onClick={() => {
                              setSelectedCandidate(candidate);
                              setSearchQuery("");
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={candidate.photo || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(candidate.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {candidate.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {candidate.job?.title || 'Sem vaga'}
                              </p>
                            </div>
                            {candidate.matchScore !== null && (
                              <Badge variant="secondary" className="text-xs">
                                {candidate.matchScore}%
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Interview Type */}
            <div className="space-y-2">
              <Label>Tipo de Entrevista</Label>
              <Select value={interviewType} onValueChange={setInterviewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interviewTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label} ({type.duration} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Horário</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duração (minutos)</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 75, 90, 120].map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      {d} minutos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location / Meeting URL */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Local (opcional)
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Escritório São Paulo"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Link da Reunião (opcional)
                </Label>
                <Input
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            </div>

            {/* Interviewer */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Entrevistador (opcional)
              </Label>
              <Input
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                placeholder="Nome do entrevistador"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            {/* Summary */}
            {selectedCandidate && selectedDate && (
              <Card className="bg-primary/5">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">Resumo</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>Candidato:</strong> {selectedCandidate.name}
                    </p>
                    <p>
                      <strong>Vaga:</strong> {selectedCandidate.job?.title || 'Sem vaga'}
                    </p>
                    <p>
                      <strong>Data:</strong>{" "}
                      {format(selectedDate, "PPP", { locale: ptBR })} às {selectedTime}
                    </p>
                    <p>
                      <strong>Tipo:</strong>{" "}
                      {interviewTypes.find((t) => t.value === interviewType)?.label} ({duration} min)
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !selectedCandidate}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Agendar Entrevista
                  </>
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
