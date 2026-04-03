/**
 * Messaging WebSocket Service - Zion Recruit
 * Real-time messaging service using Socket.IO
 */

import { Server } from "socket.io";

const PORT = 3004;

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

interface TypingIndicator {
  conversationId: string;
  senderType: "CANDIDATE" | "AI" | "RECRUITER";
  senderName?: string;
}

interface ConversationUpdate {
  id: string;
  lastMessageAt: Date;
  lastMessagePreview: string;
  unreadCount: number;
  needsIntervention?: boolean;
}

// Socket events
const EVENTS = {
  // Client -> Server
  JOIN_CONVERSATION: "join:conversation",
  LEAVE_CONVERSATION: "leave:conversation",
  SEND_MESSAGE: "message:send",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  MARK_READ: "conversation:read",

  // Server -> Client
  NEW_MESSAGE: "message:new",
  MESSAGE_UPDATED: "message:updated",
  CONVERSATION_UPDATED: "conversation:updated",
  TYPING_INDICATOR: "typing:indicator",
  UNREAD_COUNT: "unread:count",
  INTERVENTION_NEEDED: "intervention:needed",
  
  // AI Events
  AI_RESPONSE: "ai:response",
  AI_STAGE_CHANGE: "ai:stage",
};

// Store connected users per tenant
const tenantUsers = new Map<string, Set<string>>();
const userSockets = new Map<string, string>();

const io = new Server(PORT, {
  cors: {
    origin: ["http://localhost:3000", "http://21.0.10.42:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io/",
});

console.log(` Messaging WebSocket Service running on port ${PORT}`);

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // User authentication/join tenant
  socket.on("join:tenant", (data: { tenantId: string; userId: string; userName: string }) => {
    const { tenantId, userId, userName } = data;
    
    // Join tenant room
    socket.join(`tenant:${tenantId}`);
    
    // Track user
    if (!tenantUsers.has(tenantId)) {
      tenantUsers.set(tenantId, new Set());
    }
    tenantUsers.get(tenantId)!.add(userId);
    userSockets.set(socket.id, userId);
    
    // Store user info on socket
    socket.data.tenantId = tenantId;
    socket.data.userId = userId;
    socket.data.userName = userName;
    
    console.log(`User ${userName} (${userId}) joined tenant ${tenantId}`);
    
    // Send connection confirmation
    socket.emit("connected", { userId, tenantId });
  });

  // Join a specific conversation
  socket.on(EVENTS.JOIN_CONVERSATION, (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // Leave a conversation
  socket.on(EVENTS.LEAVE_CONVERSATION, (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`Socket ${socket.id} left conversation ${conversationId}`);
  });

  // Handle new message
  socket.on(EVENTS.SEND_MESSAGE, async (data: {
    conversationId: string;
    content: string;
    tempId?: string;
  }) => {
    const { conversationId, content, tempId } = data;
    const tenantId = socket.data.tenantId as string;
    const userId = socket.data.userId as string;
    const userName = socket.data.userName as string;

    console.log(`Message from ${userName} in conversation ${conversationId}`);

    // Create message object (in real app, this would be saved to DB)
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      senderType: "RECRUITER",
      senderId: userId,
      senderName: userName,
      content,
      sentAt: new Date(),
      isAiGenerated: false,
    };

    // Broadcast to conversation room
    io.to(`conversation:${conversationId}`).emit(EVENTS.NEW_MESSAGE, {
      message,
      tempId,
    });

    // Update conversation for tenant
    const update: ConversationUpdate = {
      id: conversationId,
      lastMessageAt: new Date(),
      lastMessagePreview: content.substring(0, 100),
      unreadCount: 0, // Reset for sender
    };

    io.to(`tenant:${tenantId}`).emit(EVENTS.CONVERSATION_UPDATED, update);

    // Trigger AI processing (emit event for processing)
    // In real app, this would call the AI service
    setTimeout(() => {
      // Simulate AI typing
      io.to(`conversation:${conversationId}`).emit(EVENTS.TYPING_INDICATOR, {
        conversationId,
        senderType: "AI",
        senderName: "Zoe (IA)",
      } as TypingIndicator);
    }, 1000);
  });

  // Handle typing indicator
  socket.on(EVENTS.TYPING_START, (data: { conversationId: string }) => {
    const { conversationId } = data;
    const userName = socket.data.userName as string;

    socket.to(`conversation:${conversationId}`).emit(EVENTS.TYPING_INDICATOR, {
      conversationId,
      senderType: "RECRUITER",
      senderName: userName,
    } as TypingIndicator);
  });

  socket.on(EVENTS.TYPING_STOP, (data: { conversationId: string }) => {
    const { conversationId } = data;

    socket.to(`conversation:${conversationId}`).emit(EVENTS.TYPING_INDICATOR, {
      conversationId,
      senderType: "RECRUITER",
      senderName: undefined,
    });
  });

  // Mark conversation as read
  socket.on(EVENTS.MARK_READ, (data: { conversationId: string }) => {
    const { conversationId } = data;
    const tenantId = socket.data.tenantId as string;

    io.to(`tenant:${tenantId}`).emit(EVENTS.CONVERSATION_UPDATED, {
      id: conversationId,
      unreadCount: 0,
    } as ConversationUpdate);
  });

  // AI response event (called from API)
  socket.on("ai:process:complete", (data: {
    conversationId: string;
    message: Message;
    nextStage?: string;
    needsIntervention?: boolean;
  }) => {
    const { conversationId, message, nextStage, needsIntervention } = data;
    const tenantId = socket.data.tenantId as string;

    // Broadcast AI message
    io.to(`conversation:${conversationId}`).emit(EVENTS.AI_RESPONSE, {
      message,
      nextStage,
    });

    // Update conversation
    io.to(`tenant:${tenantId}`).emit(EVENTS.CONVERSATION_UPDATED, {
      id: conversationId,
      lastMessageAt: new Date(),
      lastMessagePreview: message.content.substring(0, 100),
    });

    // If intervention needed, notify tenant
    if (needsIntervention) {
      io.to(`tenant:${tenantId}`).emit(EVENTS.INTERVENTION_NEEDED, {
        conversationId,
        reason: "AI requested human intervention",
      });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    const tenantId = socket.data.tenantId as string;
    const userId = socket.data.userId as string;

    if (tenantId && userId) {
      const users = tenantUsers.get(tenantId);
      if (users) {
        users.delete(userId);
        if (users.size === 0) {
          tenantUsers.delete(tenantId);
        }
      }
      userSockets.delete(socket.id);
    }

    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Export for external use
export { io, EVENTS };
