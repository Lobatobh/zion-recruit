/**
 * Notification Toast Utility
 * Shows toast notifications and creates persistent notifications
 */

import { toast } from "sonner";
import {
  createNotification,
  NotificationPresets,
} from "@/lib/notification-service";
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from "@prisma/client";

// Types
type PresetKey = keyof typeof NotificationPresets;

interface NotifyOptions {
  // Whether to also create a persistent notification
  persistent?: boolean;
  // Tenant ID (required if persistent is true)
  tenantId?: string;
  // User ID (optional, for targeting specific user)
  userId?: string;
  // Custom action URL
  actionUrl?: string;
  // Custom action label
  actionLabel?: string;
  // Whether to show toast
  showToast?: boolean;
  // Toast duration in ms
  duration?: number;
}

/**
 * Show a toast and optionally create a persistent notification
 */
async function notify(
  preset: PresetKey,
  presetArgs: Parameters<(typeof NotificationPresets)[PresetKey]>,
  options: NotifyOptions = {}
) {
  const {
    persistent = false,
    tenantId,
    userId,
    actionUrl,
    actionLabel,
    showToast = true,
    duration = 5000,
  } = options;

  // Get preset data
  // @ts-expect-error - Dynamic preset access
  const presetData = NotificationPresets[preset](...presetArgs);

  // Override action URL/label if provided
  const notificationData = {
    ...presetData,
    actionUrl: actionUrl || presetData.actionUrl,
    actionLabel: actionLabel || presetData.actionLabel,
  };

  // Show toast
  if (showToast) {
    const { title, message, priority, actionUrl: url, actionLabel: label } = notificationData;

    const toastOptions = {
      duration,
      action: url && label ? {
        label,
        onClick: () => {
          window.location.href = url;
        },
      } : undefined,
    };

    switch (priority) {
      case "URGENT":
        toast.error(title, {
          description: message,
          ...toastOptions,
        });
        break;
      case "HIGH":
        toast.warning(title, {
          description: message,
          ...toastOptions,
        });
        break;
      case "LOW":
        toast.info(title, {
          description: message,
          ...toastOptions,
        });
        break;
      default:
        toast.success(title, {
          description: message,
          ...toastOptions,
        });
    }
  }

  // Create persistent notification
  if (persistent && tenantId) {
    try {
      await createNotification({
        tenantId,
        userId: userId || null,
        type: notificationData.type as NotificationType,
        category: notificationData.category as NotificationCategory,
        priority: (notificationData.priority as NotificationPriority) || "NORMAL",
        title: notificationData.title,
        message: notificationData.message,
        description: notificationData.description,
        actionUrl: notificationData.actionUrl,
        actionLabel: notificationData.actionLabel,
        entityType: notificationData.entityType,
        entityId: notificationData.entityId,
      });
    } catch (error) {
      console.error("Failed to create persistent notification:", error);
    }
  }
}

/**
 * Notification helper functions
 */
