/**
 * Conversations API - Zion Recruit
 * Handles conversation listing and creation
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/messages/conversations - List conversations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const tenantId = session.user.tenantId as string;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const channel = searchParams.get("channel");
    const jobId = searchParams.get("jobId");
    const search = searchParams.get("search");
    const needsIntervention = searchParams.get("needsIntervention");

    // Build where clause with Prisma - always filter by tenant
    const where: Record<string, unknown> = { tenantId };

    if (status) {
      where.status = status;
    }
    if (channel) {
      where.channel = channel;
    }
    if (jobId) {
      where.jobId = jobId;
    }
    if (needsIntervention === "true") {
      where.needsIntervention = true;
    }

    // Search filter: candidate name or email
    if (search) {
      where.OR = [
        { candidate: { name: { contains: search } } },
        { candidate: { email: { contains: search } } },
        { lastMessagePreview: { contains: search } },
      ];
    }

    const conversations = await db.conversation.findMany({
      where,
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
      orderBy: { lastMessageAt: "desc" },
      take: 50,
    });

    // Transform to match expected format
    const formatted = conversations.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      candidateId: c.candidateId,
      jobId: c.jobId,
      channel: c.channel,
      status: c.status,
      aiMode: c.aiMode,
      aiStage: c.aiStage,
      lastMessageAt: c.lastMessageAt?.toISOString(),
      lastMessagePreview: c.lastMessagePreview,
      unreadCount: c.unreadCount,
      needsIntervention: c.needsIntervention,
      interventionReason: c.interventionReason,
      createdAt: c.createdAt?.toISOString(),
      candidate: c.candidate,
      job: c.job,
    }));

    // Stats - also tenant-filtered
    const total = await db.conversation.count({ where });
    const unread = await db.conversation.count({ where: { tenantId, unreadCount: { gt: 0 } } });
    const active = await db.conversation.count({ where: { tenantId, status: "ACTIVE" } });

    return NextResponse.json({
      conversations: formatted,
      total,
      unread,
      active,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Falha ao carregar conversas" },
      { status: 500 }
    );
  }
}

// POST /api/messages/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateId, jobId, channel = "CHAT" } = body;

    if (!candidateId) {
      return NextResponse.json(
        { error: "ID do candidato é obrigatório" },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const existing = await db.conversation.findFirst({
      where: { candidateId, channel },
    });

    if (existing) {
      return NextResponse.json({ conversation: existing });
    }

    // Get tenant from candidate
    const candidate = await db.candidate.findUnique({
      where: { id: candidateId },
      select: { tenantId: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    // Create new conversation
    const conversation = await db.conversation.create({
      data: {
        tenantId: candidate.tenantId,
        candidateId,
        jobId: jobId || null,
        channel,
        status: "ACTIVE",
        aiMode: true,
        aiStage: "WELCOME",
        lastMessageAt: new Date(),
        unreadCount: 0,
        needsIntervention: false,
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

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Falha ao criar conversa" },
      { status: 500 }
    );
  }
}
