"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ExternalLink,
  Copy,
  Check,
  Mail,
  RefreshCw,
  Shield,
  Clock,
  Globe,
  Loader2,
  Eye,
  Send,
  Link2,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface SharePortalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
}

interface PortalInfo {
  hasActiveToken: boolean;
  portalUrl: string | null;
  expiresAt: string | null;
  lastAccessAt: string | null;
}

export function SharePortalDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  candidateEmail,
}: SharePortalDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [portalInfo, setPortalInfo] = useState<PortalInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");

  // Fetch existing portal info when dialog opens
  useEffect(() => {
    if (open && candidateId) {
      fetchPortalInfo();
    }
  }, [open, candidateId]);

  const fetchPortalInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/portal`);
      if (response.ok) {
        const data = await response.json();
        setPortalInfo(data);
        if (data.portalUrl) {
          buildWhatsappUrl(data.portalUrl);
        }
      }
    } catch {
      console.error("Failed to fetch portal info");
    } finally {
      setLoading(false);
    }
  };

  const buildWhatsappUrl = (portalUrl: string) => {
    const message = encodeURIComponent(
      `Olá, ${candidateName}! 🎯\n\nAcompanhe o andamento do seu processo seletivo em tempo real pelo nosso Portal do Candidato:\n\n🔗 ${portalUrl}\n\nO link é válido por 7 dias. Qualquer dúvida, entre em contato!`
    );
    const phone = candidateEmail.replace(/[^0-9]/g, "");
    setWhatsappUrl(`https://wa.me/55${phone}?text=${message}`);
  };

  const handleGenerateToken = async (sendEmail: boolean = false) => {
    setGenerating(true);
    setSendingEmail(sendEmail);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setPortalInfo({
          hasActiveToken: true,
          portalUrl: data.portalUrl,
          expiresAt: data.expiresAt,
          lastAccessAt: null,
        });
        buildWhatsappUrl(data.portalUrl);

        if (sendEmail && data.emailSent) {
          toast.success("Email enviado com sucesso!", {
            description: `${candidateName} recebeu o link do portal por email.`,
          });
        } else if (sendEmail && !data.emailSent) {
          toast.warning("Email não enviado", {
            description:
              "Configure as credenciais do Resend nas Configurações > APIs para enviar emails automaticamente. O link foi gerado e pode ser copiado manualmente.",
          });
        } else {
          toast.success("Link gerado com sucesso!", {
            description: "Copie o link e envie ao candidato.",
          });
        }
      } else {
        toast.error("Erro ao gerar link", {
          description: data.error || "Tente novamente.",
        });
      }
    } catch {
      toast.error("Erro de conexão", {
        description: "Não foi possível gerar o link do portal.",
      });
    } finally {
      setGenerating(false);
      setSendingEmail(false);
    }
  };

  const handleCopyLink = async () => {
    if (!portalInfo?.portalUrl) return;

    try {
      await navigator.clipboard.writeText(portalInfo.portalUrl);
      setCopied(true);
      toast.success("Link copiado!", {
        description: "Cole no WhatsApp, email ou outro canal.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = portalInfo.portalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatExpiry = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = portalInfo?.expiresAt
    ? new Date(portalInfo.expiresAt) < new Date()
    : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Portal do Candidato
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-0.5">
                  Compartilhe o acesso para {candidateName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Features explanation */}
          <div className="rounded-xl bg-muted/50 border p-4">
            <p className="text-sm font-medium text-foreground mb-3">
              O que o candidato pode ver no portal:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { icon: "📊", text: "Etapa atual do processo" },
                { icon: "📋", text: "Todas as fases do seletivo" },
                { icon: "📅", text: "Agendamento de entrevistas" },
                { icon: "🧠", text: "Teste DISC comportamental" },
                { icon: "💬", text: "Mensagens com recrutador" },
                { icon: "📝", text: "Edição de dados cadastrais" },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Carregando...
              </span>
            </div>
          )}

          {/* No active token state */}
          {!loading && !portalInfo?.hasActiveToken && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Shield className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold">
                  Nenhum link ativo para este candidato
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Gere um link de acesso seguro para que {candidateName} possa
                  acompanhar o processo seletivo.
                </p>
              </div>
            </div>
          )}

          {/* Active token - Link display */}
          {!loading && portalInfo?.hasActiveToken && !isExpired && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Link Ativo
                </Badge>
                {portalInfo.expiresAt && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Expira em {formatExpiry(portalInfo.expiresAt)}
                  </span>
                )}
              </div>

              {portalInfo.lastAccessAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Último acesso: {formatExpiry(portalInfo.lastAccessAt)}
                </p>
              )}

              {/* URL input with copy */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    readOnly
                    value={portalInfo.portalUrl || ""}
                    className="pr-10 font-mono text-xs h-10 bg-muted"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute right-1 top-1 h-8 w-8"
                          onClick={handleCopyLink}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {copied ? "Copiado!" : "Copiar link"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Quick share buttons */}
              <div className="grid grid-cols-2 gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleCopyLink}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {copied ? "Copiado!" : "Copiar Link"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Copie e cole no canal de sua preferência
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
                        asChild
                      >
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4 mr-2 fill-current"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          WhatsApp
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Enviar mensagem pre-formatada via WhatsApp
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}

          {/* Expired token */}
          {!loading && portalInfo?.hasActiveToken && isExpired && (
            <div className="text-center py-4 space-y-3">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                <Clock className="h-3 w-3 mr-1" />
                Link Expirado
              </Badge>
              <p className="text-sm text-muted-foreground">
                O link anterior expirou. Gere um novo link para o candidato.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-muted/20 space-y-3">
          <Separator className="hidden" />
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateToken(false)}
              disabled={generating}
            >
              {generating && !sendingEmail ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-1.5" />
              )}
              {portalInfo?.hasActiveToken && !isExpired
                ? "Gerar Novo Link"
                : "Gerar Link"}
            </Button>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateToken(true)}
                      disabled={generating}
                    >
                      {sendingEmail ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-1.5" />
                      )}
                      Enviar por Email
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Envia o link automaticamente para {candidateEmail}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {portalInfo?.portalUrl && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  asChild
                >
                  <a
                    href={portalInfo.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Abrir
                  </a>
                </Button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3 flex-shrink-0" />
            O link é pessoal, intransferível e válido por 7 dias.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
