/**
 * Candidate Reply API - Zion Recruit
 *
 * Handles candidate replies within a conversation.
 * When AI mode is enabled, automatically triggers AI screening responses.
 * When AI mode is disabled, simply persists the candidate's message
 * for the recruiter to handle manually.
 *
 * POST /api/messages/conversations/[id]/candidate-reply
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  processCandidateMessage,
  sendAIMessage,
} from "@/lib/ai-screening-service";
import { SenderType, ContentType, ChannelType, MessageStatus } from "@prisma/client";

const DEMO_TENANT_ID = "cmmxleln70000px3a43u36vum";

interface CandidateReplyBody {
  message: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── 1. Validate session ──────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { id: conversationId } = await params;
    const tenantId = session.user.tenantId as string;

    // ── 2. Parse & validate request body ─────────────────────────────
    const body: CandidateReplyBody = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Mensagem do candidato é obrigatória" },
        { status: 400 }
      );
    }

    // ── 3. Get conversation with candidate and job details ───────────
    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            job: {
              select: {
                id: true,
                title: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada" },
        { status: 404 }
      );
    }

    // ── 4. Save candidate message ────────────────────────────────────
    const candidateMessage = await db.message.create({
      data: {
        conversationId,
        senderType: SenderType.CANDIDATE,
        senderId: conversation.candidate.id,
        senderName: conversation.candidate.name,
        content: message.trim(),
        contentType: ContentType.TEXT,
        channel: conversation.channel,
        status: MessageStatus.SENT,
        isAiGenerated: false,
      },
    });

    // ── 5. Branch: AI mode OFF — just persist & return ───────────────
    if (!conversation.aiMode) {
      // Update conversation metadata
      await db.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: message.trim().substring(0, 100),
          unreadCount: { increment: 1 },
        },
      });

      return NextResponse.json({
        success: true,
        aiMode: false,
        candidateMessage,
        aiResponse: null,
      });
    }

    // ── 6. Branch: AI mode ON — process & respond ────────────────────
    try {
      // Call the AI screening service to generate a response
      const aiResult = await processCandidateMessage(
        conversationId,
        message.trim()
      );

      // Persist the AI response and update conversation state
      await sendAIMessage(
        conversationId,
        aiResult.response,
        aiResult.nextStage,
        aiResult.collectedData,
        aiResult.needsIntervention,
        aiResult.interventionReason
      );

      return NextResponse.json({
        success: true,
        aiMode: true,
        candidateMessage,
        aiResponse: {
          content: aiResult.response,
          stage: aiResult.nextStage,
          needsIntervention: aiResult.needsIntervention,
          interventionReason: aiResult.interventionReason ?? null,
          collectedData: aiResult.collectedData,
        },
      });
    } catch (aiError) {
      console.error(
        `[candidate-reply] AI processing failed for conversation ${conversationId}:`,
        aiError
      );

      // Still return the saved candidate message so the UI isn't broken.
      // Flag the failure so the frontend can show a retry or warning.
      return NextResponse.json({
        success: true,
        aiMode: true,
        candidateMessage,
        aiResponse: null,
        aiError: "Falha ao gerar resposta IA. O recrutador será notificado.",
      });
    }
  } catch (error) {
    console.error("[candidate-reply] Unexpected error:", error);
    return NextResponse.json(
      { error: "Falha ao processar resposta do candidato" },
      { status: 500 }
    );
  }
}
