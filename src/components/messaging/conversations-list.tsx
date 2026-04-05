/**
 * Conversations List Component - Zion Recruit
 * Displays list of conversations with filters
 */

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  MessageCircle,
  Mail,
  MessageSquare,
  Bot,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { useMessagingStore } from "@/stores/messaging-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ConversationWithDetails, ChannelType, CHANNEL_CONFIG } from "@/types/messaging";

interface ConversationsListProps {
  onSelectConversation: (conversation: ConversationWithDetails) => void;
  selectedConversationId?: string;
}

export function ConversationsList({
  onSelectConversation,
  selectedConversationId,
}: ConversationsListProps) {
  const {
    conversations,
    isLoading,
    fetchConversations,
    filters,
    setFilters,
  } = useMessagingStore();

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, filters]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ ...filters, search: searchQuery || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getChannelIcon = (channel: ChannelType) => {
    const icons: Record<ChannelType, React.ElementType> = {
      CHAT: MessageCircle,
      EMAIL: Mail,
      WHATSAPP: MessageSquare,
      SMS: MessageCircle,
      TELEGRAM: MessageCircle,
    };
    return icons[channel] || MessageCircle;
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Ontem";
    } else if (diffDays < 7) {
      return d.toLocaleDateString("pt-BR", { weekday: "short" });
    } else {
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }
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
    <div className="flex flex-col h-full border-r border-border bg-background">
      {/* Search & Filters */}
      <div className="p-4 border-b border-border space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select
            value={filters.status || "all"}
            onValueChange={(value) =>
              setFilters({ ...filters, status: value === "all" ? undefined : value as "ACTIVE" | "PENDING" | "CLOSED" })
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ACTIVE">Ativos</SelectItem>
              <SelectItem value="PENDING">Pendentes</SelectItem>
              <SelectItem value="CLOSED">Encerrados</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.channel || "all"}
            onValueChange={(value) =>
              setFilters({ ...filters, channel: value === "all" ? undefined : value as ChannelType })
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="CHAT">Chat</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={filters.needsIntervention ? "default" : "outline"}
            size="icon"
            onClick={() =>
              setFilters({
                ...filters,
                needsIntervention: filters.needsIntervention ? undefined : true,
                aiActive: undefined,
              })
            }
            title="Precisa de intervenção"
          >
            <AlertCircle className="h-4 w-4" />
          </Button>

          <Button
            variant={filters.aiActive ? "default" : "outline"}
            size="icon"
            onClick={() =>
              setFilters({
                ...filters,
                aiActive: filters.aiActive ? undefined : true,
                needsIntervention: undefined,
              })
            }
            title="IA Ativas"
            className={cn(
              filters.aiActive && "bg-violet-600 hover:bg-violet-700"
            )}
          >
            <Bot className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center p-4">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Inicie uma conversa com um candidato
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {conversations.map((conversation, index) => {
              const ChannelIcon = getChannelIcon(conversation.channel);
              const isSelected = selectedConversationId === conversation.id;

              return (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onSelectConversation(conversation)}
                  className={cn(
                    "flex items-start gap-3 p-4 cursor-pointer transition-colors border-b border-border/50",
                    isSelected
                      ? "bg-primary/10 border-l-2 border-l-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conversation.candidate?.photo || undefined} />
                      <AvatarFallback>
                        {getInitials(conversation.candidate?.name || "C")}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background border"
                      style={{
                        backgroundColor: CHANNEL_CONFIG[conversation.channel]?.color || "#6B7280",
                      }}
                    >
                      <ChannelIcon className="h-3 w-3 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">
                        {conversation.candidate?.name}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      {conversation.job && (
                        <span className="text-xs text-muted-foreground truncate">
                          {conversation.job.title}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {conversation.lastMessagePreview || "Sem mensagens"}
                    </p>

                    {/* Indicators */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {conversation.takenOverBy ? (
                        <Badge variant="outline" className="text-xs gap-1 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">
                          <User className="h-3 w-3" />
                          Assumida por {conversation.takenOverName || "Recrutador"}
                        </Badge>
                      ) : conversation.aiMode ? (
                        <Badge variant="outline" className="text-xs gap-1 border-violet-500/50 text-violet-700 dark:text-violet-400 bg-violet-500/5">
                          <Bot className="h-3 w-3" />
                          IA Ativa
                        </Badge>
                      ) : !conversation.aiMode && conversation.takenOverBy && (
                        <Badge variant="outline" className="text-xs gap-1 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">
                          <User className="h-3 w-3" />
                          Você no controle
                        </Badge>
                      )}

                      {conversation.needsIntervention && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Intervenção
                        </Badge>
                      )}

                      {conversation.unreadCount > 0 && (
                        <Badge className="text-xs ml-auto">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </ScrollArea>
    </div>
  );
}
