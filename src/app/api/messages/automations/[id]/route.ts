/**
 * Automation by ID API - Zion Recruit
 * GET, PATCH, DELETE a single automation
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEMO_TENANT_ID = "cmn67w6by0000otpmwm26xoo8";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/messages/automations/[id] - Get automation by ID
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const automation = await db.automation.findFirst({
      where: { id, tenantId: DEMO_TENANT_ID },
    });

    if (!automation) {
      return NextResponse.json(
        { error: "Automação não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ automation });
  } catch (error) {
    console.error("Erro ao buscar automação:", error);
    return NextResponse.json(
      { error: "Falha ao carregar automação" },
      { status: 500 }
    );
  }
}

// PATCH /api/messages/automations/[id] - Update automation
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const existing = await db.automation.findFirst({
      where: { id, tenantId: DEMO_TENANT_ID },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Automação não encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      channel,
      config,
      aiTone,
      aiLanguage,
      aiInstructions,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (channel !== undefined) updateData.channel = channel;
    if (config !== undefined)
      updateData.config = typeof config === "string" ? config : JSON.stringify(config);
    if (aiTone !== undefined) updateData.aiTone = aiTone;
    if (aiLanguage !== undefined) updateData.aiLanguage = aiLanguage;
    if (aiInstructions !== undefined)
      updateData.aiInstructions = aiInstructions;

    const automation = await db.automation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ automation });
  } catch (error) {
    console.error("Erro ao atualizar automação:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar automação" },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/automations/[id] - Delete automation
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const existing = await db.automation.findFirst({
      where: { id, tenantId: DEMO_TENANT_ID },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Automação não encontrada" },
        { status: 404 }
      );
    }

    await db.automation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir automação:", error);
    return NextResponse.json(
      { error: "Falha ao excluir automação" },
      { status: 500 }
    );
  }
}
