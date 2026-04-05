/**
 * @deprecated Use src/lib/whatsapp/evolution-service.ts instead.
 * 
 * This file is kept for backward compatibility only.
 * All new code should import from '@/lib/whatsapp/evolution-service'.
 */

// Re-export utility functions from the canonical location
export {
  formatPhoneNumber,
  formatDateForDisplay,
  formatTimeForDisplay,
  getEvolutionService,
  sendCandidateNotificationMessage,
  sendDISCTestLink,
  sendInterviewReminderNotification,
  processWebhookEvent,
} from './whatsapp/evolution-service';

// Re-export commonly used types from the canonical location
export type {
  EvolutionConfig,
  EvolutionInstanceStatus,
  SendMessageResult,
  WebhookProcessResult,
  CandidateNotification,
  MessageTrackingStatus,
} from './whatsapp/types';

// ============================================
// Legacy Utility Functions (kept for compatibility)
// ============================================

/**
 * Format Brazilian phone number for display
 * @deprecated Use formatPhoneNumber from '@/lib/whatsapp/evolution-service' instead
 */
export function formatBrazilianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Validate Brazilian phone number
 * @deprecated Implement validation directly or use a validation library
 */
export function isValidBrazilianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length === 10 || cleaned.length === 11;
}

/**
 * Get WhatsApp deep link
 */
export function getWhatsAppDeepLink(phone: string, message?: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const encodedMessage = message ? encodeURIComponent(message) : "";
  return `https://wa.me/${cleaned}${encodedMessage ? `?text=${encodedMessage}` : ""}`;
}
