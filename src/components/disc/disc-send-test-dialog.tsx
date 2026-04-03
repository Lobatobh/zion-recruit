"use client";

/**
 * DISC Send Test Dialog - Zion Recruit (Premium Edition)
 * Dialog para enviar teste DISC a um candidato com busca, seleção de envio e link copiável
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Search,
  Send,
  Mail,
  MessageSquare,
  Copy,
  Check,
  CheckCircle,
  QrCode,
  ExternalLink,
  Loader2,
  User,
  Briefcase,
  Sparkles,
  X,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiscSendTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestSent?: () => void;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photo: string | null;
  status: string;
  city: string | null;
  state: string | null;
  job: {
    id: string;
    title: string;
    department: string | null;
  } | null;
}

interface SendResult {
  testUrl: string;
  testId: string;
  candidateName: string;
  notifications: { email?: boolean; whatsapp?: boolean };
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const successScale = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    SOURCED: "Sourceado",
    APPLIED: "Aplicado",
    SCREENING: "Triagem",
    INTERVIEWING: "Entrevista",
    DISC_TEST: "Teste DISC",
    OFFER: "Proposta",
    HIRED: "Contratado",
    REJECTED: "Rejeitado",
  };
  return map[status] || status;
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    SOURCED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    APPLIED: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    SCREENING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    INTERVIEWING: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    DISC_TEST: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    OFFER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    HIRED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  return map[status] || "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300";
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DiscSendTestDialog({
  open,
  onOpenChange,
  onTestSent,
}: DiscSendTestDialogProps) {
  // State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch candidates
  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: "SOURCED,APPLIED,SCREENING,INTERVIEWING,DISC_TEST",
        pageSize: "50",
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      const response = await fetch(`/api/candidates?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar candidatos");
      }

      setCandidates(data.candidates || []);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast.error("Erro ao carregar candidatos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedCandidateId(null);
      setSendEmail(true);
      setSendWhatsapp(false);
      setSendResult(null);
      setLinkCopied(false);
      fetchCandidates();
    }
  }, [open, fetchCandidates]);

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.job?.title?.toLowerCase().includes(q) ||
        false
    );
  }, [candidates, searchQuery]);

  // Selected candidate
  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) || null,
    [candidates, selectedCandidateId]
  );

  // Handle send
  const handleSend = async () => {
    if (!selectedCandidateId) {
      toast.error("Selecione um candidato para enviar o teste");
      return;
    }

    if (!sendEmail && !sendWhatsapp) {
      toast.error("Selecione ao menos um método de envio (Email ou WhatsApp)");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/disc/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedCandidateId,
          sendEmail,
          sendWhatsapp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar teste DISC");
      }

      setSendResult({
        testUrl: data.testUrl || "",
        testId: data.test?.id || "",
        candidateName: selectedCandidate?.name || "",
        notifications: data.notifications || {},
      });

      toast.success(data.message || "Teste DISC enviado com sucesso!");
      onTestSent?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar teste DISC"
      );
    } finally {
      setIsSending(false);
    }
  };

  // Copy link
  const copyLink = async () => {
    if (!sendResult?.testUrl) return;
    try {
      await navigator.clipboard.writeText(sendResult.testUrl);
      setLinkCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  // Open link externally
  const openLink = () => {
    if (sendResult?.testUrl) {
      window.open(sendResult.testUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[560px] p-0 gap-0 overflow-hidden rounded-2xl border border-white/20 shadow-2xl max-h-[90vh] bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl"
        showCloseButton={false}
      >
        {/* ── Gradient Header ─────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 pt-6 pb-6">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          <DialogHeader className="relative">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20"
              >
                <Brain className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <DialogTitle className="text-xl font-bold text-white tracking-tight">
                  Enviar Teste DISC
                </DialogTitle>
                <DialogDescription className="text-sm text-white/70 mt-0.5">
                  Selecione um candidato e configure o envio da avaliação
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {sendResult ? (
            /* ── Success State ───────────────────────────────────────────── */
            <motion.div
              key="success"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={successScale}
              className="p-6 space-y-5"
            >
              {/* Success banner */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                  className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                >
                  <CheckCircle className="w-5 h-5 text-white" />
                </motion.div>
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
                    Teste enviado com sucesso!
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    O teste DISC foi enviado para{" "}
                    <span className="font-medium">{sendResult.candidateName}</span>
                  </p>
                </div>
              </div>

              {/* Notifications summary */}
              <div className="flex items-center gap-3 flex-wrap">
                {sendResult.notifications?.email && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 gap-1.5"
                  >
                    <Mail className="w-3 h-3" />
                    Email enviado
                  </Badge>
                )}
                {sendResult.notifications?.whatsapp && (
                  <Badge
                    variant="outline"
                    className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-300 gap-1.5"
                  >
                    <MessageSquare className="w-3 h-3" />
                    WhatsApp enviado
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Link Card */}
              <div className="rounded-xl border border-violet-200 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/80 to-purple-50/80 dark:from-violet-900/10 dark:to-purple-900/10 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                    Link do Teste
                  </h3>
                </div>

                {/* URL display */}
                <div className="flex gap-2">
                  <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border border-violet-200/60 dark:border-violet-800/30 px-3 py-2.5 min-w-0">
                    <p className="text-xs font-mono text-violet-700 dark:text-violet-300 truncate">
                      {sendResult.testUrl}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyLink}
                    className={cn(
                      "shrink-0 rounded-lg transition-all duration-200",
                      linkCopied
                        ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300"
                        : "hover:bg-violet-100 hover:text-violet-700 hover:border-violet-300 dark:hover:bg-violet-900/30 dark:hover:text-violet-300 dark:hover:border-violet-700"
                    )}
                  >
                    {linkCopied ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Check className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={openLink}
                    className="shrink-0 rounded-lg hover:bg-violet-100 hover:text-violet-700 hover:border-violet-300 dark:hover:bg-violet-900/30 dark:hover:text-violet-300 dark:hover:border-violet-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>

                {/* QR Code Placeholder */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-white/60 dark:bg-gray-900/40 border border-dashed border-violet-300/60 dark:border-violet-700/30">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center shrink-0">
                    <QrCode className="w-8 h-8 text-violet-500 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
                      QR Code do Teste
                    </p>
                    <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-0.5">
                      Compartilhe este link ou o QR code com o candidato para
                      iniciar a avaliação DISC
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={copyLink}
                  className={cn(
                    "gap-2 transition-all duration-200",
                    linkCopied &&
                      "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300"
                  )}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Link Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar Link
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  Concluir
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            /* ── Form State ──────────────────────────────────────────────── */
            <motion.div
              key="form"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { duration: 0.25 } },
              }}
              className="flex flex-col max-h-[60vh]"
            >
              {/* Search input */}
              <div className="px-6 pt-5 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar candidato por nome, e-mail ou vaga..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-muted/50 border-transparent focus:border-violet-300 focus:ring-violet-200/60 dark:focus:border-violet-700 dark:focus:ring-violet-800/40"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Candidate list */}
              <ScrollArea className="flex-1 px-6 min-h-0">
                <div className="pb-3 min-h-[140px]">
                  {isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl"
                        >
                          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-56" />
                          </div>
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : filteredCandidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/20 flex items-center justify-center mb-4">
                        <Users className="w-7 h-7 text-violet-400" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {searchQuery
                          ? "Nenhum candidato encontrado"
                          : "Nenhum candidato disponível"}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                        {searchQuery
                          ? "Tente ajustar os termos de busca."
                          : "Adicione candidatos ao pipeline para enviar testes DISC."}
                      </p>
                    </div>
                  ) : (
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="space-y-1.5"
                    >
                      {filteredCandidates.map((candidate, index) => (
                        <motion.button
                          key={candidate.id}
                          custom={index}
                          variants={fadeInUp}
                          onClick={() => setSelectedCandidateId(candidate.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group",
                            "hover:bg-violet-50/80 dark:hover:bg-violet-900/15",
                            selectedCandidateId === candidate.id
                              ? "bg-violet-100/80 dark:bg-violet-900/25 border border-violet-300/60 dark:border-violet-700/40 shadow-sm"
                              : "border border-transparent"
                          )}
                        >
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <Avatar className="h-10 w-10 ring-1 ring-muted">
                              <AvatarImage
                                src={candidate.photo || undefined}
                              />
                              <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-purple-600 text-white font-medium">
                                {getInitials(candidate.name)}
                              </AvatarFallback>
                            </Avatar>
                            {selectedCandidateId === candidate.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                }}
                                className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-violet-600 flex items-center justify-center shadow-sm"
                              >
                                <Check className="w-2.5 h-2.5 text-white" />
                              </motion.div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-sm font-medium truncate transition-colors",
                                selectedCandidateId === candidate.id
                                  ? "text-violet-900 dark:text-violet-100"
                                  : "text-foreground group-hover:text-violet-800 dark:group-hover:text-violet-200"
                              )}
                            >
                              {candidate.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {candidate.email}
                            </p>
                            {candidate.job?.title && (
                              <div className="flex items-center gap-1 mt-1">
                                <Briefcase className="w-3 h-3 text-muted-foreground/60" />
                                <span className="text-[11px] text-muted-foreground/70 truncate">
                                  {candidate.job.title}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Status badge */}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 shrink-0 border",
                              statusColor(candidate.status)
                            )}
                          >
                            {statusLabel(candidate.status)}
                          </Badge>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Divider */}
              <div className="mx-6 border-t" />

              {/* Send options + Footer */}
              <div className="px-6 py-4 space-y-4 bg-muted/20 dark:bg-muted/10">
                {/* Send method checkboxes */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Método de Envio
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 flex-1 cursor-pointer",
                        sendEmail
                          ? "bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-800/40"
                          : "bg-white dark:bg-gray-900/50 border-muted hover:border-blue-200/60 dark:hover:border-blue-800/30"
                      )}
                      onClick={() => setSendEmail(!sendEmail)}
                    >
                      <Checkbox
                        checked={sendEmail}
                        onCheckedChange={(checked) => setSendEmail(checked === true)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {selectedCandidate?.email || "Enviar por e-mail"}
                        </p>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 flex-1 cursor-pointer",
                        sendWhatsapp
                          ? "bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-800/40"
                          : "bg-white dark:bg-gray-900/50 border-muted hover:border-green-200/60 dark:hover:border-green-800/30"
                      )}
                      onClick={() => setSendWhatsapp(!sendWhatsapp)}
                    >
                      <Checkbox
                        checked={sendWhatsapp}
                        onCheckedChange={(checked) => setSendWhatsapp(checked === true)}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">WhatsApp</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {selectedCandidate?.phone || "Enviar por WhatsApp"}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* No candidate selected hint */}
                {!selectedCandidateId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Selecione um candidato acima para enviar o teste
                  </p>
                )}

                {/* Footer */}
                <DialogFooter className="gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 sm:flex-none"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={
                      isSending ||
                      !selectedCandidateId ||
                      (!sendEmail && !sendWhatsapp)
                    }
                    className="flex-1 sm:flex-none bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none gap-2"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar Teste
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
