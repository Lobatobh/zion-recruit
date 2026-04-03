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

    // Active jobs count
    const activeJobsCount = await db.job.count({
      where: {
        clientId: id,
        status: 'PUBLISHED',
      },
    });

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

    // Parse notifyEvents JSON string into array
    let eventTypes: string[] = [];
    try {
      eventTypes = JSON.parse(client.notifyEvents || '[]');
    } catch {
      eventTypes = [];
    }

    // Map notifyFrequency enum to frontend lowercase values
    const frequencyMap: Record<string, 'immediate' | 'daily' | 'weekly'> = {
      IMMEDIATE: 'immediate',
      DAILY_DIGEST: 'daily',
      WEEKLY_DIGEST: 'weekly',
    };

    // Build the transformed response matching frontend ClientDetail type
    const clientData = client as Record<string, unknown>;
    const { _count, logo, notifyEmail, notifyWhatsapp, notifyFrequency, notifyEvents: _ne, aiTone, ...rest } = clientData;

    return NextResponse.json({
      client: {
        ...rest,
        logoUrl: logo || undefined,
        contacts: client.contacts,
        notificationStats: statsMap,
        stats: {
          totalJobs: (client._count as Record<string, number>).jobs || 0,
          activeJobs: activeJobsCount,
          totalCandidates: 0,
          contactsCount: client.contacts.length,
          notificationsSent: (client._count as Record<string, number>).notifications || 0,
          lastEventAt: lastEvent?.createdAt?.toISOString() || undefined,
        },
        notificationSettings: {
          emailEnabled: client.notifyEmail as boolean,
          whatsappEnabled: client.notifyWhatsapp as boolean,
          frequency: frequencyMap[client.notifyFrequency as string] || 'immediate',
          aiTone: (client.aiTone as 'professional' | 'casual' | 'formal') || 'professional',
          eventTypes,
        },
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
      cnpj,
      tradeName,
      legalNature,
      foundingDate,
      companySize,
      shareCapital,
      registration,
      companyEmail,
      companyPhone,
      mainActivity,
      status,
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      address,
      industry,
      website,
      notes,
      contactName,
      contactEmail,
      contactPhone,
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

    // CNPJ: normalize by removing non-digits, validate 14 digits, check uniqueness
    if (cnpj !== undefined) {
      const normalizedCnpj = typeof cnpj === 'string' ? cnpj.replace(/\D/g, '') : '';
      if (normalizedCnpj.length === 14) {
        // Check CNPJ uniqueness (exclude current client)
        const cnpjExists = await db.client.findFirst({
          where: {
            tenantId: session.user.tenantId,
            cnpj: normalizedCnpj,
            id: { not: id },
          },
        });
        if (cnpjExists) {
          return NextResponse.json(
            { error: 'Já existe uma empresa com este CNPJ' },
            { status: 409 }
          );
        }
        updateData.cnpj = normalizedCnpj;
      } else if (normalizedCnpj.length === 0 || !cnpj) {
        updateData.cnpj = null;
      }
      // If not exactly 14 digits, silently ignore (don't update)
    }

    if (tradeName !== undefined) updateData.tradeName = tradeName || null;
    if (legalNature !== undefined) updateData.legalNature = legalNature || null;
    if (foundingDate !== undefined) updateData.foundingDate = foundingDate || null;
    if (companySize !== undefined) updateData.companySize = companySize || null;
    if (shareCapital !== undefined) updateData.shareCapital = shareCapital || null;
    if (registration !== undefined) updateData.registration = registration || null;
    if (companyEmail !== undefined) updateData.companyEmail = companyEmail || null;
    if (companyPhone !== undefined) updateData.companyPhone = companyPhone || null;
    if (mainActivity !== undefined) updateData.mainActivity = mainActivity || null;
    if (status !== undefined) updateData.status = status || null;

    // CEP: normalize by removing non-digits
    if (cep !== undefined) {
      const normalizedCep = typeof cep === 'string' ? cep.replace(/\D/g, '') : '';
      updateData.cep = normalizedCep.length > 0 ? normalizedCep : null;
    }

    if (street !== undefined) updateData.street = street || null;
    if (number !== undefined) updateData.number = number || null;
    if (complement !== undefined) updateData.complement = complement || null;
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood || null;
    if (city !== undefined) updateData.city = city || null;
    if (state !== undefined) updateData.state = state || null;
    if (address !== undefined) updateData.address = address || null;
    if (industry !== undefined) updateData.industry = industry || null;
    if (website !== undefined) updateData.website = website || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (contactName !== undefined) updateData.contactName = contactName || null;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail || null;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone || null;
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
