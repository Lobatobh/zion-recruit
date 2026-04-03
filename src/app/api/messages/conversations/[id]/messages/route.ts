/**
 * Messages API - Zion Recruit
 * Handles messages within a conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SenderType, ContentType, ChannelType, MessageStatus } from "@prisma/client";

// GET /api/messages/conversations/[id]/messages - Get messages
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
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    const limit = parseInt(searchParams.get("limit") || "50");

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

    // Build query
    const where: Record<string, unknown> = { conversationId: id };
    if (before) {
      where.sentAt = { lt: new Date(before) };
    }

    const messages = await db.message.findMany({
      where,
      orderBy: { sentAt: "asc" },
      take: limit,
    });

    return NextResponse.json({
      messages,
      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Falha ao carregar mensagens" },
      { status: 500 }
    );
  }
}

// POST /api/messages/conversations/[id]/messages - Send message
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
    const userId = session.user.id as string;
    const body = await request.json();
    const { content, contentType = "TEXT", mediaUrl, mediaType, senderType = "RECRUITER" } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json(
        { error: "Conteúdo da mensagem é obrigatório" },
        { status: 400 }
      );
    }

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

    // Create message
    const message = await db.message.create({
      data: {
        conversationId: id,
        senderType: senderType as SenderType,
        senderId: userId,
        senderName: session.user.name || "Recrutador",
        content: content || "",
        contentType: contentType as ContentType,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        channel: conversation.channel as ChannelType,
        status: "SENT" as MessageStatus,
        isAiGenerated: false,
        needsReview: false,
      },
    });

    // Update conversation last message
    await db.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: content?.substring(0, 100) || "Mídia",
        unreadByCandidate: true,
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Falha ao enviar mensagem" },
      { status: 500 }
    );
  }
}
