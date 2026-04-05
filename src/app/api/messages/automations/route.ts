/**
 * Automations API - Zion Recruit
 * Full CRUD for automations with computed stats
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AutomationType, AutomationChannel } from "@prisma/client";
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper';

export const dynamic = "force-dynamic";

// GET /api/messages/automations - List all automations with stats
export async function GET() {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const automations = await db.automation.findMany({
      where: { tenantId },
      orderBy: { type: "asc" },
    });

    const activeCount = automations.filter((a) => a.enabled).length;
    const totalExecutions = automations.reduce(
      (sum, a) => sum + a.executionCount,
      0
    );

    // channelsConnected = count of distinct channels among enabled automations
    const enabledChannels = automations
      .filter((a) => a.enabled)
      .map((a) => a.channel);
    const channelsConnected = new Set(enabledChannels).size;

    return NextResponse.json({
      automations,
      stats: {
        activeCount,
        totalExecutions,
        channelsConnected,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar automações:", error);
    return NextResponse.json(
      { error: "Falha ao carregar automações" },
      { status: 500 }
    );
  }
}

// POST /api/messages/automations - Create automation
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const body = await request.json();
    const {
      type,
      name,
      description,
      channel,
      config,
      aiTone,
      aiLanguage,
      aiInstructions,
    } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: "Tipo e nome são obrigatórios" },
        { status: 400 }
      );
    }

    // Check if automation type already exists for tenant
    const existing = await db.automation.findFirst({
      where: {
        tenantId,
        type: type as AutomationType,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma automação deste tipo" },
        { status: 400 }
      );
    }

    const automation = await db.automation.create({
      data: {
        tenantId,
        type: type as AutomationType,
        name,
        description: description || null,
        channel: (channel as AutomationChannel) || AutomationChannel.ALL,
        config: config ? JSON.stringify(config) : null,
        aiTone: aiTone || "friendly",
        aiLanguage: aiLanguage || "pt-BR",
        aiInstructions: aiInstructions || null,
        enabled: false,
      },
    });

    return NextResponse.json({ automation });
  } catch (error) {
    console.error("Erro ao criar automação:", error);
    return NextResponse.json(
      { error: "Falha ao criar automação" },
      { status: 500 }
    );
  }
}
