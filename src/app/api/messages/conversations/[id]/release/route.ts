/**
 * Conversation Release to AI API - Zion Recruit
 * POST /api/messages/conversations/[id]/release
 * Allows a recruiter to release a conversation back to AI control
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SenderType, ContentType, ChannelType, MessageStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

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

    // Find conversation belonging to tenant
    const conversation = await db.conversation.findFirst({
      where: { id, tenantId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada" },
        { status: 404 }
      );
    }

    if (conversation.status === "ARCHIVED" || conversation.status === "CLOSED") {
      return NextResponse.json(
        { error: "Não é possível liberar uma conversa encerrada ou arquivada" },
        { status: 400 }
      );
    }

    if (conversation.aiMode) {
      return NextResponse.json(
        { error: "A IA já está no controle desta conversa" },
        { status: 400 }
      );
    }

    // Update conversation: clear takeover fields and enable AI mode
    const updated = await db.conversation.update({
      where: { id },
      data: {
        takenOverBy: null,
        takenOverAt: null,
        takenOverName: null,
        aiMode: true,
        aiStage: conversation.aiStage || "WELCOME",
        updatedAt: new Date(),
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photo: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
      },
    });

    // Create system message about AI resuming
    await db.message.create({
      data: {
        conversationId: id,
        senderType: "SYSTEM" as SenderType,
        senderName: "Sistema",
        content: "🤖 IA Zoe reassumiu o controle da conversa",
        contentType: "TEXT" as ContentType,
        channel: (conversation.channel || "CHAT") as ChannelType,
        status: "SENT" as MessageStatus,
      },
    });

    return NextResponse.json({
      conversation: {
        ...updated,
        aiMode: updated.aiMode,
        needsIntervention: updated.needsIntervention,
      },
      message: "Conversa liberada para a IA Zoe com sucesso",
    });
  } catch (error) {
    console.error("Error in conversation release:", error);
    return NextResponse.json(
      { error: "Falha ao liberar conversa para a IA" },
      { status: 500 }
    );
  }
}
