/**
 * Automation Toggle API - Zion Recruit
 * POST to toggle automation enabled/disabled status
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEMO_TENANT_ID = "cmn67w6by0000otpmwm26xoo8";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/messages/automations/[id]/toggle - Toggle automation enabled status
export async function POST(
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

    const newEnabled = !automation.enabled;

    const updated = await db.automation.update({
      where: { id },
      data: {
        enabled: newEnabled,
        // When enabling: reset lastRunAt for a fresh start
        ...(newEnabled ? { lastRunAt: null } : {}),
      },
    });

    return NextResponse.json({ automation: updated });
  } catch (error) {
    console.error("Erro ao alterar status da automação:", error);
    return NextResponse.json(
      { error: "Falha ao alterar status da automação" },
      { status: 500 }
    );
  }
}
