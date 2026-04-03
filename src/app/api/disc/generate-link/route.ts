/**
 * DISC Test Link Generator - Zion Recruit
 * API for generating public DISC test links
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DISCStatus } from "@prisma/client";

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

// POST /api/disc/generate-link
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

    const body = await request.json();
    const { candidateId, expiresInDays } = body;

    if (!candidateId) {
      return NextResponse.json({ error: "ID do candidato é obrigatório" }, { status: 400 });
    }

    // Get candidate
    const candidate = await db.candidate.findFirst({
      where: {
        id: candidateId,
        tenantId: effectiveTenantId,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidato não encontrado" }, { status: 404 });
    }

    // Check if test already exists
    let test = await db.dISTest.findFirst({
      where: {
        candidateId,
        status: { not: DISCStatus.EXPIRED },
      },
    });

    if (!test) {
      // Create new test
      test = await db.dISTest.create({
        data: {
          tenantId: effectiveTenantId,
          candidateId,
          status: DISCStatus.PENDING,
          sentAt: new Date(),
        },
      });
    } else {
      // Update existing test
      test = await db.dISTest.update({
        where: { id: test.id },
        data: {
          sentAt: new Date(),
          status: test.status === DISCStatus.COMPLETED ? test.status : DISCStatus.SENT,
        },
      });
    }

    // Generate public link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null) ||
      "http://localhost:3000";

    const publicLink = `${baseUrl}/disc?testId=${test.id}`;

    // Update candidate
    await db.candidate.update({
      where: { id: candidateId },
      data: { discTestSentAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      test: {
        id: test.id,
        status: test.status,
        sentAt: test.sentAt,
      },
      publicLink,
      qrCodeData: publicLink,
    });
  } catch (error) {
    console.error("Error generating DISC test link:", error);
    return NextResponse.json({ error: "Erro ao gerar link do teste" }, { status: 500 });
  }
}
