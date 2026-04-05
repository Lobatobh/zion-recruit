/**
 * Conversation Takeover API - Zion Recruit
 * POST /api/messages/conversations/[id]/takeover
 * Allows a recruiter to take over an AI-managed conversation
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
    const recruiterId = session.user.id;
    const recruiterName = session.user.name || "Recrutador";

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
        { error: "Não é possível assumir uma conversa encerrada ou arquivada" },
        { status: 400 }
      );
    }

    // Update conversation: set takeover fields and disable AI mode
    const updated = await db.conversation.update({
      where: { id },
      data: {
        takenOverBy: recruiterId,
        takenOverAt: new Date(),
        takenOverName: recruiterName,
        aiMode: false,
        needsIntervention: false,
        interventionReason: null,
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

    // Create system message about takeover
    await db.message.create({
      data: {
        conversationId: id,
        senderType: "SYSTEM" as SenderType,
        senderName: "Sistema",
        content: `🎯 ${recruiterName} assumiu a conversa`,
        contentType: "TEXT" as ContentType,
        channel: (conversation.channel || "CHAT") as ChannelType,
        status: "SENT" as MessageStatus,
      },
    });

    // Resolve any pending human intervention
    const pendingIntervention = await db.humanIntervention.findFirst({
      where: { conversationId: id, resolvedAt: null },
      orderBy: { triggeredAt: "desc" },
    });

    if (pendingIntervention) {
      await db.humanIntervention.update({
        where: { id: pendingIntervention.id },
        data: {
          resolvedAt: new Date(),
          resolvedBy: recruiterId,
          resolutionNotes: `Conversa assumida por ${recruiterName}`,
        },
      });
    }

    return NextResponse.json({
      conversation: {
        ...updated,
        aiMode: updated.aiMode,
        needsIntervention: updated.needsIntervention,
      },
      message: `Conversa assumida por ${recruiterName} com sucesso`,
    });
  } catch (error) {
    console.error("Error in conversation takeover:", error);
    return NextResponse.json(
      { error: "Falha ao assumir conversa" },
      { status: 500 }
    );
  }
}