export const notifyEvent = {
  // Candidate events
  candidateNew: (
    candidateName: string,
    candidateId: string,
    jobTitle: string,
    options?: NotifyOptions
  ) =>
    notify(
      "candidateNew",
      [candidateName, candidateId, jobTitle],
      options
    ),

  candidateStatusChange: (
    candidateName: string,
    candidateId: string,
    newStatus: string,
    options?: NotifyOptions
  ) =>
    notify(
      "candidateStatusChange",
      [candidateName, candidateId, newStatus],
      options
    ),

  candidateHired: (
    candidateName: string,
    candidateId: string,
    jobTitle: string,
    options?: NotifyOptions
  ) =>
    notify(
      "candidateHired",
      [candidateName, candidateId, jobTitle],
      { ...options, persistent: true }
    ),

  candidateRejected: (
    candidateName: string,
    candidateId: string,
    options?: NotifyOptions
  ) =>
    notify(
      "candidateRejected",
      [candidateName, candidateId],
      options
    ),

  // Job events
  jobPublished: (
    jobTitle: string,
    jobId: string,
    options?: NotifyOptions
  ) =>
    notify(
      "jobPublished",
      [jobTitle, jobId],
      options
    ),

  jobExpiring: (
    jobTitle: string,
    jobId: string,
    daysLeft: number,
    options?: NotifyOptions
  ) =>
    notify(
      "jobExpiring",
      [jobTitle, jobId, daysLeft],
      { ...options, persistent: true }
    ),

  // AI Agent events
  aiTaskCompleted: (
    taskType: string,
    taskId: string,
    options?: NotifyOptions
  ) =>
    notify(
      "aiTaskCompleted",
      [taskType, taskId],
      options
    ),

  aiTaskFailed: (
    taskType: string,
    taskId: string,
    errorMessage: string,
    options?: NotifyOptions
  ) =>
    notify(
      "aiTaskFailed",
      [taskType, taskId, errorMessage],
      { ...options, persistent: true }
    ),

  aiSuggestion: (
    suggestion: string,
    entityType?: string,
    entityId?: string,
    options?: NotifyOptions
  ) =>
    notify(
      "aiSuggestion",
      [suggestion, entityType, entityId],
      options
    ),

  // Message events
  messageReceived: (
    senderName: string,
    conversationId: string,
    preview: string,
    options?: NotifyOptions
  ) =>
    notify(
      "messageReceived",
      [senderName, conversationId, preview],
      options
    ),

  messageIntervention: (
    candidateName: string,
    conversationId: string,
    reason: string,
    options?: NotifyOptions
  ) =>
    notify(
      "messageIntervention",
      [candidateName, conversationId, reason],
      { ...options, persistent: true }
    ),

  // Interview events
  interviewScheduled: (
    candidateName: string,
    interviewId: string,
    dateTime: string,
    options?: NotifyOptions
  ) =>
    notify(
      "interviewScheduled",
      [candidateName, interviewId, dateTime],
      options
    ),

  interviewReminder: (
    candidateName: string,
    interviewId: string,
    inMinutes: number,
    options?: NotifyOptions
  ) =>
    notify(
      "interviewReminder",
      [candidateName, interviewId, inMinutes],
      { ...options, persistent: true }
    ),

  interviewNoShow: (
    candidateName: string,
    interviewId: string,
    options?: NotifyOptions
  ) =>
    notify(
      "interviewNoShow",
      [candidateName, interviewId],
      { ...options, persistent: true }
    ),

  // DISC events
  discTestCompleted: (
    candidateName: string,
    testId: string,
    profile: string,
    options?: NotifyOptions
  ) =>
    notify(
      "discTestCompleted",
      [candidateName, testId, profile],
      options
    ),

  // API events
  apiUsageAlert: (
    provider: string,
    percentage: number,
    options?: NotifyOptions
  ) =>
    notify(
      "apiUsageAlert",
      [provider, percentage],
      { ...options, persistent: true }
    ),

  apiLimitReached: (
    provider: string,
    options?: NotifyOptions
  ) =>
    notify(
      "apiLimitReached",
      [provider],
      { ...options, persistent: true }
    ),

  // Team events
  teamInvite: (
    email: string,
    invitedBy: string,
    options?: NotifyOptions
  ) =>
    notify(
      "teamInvite",
      [email, invitedBy],
      options
    ),

  teamJoined: (
    name: string,
    email: string,
    options?: NotifyOptions
  ) =>
    notify(
      "teamJoined",
      [name, email],
      options
    ),

  // System events
  systemAlert: (
    title: string,
    message: string,
    priority: NotificationPriority = "NORMAL",
    options?: NotifyOptions
  ) =>
    notify(
      "systemAlert",
      [title, message, priority],
      { ...options, persistent: true }
    ),
};

/**
 * Quick toast notifications without persistent storage
 */
export const quickNotify = {
  success: (title: string, message?: string) =>
    toast.success(title, { description: message }),

  error: (title: string, message?: string) =>
    toast.error(title, { description: message }),

  warning: (title: string, message?: string) =>
    toast.warning(title, { description: message }),

  info: (title: string, message?: string) =>
    toast.info(title, { description: message }),

  loading: (title: string, message?: string) =>
    toast.loading(title, { description: message }),

  dismiss: (toastId?: string | number) =>
    toast.dismiss(toastId),
};
