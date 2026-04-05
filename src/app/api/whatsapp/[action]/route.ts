/**
 * WhatsApp Action API - Zion Recruit
 * Handles WhatsApp actions: connect, disconnect, qrcode, send, check-number
 * 
 * Uses direct Evolution API calls for setup operations and
 * the whatsapp/evolution-service for message sending.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEvolutionService } from "@/lib/whatsapp/evolution-service";
import { authErrorResponse } from "@/lib/auth-helper";

// Helper to get effective tenant ID - ONLY from session, no fallbacks
async function getEffectiveTenantId(session: { user?: { id?: string; tenantId?: string | null } }): Promise<string> {
  if (session?.user?.tenantId) {
    return session.user.tenantId;
  }
  throw new Error("Organização não encontrada");
}

/**
 * Check if Evolution API env vars are configured
 */
function isEvolutionConfigured(): boolean {
  return !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY);
}

/**
 * Direct Evolution API request helper (for setup/instance management)
 */
async function evolutionApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: unknown
): Promise<T> {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Evolution API não configurada");
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Evolution API error: ${error}`);
  }

  return response.json();
}

// POST /api/whatsapp/[action]
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const effectiveTenantId = await getEffectiveTenantId(session);

    const { action } = await params;
    const body = await request.json().catch(() => ({}));

    switch (action) {
      case "connect": {
        if (!isEvolutionConfigured()) {
          return NextResponse.json({
            error: "Evolution API não configurada",
            hint: "Configure as variáveis de ambiente EVOLUTION_API_URL e EVOLUTION_API_KEY",
          }, { status: 400 });
        }

        const instanceName = `zion-recruit-${effectiveTenantId.slice(0, 8)}`;

        try {
          // Create instance on Evolution API
          const instance = await evolutionApiRequest<{
            instance: { instanceName: string; instanceId: string; status: string };
          }>("/instance/create", "POST", {
            instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          });

          // Save channel to database
          const channel = await db.messageChannel.upsert({
            where: {
              tenantId_type: {
                tenantId: effectiveTenantId,
                type: "WHATSAPP",
              },
            },
            update: {
              instanceName,
              instanceId: instance.instance.instanceId,
              isActive: true,
            },
            create: {
              tenantId: effectiveTenantId,
              type: "WHATSAPP",
              name: "WhatsApp",
              instanceName,
              instanceId: instance.instance.instanceId,
              isActive: true,
            },
          });

          // Get QR code
          const qrCode = await evolutionApiRequest<{
            qrcode: { base64: string };
          }>(`/instance/qrcode/${instanceName}`);

          return NextResponse.json({
            success: true,
            channel,
            qrcode: qrCode.qrcode.base64,
            instance: instance.instance,
          });
        } catch (error) {
          // Instance might already exist, try to get QR code
          try {
            const qrCode = await evolutionApiRequest<{
              qrcode: { base64: string };
            }>(`/instance/qrcode/${instanceName}`);

            return NextResponse.json({
              success: true,
              qrcode: qrCode.qrcode.base64,
              instance: { instanceName },
            });
          } catch {
            throw error;
          }
        }
      }

      case "disconnect": {
        const channel = await db.messageChannel.findFirst({
          where: {
            tenantId: effectiveTenantId,
            type: "WHATSAPP",
          },
        });

        if (!channel?.instanceName) {
          return NextResponse.json({ error: "Canal não configurado" }, { status: 400 });
        }

        // Try using the new service first (DB-backed credentials)
        try {
          const service = await getEvolutionService(effectiveTenantId);
          await service.logout();
        } catch {
          // Fallback to direct API call
          if (isEvolutionConfigured()) {
            await evolutionApiRequest(`/instance/logout/${channel.instanceName}`, "DELETE");
          }
        }

        await db.messageChannel.update({
          where: { id: channel.id },
          data: { isActive: false },
        });

        return NextResponse.json({ success: true });
      }

      case "qrcode": {
        if (!isEvolutionConfigured()) {
          return NextResponse.json({
            error: "Evolution API não configurada",
          }, { status: 400 });
        }

        const channel = await db.messageChannel.findFirst({
          where: {
            tenantId: effectiveTenantId,
            type: "WHATSAPP",
          },
        });

        const instanceName = channel?.instanceName || `zion-recruit-${effectiveTenantId.slice(0, 8)}`;

        try {
          const qrCode = await evolutionApiRequest<{
            qrcode: { base64: string };
          }>(`/instance/qrcode/${instanceName}`);

          return NextResponse.json({
            success: true,
            qrcode: qrCode.qrcode.base64,
          });
        } catch (error) {
          return NextResponse.json({
            error: "Não foi possível obter o QR code",
            details: error instanceof Error ? error.message : "Unknown error",
          }, { status: 400 });
        }
      }

      case "send": {
        const { phone, message } = body;

        if (!phone || !message) {
          return NextResponse.json({
            error: "Phone e message são obrigatórios",
          }, { status: 400 });
        }

        const channel = await db.messageChannel.findFirst({
          where: {
            tenantId: effectiveTenantId,
            type: "WHATSAPP",
            isActive: true,
          },
        });

        if (!channel?.instanceName) {
          return NextResponse.json({
            error: "WhatsApp não está conectado",
          }, { status: 400 });
        }

        // Use the new evolution service for sending (DB-backed)
        try {
          const service = await getEvolutionService(effectiveTenantId);
          const result = await service.sendTextMessage(phone, message);

          if (!result.success) {
            return NextResponse.json({
              error: result.error || "Erro ao enviar mensagem",
            }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            messageId: result.messageId,
            status: "sent",
          });
        } catch (error) {
          return NextResponse.json({
            error: error instanceof Error ? error.message : "Erro ao enviar mensagem",
          }, { status: 500 });
        }
      }

      case "check-number": {
        const { phone } = body;

        if (!phone) {
          return NextResponse.json({ error: "Phone é obrigatório" }, { status: 400 });
        }

        if (!isEvolutionConfigured()) {
          return NextResponse.json({ error: "Evolution API não configurada" }, { status: 400 });
        }

        const channel = await db.messageChannel.findFirst({
          where: {
            tenantId: effectiveTenantId,
            type: "WHATSAPP",
            isActive: true,
          },
        });

        if (!channel?.instanceName) {
          return NextResponse.json({ error: "WhatsApp não está conectado" }, { status: 400 });
        }

        // Direct API call for number check
        const cleaned = phone.replace(/\D/g, "");
        let formattedNumber = cleaned;
        if (cleaned.length === 10 || cleaned.length === 11) {
          formattedNumber = `55${cleaned}`;
        }

        try {
          const data = await evolutionApiRequest<
            Array<{ number: string; exists: boolean; jid?: string }>
          >(`/chat/whatsappNumbers/${channel.instanceName}`, "POST", {
            numbers: [formattedNumber],
          });

          const result = data.find((r) => r.number === formattedNumber);

          return NextResponse.json({
            success: true,
            exists: result?.exists || false,
            jid: result?.jid,
          });
        } catch {
          return NextResponse.json({
            success: true,
            exists: false,
          });
        }
      }

      default:
        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }
  } catch (error) {
    return authErrorResponse(error);
  }
}
