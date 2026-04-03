/**
 * Compose Message Dialog - Zion Recruit
 * Dialog for creating a new conversation with a candidate
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  MessageCircle,
  Loader2,
  User,
  Building2,
  Hash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMessagingStore } from "@/stores/messaging-store";
import { toast } from "sonner";

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated?: (conversationId: string) => void;
}

interface CandidateOption {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photo?: string;
  jobTitle?: string;
  department?: string;
}

export function ComposeMessageDialog({
  open,
  onOpenChange,
  onConversationCreated,
}: ComposeMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateOption | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>("CHAT");
  const [initialMessage, setInitialMessage] = useState("");
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<"search" | "compose">("search");

  const { createConversation } = useMessagingStore();

  // Search candidates when query changes
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/candidates?search=${encodeURIComponent(searchQuery)}&limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          setCandidates(
            (data.candidates || []).map((c: any) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              phone: c.phone,
              photo: c.photo,
              jobTitle: c.job?.title,
              department: c.job?.department,
            }))
          );
        }
      } catch {
        setCandidates([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCandidate = (candidate: CandidateOption) => {
    setSelectedCandidate(candidate);
    setStep("compose");
  };

  const handleCreate = async () => {
    if (!selectedCandidate) return;

    setIsCreating(true);
    try {
      const conversation = await createConversation({
        candidateId: selectedCandidate.id,
        channel: selectedChannel as any,
      });

      // If there's an initial message, send it
      if (initialMessage.trim()) {
        await fetch(`/api/messages/conversations/${conversation.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: initialMessage.trim() }),
        });
      }

      toast.success("Conversa criada com sucesso!");
      onConversationCreated?.(conversation.id);
      handleClose();
    } catch (error) {
      toast.error("Falha ao criar conversa");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setStep("search");
    setSearchQuery("");
    setSelectedCandidate(null);
    setInitialMessage("");
    setCandidates([]);
    onOpenChange(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Nova Conversa
          </DialogTitle>
          <DialogDescription>
            {step === "search"
              ? "Busque um candidato para iniciar uma conversa"
              : `Conversa com ${selectedCandidate?.name}`}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "search" ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar candidato por nome ou e-mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              {/* Results */}
              <ScrollArea className="max-h-[300px]">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : candidates.length === 0 && searchQuery.length >= 2 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Nenhum candidato encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {candidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        onClick={() => handleSelectCandidate(candidate)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={candidate.photo || undefined} />
                          <AvatarFallback>
                            {getInitials(candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {candidate.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {candidate.email}
                          </p>
                        </div>
                        {candidate.jobTitle && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {candidate.jobTitle}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          ) : (
            <motion.div
              key="compose"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Selected Candidate */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedCandidate?.photo || undefined} />
                  <AvatarFallback className="text-sm">
                    {getInitials(selectedCandidate?.name || "C")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedCandidate?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedCandidate?.email}
                  </p>
                  {selectedCandidate?.jobTitle && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      {selectedCandidate.jobTitle}
                      {selectedCandidate?.department && (
                        <> • {selectedCandidate.department}</>
                      )}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setStep("search")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Channel Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Canal
                </label>
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHAT">Chat Interno</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">E-mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Initial Message */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Mensagem inicial (opcional)
                </label>
                <textarea
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="Digite uma mensagem de abertura..."
                  className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("search")}
                >
                  Voltar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Criar conversa
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
