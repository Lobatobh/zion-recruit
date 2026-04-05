/**
 * Messages Page Component - Zion Recruit
 * Unified messaging module: Conversas, Campanhas IA, Automações
 */

"use client";

import { useState, useEffect, useCallback } from "react";
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
  Zap,
  Mail,
  MessageSquare,
  Sparkles,
  Clock,
  TrendingUp,
  Target,
  MousePointerClick,
  Globe,
  Smartphone,
  AtSign,
  Play,
  Pause,
  Eye,
  Trash2,
  Copy,
  MoreVertical,
  ArrowUpDown,
  Loader2,
  Check,
  UserCheck,
  X,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ============================================
// TYPES
// ============================================

type TabType = "conversations" | "campaigns" | "automations";

interface CampaignData {
  id: string;
  name: string;
  description?: string;
  status: string;
  source: string;
  jobTitle?: string;
  aiTone: string;
  aiLanguage: string;
  autoSchedule: boolean;
  sent: number;
  replied: number;
  interested: number;
  totalTarget: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface AutomationData {
  id: string;
  type: string;
  name: string;
  description?: string;
  enabled: boolean;
  channel: string;
  config?: string;
  aiTone: string;
  aiLanguage: string;
  aiInstructions?: string;
  executionCount: number;
  lastRunAt?: string;
  lastError?: string;
}

interface CampaignStats {
  total: number;
  active: number;
  totalSent: number;
  totalReplied: number;
  totalInterested: number;
}

interface AutomationStats {
  activeCount: number;
  totalExecutions: number;
  channelsConnected: number;
}

// ============================================
// CONSTANTS
// ============================================

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Ativa", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  PAUSED: { label: "Pausada", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  DRAFT: { label: "Rascunho", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400" },
  COMPLETED: { label: "Concluída", className: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
  CANCELLED: { label: "Cancelada", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
};

const toneLabels: Record<string, string> = {
  formal: "Formal",
  friendly: "Amigável",
  casual: "Casual",
};

const sourceLabels: Record<string, string> = {
  LINKEDIN: "LinkedIn",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  MULTI_CHANNEL: "Multi-canal",
};

const channelLabels: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  ALL: "Todos",
  MULTI_CHANNEL: "Multi-canal",
};

