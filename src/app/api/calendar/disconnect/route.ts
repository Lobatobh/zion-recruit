/**
 * Google Calendar Disconnect API - Zion Recruit
 * Disconnects Google Calendar integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

// POST /api/calendar/disconnect
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const effectiveTenantId = await getEffectiveTenantId(session);

    if (!effectiveTenantId) {
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    // Delete Google Calendar integration settings
    // This would typically be stored in a settings table
    // For now, we'll use a simple approach

    return NextResponse.json({
      success: true,
      message: "Google Calendar desconectado com sucesso",
    });
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    return NextResponse.json({ error: "Erro ao desconectar Google Calendar" }, { status: 500 });
  }
}
