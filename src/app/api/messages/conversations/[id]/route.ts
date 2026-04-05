/**
 * Single Conversation API - Zion Recruit
 * GET /api/messages/conversations/[id]
 * PATCH /api/messages/conversations/[id]
 * DELETE /api/messages/conversations/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SenderType, ContentType, ChannelType, MessageStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
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

    const conversation = await db.conversation.findFirst({
      where: { id, tenantId },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photo: true,
            city: true,
            resumeText: true,
            matchScore: true,
            parsedSkills: true,
            linkedin: true,
            portfolio: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        aiMode: conversation.aiMode,
        needsIntervention: conversation.needsIntervention,
        messagesCount: conversation._count.messages,
        candidate: conversation.candidate,
        job: conversation.job,
      },
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Falha ao carregar conversa" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const conversation = await db.conversation.findFirst({
      where: { id, tenantId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status !== undefined) updateData.status = body.status;
    if (body.aiMode !== undefined) updateData.aiMode = body.aiMode;
    if (body.aiStage !== undefined) updateData.aiStage = body.aiStage;
    if (body.notes !== undefined) updateData.collectedData = body.notes;

    // Handle recruiter takeover via PATCH
    if (body.takenOverBy && body.takenOverName) {
      updateData.takenOverBy = body.takenOverBy;
      updateData.takenOverAt = new Date();
      updateData.takenOverName = body.takenOverName;
      updateData.aiMode = false;

      // Create system message for takeover
      await db.message.create({
        data: {
          conversationId: id,
          senderType: "SYSTEM" as SenderType,
          senderName: "Sistema",
          content: `🎯 ${body.takenOverName} assumiu a conversa`,
          contentType: "TEXT" as ContentType,
          channel: (conversation.channel || "CHAT") as ChannelType,
          status: "SENT" as MessageStatus,
        },
      });

      // Resolve any pending intervention
      const pendingIntervention = await db.humanIntervention.findFirst({
        where: { conversationId: id, resolvedAt: null },
        orderBy: { triggeredAt: "desc" },
      });
      if (pendingIntervention) {
        await db.humanIntervention.update({
          where: { id: pendingIntervention.id },
          data: {
            resolvedAt: new Date(),
            resolvedBy: body.takenOverBy,
            resolutionNotes: `Assumida por ${body.takenOverName} via PATCH`,
          },
        });
      }
    }

    // Handle release back to AI via PATCH
    if (body.releaseToAI === true) {
      updateData.takenOverBy = null;
      updateData.takenOverAt = null;
      updateData.takenOverName = null;
      updateData.aiMode = true;

      // Create system message for release
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
    }

    const updated = await db.conversation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      conversation: {
        ...updated,
        aiMode: updated.aiMode,
        needsIntervention: updated.needsIntervention,
      },
    });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar conversa" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const conversation = await db.conversation.findFirst({
      where: { id, tenantId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada" },
        { status: 404 }
      );
    }

    // Archive instead of hard delete
    const archived = await db.conversation.update({
      where: { id },
      data: {
        status: "ARCHIVED",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      conversation: archived,
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Falha ao arquivar conversa" },
      { status: 500 }
    );
  }
}
