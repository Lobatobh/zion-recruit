/**
 * Channels API - Zion Recruit
 * Handles message channel configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ChannelType } from "@prisma/client";
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper';

export const dynamic = "force-dynamic";

// GET /api/messages/channels - List channels
export async function GET() {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const channels = await db.messageChannel.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return NextResponse.json(
      { error: "Falha ao carregar canais" },
      { status: 500 }
    );
  }
}

// POST /api/messages/channels - Create channel
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const body = await request.json();
    const { type, name, config, instanceName, instanceId } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: "Tipo e nome são obrigatórios" },
        { status: 400 }
      );
    }

    // Check if channel type already exists
    const existing = await db.messageChannel.findFirst({
      where: {
        tenantId,
        type: type as ChannelType,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Este tipo de canal já está configurado" },
        { status: 400 }
      );
    }

    const channel = await db.messageChannel.create({
      data: {
        tenantId,
        type: type as ChannelType,
        name,
        config: config ? JSON.stringify(config) : null,
        instanceName: instanceName || null,
        instanceId: instanceId || null,
        isActive: true,
      },
    });

    return NextResponse.json({ channel });
  } catch (error) {
    console.error("Error creating channel:", error);
    return NextResponse.json(
      { error: "Falha ao criar canal" },
      { status: 500 }
    );
  }
}
