/**
 * useNotifications Hook
 * React hook for managing notifications in components
 */

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

// Types based on Prisma schema
export type NotificationType =
  | "SYSTEM_UPDATE"
  | "SYSTEM_MAINTENANCE"
  | "SYSTEM_ALERT"
  | "CANDIDATE_NEW"
  | "CANDIDATE_STATUS_CHANGE"
  | "CANDIDATE_APPLIED"
  | "CANDIDATE_HIRED"
  | "CANDIDATE_REJECTED"
  | "JOB_PUBLISHED"
  | "JOB_CLOSED"
  | "JOB_EXPIRING"
  | "PIPELINE_STAGE_CHANGE"
  | "PIPELINE_STUCK"
  | "AI_TASK_COMPLETED"
  | "AI_TASK_FAILED"
  | "AI_AGENT_ERROR"
  | "AI_SUGGESTION"
  | "MESSAGE_RECEIVED"
  | "MESSAGE_INTERVENTION"
  | "MESSAGE_FAILED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_REMINDER"
  | "INTERVIEW_CANCELLED"
  | "INTERVIEW_COMPLETED"
  | "INTERVIEW_NO_SHOW"
  | "DISC_TEST_SENT"
  | "DISC_TEST_COMPLETED"
  | "DISC_PROFILE_READY"
  | "API_USAGE_ALERT"
  | "API_ERROR"
  | "API_LIMIT_REACHED"
  | "CREDENTIAL_EXPIRED"
  | "TEAM_INVITE"
  | "TEAM_JOINED"
  | "TEAM_ROLE_CHANGE";

export type NotificationCategory =
  | "SYSTEM"
  | "CANDIDATES"
  | "JOBS"
  | "PIPELINE"
  | "AI_AGENTS"
  | "MESSAGES"
  | "INTERVIEWS"
  | "DISC"
  | "API"
  | "TEAM";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  description?: string;
  actionUrl?: string;
  actionLabel?: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  isPinned: boolean;
  createdAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  recent: number;
  urgent: number;
}

interface CreateNotificationParams {
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  description?: string;
  actionUrl?: string;
  actionLabel?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Hook for notification operations
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async (params?: {
    category?: NotificationCategory;
    isRead?: boolean;
    limit?: number;
  }) => {
    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.append("category", params.category);
      if (params?.isRead !== undefined) searchParams.append("isRead", String(params.isRead));
      if (params?.limit) searchParams.append("limit", String(params.limit));

      const response = await fetch(`/api/notifications?${searchParams.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setNotifications(data.notifications || []);
        return data;
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/stats");
      const data = await response.json();

      if (response.ok) {
        setStats(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching notification stats:", error);
    }
  }, []);

  // Create notification
  const createNotification = useCallback(async (params: CreateNotificationParams) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh stats
        fetchStats();
        return data.notification;
      } else {
        throw new Error(data.error || "Failed to create notification");
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }, [fetchStats]);

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setStats((prev) =>
          prev ? { ...prev, unread: Math.max(0, prev.unread - 1) } : null
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async (category?: NotificationCategory) => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setStats((prev) => (prev ? { ...prev, unread: 0 } : null));
        toast.success("Todas notificações marcadas como lidas");
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Erro ao marcar notificações");
    }
  }, []);

  // Archive notification
  const archiveNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (error) {
      console.error("Error archiving notification:", error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        toast.success("Notificação excluída");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Erro ao excluir notificação");
    }
  }, []);

  return {
    notifications,
    stats,
    isLoading,
    fetchNotifications,
    fetchStats,
    createNotification,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
  };
}

/**
 * Hook for polling notification stats
 */
export function useNotificationPolling(intervalMs: number = 30000) {
  const [stats, setStats] = useState<NotificationStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/notifications/stats");
        const data = await response.json();
        if (response.ok) {
          setStats(data);
        }
      } catch (error) {
        console.error("Error polling notification stats:", error);
      }
    };

    // Initial fetch
    fetchStats();

    // Poll
    const interval = setInterval(fetchStats, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return stats;
}
