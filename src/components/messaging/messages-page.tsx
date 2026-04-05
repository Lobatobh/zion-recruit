/**
 * Messages Page Component - Zion Recruit
 * Unified messaging module: Conversas, Campanhas IA, Automações
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Settings,
  MessageCircle,
  Bot,
  AlertCircle,
  WifiOff,
  Wifi,
  RefreshCw,
  Megaphone,
  Send,
  Users,
  BarChart3,
  Zap,
  Mail,
  MessageSquare,
  Sparkles,
  Clock,
  TrendingUp,
  Target,
  MousePointerClick,
  ToggleLeft,
  ToggleRight,
  Globe,
  Smartphone,
  AtSign,
  ChevronRight,
  Play,
  Pause,
  Square,
  Eye,
  Trash2,
  Copy,
  MoreVertical,
  ArrowUpDown,
} from "lucide-react";
import { useMessagingStore } from "@/stores/messaging-store";
import { useSession } from "next-auth/react";
import { ConversationsList } from "./conversations-list";
import { ChatView } from "./chat-view";
import { ComposeMessageDialog } from "./compose-message-dialog";
import { useMessagingSocket } from "@/hooks/use-messaging-socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConversationWithDetails } from "@/types/messaging";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

type TabType = "conversations" | "campaigns" | "automations";

interface Campaign {
  id: string;
  name: string;
  status: "active" | "paused" | "draft" | "completed";
  sent: number;
  replied: number;
  interested: number;
  source: "LinkedIn" | "Email" | "WhatsApp" | "Multi-canal";
  jobTitle: string;
  startedAt: string;
  aiConfig: {
    tone: "formal" | "friendly" | "casual";
    language: "pt-BR" | "en" | "es";
    autoSchedule: boolean;
  };
}

// ============================================
// MOCK DATA
// ============================================

const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Senior Dev Python",
    status: "active",
    sent: 45,
    replied: 12,
    interested: 5,
    source: "LinkedIn",
    jobTitle: "Desenvolvedor Python Sênior",
    startedAt: "2025-01-10",
    aiConfig: { tone: "friendly", language: "pt-BR", autoSchedule: true },
  },
  {
    id: "2",
    name: "Product Manager",
    status: "active",
    sent: 30,
    replied: 8,
    interested: 3,
    source: "Email",
    jobTitle: "Product Manager",
    startedAt: "2025-01-08",
    aiConfig: { tone: "formal", language: "pt-BR", autoSchedule: false },
  },
  {
    id: "3",
    name: "UX Designer",
    status: "paused",
    sent: 20,
    replied: 4,
    interested: 1,
    source: "LinkedIn",
    jobTitle: "UX/UI Designer",
    startedAt: "2025-01-05",
    aiConfig: { tone: "casual", language: "pt-BR", autoSchedule: true },
  },
  {
    id: "4",
    name: "DevOps Engineer",
    status: "draft",
    sent: 0,
    replied: 0,
    interested: 0,
    source: "Multi-canal",
    jobTitle: "DevOps Engineer",
    startedAt: "",
    aiConfig: { tone: "friendly", language: "pt-BR", autoSchedule: false },
  },
  {
    id: "5",
    name: "QA Automation",
    status: "completed",
    sent: 50,
    replied: 18,
    interested: 8,
    source: "WhatsApp",
    jobTitle: "QA Automation Engineer",
    startedAt: "2024-12-20",
    aiConfig: { tone: "friendly", language: "pt-BR", autoSchedule: true },
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Ativa", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  paused: { label: "Pausada", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  draft: { label: "Rascunho", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400" },
  completed: { label: "Concluída", className: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
};

const toneLabels: Record<string, string> = {
  formal: "Formal",
  friendly: "Amigável",
  casual: "Casual",
};

// ============================================
// CONVERSATIONS TAB CONTENT
// ============================================

function ConversationsTab({
  unreadCount,
  needsInterventionCount,
  wsConnected,
  onOpenCompose,
}: {
  unreadCount: number;
  needsInterventionCount: number;
  wsConnected: boolean;
  onOpenCompose: () => void;
}) {
  const { conversations, fetchConversations } = useMessagingStore();
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithDetails | null>(null);
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);

  const handleSelectConversation = (conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation);
    setIsMobileListOpen(false);
  };

  const handleBackToList = () => {
    setIsMobileListOpen(true);
    setSelectedConversation(null);
  };

  const handleConversationCreated = () => {
    fetchConversations();
  };

  return (
    <div className="flex h-[calc(100vh-10rem)]">
      {/* Desktop Layout */}
      <div className="hidden md:flex w-full">
        {/* Conversations List */}
        <div className="w-[350px] flex-shrink-0 flex flex-col">
          {/* List Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Conversas</h2>
              <Badge variant="secondary" className="text-xs">
                {conversations.length}
              </Badge>
              {unreadCount > 0 && (
                <Badge className="text-xs">{unreadCount}</Badge>
              )}
              {needsInterventionCount > 0 && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {needsInterventionCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Connection indicator */}
              <div
                className={cn(
                  "flex items-center gap-1 mr-2 text-xs px-2 py-1 rounded-full",
                  wsConnected
                    ? "text-green-600 bg-green-50 dark:bg-green-950/30"
                    : "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30"
                )}
              >
                {wsConnected ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {wsConnected ? "Online" : "Offline"}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fetchConversations()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                className="h-8 w-8"
                onClick={onOpenCompose}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ConversationsList
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversation?.id}
          />
        </div>

        {/* Chat View */}
        <div className="flex-1">
          <ChatView conversation={selectedConversation} />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full relative">
        <AnimatePresence mode="wait">
          {isMobileListOpen ? (
            <motion.div
              key="list"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute inset-0 w-full"
            >
              <ConversationsList
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversation?.id}
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute inset-0 w-full"
            >
              <ChatView
                conversation={selectedConversation}
                onBack={handleBackToList}
                isMobile
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile FAB for new conversation */}
        {isMobileListOpen && (
          <Button
            className="fixed bottom-20 right-4 h-12 w-12 rounded-full shadow-lg z-10"
            onClick={onOpenCompose}
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Compose Dialog */}
      <ComposeMessageDialog
        open={false}
        onOpenChange={onOpenCompose}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}

