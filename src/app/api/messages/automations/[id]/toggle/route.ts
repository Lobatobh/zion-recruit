/**
 * Automation Toggle API - Zion Recruit
 * POST to toggle automation enabled/disabled status
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper';

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/messages/automations/[id]/toggle - Toggle automation enabled status
export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);
    const { id } = await context.params;

    const automation = await db.automation.findFirst({
      where: { id, tenantId },
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
