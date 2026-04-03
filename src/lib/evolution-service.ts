/**
 * Evolution API Service - Zion Recruit
 * WhatsApp integration via Evolution API
 * 
 * Documentation: https://doc.evolution-api.com/
 */

// ============================================
// Types
// ============================================

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}

export interface EvolutionInstance {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
  };
  hash?: string;
}

export interface EvolutionQRCode {
  instance: string;
  qrcode: {
    code: string;
    base64: string;
  };
}

export interface EvolutionMessage {
  key: {
    id: string;
    remoteJid: string;
    fromMe: boolean;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
  };
  messageTimestamp: number;
  status: string;
}

export interface EvolutionSendResult {
  key: {
    id: string;
    remoteJid: string;
  };
  message: {
    conversation: string;
  };
  status: string;
}

export interface WhatsAppContact {
  jid: string;
  name?: string;
  notify?: string;
  profilePicUrl?: string;
}

// ============================================
// Evolution API Service Class
// ============================================

class EvolutionAPIService {
  private config: EvolutionConfig | null = null;

  configure(config: EvolutionConfig) {
    this.config = config;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "apikey": this.config?.apiKey || "",
    };
  }

  private getBaseUrl(): string {
    return this.config?.baseUrl || process.env.EVOLUTION_API_URL || "";
  }

  // ============================================
  // Instance Management
  // ============================================

  /**
   * Create a new WhatsApp instance
   */
  async createInstance(instanceName: string): Promise<EvolutionInstance> {
    const response = await fetch(`${this.getBaseUrl()}/instance/create`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create instance: ${error}`);
    }

    return response.json();
  }

  /**
   * Get instance connection state
   */
  async getConnectionState(instanceName: string): Promise<{ state: string }> {
    const response = await fetch(
      `${this.getBaseUrl()}/instance/connectionState/${instanceName}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get connection state");
    }

    return response.json();
  }

  /**
   * Get QR code for instance
   */
  async getQRCode(instanceName: string): Promise<EvolutionQRCode> {
    const response = await fetch(
      `${this.getBaseUrl()}/instance/qrcode/${instanceName}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get QR code");
    }

    return response.json();
  }

  /**
   * Logout from instance
   */
  async logout(instanceName: string): Promise<void> {
    const response = await fetch(
      `${this.getBaseUrl()}/instance/logout/${instanceName}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to logout");
    }
  }

  /**
   * Delete instance
   */
  async deleteInstance(instanceName: string): Promise<void> {
    const response = await fetch(
      `${this.getBaseUrl()}/instance/delete/${instanceName}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete instance");
    }
  }

  // ============================================
  // Message Sending
  // ============================================

  /**
   * Send text message
   */
  async sendTextMessage(
    instanceName: string,
    phone: string,
    message: string
  ): Promise<EvolutionSendResult> {
    // Format phone number (remove non-numeric chars, add country code if needed)
    const formattedPhone = this.formatPhone(phone);

    const response = await fetch(
      `${this.getBaseUrl()}/message/sendText/${instanceName}`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          number: formattedPhone,
          options: {
            delay: 1200,
            presence: "composing",
          },
          textMessage: {
            text: message,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send message: ${error}`);
    }

    return response.json();
  }

  /**
   * Send message with buttons (interactive)
   */
  async sendButtonMessage(
    instanceName: string,
    phone: string,
    title: string,
    description: string,
    buttons: { id: string; text: string }[]
  ): Promise<EvolutionSendResult> {
    const formattedPhone = this.formatPhone(phone);

    const response = await fetch(
      `${this.getBaseUrl()}/message/sendButtons/${instanceName}`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          number: formattedPhone,
          options: {
            delay: 1200,
          },
          buttonMessage: {
            title,
            description,
            buttons: buttons.map((btn) => ({
              buttonId: btn.id,
              buttonText: { displayText: btn.text },
              type: 1,
            })),
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send button message: ${error}`);
    }

    return response.json();
  }

  /**
   * Send media (image, document, etc.)
   */
  async sendMediaMessage(
    instanceName: string,
    phone: string,
    mediaUrl: string,
    caption?: string,
    mediaType: "image" | "document" = "image"
  ): Promise<EvolutionSendResult> {
    const formattedPhone = this.formatPhone(phone);

    const endpoint = mediaType === "image" ? "sendMedia" : "sendMedia";
    const bodyKey = mediaType === "image" ? "imageMessage" : "documentMessage";

    const response = await fetch(
      `${this.getBaseUrl()}/message/${endpoint}/${instanceName}`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          number: formattedPhone,
          options: {
            delay: 1200,
          },
          [bodyKey]: {
            url: mediaUrl,
            caption: caption || "",
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send media: ${error}`);
    }

    return response.json();
  }

  // ============================================
  // Contact & Profile
  // ============================================

  /**
   * Get profile picture
   */
  async getProfilePicture(
    instanceName: string,
    phone: string
  ): Promise<{ profilePictureUrl: string | null }> {
    const formattedPhone = this.formatPhone(phone);

    const response = await fetch(
      `${this.getBaseUrl()}/chat/fetchProfilePicture/${instanceName}?number=${formattedPhone}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      return { profilePictureUrl: null };
    }

    return response.json();
  }

  /**
   * Check if number is on WhatsApp
   */
  async checkNumber(
    instanceName: string,
    phone: string
  ): Promise<{ exists: boolean; jid?: string }> {
    const formattedPhone = this.formatPhone(phone);

    const response = await fetch(
      `${this.getBaseUrl()}/chat/whatsappNumbers/${instanceName}`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          numbers: [formattedPhone],
        }),
      }
    );

    if (!response.ok) {
      return { exists: false };
    }

    const data = await response.json();
    const result = data.find((r: { number: string }) => r.number === formattedPhone);
    
    return {
      exists: result?.exists || false,
      jid: result?.jid,
    };
  }

  // ============================================
  // Webhook Management
  // ============================================

  /**
   * Set webhook for receiving messages
   */
  async setWebhook(
    instanceName: string,
    webhookUrl: string,
    events: string[] = ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
  ): Promise<void> {
    const response = await fetch(
      `${this.getBaseUrl()}/webhook/set/${instanceName}`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          url: webhookUrl,
          webhookByEvents: true,
          events,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to set webhook: ${error}`);
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Format phone number for WhatsApp API
   */
  private formatPhone(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, "");
    
    // Add Brazil country code if not present
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = "55" + cleaned;
    }
    
    // Add @s.whatsapp.net suffix for JID format
    return cleaned;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.config?.baseUrl && !!this.config?.apiKey;
  }
}

// Export singleton instance
export const evolutionService = new EvolutionAPIService();

// ============================================
// Utility Functions
// ============================================

/**
 * Format Brazilian phone number
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
