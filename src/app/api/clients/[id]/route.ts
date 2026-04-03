/**
 * Client Detail API - Zion Recruit
 * Get, update, and soft-delete a single client company.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/clients/[id] - Get single client with details
export async function GET(
  _request: NextRequest,
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

    const { id } = await params;

    const client = await db.client.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        contacts: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: {
            jobs: true,
            events: true,
            notifications: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    // Notification stats
    const notificationStats = await db.trackingNotification.groupBy({
      by: ['status'],
      where: {
        clientId: id,
      },
      _count: { status: true },
    });

    const statsMap: Record<string, number> = {};
    for (const stat of notificationStats) {
      statsMap[stat.status] = stat._count.status;
    }

    // Last event date
    const lastEvent = await db.trackingEvent.findFirst({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return NextResponse.json({
      client: {
        ...client,
        lastEventAt: lastEvent?.createdAt || null,
        notificationStats: statsMap,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cliente' },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(
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

    const { id } = await params;
    const body = await request.json();

    // Verify client belongs to tenant
    const existing = await db.client.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    const {
      name,
      logo,
      contactName,
      contactEmail,
      contactPhone,
      address,
      industry,
      website,
      notes,
      notifyEmail,
      notifyWhatsapp,
      notifyFrequency,
      notifyEvents,
      aiTone,
      isActive,
    } = body;

    // Build update data - exclude id, tenantId, createdAt
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (name !== undefined) updateData.name = name.trim();
    if (logo !== undefined) updateData.logo = logo || null;
    if (contactName !== undefined) updateData.contactName = contactName || null;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail || null;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone || null;
    if (address !== undefined) updateData.address = address || null;
    if (industry !== undefined) updateData.industry = industry || null;
    if (website !== undefined) updateData.website = website || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (notifyEmail !== undefined) updateData.notifyEmail = Boolean(notifyEmail);
    if (notifyWhatsapp !== undefined) updateData.notifyWhatsapp = Boolean(notifyWhatsapp);
    if (notifyFrequency !== undefined) updateData.notifyFrequency = notifyFrequency;
    if (aiTone !== undefined) updateData.aiTone = aiTone || 'professional';
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (notifyEvents !== undefined) {
      updateData.notifyEvents = Array.isArray(notifyEvents)
        ? JSON.stringify(notifyEvents)
        : typeof notifyEvents === 'string'
          ? notifyEvents
          : '[]';
    }

    // If name changed, update slug
    if (name && name.trim() !== existing.name) {
      const slug = name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

      // Check slug uniqueness
      const slugExists = await db.client.findFirst({
        where: {
          tenantId: session.user.tenantId,
          slug,
          id: { not: id },
        },
      });

      if (!slugExists) {
        updateData.slug = slug;
      }
    }

    const client = await db.client.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar cliente' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id] - Soft-delete client
export async function DELETE(
  _request: NextRequest,
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

    const { id } = await params;

    const existing = await db.client.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    await db.client.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Cliente removido com sucesso',
    });
  } catch (error) {
    console.error('Erro ao remover cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao remover cliente' },
      { status: 500 }
    );
  }
}
