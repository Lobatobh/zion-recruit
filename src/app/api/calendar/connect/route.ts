/**
 * Google Calendar Connect API - Zion Recruit
 * Initiates OAuth flow for Google Calendar integration
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

// POST /api/calendar/connect
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

    // Check if Google OAuth is configured
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        error: "Google OAuth não configurado",
        hint: "Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nas variáveis de ambiente",
      }, { status: 400 });
    }

    // Generate OAuth URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null) ||
      "http://localhost:3000";

    const redirectUri = `${baseUrl}/api/calendar/callback`;

    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ];

    const state = Buffer.from(JSON.stringify({
      tenantId: effectiveTenantId,
      userId: session.user.id,
      timestamp: Date.now(),
    })).toString("base64");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return NextResponse.json({
      authUrl: authUrl.toString(),
    });
  } catch (error) {
    console.error("Error connecting Google Calendar:", error);
    return NextResponse.json({ error: "Erro ao conectar Google Calendar" }, { status: 500 });
  }
}
