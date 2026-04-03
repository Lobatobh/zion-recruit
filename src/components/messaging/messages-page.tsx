/**
 * Messages Page Component - Zion Recruit
 * Main messaging page with conversations list and chat view
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
} from "lucide-react";
import { useMessagingStore } from "@/stores/messaging-store";
import { useSession } from "next-auth/react";
import { ConversationsList } from "./conversations-list";
import { ChatView } from "./chat-view";
import { ComposeMessageDialog } from "./compose-message-dialog";
import { useMessagingSocket } from "@/hooks/use-messaging-socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConversationWithDetails } from "@/types/messaging";
import { cn } from "@/lib/utils";

export function MessagesPage() {
  const { data: session } = useSession();
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithDetails | null>(null);
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Store stats
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

  const handleSelectConversation = (conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation);
    setIsMobileListOpen(false);
  };

  const handleBackToList = () => {
    setIsMobileListOpen(true);
    setSelectedConversation(null);
  };

  const handleConversationCreated = (conversationId: string) => {
    // Refresh conversations and select the new one
    fetchConversations();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Desktop Layout */}
      <div className="hidden md:flex w-full">
        {/* Conversations List */}
        <div className="w-[350px] flex-shrink-0 flex flex-col">
          {/* List Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Mensagens</h2>
              <Badge variant="secondary" className="text-xs">
                {conversations.length}
              </Badge>
              {unreadCount > 0 && (
                <Badge className="text-xs">{unreadCount}</Badge>
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
                onClick={() => setIsComposeOpen(true)}
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
            onClick={() => setIsComposeOpen(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Compose Dialog */}
      <ComposeMessageDialog
        open={isComposeOpen}
        onOpenChange={setIsComposeOpen}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
