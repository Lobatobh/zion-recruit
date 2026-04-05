/**
 * Automations Seed API - Zion Recruit
 * Seeds default automations for the demo tenant if none exist
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AutomationType, AutomationChannel } from "@prisma/client";
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper';

export const dynamic = "force-dynamic";

const DEFAULT_AUTOMATIONS = [
  {
    type: AutomationType.WHATSAPP_BOT,
    name: "Bot WhatsApp",
    description: "Respostas automáticas via WhatsApp Evolution API",
    channel: AutomationChannel.WHATSAPP,
    config: {
      instanceName: "Zion Recruit",
      autoReply: true,
      greetingEnabled: true,
    },
    enabled: true,
  },
  {
    type: AutomationType.EMAIL_SEQUENCES,
    name: "Sequências de Email",
    description: "Campanhas de email automatizadas com follow-ups",
    channel: AutomationChannel.EMAIL,
    config: {
      provider: "SMTP",
      dailyLimit: 100,
      followUps: 3,
    },
    enabled: true,
  },
  {
    type: AutomationType.AI_SCREENING,
    name: "Triagem IA",
    description: "Qualificação automática de candidatos com IA",
    channel: AutomationChannel.ALL,
    config: {
      stages: 6,
      autoHandoff: true,
      minConfidence: 0.7,
    },
    enabled: true,
  },
  {
    type: AutomationType.AUTO_SCHEDULE,
    name: "Agendamento Automático",
    description: "Agenda entrevistas automaticamente após qualificação",
    channel: AutomationChannel.ALL,
    config: {
      calendarIntegration: "Google",
      bufferMinutes: 30,
      maxPerDay: 5,
    },
    enabled: false,
  },
  {
    type: AutomationType.LEAD_NURTURING,
    name: "Nutrição de Leads",
    description: "Mantém candidatos engajados com mensagens periódicas",
    channel: AutomationChannel.MULTI_CHANNEL,
    config: {
      frequency: "weekly",
      maxTouchpoints: 5,
    },
    enabled: false,
  },
];

// POST /api/messages/automations/seed - Seed default automations
export async function POST() {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const existingCount = await db.automation.count({
      where: { tenantId },
    });

    if (existingCount > 0) {
      const automations = await db.automation.findMany({
        where: { tenantId },
        orderBy: { type: "asc" },
      });

      return NextResponse.json({ automations, seeded: false });
    }

    // Create all default automations
    for (const def of DEFAULT_AUTOMATIONS) {
      await db.automation.create({
        data: {
          tenantId,
          type: def.type,
          name: def.name,
          description: def.description,
          channel: def.channel,
          config: JSON.stringify(def.config),
          aiTone: "friendly",
          aiLanguage: "pt-BR",
          aiInstructions: null,
          enabled: def.enabled,
        },
      });
    }

    const automations = await db.automation.findMany({
      where: { tenantId },
      orderBy: { type: "asc" },
    });

    return NextResponse.json({ automations, seeded: true });
  } catch (error) {
    console.error("Erro ao semear automações:", error);
    return NextResponse.json(
      { error: "Falha ao semear automações padrão" },
      { status: 500 }
    );
  }
}
