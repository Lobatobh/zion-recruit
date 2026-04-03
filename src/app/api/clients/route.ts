/**
 * Clients API - Zion Recruit
 * List and create client companies for the tenant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// GET /api/clients - List all clients for tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = {
      tenantId: session.user.tenantId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactName: { contains: search } },
        { contactEmail: { contains: search } },
        { industry: { contains: search } },
      ];
    }

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          cnpj: true,
          tradeName: true,
          industry: true,
          city: true,
          state: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          website: true,
          notifyEmail: true,
          notifyWhatsapp: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              jobs: true,
              contacts: true,
              events: true,
              notifications: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.client.count({ where }),
    ]);

    // Enrich with last event date and count active jobs
    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        const [lastEvent, activeJobsCount] = await Promise.all([
          db.trackingEvent.findFirst({
            where: { clientId: client.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
          db.job.count({
            where: {
              clientId: client.id,
              status: 'PUBLISHED',
            },
          }),
        ]);

        // Transform to match frontend ClientListItem type
        const { _count, logo, notifyEmail, notifyWhatsapp, ...rest } = client as Record<string, unknown>;

        return {
          ...rest,
          logoUrl: logo || undefined,
          stats: {
            totalJobs: (client._count as Record<string, number>).jobs || 0,
            activeJobs: activeJobsCount,
            totalCandidates: 0,
            contactsCount: (client._count as Record<string, number>).contacts || 0,
            notificationsSent: (client._count as Record<string, number>).notifications || 0,
            lastEventAt: lastEvent?.createdAt?.toISOString() || undefined,
          },
          notificationSettings: {
            emailEnabled: client.notifyEmail as boolean,
            whatsappEnabled: client.notifyWhatsapp as boolean,
          },
        };
      })
    );

    return NextResponse.json({
      clients: enrichedClients,
      total,
    });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar clientes' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
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
    } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome do cliente é obrigatório' },
        { status: 400 }
      );
    }

    const slug = generateSlug(name.trim());

    // Check slug uniqueness — only among active clients
    const existing = await db.client.findFirst({
      where: {
        tenantId: session.user.tenantId,
        slug,
        isActive: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um cliente com este nome' },
        { status: 409 }
      );
    }

    // If slug collides with an inactive client, append a suffix to make it unique
    const inactiveCollision = await db.client.findFirst({
      where: {
        tenantId: session.user.tenantId,
        slug,
        isActive: false,
      },
    });

    let finalSlug = slug;
    if (inactiveCollision) {
      let counter = 1;
      let candidate = `${slug}-${counter}`;
      while (await db.client.findFirst({ where: { tenantId: session.user.tenantId, slug: candidate } })) {
        counter++;
        candidate = `${slug}-${counter}`;
      }
      finalSlug = candidate;
    }

    // Parse notifyEvents if it's an array
    let notifyEventsStr = '[]';
    if (Array.isArray(notifyEvents)) {
      notifyEventsStr = JSON.stringify(notifyEvents);
    } else if (typeof notifyEvents === 'string') {
      notifyEventsStr = notifyEvents;
    }

    // Normalize CNPJ (remove formatting)
    let normalizedCnpj: string | null = null;
    if (cnpj) {
      normalizedCnpj = cnpj.replace(/\D/g, '');
      if (normalizedCnpj.length !== 14) normalizedCnpj = null;
    }

    // Check CNPJ uniqueness (global unique constraint) — only among active clients
    if (normalizedCnpj) {
      const cnpjExists = await db.client.findFirst({
        where: { cnpj: normalizedCnpj, isActive: true },
      });
      if (cnpjExists) {
        return NextResponse.json(
          { error: 'Já existe uma empresa cadastrada com este CNPJ' },
          { status: 409 }
        );
      }
    }

    const client = await db.client.create({
      data: {
        tenantId: session.user.tenantId,
        name: name.trim(),
        slug: finalSlug,
        logo: logo || null,
        cnpj: normalizedCnpj,
        tradeName: tradeName || null,
        legalNature: legalNature || null,
        foundingDate: foundingDate || null,
        companySize: companySize || null,
        shareCapital: shareCapital || null,
        registration: registration || null,
        companyEmail: companyEmail || null,
        companyPhone: companyPhone || null,
        mainActivity: mainActivity || null,
        status: status || null,
        cep: cep || null,
        street: street || null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state || null,
        address: address || null,
        industry: industry || null,
        website: website || null,
        notes: notes || null,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        notifyEmail: Boolean(notifyEmail),
        notifyWhatsapp: Boolean(notifyWhatsapp),
        notifyFrequency: notifyFrequency || 'IMMEDIATE',
        notifyEvents: notifyEventsStr,
        aiTone: aiTone || 'professional',
        isActive: true,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao criar cliente' },
      { status: 500 }
    );
  }
}
