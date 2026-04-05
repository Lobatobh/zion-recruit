/**
 * Chat View Component - Zion Recruit
 * Individual conversation chat interface with full functionality
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Bot,
  User,
  AlertCircle,
  Pause,
  Play,
  CheckCheck,
  Clock,
  ArrowLeft,
  FileText,
  Sparkles,
  X,
  Loader2,
  Mic,
  Image as ImageIcon,
  Link2,
  Copy,
  Reply,
  Forward,
  Pin,
  Trash2,
  Check,
  PhoneOff,
  WifiOff,
  Zap,
  MessageSquare,
  ShieldCheck,
  HandMetal,
} from "lucide-react";
import { useMessagingStore } from "@/stores/messaging-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ConversationWithDetails, Message, CHANNEL_CONFIG, AI_STAGES } from "@/types/messaging";
import { toast } from "sonner";

// ============================================
// QUICK REPLY TEMPLATES
// ============================================

const QUICK_REPLIES = [
  { label: "Boas-vindas", icon: "👋", text: "Olá! Muito obrigado pelo seu interesse na vaga. Como posso te ajudar?" },
  { label: "Disponibilidade", icon: "📅", text: "Qual é a sua disponibilidade para iniciar e quais são seus horários preferidos?" },
  { label: "Pretensão salarial", icon: "💰", text: "Poderia compartilhar sua pretensão salarial para esta posição?" },
  { label: "Experiência", icon: "💼", text: "Conte-nos um pouco sobre sua experiência mais relevante para esta vaga." },
  { label: "Agendar entrevista", icon: "📞", text: "Gostaria de agendar uma entrevista! Qual sua disponibilidade nesta semana?" },
  { label: "Feedback positivo", icon: "✅", text: "Seu perfil está excelente! Vamos avançar para a próxima etapa do processo." },
  { label: "Agradecimento", icon: "🙏", text: "Agradecemos muito pelo seu tempo e interesse. Entraremos em contato em breve!" },
  { label: "Documentação", icon: "📄", text: "Por favor, envie seus documentos atualizados: RG, CPF e comprovante de residência." },
];

// ============================================
// AI SUGGESTIONS BY STAGE
// ============================================

const AI_SUGGESTIONS_BY_STAGE: Record<string, { label: string; text: string }[]> = {
  [AI_STAGES.WELCOME]: [
    { label: "Boas-vindas", text: "Olá! Sou a Zoe, assistente de recrutamento. Fico feliz em falar com você!" },
    { label: "Sobre a vaga", text: "Vi que você se candidatou para a vaga. Gostaria de saber mais sobre ela?" },
  ],
  [AI_STAGES.EXPERIENCE_CHECK]: [
    { label: "Experiência", text: "Perguntar sobre experiência anterior" },
    { label: "Tempo de área", text: "Há quanto tempo trabalha na área?" },
    { label: "Maior desafio", text: "Qual foi o maior desafio que já enfrentou profissionalmente?" },
  ],
  [AI_STAGES.AVAILABILITY_CHECK]: [
    { label: "Disponibilidade", text: "Solicitar disponibilidade para início" },
    { label: "Horários", text: "Quais são seus horários preferidos de trabalho?" },
    { label: "Presencial/Remoto", text: "Você tem preferência por trabalho presencial ou remoto?" },
  ],
  [AI_STAGES.SALARY_CHECK]: [
    { label: "Salário", text: "Perguntar pretensão salarial" },
    { label: "Benefícios", text: "Quais benefícios são mais importantes para você?" },
  ],
  [AI_STAGES.SKILLS_CHECK]: [
    { label: "Habilidades", text: "Quais são suas principais habilidades técnicas?" },
    { label: "Certificações", text: "Possui alguma certificação relevante?" },
  ],
  [AI_STAGES.MOTIVATION_CHECK]: [
    { label: "Motivação", text: "O que te motivou a se candidatar para esta vaga?" },
    { label: "Objetivos", text: "Quais são seus objetivos profissionais para os próximos anos?" },
  ],
  [AI_STAGES.SCHEDULING]: [
    { label: "Agendar", text: "Agendar entrevista técnica" },
    { label: "Confirmar", text: "Confirmar data e horário da entrevista" },
    { label: "Reagendar", text: "Gostaria de reagendar a entrevista" },
  ],
  [AI_STAGES.HANDOFF]: [
    { label: "Transferir", text: "Vou transferir você para um recrutador humano" },
    { label: "Esclarecimento", text: "Precisa falar com alguém da equipe?" },
  ],
};

const DEFAULT_AI_SUGGESTIONS = [
  { label: "Experiência", text: "Perguntar sobre experiência anterior" },
  { label: "Disponibilidade", text: "Solicitar disponibilidade" },
  { label: "Salário", text: "Perguntar pretensão salarial" },
  { label: "Entrevista", text: "Agendar entrevista" },
];

// ============================================
// EMOJI DATA
// ============================================

const EMOJI_CATEGORIES = [
  { name: "Frequentes", emojis: ["👍", "👎", "❤️", "😂", "🎉", "🔥", "👏", "🙏", "✅", "⭐", "💡", "📌", "🎯", "🚀", "💬", "📧", "👨‍💻", "📋", "📊", "💰"] },
  { name: "Caras", emojis: ["😊", "😂", "🤔", "😮", "😅", "🤣", "😄", "🙂", "😉", "😍", "🥳", "😎", "🤩", "😇", "🤗", "🫡", "🤓", "😏"] },
  { name: "Gestos", emojis: ["👋", "🤝", "👍", "👎", "👏", "🙏", "💪", "✌️", "🤞", "🫶", "☝️", "👆", "👇", "👈", "👉", "🫵", "🤙", "🖐️"] },
];

// ============================================
// COMPONENT
// ============================================

interface ChatViewProps {
  conversation: ConversationWithDetails | null;
  onBack?: () => void;
  isMobile?: boolean;
}

export function ChatView({ conversation, onBack, isMobile = false }: ChatViewProps) {
  const {
    messages,
    fetchMessages,
    sendMessage,
    toggleAiMode,
    markAsRead,
    isLoadingMessages,
    typingIndicators,
    socketConnected,
    updateConversationStatus,
  } = useMessagingStore();

  const { openCandidateDetail } = usePipelineStore();

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ message: Message; x: number; y: number } | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeText, setResumeText] = useState<string>("");
  const [isLoadingResume, setIsLoadingResume] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isTakingOver, setIsTakingOver] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (conversation?.id) {
      fetchMessages(conversation.id);
      markAsRead(conversation.id);
      setReplyingTo(null);
    }
  }, [conversation?.id, fetchMessages, markAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages[conversation?.id || ""], typingIndicators]);

  // Typing indicator for this conversation
  const typingIndicator = typingIndicators.find(
    (t) => t.conversationId === conversation?.id
  );

  const handleSendMessage = useCallback(async (content?: string) => {
    const text = content || newMessage.trim();
    if (!text || !conversation || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({
        conversationId: conversation.id,
        content: text,
      });
      setNewMessage("");
      setReplyingTo(null);
      setShowQuickReplies(false);
      setShowEmojiPicker(false);
    } catch (error) {
      toast.error("Falha ao enviar mensagem");
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [newMessage, conversation, isSending, sendMessage]);

  const handleToggleAI = async () => {
    if (!conversation) return;
    try {
      await toggleAiMode(conversation.id, !conversation.aiMode);
      toast.success(
        conversation.aiMode ? "IA pausada" : "IA reativada"
      );
    } catch (error) {
      toast.error("Falha ao alterar modo IA");
    }
  };

  const handleTakeOver = async () => {
    if (!conversation || isTakingOver) return;
    setIsTakingOver(true);
    try {
      // 1. Disable AI mode
      await toggleAiMode(conversation.id, false);
      // 2. Send a system message indicating takeover
      await sendMessage({
        conversationId: conversation.id,
        content: "🎯 *Recrutador assumiu a conversa*",
        contentType: "TEXT" as any,
      }).catch(() => {});
      toast.success("Você assumiu a conversa! A IA está pausada.");
    } catch (error) {
      toast.error("Falha ao assumir conversa");
    } finally {
      setIsTakingOver(false);
    }
  };

  const handleReactivateAI = async () => {
    if (!conversation) return;
    try {
      await toggleAiMode(conversation.id, true);
      toast.success("IA reativada! A Zoe voltou a controlar a conversa.");
    } catch (error) {
      toast.error("Falha ao reativar IA");
    }
  };

  const handleCloseConversation = async () => {
    if (!conversation) return;
    try {
      await updateConversationStatus(conversation.id, "CLOSED");
      toast.success("Conversa encerrada");
    } catch (error) {
      toast.error("Falha ao encerrar conversa");
    }
  };

  const handleViewProfile = () => {
    if (!conversation?.candidate) return;
    // Fetch candidate data and open detail dialog
    openCandidateDetail({
      id: conversation.candidate.id,
      name: conversation.candidate.name,
      email: conversation.candidate.email,
      phone: conversation.candidate.phone || "",
      photo: conversation.candidate.photo || "",
      matchScore: 0,
      job: {
        id: conversation.job?.id || "",
        title: conversation.job?.title || "Sem vaga",
      },
      pipelineStageId: "",
      createdAt: new Date(),
      tenantId: conversation.tenantId,
      status: "APPLIED",
    } as any);
    toast.success("Perfil do candidato aberto");
  };

  const handleViewResume = async () => {
    if (!conversation?.candidate) return;
    setIsLoadingResume(true);
    setShowResumeDialog(true);
    try {
      const response = await fetch(`/api/messages/conversations/${conversation.id}`);
      if (response.ok) {
        const data = await response.json();
        setResumeText(data.conversation?.candidate?.resumeText || "Currículo não disponível");
      } else {
        setResumeText("Erro ao carregar currículo");
      }
    } catch {
      setResumeText("Erro ao carregar currículo");
    } finally {
      setIsLoadingResume(false);
    }
  };

  const handleCall = () => {
    if (!conversation?.candidate?.phone) {
      toast.error("Telefone do candidato não disponível");
      return;
    }
    setShowCallDialog(true);
  };

  const handleVideoCall = () => {
    if (!conversation?.candidate?.email) {
      toast.error("E-mail do candidato não disponível");
      return;
    }
    setShowVideoDialog(true);
  };

  const handleCopyMessage = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      toast.success("Mensagem copiada");
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      toast.error("Falha ao copiar mensagem");
    }
    setContextMenu(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    // For now, we'll send the file name as a message since file upload to API is complex
    // In a production app, this would upload to S3/storage and send the URL
    try {
      setIsSending(true);
      await sendMessage({
        conversationId: conversation.id,
        content: `📎 ${file.name} (${(file.size / 1024).toFixed(1)}KB)`,
        contentType: "TEXT",
      });
      toast.success("Arquivo referenciado na conversa");
    } catch {
      toast.error("Falha ao enviar arquivo");
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Hoje";
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "Ontem";
    } else {
      return d.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
  };

  const conversationMessages = messages[conversation?.id || ""] || [];

  // Dynamic AI suggestions based on stage
  const currentStage = conversation?.aiStage || "";
  const aiSuggestions = AI_SUGGESTIONS_BY_STAGE[currentStage] || DEFAULT_AI_SUGGESTIONS;

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = "";
  conversationMessages.forEach((msg) => {
    const msgDate = formatDate(msg.sentAt);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  // Render link previews in message content
  const renderMessageContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        urlRegex.lastIndex = 0;
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-blue-400 underline break-all hover:opacity-80"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Selecione uma conversa</p>
          <p className="text-sm text-muted-foreground mt-1">
            para começar a interagir
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-background">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <Avatar className="h-10 w-10">
          <AvatarImage src={conversation.candidate?.photo || undefined} />
          <AvatarFallback>
            {getInitials(conversation.candidate?.name || "C")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">
              {conversation.candidate?.name}
            </span>
            {conversation.aiMode && (
              <Badge variant="secondary" className="text-xs gap-1 h-5">
                <Bot className="h-3 w-3" />
                IA
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground truncate">
              {conversation.job?.title || "Sem vaga associada"}
            </p>
            {/* Connection Status */}
            <div
              className={cn(
                "flex items-center gap-1",
                socketConnected ? "text-green-500" : "text-yellow-500"
              )}
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  socketConnected ? "bg-green-500" : "bg-yellow-500"
                )}
              />
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-0.5">
          <TooltipProvider>
            {/* Call */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCall}>
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ligar</TooltipContent>
            </Tooltip>

            {/* Video Call */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleVideoCall}>
                  <Video className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Videochamada</TooltipContent>
            </Tooltip>

            {/* AI Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={conversation.aiMode ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleToggleAI}
                >
                  {conversation.aiMode ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {conversation.aiMode ? "Pausar IA" : "Reativar IA"}
              </TooltipContent>
            </Tooltip>

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={handleViewProfile}>
                  <User className="mr-2 h-4 w-4" />
                  Ver perfil do candidato
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewResume}>
                  <FileText className="mr-2 h-4 w-4" />
                  Ver currículo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  navigator.clipboard.writeText(conversation.candidate?.phone || "");
                  toast.success("Telefone copiado");
                }}>
                  <Phone className="mr-2 h-4 w-4" />
                  Copiar telefone
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  navigator.clipboard.writeText(conversation.candidate?.email || "");
                  toast.success("E-mail copiado");
                }}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Copiar e-mail
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleCloseConversation}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Encerrar conversa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </div>
      </div>

      {/* AI Control Banner - Show when AI is driving the conversation */}
      {conversation.aiMode && !conversation.needsIntervention && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2.5 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-b border-violet-500/20"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm">
              <div className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
              </div>
              <div>
                <span className="font-medium text-violet-700 dark:text-violet-400">
                  Zoe (IA) está controlando esta conversa
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A IA está conversando com o candidato automaticamente
                </p>
              </div>
            </div>
            <Button
              variant="default"
              size="sm"
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm"
              onClick={handleTakeOver}
              disabled={isTakingOver}
            >
              {isTakingOver ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <HandMetal className="h-3.5 w-3.5 mr-1.5" />
              )}
              Assumir Conversa
            </Button>
          </div>
        </motion.div>
      )}

      {/* Human Control Banner - Show when recruiter took over */}
      {!conversation.aiMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2.5 bg-emerald-500/5 border-b border-emerald-500/20"
        >
          <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  Você está no controle
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A IA está pausada. Você está respondendo diretamente.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-violet-600 border-violet-500/30 hover:bg-violet-500/10"
              onClick={handleReactivateAI}
            >
              <Bot className="h-3.5 w-3.5 mr-1.5" />
              Reativar IA
            </Button>
          </div>
        </motion.div>
      )}

      {/* Intervention Banner */}
      {conversation.needsIntervention && (
        <div className="px-4 py-2.5 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive font-medium">
                Intervenção necessária:
              </span>
              <span className="text-muted-foreground">
                {conversation.interventionReason || "Aguardando análise"}
              </span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleTakeOver}
              disabled={isTakingOver}
            >
              {isTakingOver ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <HandMetal className="h-3.5 w-3.5 mr-1.5" />}
              Assumir Agora
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoadingMessages ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn("flex gap-2", i % 2 === 0 ? "justify-end" : "")}
              >
                <Skeleton
                  className={cn(
                    "h-16 rounded-lg",
                    i % 2 === 0 ? "w-48" : "w-64"
                  )}
                />
              </div>
            ))}
          </div>
        ) : conversationMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhuma mensagem ainda
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Envie a primeira mensagem para iniciar a conversa
            </p>
            <div className="flex flex-col items-center gap-2 mt-4">
              {conversation.aiMode && (
                <Button
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 text-white"
                  onClick={async () => {
                    try {
                      await fetch(`/api/messages/conversations/${conversation.id}/ai-process`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ startScreening: true }),
                      });
                      toast.success("Triagem IA iniciada");
                      fetchMessages(conversation.id);
                    } catch {
                      toast.error("Falha ao iniciar triagem IA");
                    }
                  }}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Iniciar triagem com IA
                </Button>
              )}
              {/* Demo: Simulate candidate reply to test AI auto-response */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs text-muted-foreground">
                    <Bot className="h-3 w-3 mr-1" />
                    Simular resposta do candidato
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="center">
                  <p className="text-sm font-medium mb-2">Simular resposta do candidato</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    A IA vai responder automaticamente se estiver ativa
                  </p>
                  <div className="flex flex-col gap-2">
                    {["Olá, tenho interesse na vaga!", "Sim, estou disponível para começar amanhã.", "Minha pretensão é R$ 8.000.", "Não tenho interesse no momento, obrigado."].map((msg) => (
                      <Button
                        key={msg}
                        variant="outline"
                        size="sm"
                        className="text-xs justify-start text-left"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/messages/conversations/${conversation.id}/candidate-reply`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ message: msg }),
                            });
                            if (res.ok) {
                              const data = await res.json();
                              toast.success(conversation.aiMode ? "IA respondeu automaticamente" : "Resposta do candidato registrada");
                              fetchMessages(conversation.id);
                            }
                          } catch {
                            toast.error("Falha ao simular resposta");
                          }
                        }}
                      >
                        {msg}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date Divider */}
                <div className="flex items-center gap-4 my-4">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {group.date}
                  </span>
                  <Separator className="flex-1" />
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  {group.messages.map((message) => {
                    const isRecruiter = message.senderType === "RECRUITER";
                    const isAI = message.senderType === "AI";
                    const isCandidate = message.senderType === "CANDIDATE";

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ message, x: e.clientX, y: e.clientY });
                        }}
                        className={cn(
                          "flex gap-2 max-w-[80%] group",
                          isRecruiter ? "ml-auto flex-row-reverse" : ""
                        )}
                      >
                        {/* Avatar (for non-recruiter messages) */}
                        {!isRecruiter && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback
                              className={cn(
                                isAI
                                  ? "bg-primary/20 text-primary"
                                  : "bg-muted"
                              )}
                            >
                              {isAI ? (
                                <Bot className="h-4 w-4" />
                              ) : (
                                getInitials(
                                  conversation.candidate?.name || "C"
                                )
                              )}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        {/* Message Bubble */}
                        <div className="relative">
                          <div
                            className={cn(
                              "rounded-lg px-4 py-2",
                              isRecruiter
                                ? "bg-primary text-primary-foreground"
                                : isAI
                                ? "bg-primary/10 border border-primary/20"
                                : "bg-muted"
                            )}
                          >
                            {/* Reply Reference */}
                            {message.metadata && (
                              <div className="flex items-center gap-1 mb-1 pb-1 border-b border-current/20">
                                <Reply className="h-3 w-3 opacity-70" />
                                <span className="text-xs opacity-70">
                                  Respondendo
                                </span>
                              </div>
                            )}

                            {/* AI Badge */}
                            {isAI && (
                              <div className="flex items-center gap-1 mb-1">
                                <Sparkles className="h-3 w-3 text-primary" />
                                <span className="text-xs font-medium text-primary">
                                  {message.senderName || "Zoe (IA)"}
                                </span>
                              </div>
                            )}

                            {/* Content */}
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {renderMessageContent(message.content)}
                            </p>

                            {/* Time & Status */}
                            <div
                              className={cn(
                                "flex items-center gap-1 mt-1",
                                isRecruiter
                                  ? "justify-end"
                                  : "justify-start"
                              )}
                            >
                              <span
                                className={cn(
                                  "text-xs",
                                  isRecruiter
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                )}
                              >
                                {formatTime(message.sentAt)}
                              </span>
                              {message.readAt && (
                                <span className="text-xs text-muted-foreground">
                                  • Lida
                                </span>
                              )}
                              {isRecruiter && (
                                <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                              )}
                            </div>
                          </div>

                          {/* Hover Actions */}
                          <div
                            className={cn(
                              "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity",
                              isRecruiter ? "-left-8" : "left-[calc(100%+8px)]"
                            )}
                          >
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setReplyingTo(message)}
                              >
                                <Reply className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleCopyMessage(message)}
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            <AnimatePresence>
              {typingIndicator && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className={
                        typingIndicator.senderType === "AI"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted"
                      }
                    >
                      {typingIndicator.senderType === "AI" ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex items-center gap-1">
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 bg-muted-foreground rounded-full"
                      />
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 bg-muted-foreground rounded-full"
                      />
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 bg-muted-foreground rounded-full"
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {typingIndicator.senderName || "Digitando..."}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* Reply Bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-muted/30 px-4 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <Reply className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">
                  Respondendo a {replyingTo.senderName || "mensagem"}:{" "}
                  <span className="text-foreground">
                    {replyingTo.content.substring(0, 60)}
                    {replyingTo.content.length > 60 ? "..." : ""}
                  </span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => setReplyingTo(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Suggestions */}
      <AnimatePresence>
        {showAiSuggestions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-3 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              <span className="text-xs text-muted-foreground w-full mb-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Sugestões baseadas no estágio ({currentStage || "geral"}):
              </span>
              {aiSuggestions.map((suggestion) => (
                <Button
                  key={suggestion.label}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewMessage(suggestion.text);
                    setShowAiSuggestions(false);
                    inputRef.current?.focus();
                  }}
                  className="text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {suggestion.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Reply Templates */}
      <AnimatePresence>
        {showQuickReplies && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-3 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              <span className="text-xs text-muted-foreground w-full mb-1">
                Respostas rápidas:
              </span>
              {QUICK_REPLIES.map((qr) => (
                <Button
                  key={qr.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage(qr.text)}
                  className="text-xs"
                >
                  <span className="mr-1">{qr.icon}</span>
                  {qr.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-background">
        <div className="flex items-end gap-2">
          {/* Left Actions */}
          <div className="flex items-center gap-0.5">
            {/* AI Suggestions Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setShowAiSuggestions(!showAiSuggestions);
                      setShowQuickReplies(false);
                      setShowEmojiPicker(false);
                    }}
                  >
                    <Sparkles className={cn("h-4 w-4", showAiSuggestions && "text-primary")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sugestões IA</TooltipContent>
              </Tooltip>

              {/* Quick Replies Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setShowQuickReplies(!showQuickReplies);
                      setShowAiSuggestions(false);
                      setShowEmojiPicker(false);
                    }}
                  >
                    <MessageSquare className={cn("h-4 w-4", showQuickReplies && "text-primary")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Respostas rápidas</TooltipContent>
              </Tooltip>

              {/* Emoji Picker */}
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowAiSuggestions(false);
                      setShowQuickReplies(false);
                    }}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <div className="p-2 space-y-2">
                    {EMOJI_CATEGORIES.map((category) => (
                      <div key={category.name}>
                        <p className="text-xs font-medium text-muted-foreground mb-1 px-1">
                          {category.name}
                        </p>
                        <div className="grid grid-cols-10 gap-0.5">
                          {category.emojis.map((emoji) => (
                            <button
                              key={emoji}
                              className="h-8 w-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-colors"
                              onClick={() => handleInsertEmoji(emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* File Upload */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Anexar arquivo</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.csv"
            />
          </div>

          {/* Message Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                conversation.aiMode
                  ? "Mensagem (IA ativa, pressione Shift+Enter para nova linha)..."
                  : "Digite sua mensagem..."
              }
              className="min-h-[40px] max-h-[120px] resize-none pr-10"
              disabled={isSending}
              rows={1}
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={() => handleSendMessage()}
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="h-8 w-8"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Connection Status Bar */}
        {!socketConnected && (
          <div className="flex items-center justify-center mt-2">
            <div className="flex items-center gap-1 text-xs text-yellow-600">
              <WifiOff className="h-3 w-3" />
              <span>Offline — mensagens serão enviadas ao reconectar</span>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
        >
          <div
            className="absolute bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-left"
              onClick={() => {
                setReplyingTo(contextMenu.message);
                setContextMenu(null);
              }}
            >
              <Reply className="h-4 w-4" />
              Responder
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-left"
              onClick={() => handleCopyMessage(contextMenu.message)}
            >
              <Copy className="h-4 w-4" />
              Copiar texto
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-left"
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.message.content);
                toast.success("Mensagem copiada");
                setContextMenu(null);
              }}
            >
              <Pin className="h-4 w-4" />
              Fixar mensagem
            </button>
          </div>
        </div>
      )}

      {/* Resume Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Currículo — {conversation.candidate?.name}
            </DialogTitle>
            <DialogDescription>
              Resumo do currículo do candidato
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {isLoadingResume ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                {resumeText}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Dialog */}
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Ligar para candidato</DialogTitle>
            <DialogDescription>
              {conversation.candidate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Avatar className="h-20 w-20 mx-auto">
              <AvatarImage src={conversation.candidate?.photo || undefined} />
              <AvatarFallback className="text-xl">
                {getInitials(conversation.candidate?.name || "C")}
              </AvatarFallback>
            </Avatar>
            <p className="text-2xl font-mono font-medium">
              {conversation.candidate?.phone}
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" className="w-full" onClick={() => {
                window.open(`tel:${conversation.candidate?.phone}`, "_self");
                setShowCallDialog(false);
              }}>
                <Phone className="h-5 w-5 mr-2" />
                Ligar agora
              </Button>
              <Button size="lg" variant="outline" onClick={() => {
                navigator.clipboard.writeText(conversation.candidate?.phone || "");
                toast.success("Número copiado");
                setShowCallDialog(false);
              }}>
                <Copy className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Call Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Videochamada</DialogTitle>
            <DialogDescription>
              {conversation.candidate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Avatar className="h-20 w-20 mx-auto">
              <AvatarImage src={conversation.candidate?.photo || undefined} />
              <AvatarFallback className="text-xl">
                {getInitials(conversation.candidate?.name || "C")}
              </AvatarFallback>
            </Avatar>
            <p className="text-muted-foreground">
              {conversation.candidate?.email}
            </p>
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  // Create Google Meet link and copy
                  const meetLink = `https://meet.google.com/new`;
                  window.open(meetLink, "_blank");
                  handleSendMessage(`🎥 Videochamada iniciada: ${meetLink}`);
                  setShowVideoDialog(false);
                }}
              >
                <Video className="h-5 w-5 mr-2" />
                Iniciar Meet
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => setShowVideoDialog(false)}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
