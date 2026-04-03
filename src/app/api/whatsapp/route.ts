/**
 * WhatsApp API - Zion Recruit
 * Send WhatsApp messages via Evolution API
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEvolutionService, sendCandidateNotificationMessage } from "@/lib/whatsapp/evolution-service";

// GET /api/whatsapp - Get WhatsApp status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Get tenant - either from session or first available (demo mode)
    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({
        configured: false,
        status: "demo",
        message: "WhatsApp integration running in demo mode",
      });
    }

    // Check if credentials exist
    const credential = await db.apiCredential.findFirst({
      where: {
        tenantId,
        provider: 'EVOLUTION',
        isActive: true,
      },
    });

    if (!credential) {
      return NextResponse.json({
        configured: false,
        status: "demo",
        message: "WhatsApp integration not configured",
      });
    }

    // Get actual status from Evolution service
    try {
      const service = await getEvolutionService(tenantId);
      const statusResult = await service.checkInstanceStatus();

      return NextResponse.json({
        configured: true,
        status: statusResult.status || "unknown",
      });
    } catch {
      return NextResponse.json({
        configured: true,
        status: "error",
        message: "Could not connect to Evolution API",
      });
    }
  } catch (error) {
    console.error("Error getting WhatsApp status:", error);
    return NextResponse.json(
      { error: "Erro ao verificar status do WhatsApp" },
      { status: 500 }
    );
  }
}

// POST /api/whatsapp - Send WhatsApp message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Get tenant - either from session or first available (demo mode)
    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant não encontrado" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { candidateId, message, type = 'status_update' } = body;

    if (!candidateId) {
      return NextResponse.json(
        { error: "candidateId é obrigatório" },
        { status: 400 }
      );
    }

    // Get candidate
    const candidate = await db.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    if (!candidate.phone) {
      return NextResponse.json(
        { error: "Candidato não tem telefone cadastrado" },
        { status: 400 }
      );
    }

    // Send message using the evolution service
    const result = await sendCandidateNotificationMessage(
      tenantId,
      candidateId,
      type as 'welcome' | 'status_update' | 'follow_up' | 'offer' | 'rejection',
      message
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erro ao enviar mensagem" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      sentTo: candidate.phone,
    });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return NextResponse.json(
      { error: "Erro ao enviar mensagem" },
      { status: 500 }
    );
  }
}
