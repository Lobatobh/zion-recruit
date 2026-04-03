/**
 * WhatsApp Action API - Zion Recruit
 * Handles WhatsApp actions: connect, disconnect, qrcode, send
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { evolutionService } from "@/lib/evolution-service";

// Helper to get effective tenant ID
async function getEffectiveTenantId(session: { user?: { id?: string; tenantId?: string | null } }): Promise<string | null> {
  if (session?.user?.tenantId) {
    const tenant = await db.tenant.findUnique({ where: { id: session.user.tenantId } });
    if (tenant) return tenant.id;
  }

  if (session?.user?.id) {
    const membership = await db.tenantMember.findFirst({
      where: { userId: session.user.id },
    });
    if (membership) return membership.tenantId;
  }

  const firstTenant = await db.tenant.findFirst();
  return firstTenant?.id || null;
}

// Configure Evolution service
async function configureEvolution() {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (baseUrl && apiKey) {
    evolutionService.configure({
      baseUrl,
      apiKey,
      instanceName: "zion-recruit",
    });
    return true;
  }
  return false;
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

    if (!effectiveTenantId) {
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const { action } = await params;
    const body = await request.json().catch(() => ({}));

    // Check if Evolution API is configured
    const isConfigured = await configureEvolution();
    
    if (!isConfigured) {
      return NextResponse.json({
        error: "Evolution API não configurada",
        hint: "Configure as variáveis de ambiente EVOLUTION_API_URL e EVOLUTION_API_KEY",
      }, { status: 400 });
    }

    switch (action) {
      case "connect": {
        // Create or get existing instance
        const instanceName = `zion-recruit-${effectiveTenantId.slice(0, 8)}`;
        
        try {
          // Try to create instance
          const instance = await evolutionService.createInstance(instanceName);
          
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
          const qrCode = await evolutionService.getQRCode(instanceName);

          return NextResponse.json({
            success: true,
            channel,
            qrcode: qrCode.qrcode.base64,
            instance: instance.instance,
          });
        } catch (error) {
          // Instance might already exist, try to get QR code
          try {
            const qrCode = await evolutionService.getQRCode(instanceName);
            
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

        await evolutionService.logout(channel.instanceName);
        
        await db.messageChannel.update({
          where: { id: channel.id },
          data: { isActive: false },
        });

        return NextResponse.json({ success: true });
      }

      case "qrcode": {
        const channel = await db.messageChannel.findFirst({
          where: {
            tenantId: effectiveTenantId,
            type: "WHATSAPP",
          },
        });

        const instanceName = channel?.instanceName || `zion-recruit-${effectiveTenantId.slice(0, 8)}`;
        
        try {
          const qrCode = await evolutionService.getQRCode(instanceName);
          
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

        const result = await evolutionService.sendTextMessage(
          channel.instanceName,
          phone,
          message
        );

        return NextResponse.json({
          success: true,
          messageId: result.key.id,
          status: result.status,
        });
      }

      case "check-number": {
        const { phone } = body;

        if (!phone) {
          return NextResponse.json({ error: "Phone é obrigatório" }, { status: 400 });
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

        const result = await evolutionService.checkNumber(channel.instanceName, phone);

        return NextResponse.json({
          success: true,
          exists: result.exists,
          jid: result.jid,
        });
      }

      default:
        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in WhatsApp action:", error);
    return NextResponse.json({
      error: "Erro ao executar ação",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
