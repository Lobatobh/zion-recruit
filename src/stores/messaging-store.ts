/**
 * Messaging Store - Zion Recruit
 * Zustand store for omnichannel messaging state management
 */

import { create } from "zustand";
import {
  Conversation,
  ConversationWithDetails,
  Message,
  MessageChannel,
  MessageTemplate,
  ConversationStatus,
  ChannelType,
  SendMessageInput,
  CreateConversationInput,
  AIStage,
} from "@/types/messaging";

// ============================================
// TYPES
// ============================================

interface MessageFilters {
  status?: ConversationStatus;
  channel?: ChannelType;
  jobId?: string;
  search?: string;
  needsIntervention?: boolean;
  aiActive?: boolean;
}

interface TypingIndicator {
  conversationId: string;
  senderType: "CANDIDATE" | "AI" | "RECRUITER";
  senderName?: string;
  timestamp: Date;
}

interface MessagingState {
  // Data
  conversations: ConversationWithDetails[];
  currentConversation: ConversationWithDetails | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  channels: MessageChannel[];
  templates: MessageTemplate[];

  // UI State
  isLoading: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  filters: MessageFilters;

  // Real-time State
  typingIndicators: TypingIndicator[];
  socketConnected: boolean;

  // Dialog State
  isComposeOpen: boolean;
  selectedConversationIds: string[];
  isTemplatesOpen: boolean;

  // Actions - Conversations
  setConversations: (conversations: ConversationWithDetails[]) => void;
  setCurrentConversation: (conversation: ConversationWithDetails | null) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;

  // Actions - Messages
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  prependMessages: (conversationId: string, messages: Message[]) => void;

  // Actions - Channels & Templates
  setChannels: (channels: MessageChannel[]) => void;
  setTemplates: (templates: MessageTemplate[]) => void;

  // Actions - UI
  setLoading: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: MessageFilters) => void;
  resetFilters: () => void;

  // Actions - Real-time
  setTypingIndicator: (indicator: TypingIndicator | null) => void;
  clearTypingIndicator: (conversationId: string) => void;
  setSocketConnected: (connected: boolean) => void;

  // Actions - Dialogs
  openCompose: () => void;
  closeCompose: () => void;
  toggleConversationSelection: (id: string) => void;
  clearSelection: () => void;
  openTemplates: () => void;
  closeTemplates: () => void;

  // Async Actions
  fetchConversations: () => Promise<void>;
  fetchConversation: (id: string) => Promise<void>;
  fetchMessages: (conversationId: string, before?: string) => Promise<void>;
  sendMessage: (input: SendMessageInput) => Promise<Message>;
  createConversation: (input: CreateConversationInput) => Promise<Conversation>;
  updateConversationStatus: (id: string, status: ConversationStatus) => Promise<void>;
  toggleAiMode: (id: string, enabled: boolean) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;

  // Channels
  fetchChannels: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
}

// ============================================
// STORE
// ============================================

