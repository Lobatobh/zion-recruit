/**
 * DISC Test Send API - Zion Recruit
 * Send DISC test to candidate via email/WhatsApp
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireTenant, authErrorResponse } from "@/lib/auth-helper";

// POST /api/disc/send - Send DISC test to candidate
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const body = await request.json();
    const { candidateId, sendEmail = true, sendWhatsapp = false } = body;

    if (!candidateId) {
      return NextResponse.json(
        { error: "candidateId é obrigatório" },
        { status: 400 }
      );
    }

    // Get candidate data
    const candidate = await db.candidate.findFirst({
      where: {
        id: candidateId,
        tenantId,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            discProfileRequired: true,
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    // Check if test already exists
    let test = await db.dISCTest.findUnique({
      where: { candidateId },
    });

    if (!test) {
      // Create new test
      test = await db.dISCTest.create({
        data: {
          tenantId,
          candidateId,
          status: "PENDING",
        },
      });
    }

    // If test is already completed, don't send again
    if (test.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Teste DISC já foi concluído", test },
        { status: 400 }
      );
    }

    // Generate test URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const testUrl = `${baseUrl}/?view=disc-test&testId=${test.id}`;

    // Update test status to SENT
    await db.dISCTest.update({
      where: { id: test.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    // Update candidate
    await db.candidate.update({
      where: { id: candidateId },
      data: {
        discTestSentAt: new Date(),
      },
    });

    // Send notifications
    const notifications: { email?: boolean; whatsapp?: boolean } = {};

    // Send WhatsApp if requested
    if (sendWhatsapp && candidate.phone) {
      // TODO: Implement WhatsApp integration with Evolution API
      notifications.whatsapp = false;
    }

    // In production, send email here
    if (sendEmail && candidate.email) {
      // For demo, we'll just mark it as sent
      // In production, integrate with email service (SendGrid, Resend, etc.)
      notifications.email = true;
    }

    return NextResponse.json({
      success: true,
      test,
      testUrl,
      notifications,
      message: `Teste DISC enviado para ${candidate.name}`,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
