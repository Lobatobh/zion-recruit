/**
 * Client Events API - Zion Recruit
 * List and create tracking events for a client company.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { trackEvent, EVENT_LABELS } from '@/lib/tracking';
import { TrackingEventType } from '@prisma/client';

// GET /api/clients/[id]/events - List tracking events for client
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
    const type = searchParams.get('type');

    const where: Record<string, unknown> = {
      clientId,
    };

    if (type && Object.values(TrackingEventType).includes(type as TrackingEventType)) {
      where.type = type;
    }

    const [events, total] = await Promise.all([
      db.trackingEvent.findMany({
        where,
        include: {
          job: {
            select: { id: true, title: true },
          },
          candidate: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.trackingEvent.count({ where }),
    ]);

    // Enrich with pt-BR labels
    const enrichedEvents = events.map((event) => ({
      ...event,
      label: EVENT_LABELS[event.type] || event.type,
    }));

    return NextResponse.json({
      events: enrichedEvents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar eventos' },
      { status: 500 }
    );
  }
}

// POST /api/clients/[id]/events - Create a new tracking event
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

    const { type, title, description, metadata, jobId, candidateId } = body;

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

    if (!type || !Object.values(TrackingEventType).includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de evento inválido' },
        { status: 400 }
      );
    }

    // Verify job belongs to tenant if provided
    if (jobId) {
      const job = await db.job.findFirst({
        where: {
          id: jobId,
          tenantId: session.user.tenantId,
        },
      });

      if (!job) {
        return NextResponse.json(
          { error: 'Vaga não encontrada' },
          { status: 404 }
        );
      }
    }

    // Verify candidate belongs to tenant if provided
    if (candidateId) {
      const candidate = await db.candidate.findFirst({
        where: {
          id: candidateId,
          tenantId: session.user.tenantId,
        },
      });

      if (!candidate) {
        return NextResponse.json(
          { error: 'Candidato não encontrado' },
          { status: 404 }
        );
      }
    }

    // Create the event using the tracking utility (auto-generates notifications)
    const event = await trackEvent({
      tenantId: session.user.tenantId,
      clientId,
      jobId: jobId || undefined,
      candidateId: candidateId || undefined,
      type: type as TrackingEventType,
      title: title || undefined,
      description: description || undefined,
      metadata: metadata || undefined,
    });

    // Fetch the full event with relations
    const fullEvent = await db.trackingEvent.findUnique({
      where: { id: event.id },
      include: {
        job: {
          select: { id: true, title: true },
        },
        candidate: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      {
        event: {
          ...fullEvent,
          label: EVENT_LABELS[event.type] || event.type,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    return NextResponse.json(
      { error: 'Erro ao criar evento' },
      { status: 500 }
    );
  }
}