// ============================================
// CAMPAIGNS TAB CONTENT
// ============================================

function CampaignsTab() {
  const [campaigns] = useState<Campaign[]>(mockCampaigns);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredCampaigns = filterStatus === "all"
    ? campaigns
    : campaigns.filter((c) => c.status === filterStatus);

  const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0);
  const totalReplied = campaigns.reduce((sum, c) => sum + c.replied, 0);
  const totalInterested = campaigns.reduce((sum, c) => sum + c.interested, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

  const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "0";
  const interestRate = totalReplied > 0 ? ((totalInterested / totalReplied) * 100).toFixed(1) : "0";

  const handleToggleCampaign = (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;
    if (campaign.status === "active") {
      toast.success(`Campanha "${campaign.name}" pausada`);
    } else if (campaign.status === "paused") {
      toast.success(`Campanha "${campaign.name}" reativada`);
    }
  };

  const handleDuplicateCampaign = (campaign: Campaign) => {
    toast.success(`Campanha "${campaign.name}" duplicada`);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Campanhas Ativas",
            value: activeCampaigns,
            total: campaigns.length,
            icon: Megaphone,
            color: "text-violet-600",
            bgColor: "bg-violet-500/10",
          },
          {
            label: "Mensagens Enviadas",
            value: totalSent,
            icon: Send,
            color: "text-purple-600",
            bgColor: "bg-purple-500/10",
          },
          {
            label: "Taxa de Resposta",
            value: `${replyRate}%`,
            icon: TrendingUp,
            color: "text-fuchsia-600",
            bgColor: "bg-fuchsia-500/10",
          },
          {
            label: "Interessados",
            value: totalInterested,
            icon: Users,
            color: "text-emerald-600",
            bgColor: "bg-emerald-500/10",
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign Actions & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="paused">Pausadas</SelectItem>
              <SelectItem value="draft">Rascunhos</SelectItem>
              <SelectItem value="completed">Concluídas</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {filteredCampaigns.length} campanha(s)
          </Badge>
        </div>
        <Button className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:opacity-90 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-3">
        {filteredCampaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma campanha encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie uma nova campanha para começar o outreach
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCampaigns.map((campaign, idx) => {
            const status = statusConfig[campaign.status];
            const campaignReplyRate = campaign.sent > 0
              ? ((campaign.replied / campaign.sent) * 100).toFixed(0)
              : "0";
            const campaignInterestRate = campaign.replied > 0
              ? ((campaign.interested / campaign.replied) * 100).toFixed(0)
              : "0";

            return (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card
                  className={cn(
                    "transition-all hover:shadow-md cursor-pointer",
                    selectedCampaign?.id === campaign.id && "ring-2 ring-violet-500/50"
                  )}
                  onClick={() => setSelectedCampaign(
                    selectedCampaign?.id === campaign.id ? null : campaign
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 shrink-0">
                        <Bot className="h-5 w-5 text-violet-600" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{campaign.name}</h3>
                            <Badge variant="secondary" className={status.className}>
                              {status.label}
                            </Badge>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info("Abrindo detalhes..."); }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateCampaign(campaign); }}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleToggleCampaign(campaign.id); }}
                              >
                                {campaign.status === "active" ? (
                                  <><Pause className="h-4 w-4 mr-2" /> Pausar</>
                                ) : campaign.status === "paused" ? (
                                  <><Play className="h-4 w-4 mr-2" /> Reativar</>
                                ) : (
                                  <><Play className="h-4 w-4 mr-2" /> Iniciar</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); toast.success("Campanha removida"); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <p className="text-xs text-muted-foreground mt-0.5">
                          {campaign.jobTitle} · {campaign.source}
                        </p>

                        {/* Metrics Row */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            <span>{campaign.sent} enviadas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{campaign.replied} respostas ({campaignReplyRate}%)</span>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-600">
                            <Target className="h-3 w-3" />
                            <span className="font-medium">{campaign.interested} interessados</span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {campaign.sent > 0 && (
                          <div className="mt-3">
                            <Progress
                              value={Number(campaignReplyRate)}
                              className="h-1.5"
                            />
                          </div>
                        )}

                        {/* AI Config Tags */}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            Tom: {toneLabels[campaign.aiConfig.tone]}
                          </Badge>
                          {campaign.aiConfig.autoSchedule && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              Auto-agendamento
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {selectedCampaign?.id === campaign.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <Separator className="my-3" />
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="font-medium text-muted-foreground mb-1">Conversão</p>
                              <p className="text-lg font-bold text-emerald-600">{campaignInterestRate}%</p>
                              <p className="text-muted-foreground">resposta → interessado</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="font-medium text-muted-foreground mb-1">Taxa de Resposta</p>
                              <p className="text-lg font-bold text-purple-600">{campaignReplyRate}%</p>
                              <p className="text-muted-foreground">enviadas → respostas</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="font-medium text-muted-foreground mb-1">Início</p>
                              <p className="text-lg font-bold">
                                {campaign.startedAt
                                  ? new Date(campaign.startedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                                  : "—"}
                              </p>
                              <p className="text-muted-foreground">{campaign.source}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================
// AUTOMATIONS TAB CONTENT
// ============================================

function AutomationsTab() {
  const [automations, setAutomations] = useState([
    {
      id: "whatsapp-bot",
      name: "Bot WhatsApp",
      description: "Respostas automáticas via WhatsApp Evolution API",
      icon: MessageSquare,
      enabled: true,
      channel: "WhatsApp",
      config: { instanceName: "Zion Recruit", autoReply: true, greetingEnabled: true },
    },
    {
      id: "email-sequences",
      name: "Sequências de Email",
      description: "Campanhas de email automatizadas com follow-ups",
      icon: Mail,
      enabled: true,
      channel: "Email",
      config: { provider: "SMTP", dailyLimit: 100, followUps: 3 },
    },
    {
      id: "ai-screening",
      name: "Triagem IA",
      description: "Qualificação automática de candidatos com IA",
      icon: Sparkles,
      enabled: true,
      channel: "Todos",
      config: { stages: 6, autoHandoff: true, minConfidence: 0.7 },
    },
    {
      id: "auto-schedule",
      name: "Agendamento Automático",
      description: "Agenda entrevistas automaticamente após qualificação",
      icon: Clock,
      enabled: false,
      channel: "Todos",
      config: { calendarIntegration: "Google", bufferMinutes: 30, maxPerDay: 5 },
    },
    {
      id: "lead-nurturing",
      name: "Nutrição de Leads",
      description: "Mantém candidatos engajados com mensagens periódicas",
      icon: Target,
      enabled: false,
      channel: "Multi-canal",
      config: { frequency: "weekly", maxTouchpoints: 5 },
    },
  ]);

  const handleToggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      )
    );
    const auto = automations.find((a) => a.id === id);
    toast.success(
      `${auto?.name} ${auto?.enabled ? "desativado" : "ativado"} com sucesso`
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Automações de Comunicação</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure como a IA se comunica com seus candidatos automaticamente
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Zap className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{automations.filter((a) => a.enabled).length}</p>
              <p className="text-xs text-muted-foreground">Automações ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Bot className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">Canais conectados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-500/10">
              <MousePointerClick className="h-5 w-5 text-fuchsia-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">127</p>
              <p className="text-xs text-muted-foreground">Ações esta semana</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automations List */}
      <div className="space-y-3">
        {automations.map((automation, idx) => (
          <motion.div
            key={automation.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className={cn("transition-all", !automation.enabled && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                    automation.enabled
                      ? "bg-gradient-to-br from-violet-500/10 to-purple-500/10"
                      : "bg-muted"
                  )}>
                    <automation.icon className={cn(
                      "h-5 w-5",
                      automation.enabled ? "text-violet-600" : "text-muted-foreground"
                    )} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm">{automation.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {automation.channel}
                        </Badge>
                        <Switch
                          checked={automation.enabled}
                          onCheckedChange={() => handleToggleAutomation(automation.id)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {automation.description}
                    </p>

                    {/* Config Tags */}
                    <div className="flex items-center gap-2 mt-2">
                      {automation.id === "whatsapp-bot" && (
                        <>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Smartphone className="h-2.5 w-2.5" />
                            Evolution API
                          </Badge>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <MessageCircle className="h-2.5 w-2.5" />
                            Auto-resposta
                          </Badge>
                        </>
                      )}
                      {automation.id === "email-sequences" && (
                        <>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Mail className="h-2.5 w-2.5" />
                            100 emails/dia
                          </Badge>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <ArrowUpDown className="h-2.5 w-2.5" />
                            3 follow-ups
                          </Badge>
                        </>
                      )}
                      {automation.id === "ai-screening" && (
                        <>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            6 etapas
                          </Badge>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Bot className="h-2.5 w-2.5" />
                            Auto-handoff
                          </Badge>
                        </>
                      )}
                      {automation.id === "auto-schedule" && (
                        <>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Globe className="h-2.5 w-2.5" />
                            Google Calendar
                          </Badge>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            5 entrevistas/dia
                          </Badge>
                        </>
                      )}
                      {automation.id === "lead-nurturing" && (
                        <>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <AtSign className="h-2.5 w-2.5" />
                            Semanal
                          </Badge>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Target className="h-2.5 w-2.5" />
                            5 touchpoints
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Configure Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => toast.info(`Configurando ${automation.name}...`)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configurar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* AI Tone Configuration */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10">
              <Sparkles className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-base">Personalidade da IA</CardTitle>
              <CardDescription>Configure como a IA se comunica com candidatos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tom de Comunicação</Label>
              <Select defaultValue="friendly">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal - Profissional e direto</SelectItem>
                  <SelectItem value="friendly">Amigável - Próximo e acolhedor</SelectItem>
                  <SelectItem value="casual">Casual - Informal e descontraído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Idioma Padrão</Label>
              <Select defaultValue="pt-BR">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Instruções Adicionais para a IA</Label>
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                Ex: &quot;Sempre perguntar sobre disponibilidade de início. Usar saudações com nome do candidato. Oferecer horários de entrevista pela manhã e tarde.&quot;
              </p>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:opacity-90 text-white">
            <Sparkles className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MessagesPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("conversations");
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Store stats
  const { conversations, fetchConversations, socketConnected } = useMessagingStore();
  const unreadCount = conversations.filter((c) => c.unreadCount > 0).length;
  const needsInterventionCount = conversations.filter((c) => c.needsIntervention).length;
  const activeCampaignsCount = mockCampaigns.filter((c) => c.status === "active").length;

  // Initialize WebSocket connection
  const { socketConnected: wsConnected } = useMessagingSocket({
    tenantId: session?.user?.tenantId || "demo",
    userId: session?.user?.id || "demo-user",
    userName: session?.user?.name || "Recrutador",
    enabled: !!session,
  });

  const tabItems: { value: TabType; label: string; icon: React.ElementType; badge?: number | string }[] = [
    {
      value: "conversations",
      label: "Conversas",
      icon: MessageCircle,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      value: "campaigns",
      label: "Campanhas IA",
      icon: Megaphone,
      badge: activeCampaignsCount > 0 ? activeCampaignsCount : undefined,
    },
    {
      value: "automations",
      label: "Automações",
      icon: Zap,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-5 text-white rounded-b-2xl shadow-lg shadow-violet-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Mensagens</h1>
              <p className="text-white/80 text-sm">
                Comunicação centralizada com candidatos via WhatsApp, Email e IA
              </p>
            </div>
          </div>

          {/* Quick Stats in Header */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-white/90">
                <Bot className="h-4 w-4" />
                <span>{activeCampaignsCount} campanhas</span>
              </div>
              <div className="w-px h-4 bg-white/30" />
              <div className="flex items-center gap-1.5 text-white/90">
                <MessageSquare className="h-4 w-4" />
                <span>{conversations.length} conversas</span>
              </div>
              {unreadCount > 0 && (
                <>
                  <div className="w-px h-4 bg-white/30" />
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-white text-violet-700 hover:bg-white/90 text-xs">
                      {unreadCount} não lidas
                    </Badge>
                  </div>
                </>
              )}
            </div>
            <Button
              className="bg-white text-violet-700 hover:bg-white/90 font-medium"
              onClick={() => setIsComposeOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nova Mensagem</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-background px-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
          <TabsList className="bg-transparent p-0 h-auto border-b-0 rounded-none">
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "relative rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "hover:text-foreground text-muted-foreground",
                  activeTab === tab.value && "border-white data-[state=active]:text-foreground border-violet-500 text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.badge && (
                  <Badge
                    variant={tab.value === "conversations" && unreadCount > 0 ? "default" : "secondary"}
                    className="ml-2 text-[10px] h-5 min-w-5 px-1.5"
                  >
                    {tab.badge}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="conversations" className="m-0 mt-0">
            <ConversationsTab
              unreadCount={unreadCount}
              needsInterventionCount={needsInterventionCount}
              wsConnected={wsConnected}
              onOpenCompose={() => setIsComposeOpen(true)}
            />
          </TabsContent>

          <TabsContent value="campaigns" className="m-0 mt-0">
            <CampaignsTab />
          </TabsContent>

          <TabsContent value="automations" className="m-0 mt-0">
            <AutomationsTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Compose Dialog */}
      <ComposeMessageDialog
        open={isComposeOpen}
        onOpenChange={setIsComposeOpen}
        onConversationCreated={() => fetchConversations()}
      />
    </div>
  );
}