export const useMessagingStore = create<MessagingState>((set, get) => ({
  // Initial State
  conversations: [],
  currentConversation: null,
  messages: {},
  channels: [],
  templates: [],
  isLoading: false,
  isLoadingMessages: false,
  error: null,
  filters: {},
  typingIndicators: [],
  socketConnected: false,
  isComposeOpen: false,
  selectedConversationIds: [],
  isTemplatesOpen: false,

  // Data Actions
  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  updateConversation: (id, updates) => set((state) => ({
    conversations: state.conversations.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
    currentConversation: state.currentConversation?.id === id
      ? { ...state.currentConversation, ...updates }
      : state.currentConversation,
  })),
  removeConversation: (id) => set((state) => ({
    conversations: state.conversations.filter((c) => c.id !== id),
    currentConversation: state.currentConversation?.id === id
      ? null
      : state.currentConversation,
  })),

  // Message Actions
  setMessages: (conversationId, messages) => set((state) => ({
    messages: { ...state.messages, [conversationId]: messages },
  })),
  addMessage: (conversationId, message) => set((state) => {
    const existing = state.messages[conversationId] || [];
    // Avoid duplicates
    if (existing.some((m) => m.id === message.id)) {
      return state;
    }
    return {
      messages: {
        ...state.messages,
        [conversationId]: [...existing, message],
      },
    };
  }),
  updateMessage: (conversationId, messageId, updates) => set((state) => ({
    messages: {
      ...state.messages,
      [conversationId]: state.messages[conversationId]?.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      ) || [],
    },
  })),
  prependMessages: (conversationId, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [conversationId]: [...messages, ...(state.messages[conversationId] || [])],
    },
  })),

  // Channels & Templates
  setChannels: (channels) => set({ channels }),
  setTemplates: (templates) => set({ templates }),

  // UI Actions
  setLoading: (loading) => set({ isLoading: loading }),
  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
  setError: (error) => set({ error }),
  setFilters: (filters) => set({ filters }),
  resetFilters: () => set({ filters: {} }),

  // Real-time Actions
  setTypingIndicator: (indicator) => set((state) => {
    if (!indicator) return { typingIndicators: [] };
    const filtered = state.typingIndicators.filter(
      (t) => t.conversationId !== indicator.conversationId
    );
    return { typingIndicators: [...filtered, indicator] };
  }),
  clearTypingIndicator: (conversationId) => set((state) => ({
    typingIndicators: state.typingIndicators.filter(
      (t) => t.conversationId !== conversationId
    ),
  })),
  setSocketConnected: (connected) => set({ socketConnected: connected }),

  // Dialog Actions
  openCompose: () => set({ isComposeOpen: true }),
  closeCompose: () => set({ isComposeOpen: false }),
  toggleConversationSelection: (id) => set((state) => ({
    selectedConversationIds: state.selectedConversationIds.includes(id)
      ? state.selectedConversationIds.filter((i) => i !== id)
      : [...state.selectedConversationIds, id],
  })),
  clearSelection: () => set({ selectedConversationIds: [] }),
  openTemplates: () => set({ isTemplatesOpen: true }),
  closeTemplates: () => set({ isTemplatesOpen: false }),

  // Async Actions
  fetchConversations: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.channel) params.set("channel", filters.channel);
      if (filters.jobId) params.set("jobId", filters.jobId);
      if (filters.search) params.set("search", filters.search);
      if (filters.needsIntervention !== undefined) {
        params.set("needsIntervention", String(filters.needsIntervention));
      }
      if (filters.aiActive !== undefined) {
        params.set("aiActive", String(filters.aiActive));
      }

      const response = await fetch(`/api/messages/conversations?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Falha ao carregar conversas");
      }

      const data = await response.json();
      set({
        conversations: data.conversations,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erro desconhecido",
        isLoading: false,
      });
    }
  },

  fetchConversation: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/messages/conversations/${id}`);

      if (!response.ok) {
        throw new Error("Falha ao carregar conversa");
      }

      const data = await response.json();
      set({
        currentConversation: data.conversation,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erro desconhecido",
        isLoading: false,
      });
    }
  },

  fetchMessages: async (conversationId, before) => {
    set({ isLoadingMessages: true });

    try {
      const params = new URLSearchParams();
      if (before) params.set("before", before);
      params.set("limit", "50");

      const response = await fetch(
        `/api/messages/conversations/${conversationId}/messages?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Falha ao carregar mensagens");
      }

      const data = await response.json();
      const messages = data.messages;

      if (before) {
        get().prependMessages(conversationId, messages);
      } else {
        get().setMessages(conversationId, messages);
      }

      set({ isLoadingMessages: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erro desconhecido",
        isLoadingMessages: false,
      });
    }
  },

  sendMessage: async (input) => {
    const response = await fetch(`/api/messages/conversations/${input.conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Falha ao enviar mensagem");
    }

    const { message } = await response.json();
    get().addMessage(input.conversationId, message);
    
    return message;
  },

  createConversation: async (input) => {
    const response = await fetch("/api/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Falha ao criar conversa");
    }

    const { conversation } = await response.json();
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    }));

    return conversation;
  },

  updateConversationStatus: async (id, status) => {
    const response = await fetch(`/api/messages/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error("Falha ao atualizar status");
    }

    get().updateConversation(id, { status });
  },

  toggleAiMode: async (id, enabled) => {
    const response = await fetch(`/api/messages/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiMode: enabled }),
    });

    if (!response.ok) {
      throw new Error("Falha ao atualizar modo IA");
    }

    get().updateConversation(id, { aiMode: enabled });
  },

  markAsRead: async (conversationId) => {
    const response = await fetch(
      `/api/messages/conversations/${conversationId}/read`,
      { method: "POST" }
    );

    if (!response.ok) {
      return;
    }

    get().updateConversation(conversationId, { unreadCount: 0 });
  },

  fetchChannels: async () => {
    try {
      const response = await fetch("/api/messages/channels");
      if (response.ok) {
        const data = await response.json();
        set({ channels: data.channels });
      }
    } catch {
      // Silent fail for channels
    }
  },

  fetchTemplates: async () => {
    try {
      const response = await fetch("/api/messages/templates");
      if (response.ok) {
        const data = await response.json();
        set({ templates: data.templates });
      }
    } catch {
      // Silent fail for templates
    }
  },
}));
