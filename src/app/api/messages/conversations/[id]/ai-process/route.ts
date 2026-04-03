/**
 * AI Process API - Zion Recruit
 * Handles AI-powered message processing for conversations
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  processCandidateMessage,
  sendAIMessage,
  startAutomatedScreening,
} from "@/lib/ai-screening-service";
import { SenderType, ContentType, ChannelType, MessageStatus } from "@prisma/client";

// POST /api/messages/conversations/[id]/ai-process - Process message with AI
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = session.user.tenantId as string;
    const body = await request.json();
    const { candidateMessage, startScreening } = body;

    // Verify conversation exists and belongs to tenant
    const conversation = await db.conversation.findFirst({
      where: { id, tenantId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada" },
        { status: 404 }
      );
    }

    // If starting screening, just send welcome message
    if (startScreening) {
      await startAutomatedScreening(id);
      return NextResponse.json({ success: true, message: "Triagem iniciada" });
    }

    // If no message, return error
    if (!candidateMessage) {
      return NextResponse.json(
        { error: "Mensagem do candidato é obrigatória" },
        { status: 400 }
      );
    }

    // Check if AI mode is enabled
    if (!conversation.aiMode) {
      return NextResponse.json(
        { error: "Modo IA desativado para esta conversa" },
        { status: 400 }
      );
    }

    // Save candidate message first
    await db.message.create({
      data: {
        conversationId: id,
        senderType: "CANDIDATE" as SenderType,
        content: candidateMessage,
        contentType: "TEXT" as ContentType,
        channel: conversation.channel as ChannelType,
        status: "SENT" as MessageStatus,
        isAiGenerated: false,
      },
    });

    // Update last message
    await db.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: candidateMessage.substring(0, 100),
      },
    });

    // Process with AI
    const result = await processCandidateMessage(id, candidateMessage);

    // Send AI response
    await sendAIMessage(
      id,
      result.response,
      result.nextStage,
      result.collectedData,
      result.needsIntervention,
      result.interventionReason
    );

    return NextResponse.json({
      success: true,
      response: result.response,
      nextStage: result.nextStage,
      needsIntervention: result.needsIntervention,
      interventionReason: result.interventionReason,
      collectedData: result.collectedData,
    });
  } catch (error) {
    console.error("Error processing AI message:", error);
    return NextResponse.json(
      { error: "Falha ao processar mensagem com IA" },
      { status: 500 }
    );
  }
}
