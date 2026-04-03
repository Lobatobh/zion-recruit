/**
 * Client Notifications API - Zion Recruit
 * List notifications for a client and manually trigger notifications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { trackEvent, EVENT_LABELS } from '@/lib/tracking';
import { TrackingEventType } from '@prisma/client';
import ZAI from 'z-ai-web-dev-sdk';

// GET /api/clients/[id]/notifications - List notifications for client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: clientId } = await params;

    // Verify client belongs to tenant
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        tenantId: session.user.tenantId,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {
      clientId,
    };

    if (status) {
      where.status = status;
    }

    const [notifications, total] = await Promise.all([
      db.trackingNotification.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              type: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.trackingNotification.count({ where }),
    ]);

    // Enrich event labels
    const enrichedNotifications = notifications.map((notif) => ({
      ...notif,
      eventLabel: EVENT_LABELS[notif.event.type] || notif.event.type,
    }));

    return NextResponse.json({
      notifications: enrichedNotifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar notificações' },
      { status: 500 }
    );
  }
}

// POST /api/clients/[id]/notifications - Manually trigger a notification
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: clientId } = await params;
    const body = await request.json();
    const { type, message: customMessage } = body;

    // Verify client belongs to tenant
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        tenantId: session.user.tenantId,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    // Determine event type
    const eventType = (type as TrackingEventType) || TrackingEventType.MANUAL_UPDATE;

    if (!Object.values(TrackingEventType).includes(eventType)) {
      return NextResponse.json(
        { error: 'Tipo de evento inválido' },
        { status: 400 }
      );
    }

    // Fetch active contacts
    const contacts = await db.clientContact.findMany({
      where: {
        clientId,
        isActive: true,
      },
    });

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum contato ativo encontrado para este cliente' },
        { status: 400 }
      );
    }

    // Build context for AI message generation
    const recentJobs = await db.job.findMany({
      where: {
        clientId,
        tenantId: session.user.tenantId,
      },
      select: { title: true, status: true, candidates: { select: { status: true } } },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    });

    const jobSummaries = recentJobs.map((j) => ({
      title: j.title,
      status: j.status,
      totalCandidates: j.candidates.length,
    }));

    // Generate AI contextual message
    let message = customMessage;
    if (!message) {
      try {
        const zai = await ZAI.create();

        const toneMap: Record<string, string> = {
          professional: 'profissional e objetivo',
          casual: 'casual e amigável',
          formal: 'formal e respeitoso',
        };
        const toneDescription = toneMap[client.aiTone] || toneMap.professional;

        const completion = await zai.chat.completions.create({
          model: 'gemini-2.0-flash',
          messages: [
            {
              role: 'system',
              content: `Você é um assistente de recrutamento profissional. Gere mensagens de atualização sobre o processo seletivo para a empresa contratante. Seja cordial mas ${toneDescription}. Responda em português brasileiro. A mensagem deve ser concisa (3-5 frases) e informativa.`,
            },
            {
              role: 'user',
              content: `Gere uma mensagem de atualização sobre o processo seletivo. Empresa: ${client.name}. Tipo de atualização: ${EVENT_LABELS[eventType]}. Vagas ativas: ${JSON.stringify(jobSummaries)}.`,
            },
          ],
          temperature: 0.5,
          max_tokens: 500,
        });

        message = completion.choices[0]?.message?.content;
        if (!message) {
          message = `Atualização do processo seletivo para ${client.name}: ${EVENT_LABELS[eventType]}.`;
        }
      } catch (aiError) {
        console.error('[notifications] Falha ao gerar mensagem com IA:', aiError);
        message = `Atualização do processo seletivo para ${client.name}: ${EVENT_LABELS[eventType]}.`;
      }
    }

    // Create tracking event
    const event = await trackEvent({
      tenantId: session.user.tenantId,
      clientId,
      type: eventType,
      title: EVENT_LABELS[eventType],
      description: message,
    });

    // Determine channel
    let channel: 'EMAIL' | 'WHATSAPP' | 'BOTH' = 'EMAIL';
    if (client.notifyEmail && client.notifyWhatsapp) {
      channel = 'BOTH';
    } else if (client.notifyWhatsapp) {
      channel = 'WHATSAPP';
    }

    // Create notification for each active contact
    const notifData = contacts.map((contact) => ({
      tenantId: session.user.tenantId,
      clientId,
      eventId: event.id,
      contactId: contact.id,
      channel,
      status: 'PENDING' as const,
      message,
      subject: `Atualização - ${client.name}`,
      aiGenerated: !customMessage,
    }));

    const created = await db.trackingNotification.createMany({ data: notifData });

    return NextResponse.json(
      {
        success: true,
        eventId: event.id,
        notificationsCreated: created.count,
        message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return NextResponse.json(
      { error: 'Erro ao criar notificação' },
      { status: 500 }
    );
  }
}
