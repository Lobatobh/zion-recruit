/**
 * Portal Messages API
 * GET: Get messages/conversations
 * POST: Send message to recruiter
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Retrieve messages
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-portal-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 401 }
      );
    }

    // Find portal access by token
    const portalAccess = await db.candidatePortalAccess.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        candidate: true,
      },
    });

    if (!portalAccess) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const email = portalAccess.candidate.email;

    // Get all candidate IDs for this email
    const candidates = await db.candidate.findMany({
      where: { email },
      select: { id: true },
    });

    const candidateIds = candidates.map(c => c.id);

    // Get conversations
    const conversations = await db.conversation.findMany({
      where: {
        candidateId: {
          in: candidateIds,
        },
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
          },
        },
        messages: {
          orderBy: {
            sentAt: 'asc',
          },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    // Mark messages as read
    if (conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id);
      await db.conversation.updateMany({
        where: {
          id: { in: conversationIds },
          unreadByCandidate: true,
        },
        data: {
          unreadByCandidate: false,
          unreadCount: 0,
        },
      });
    }

    // Format conversations
    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      channel: conv.channel,
      status: conv.status,
      job: conv.job,
      lastMessageAt: conv.lastMessageAt,
      lastMessagePreview: conv.lastMessagePreview,
      messages: conv.messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        senderType: msg.senderType,
        senderName: msg.senderName,
        sentAt: msg.sentAt,
        isAiGenerated: msg.isAiGenerated,
        status: msg.status,
      })),
    }));

    return NextResponse.json({
      success: true,
      conversations: formattedConversations,
      total: formattedConversations.length,
    });
  } catch (error) {
    console.error('Portal messages error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve messages' },
      { status: 500 }
    );
  }
}

// POST - Send message
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-portal-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 401 }
      );
    }

    // Find portal access by token
    const portalAccess = await db.candidatePortalAccess.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        candidate: {
          include: {
            job: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (!portalAccess) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { conversationId, message, jobId } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    const candidate = portalAccess.candidate;
    let conversation;

    // Find or create conversation
    if (conversationId) {
      conversation = await db.conversation.findFirst({
        where: {
          id: conversationId,
          candidateId: candidate.id,
        },
      });
    }

    if (!conversation) {
      // Create new conversation
      conversation = await db.conversation.create({
        data: {
          tenantId: candidate.tenantId,
          candidateId: candidate.id,
          jobId: jobId || candidate.jobId,
          channel: 'CHAT',
          status: 'ACTIVE',
          aiMode: false, // Candidate messages don't go through AI initially
          lastMessageAt: new Date(),
          lastMessagePreview: message.substring(0, 100),
        },
      });
    }

    // Create message
    const newMessage = await db.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'CANDIDATE',
        senderId: candidate.id,
        senderName: candidate.name,
        content: message.trim(),
        contentType: 'TEXT',
        channel: 'CHAT',
        status: 'SENT',
        isAiGenerated: false,
        sentAt: new Date(),
      },
    });

    // Update conversation
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: message.substring(0, 100),
        status: 'ACTIVE',
      },
    });

    // Create notification for recruiters
    await db.notification.create({
      data: {
        tenantId: candidate.tenantId,
        type: 'MESSAGE_RECEIVED',
        category: 'MESSAGES',
        priority: 'NORMAL',
        title: 'Nova mensagem do candidato',
        message: `${candidate.name} enviou uma mensagem sobre a vaga ${candidate.job?.title || ''}`,
        actionUrl: `/?view=messages&conversation=${conversation.id}`,
        actionLabel: 'Ver conversa',
        entityType: 'conversation',
        entityId: conversation.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: {
        id: newMessage.id,
        content: newMessage.content,
        senderType: newMessage.senderType,
        senderName: newMessage.senderName,
        sentAt: newMessage.sentAt,
        status: newMessage.status,
      },
      conversation: {
        id: conversation.id,
        status: conversation.status,
      },
    });
  } catch (error) {
    console.error('Portal send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
