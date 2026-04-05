/**
 * DISC Test Link Generator - Zion Recruit
 * API for generating public DISC test links
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DISCStatus } from "@prisma/client";
import { requireAuth, requireTenant, authErrorResponse } from "@/lib/auth-helper";

// POST /api/disc/generate-link
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const body = await request.json();
    const { candidateId, expiresInDays } = body;

    if (!candidateId) {
      return NextResponse.json({ error: "ID do candidato é obrigatório" }, { status: 400 });
    }

    // Get candidate
    const candidate = await db.candidate.findFirst({
      where: {
        id: candidateId,
        tenantId,
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
          tenantId,
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
    return authErrorResponse(error);
  }
}
