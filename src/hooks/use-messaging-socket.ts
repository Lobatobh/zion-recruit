/**
 * useMessagingSocket Hook - Zion Recruit
 * WebSocket hook for real-time messaging
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useMessagingStore } from "@/stores/messaging-store";

interface UseMessagingSocketOptions {
  tenantId?: string;
  userId?: string;
  userName?: string;
  enabled?: boolean;
}

export function useMessagingSocket({
  tenantId,
  userId,
  userName,
  enabled = true,
}: UseMessagingSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const {
    setSocketConnected,
    addMessage,
    updateConversation,
    setTypingIndicator,
    clearTypingIndicator,
  } = useMessagingStore();

  // Initialize socket connection
  useEffect(() => {
    if (!enabled || !tenantId || !userId) return;

    // Create socket connection with XTransformPort for gateway
    const socket = io("/?XTransformPort=3004", {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setSocketConnected(true);

      // Join tenant room
      socket.emit("join:tenant", {
        tenantId,
        userId,
        userName: userName || "Usuário",
      });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setSocketConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setSocketConnected(false);
    });

    // Message events
    socket.on("message:new", (data: { message: Message; tempId?: string }) => {
      addMessage(data.message.conversationId, data.message);
    });

    socket.on("message:updated", (data: { message: Message }) => {
      // Handle message update (e.g., status change)
    });

    socket.on("conversation:updated", (data: ConversationUpdate) => {
      updateConversation(data.id, {
        lastMessageAt: new Date(data.lastMessageAt),
        lastMessagePreview: data.lastMessagePreview,
        unreadCount: data.unreadCount,
        needsIntervention: data.needsIntervention,
      });
    });

    socket.on("typing:indicator", (data: TypingIndicator) => {
      if (data.senderName) {
        setTypingIndicator(data);
      } else {
        clearTypingIndicator(data.conversationId);
      }
    });

    socket.on("ai:response", (data: { message: Message; nextStage?: string }) => {
      addMessage(data.message.conversationId, data.message);
      clearTypingIndicator(data.message.conversationId);
    });

    socket.on("intervention:needed", (data: { conversationId: string; reason: string }) => {
      updateConversation(data.conversationId, {
        needsIntervention: true,
        interventionReason: data.reason,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [enabled, tenantId, userId, userName, setSocketConnected, addMessage, updateConversation, setTypingIndicator, clearTypingIndicator]);

  // Join conversation room
  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join:conversation", conversationId);
    }
  }, []);

  // Leave conversation room
  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave:conversation", conversationId);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(
    (conversationId: string, content: string, tempId?: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("message:send", {
          conversationId,
          content,
          tempId,
        });
      }
    },
    []
  );

  // Start typing indicator
  const startTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing:start", { conversationId });
    }
  }, []);

  // Stop typing indicator
  const stopTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing:stop", { conversationId });
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("conversation:read", { conversationId });
    }
  }, []);

  return {
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
  };
}

// Types
interface Message {
  id: string;
  conversationId: string;
  senderType: "CANDIDATE" | "RECRUITER" | "AI" | "SYSTEM";
  senderId?: string;
  senderName?: string;
  content: string;
  sentAt: Date;
  isAiGenerated: boolean;
}

interface ConversationUpdate {
  id: string;
  lastMessageAt: Date;
  lastMessagePreview: string;
  unreadCount: number;
  needsIntervention?: boolean;
}

interface TypingIndicator {
  conversationId: string;
  senderType: "CANDIDATE" | "AI" | "RECRUITER";
  senderName?: string;
}
