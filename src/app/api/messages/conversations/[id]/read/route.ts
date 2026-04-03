/**
 * Mark Conversation as Read - Zion Recruit
 * POST /api/messages/conversations/[id]/read
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    // Verify conversation belongs to tenant before updating
    const conversation = await db.conversation.findFirst({
      where: { id, tenantId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada" },
        { status: 404 }
      );
    }

    // Update conversation: reset unread count, mark messages as read
    const updated = await db.conversation.update({
      where: { id },
      data: {
        unreadCount: 0,
        updatedAt: new Date(),
      },
    });

    // Also mark unread messages as read with timestamp
    await db.message.updateMany({
      where: {
        conversationId: id,
        senderType: { not: "RECRUITER" },
        readAt: null,
      },
      data: {
        readAt: new Date(),
        status: "READ",
      },
    });

    return NextResponse.json({ success: true, unreadCount: 0 });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    return NextResponse.json(
      { error: "Falha ao marcar como lida" },
      { status: 500 }
    );
  }
}
