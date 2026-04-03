/**
 * Google Calendar Status API - Zion Recruit
 * Returns the current status of Google Calendar integration
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

// GET /api/calendar/status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const effectiveTenantId = await getEffectiveTenantId(session);

    if (!effectiveTenantId) {
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    // Check if Google OAuth is configured
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const isConfigured = !!(clientId && clientSecret);

    // For now, return disconnected status
    // In a full implementation, you would check stored tokens
    return NextResponse.json({
      connected: false,
      configured: isConfigured,
      email: null,
      calendarId: null,
      calendarName: null,
    });
  } catch (error) {
    console.error("Error checking Google Calendar status:", error);
    return NextResponse.json({ error: "Erro ao verificar status do Google Calendar" }, { status: 500 });
  }
}