const automationIconMap: Record<string, React.ElementType> = {
  WHATSAPP_BOT: MessageSquare,
  EMAIL_SEQUENCES: Mail,
  AI_SCREENING: Sparkles,
  AUTO_SCHEDULE: Clock,
  LEAD_NURTURING: Target,
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

  // Auto-contact dialog state
  const [isAutoContactOpen, setIsAutoContactOpen] = useState(false);
  const [candidates, setCandidates] = useState<Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
  }>>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isAutoContacting, setIsAutoContacting] = useState(false);

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

  const handleOpenAutoContact = async () => {
    setIsAutoContactOpen(true);
    setIsLoadingCandidates(true);
    setSelectedCandidateIds(new Set());
    try {
      const res = await fetch("/api/candidates?status=SOURCED&limit=50");
      if (res.ok) {
        const data = await res.json();
        setCandidates((data.candidates || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
        })));
      } else {
        toast.error("Falha ao carregar candidatos");
      }
    } catch {
      toast.error("Falha ao carregar candidatos");
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const handleToggleCandidate = (candidateId: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedCandidateIds.size === candidates.length) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(candidates.map((c) => c.id)));
    }
  };

  const handleAutoContact = async () => {
    if (selectedCandidateIds.size === 0) {
      toast.error("Selecione ao menos um candidato");
      return;
    }
    setIsAutoContacting(true);
    try {
      const res = await fetch("/api/messages/auto-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: Array.from(selectedCandidateIds) }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Contato IA iniciado! ${data.contacted || selectedCandidateIds.size} candidatos serão contactados.`);
      setIsAutoContactOpen(false);
      fetchConversations();
    } catch {
      toast.error("Falha ao iniciar contato IA");
    } finally {
      setIsAutoContacting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex h-[calc(100vh-10rem)]">
      {/* Desktop Layout */}
      <div className="hidden md:flex w-full">
        <div className="w-[350px] flex-shrink-0 flex flex-col">
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
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchConversations()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs px-3"
                onClick={handleOpenAutoContact}
              >
                <Bot className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Iniciar Contato IA</span>
              </Button>
              <Button size="icon" className="h-8 w-8" onClick={onOpenCompose}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ConversationsList
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversation?.id}
          />
        </div>
        <div className="flex-1">
          <ChatView conversation={selectedConversation} />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full relative">
        <AnimatePresence mode="wait">
          {isMobileListOpen ? (
            <motion.div key="list" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }} className="absolute inset-0 w-full">
              <ConversationsList onSelectConversation={handleSelectConversation} selectedConversationId={selectedConversation?.id} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }} className="absolute inset-0 w-full">
              <ChatView conversation={selectedConversation} onBack={handleBackToList} isMobile />
            </motion.div>
          )}
        </AnimatePresence>
        {isMobileListOpen && (
          <Button className="fixed bottom-20 right-4 h-12 w-12 rounded-full shadow-lg z-10" onClick={onOpenCompose}>
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      <ComposeMessageDialog open={false} onOpenChange={onOpenCompose} onConversationCreated={handleConversationCreated} />

      {/* Auto Contact Dialog */}
      <Dialog open={isAutoContactOpen} onOpenChange={setIsAutoContactOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-violet-600" />
              Iniciar Contato IA
            </DialogTitle>
            <DialogDescription>
              Selecione os candidatos que a Zoe (IA) deverá contactar automaticamente
            </DialogDescription>
          </DialogHeader>

          {isLoadingCandidates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum candidato disponível</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastre candidatos com status &quot;Sourced&quot; para iniciar
              </p>
            </div>
          ) : (
            <>
              {/* Selection header */}
              <div className="flex items-center justify-between px-1">
                <Button variant="ghost" size="sm" className="text-xs" onClick={handleSelectAll}>
                  {selectedCandidateIds.size === candidates.length ? (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Desmarcar todos
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Selecionar todos ({candidates.length})
                    </>
                  )}
                </Button>
                <Badge variant="secondary" className="text-xs">
                  {selectedCandidateIds.size} selecionado{selectedCandidateIds.size !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Candidate list */}
              <ScrollArea className="max-h-72 rounded-md border">
                <div className="p-2 space-y-1">
                  {candidates.map((candidate) => (
                    <label
                      key={candidate.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                        selectedCandidateIds.has(candidate.id)
                          ? "bg-violet-500/5 border border-violet-500/20"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={selectedCandidateIds.has(candidate.id)}
                        onCheckedChange={() => handleToggleCandidate(candidate.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-violet-500/10 text-violet-700">
                          {getInitials(candidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>

              {/* Footer actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsAutoContactOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                  onClick={handleAutoContact}
                  disabled={isAutoContacting || selectedCandidateIds.size === 0}
                >
                  {isAutoContacting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Iniciar Contato ({selectedCandidateIds.size})
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// CAMPAIGNS TAB CONTENT (REAL API)
// ============================================

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [stats, setStats] = useState<CampaignStats>({ total: 0, active: 0, totalSent: 0, totalReplied: 0, totalInterested: 0 });
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  // Form state for new campaign
  const [newName, setNewName] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newSource, setNewSource] = useState("MULTI_CHANNEL");
  const [newTone, setNewTone] = useState("friendly");
  const [newAutoSchedule, setNewAutoSchedule] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/messages/campaigns");
      if (!res.ok) throw new Error("Erro ao carregar campanhas");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setStats(data.stats || { total: 0, active: 0, totalSent: 0, totalReplied: 0, totalInterested: 0 });
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Falha ao carregar campanhas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const filteredCampaigns = filterStatus === "all"
    ? campaigns
    : campaigns.filter((c) => c.status === filterStatus);

  const replyRate = stats.totalSent > 0 ? ((stats.totalReplied / stats.totalSent) * 100).toFixed(1) : "0";

  const handleToggleCampaign = async (campaignId: string) => {
    setIsToggling(campaignId);
    try {
      const res = await fetch(`/api/messages/campaigns/${campaignId}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const campaign = data.campaign;
      const newStatus = campaign.status === "ACTIVE" ? "reativada" : "pausada";
      toast.success(`Campanha "${campaign.name}" ${newStatus}`);
      fetchCampaigns();
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign(campaign);
      }
    } catch {
      toast.error("Falha ao alterar status da campanha");
    } finally {
      setIsToggling(null);
    }
  };

  const handleDuplicateCampaign = async (campaign: CampaignData) => {
    try {
      const res = await fetch(`/api/messages/campaigns/${campaign.id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(`Campanha duplicada com sucesso`);
      fetchCampaigns();
    } catch {
      toast.error("Falha ao duplicar campanha");
    }
  };

  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    try {
      const res = await fetch(`/api/messages/campaigns/${campaignId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`Campanha "${campaignName}" removida`);
      if (selectedCampaign?.id === campaignId) setSelectedCampaign(null);
      fetchCampaigns();
    } catch {
      toast.error("Falha ao remover campanha");
    }
  };

  const handleExecuteCampaign = async (campaignId: string, campaignName: string) => {
    setIsExecuting(campaignId);
    try {
      const res = await fetch(`/api/messages/campaigns/${campaignId}/execute`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Campanha "${campaignName}" executada! ${data.contacted || 0} candidatos contactados pela IA.`);
      fetchCampaigns();
    } catch {
      toast.error("Falha ao executar campanha. Verifique se há candidatos disponíveis.");
    } finally {
      setIsExecuting(null);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newName.trim()) { toast.error("Nome é obrigatório"); return; }
    setIsCreating(true);
    try {
      const res = await fetch("/api/messages/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, jobTitle: newJobTitle || undefined, source: newSource, aiTone: newTone, autoSchedule: newAutoSchedule }),
      });
      if (!res.ok) throw new Error();
      toast.success("Campanha criada com sucesso");
      setNewName(""); setNewJobTitle(""); setNewSource("MULTI_CHANNEL"); setNewTone("friendly"); setNewAutoSchedule(false);
      setIsCreateOpen(false);
      fetchCampaigns();
    } catch {
      toast.error("Falha ao criar campanha");
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Campanhas Ativas", value: stats.active, icon: Megaphone, color: "text-violet-600", bgColor: "bg-violet-500/10" },
          { label: "Mensagens Enviadas", value: stats.totalSent, icon: Send, color: "text-purple-600", bgColor: "bg-purple-500/10" },
          { label: "Taxa de Resposta", value: `${replyRate}%`, icon: TrendingUp, color: "text-fuchsia-600", bgColor: "bg-fuchsia-500/10" },
          { label: "Interessados", value: stats.totalInterested, icon: Users, color: "text-emerald-600", bgColor: "bg-emerald-500/10" },
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

      {/* Actions & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="ACTIVE">Ativas</SelectItem>
              <SelectItem value="PAUSED">Pausadas</SelectItem>
              <SelectItem value="DRAFT">Rascunhos</SelectItem>
              <SelectItem value="COMPLETED">Concluídas</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">{filteredCampaigns.length} campanha(s)</Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchCampaigns}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Button className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:opacity-90 text-white"
          onClick={() => setIsCreateOpen(true)}>
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
              <p className="text-sm text-muted-foreground mt-1">Crie uma nova campanha para começar o outreach</p>
            </CardContent>
          </Card>
        ) : (
          filteredCampaigns.map((campaign, idx) => {
            const status = statusConfig[campaign.status] || statusConfig.DRAFT;
            const cReplyRate = campaign.sent > 0 ? ((campaign.replied / campaign.sent) * 100).toFixed(0) : "0";
            const cInterestRate = campaign.replied > 0 ? ((campaign.interested / campaign.replied) * 100).toFixed(0) : "0";
            const isTogglingThis = isToggling === campaign.id;

            return (
              <motion.div key={campaign.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                <Card className={cn("transition-all hover:shadow-md cursor-pointer", selectedCampaign?.id === campaign.id && "ring-2 ring-violet-500/50")}
                  onClick={() => setSelectedCampaign(selectedCampaign?.id === campaign.id ? null : campaign)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 shrink-0">
                        {isTogglingThis ? <Loader2 className="h-5 w-5 text-violet-600 animate-spin" /> : <Bot className="h-5 w-5 text-violet-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{campaign.name}</h3>
                            <Badge variant="secondary" className={status.className}>{status.label}</Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateCampaign(campaign); }}>
                                <Copy className="h-4 w-4 mr-2" /> Duplicar
                              </DropdownMenuItem>
                              {(campaign.status === "DRAFT" || campaign.status === "PAUSED") && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExecuteCampaign(campaign.id, campaign.name); }}>
                                  {isExecuting === campaign.id ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Executando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Executar Campanha</>}
                                </DropdownMenuItem>
                              )}
                              {(campaign.status === "ACTIVE" || campaign.status === "PAUSED" || campaign.status === "DRAFT") && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleCampaign(campaign.id); }}>
                                  {campaign.status === "ACTIVE" ? <><Pause className="h-4 w-4 mr-2" /> Pausar</> : <><Play className="h-4 w-4 mr-2" /> Iniciar</>}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(campaign.id, campaign.name); }}>
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {campaign.jobTitle || "Sem vaga vinculada"} · {sourceLabels[campaign.source] || campaign.source}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1"><Send className="h-3 w-3" /><span>{campaign.sent} enviadas</span></div>
                          <div className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /><span>{campaign.replied} respostas ({cReplyRate}%)</span></div>
                          <div className="flex items-center gap-1 text-emerald-600"><Target className="h-3 w-3" /><span className="font-medium">{campaign.interested} interessados</span></div>
                        </div>
                        {campaign.sent > 0 && <div className="mt-3"><Progress value={Number(cReplyRate)} className="h-1.5" /></div>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            {toneLabels[campaign.aiTone] || campaign.aiTone}
                          </Badge>
                          {campaign.autoSchedule && (
                            <Badge variant="outline" className="text-[10px] gap-1"><Clock className="h-2.5 w-2.5" /> Auto-agendamento</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <AnimatePresence>
                      {selectedCampaign?.id === campaign.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <Separator className="my-3" />
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="font-medium text-muted-foreground mb-1">Conversão</p>
                              <p className="text-lg font-bold text-emerald-600">{cInterestRate}%</p>
                              <p className="text-muted-foreground">resposta → interessado</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="font-medium text-muted-foreground mb-1">Taxa de Resposta</p>
                              <p className="text-lg font-bold text-purple-600">{cReplyRate}%</p>
                              <p className="text-muted-foreground">enviadas → respostas</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="font-medium text-muted-foreground mb-1">Início</p>
                              <p className="text-lg font-bold">
                                {campaign.startedAt ? new Date(campaign.startedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
                              </p>
                              <p className="text-muted-foreground">{sourceLabels[campaign.source] || campaign.source}</p>
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

      {/* Create Campaign Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Campanha IA</DialogTitle>
            <DialogDescription>Crie uma campanha de outreach com inteligência artificial</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nome da Campanha *</Label>
              <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Ex: Senior Dev Python" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Vaga (título)</Label>
              <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Ex: Desenvolvedor Python Sênior" value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Canal</Label>
                <Select value={newSource} onValueChange={setNewSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="MULTI_CHANNEL">Multi-canal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tom da IA</Label>
                <Select value={newTone} onValueChange={setNewTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="friendly">Amigável</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-agendamento</Label>
                <p className="text-xs text-muted-foreground">Agendar entrevistas automaticamente</p>
              </div>
              <Switch checked={newAutoSchedule} onCheckedChange={setNewAutoSchedule} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:opacity-90 text-white" onClick={handleCreateCampaign} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Campanha
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// AUTOMATIONS TAB CONTENT (REAL API)
// ============================================

function AutomationsTab() {
  const [automations, setAutomations] = useState<AutomationData[]>([]);
  const [autoStats, setAutoStats] = useState<AutomationStats>({ activeCount: 0, totalExecutions: 0, channelsConnected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  // AI Personality config
  const [aiTone, setAiTone] = useState("friendly");
  const [aiLanguage, setAiLanguage] = useState("pt-BR");
  const [aiInstructions, setAiInstructions] = useState("");
  const [isSavingAiConfig, setIsSavingAiConfig] = useState(false);

  const fetchAutomations = useCallback(async () => {
    try {
      setIsLoading(true);
      // Seed defaults if none exist
      await fetch("/api/messages/automations/seed", { method: "POST" });

      const res = await fetch("/api/messages/automations");
      if (!res.ok) throw new Error("Erro ao carregar automações");
      const data = await res.json();
      setAutomations(data.automations || []);
      setAutoStats(data.stats || { activeCount: 0, totalExecutions: 0, channelsConnected: 0 });

      // Load AI config from first automation
      if (data.automations?.length > 0) {
        setAiTone(data.automations[0].aiTone || "friendly");
        setAiLanguage(data.automations[0].aiLanguage || "pt-BR");
        setAiInstructions(data.automations[0].aiInstructions || "");
      }
    } catch (error) {
      console.error("Error fetching automations:", error);
      toast.error("Falha ao carregar automações");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAutomations(); }, [fetchAutomations]);

  const handleToggleAutomation = async (id: string) => {
    setIsToggling(id);
    try {
      const res = await fetch(`/api/messages/automations/${id}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const automation = data.automation;
      toast.success(`${automation.name} ${automation.enabled ? "ativada" : "desativada"} com sucesso`);
      fetchAutomations();
    } catch {
      toast.error("Falha ao alterar automação");
    } finally {
      setIsToggling(null);
    }
  };

  const handleSaveAiConfig = async () => {
    setIsSavingAiConfig(true);
    try {
      // Update all automations with the new AI config
      await Promise.all(
        automations.map((a) =>
          fetch(`/api/messages/automations/${a.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiTone, aiLanguage, aiInstructions: aiInstructions || null }),
          })
        )
      );
      toast.success("Configurações de IA salvas com sucesso");
    } catch {
      toast.error("Falha ao salvar configurações de IA");
    } finally {
      setIsSavingAiConfig(false);
    }
  };

  const getAutomationConfigTags = (automation: AutomationData) => {
    let config: Record<string, unknown> = {};
    try { config = automation.config ? JSON.parse(automation.config) : {}; } catch { /* ignore */ }

    switch (automation.type) {
      case "WHATSAPP_BOT":
        return (
          <>
            <Badge variant="outline" className="text-[10px] gap-1"><Smartphone className="h-2.5 w-2.5" /> Evolution API</Badge>
            {config.autoReply && <Badge variant="outline" className="text-[10px] gap-1"><MessageCircle className="h-2.5 w-2.5" /> Auto-resposta</Badge>}
          </>
        );
      case "EMAIL_SEQUENCES":
        return (
          <>
            <Badge variant="outline" className="text-[10px] gap-1"><Mail className="h-2.5 w-2.5" /> {config.dailyLimit || 100} emails/dia</Badge>
            <Badge variant="outline" className="text-[10px] gap-1"><ArrowUpDown className="h-2.5 w-2.5" /> {config.followUps || 3} follow-ups</Badge>
          </>
        );
      case "AI_SCREENING":
        return (
          <>
            <Badge variant="outline" className="text-[10px] gap-1"><Sparkles className="h-2.5 w-2.5" /> {config.stages || 6} etapas</Badge>
            {config.autoHandoff && <Badge variant="outline" className="text-[10px] gap-1"><Bot className="h-2.5 w-2.5" /> Auto-handoff</Badge>}
          </>
        );
      case "AUTO_SCHEDULE":
        return (
          <>
            <Badge variant="outline" className="text-[10px] gap-1"><Globe className="h-2.5 w-2.5" /> {config.calendarIntegration || "Google"} Calendar</Badge>
            <Badge variant="outline" className="text-[10px] gap-1"><Clock className="h-2.5 w-2.5" /> {config.maxPerDay || 5} entrevistas/dia</Badge>
          </>
        );
      case "LEAD_NURTURING":
        return (
          <>
            <Badge variant="outline" className="text-[10px] gap-1"><AtSign className="h-2.5 w-2.5" /> {config.frequency === "daily" ? "Diário" : config.frequency === "weekly" ? "Semanal" : "Mensal"}</Badge>
            <Badge variant="outline" className="text-[10px] gap-1"><Target className="h-2.5 w-2.5" /> {config.maxTouchpoints || 5} touchpoints</Badge>
          </>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Automações de Comunicação</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure como a IA se comunica com seus candidatos automaticamente</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchAutomations}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Zap className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{autoStats.activeCount}</p>
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
              <p className="text-2xl font-bold">{autoStats.channelsConnected}</p>
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
              <p className="text-2xl font-bold">{autoStats.totalExecutions}</p>
              <p className="text-xs text-muted-foreground">Total de execuções</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automations List */}
      <div className="space-y-3">
        {automations.map((automation, idx) => {
          const Icon = automationIconMap[automation.type] || Bot;
          const isTogglingThis = isToggling === automation.id;

          return (
            <motion.div key={automation.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
              <Card className={cn("transition-all", !automation.enabled && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                      automation.enabled ? "bg-gradient-to-br from-violet-500/10 to-purple-500/10" : "bg-muted")}>
                      {isTogglingThis ? <Loader2 className="h-5 w-5 text-violet-600 animate-spin" /> :
                        <Icon className={cn("h-5 w-5", automation.enabled ? "text-violet-600" : "text-muted-foreground")} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm">{automation.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {channelLabels[automation.channel] || automation.channel}
                          </Badge>
                          {automation.lastError && (
                            <Badge variant="destructive" className="text-[10px]">Erro</Badge>
                          )}
                          <Switch
                            checked={automation.enabled}
                            onCheckedChange={() => handleToggleAutomation(automation.id)}
                            disabled={isTogglingThis}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{automation.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {getAutomationConfigTags(automation)}
                        {automation.executionCount > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <MousePointerClick className="h-2.5 w-2.5" />
                            {automation.executionCount} execuções
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
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
              <Select value={aiTone} onValueChange={setAiTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal - Profissional e direto</SelectItem>
                  <SelectItem value="friendly">Amigável - Próximo e acolhedor</SelectItem>
                  <SelectItem value="casual">Casual - Informal e descontraído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Idioma Padrão</Label>
              <Select value={aiLanguage} onValueChange={setAiLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Textarea
              placeholder='Ex: "Sempre perguntar sobre disponibilidade de início. Usar saudações com nome do candidato. Oferecer horários de entrevista pela manhã e tarde."'
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </div>
          <Button className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:opacity-90 text-white"
            onClick={handleSaveAiConfig} disabled={isSavingAiConfig}>
            {isSavingAiConfig ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
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
  const [activeCampaignsCount, setActiveCampaignsCount] = useState(0);

  const { conversations, fetchConversations, socketConnected } = useMessagingStore();
  const unreadCount = conversations.filter((c) => c.unreadCount > 0).length;
  const needsInterventionCount = conversations.filter((c) => c.needsIntervention).length;

  // Initialize WebSocket connection
  const { socketConnected: wsConnected } = useMessagingSocket({
    tenantId: session?.user?.tenantId || "demo",
    userId: session?.user?.id || "demo-user",
    userName: session?.user?.name || "Recrutador",
    enabled: !!session,
  });

  const tabItems: { value: TabType; label: string; icon: React.ElementType; badge?: number | string }[] = [
    { value: "conversations", label: "Conversas", icon: MessageCircle, badge: unreadCount > 0 ? unreadCount : undefined },
    { value: "campaigns", label: "Campanhas IA", icon: Megaphone, badge: activeCampaignsCount > 0 ? activeCampaignsCount : undefined },
    { value: "automations", label: "Automações", icon: Zap },
  ];

  // Fetch active campaigns count for header badge
  useEffect(() => {
    const fetchCampaignCount = async () => {
      try {
        const res = await fetch("/api/messages/campaigns");
        if (res.ok) {
          const data = await res.json();
          setActiveCampaignsCount(data.stats?.active || 0);
        }
      } catch { /* silent */ }
    };
    fetchCampaignCount();
    const interval = setInterval(fetchCampaignCount, 30000);
    return () => clearInterval(interval);
  }, []);

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
              <p className="text-white/80 text-sm">Comunicação centralizada com candidatos via WhatsApp, Email e IA</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-white/90"><Bot className="h-4 w-4" /><span>{activeCampaignsCount} campanhas</span></div>
              <div className="w-px h-4 bg-white/30" />
              <div className="flex items-center gap-1.5 text-white/90"><MessageSquare className="h-4 w-4" /><span>{conversations.length} conversas</span></div>
              {unreadCount > 0 && (
                <>
                  <div className="w-px h-4 bg-white/30" />
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-white text-violet-700 hover:bg-white/90 text-xs">{unreadCount} não lidas</Badge>
                  </div>
                </>
              )}
            </div>
            <Button className="bg-white text-violet-700 hover:bg-white/90 font-medium" onClick={() => setIsComposeOpen(true)}>
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
              <TabsTrigger key={tab.value} value={tab.value}
                className={cn(
                  "relative rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "hover:text-foreground text-muted-foreground",
                  activeTab === tab.value && "border-violet-500 text-foreground"
                )}>
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.badge && (
                  <Badge variant={tab.value === "conversations" && unreadCount > 0 ? "default" : "secondary"}
                    className="ml-2 text-[10px] h-5 min-w-5 px-1.5">{tab.badge}</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="conversations" className="m-0 mt-0">
            <ConversationsTab unreadCount={unreadCount} needsInterventionCount={needsInterventionCount} wsConnected={wsConnected} onOpenCompose={() => setIsComposeOpen(true)} />
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
      <ComposeMessageDialog open={isComposeOpen} onOpenChange={setIsComposeOpen} onConversationCreated={() => fetchConversations()} />
    </div>
  );
}
