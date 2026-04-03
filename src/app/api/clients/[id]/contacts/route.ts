/**
 * Client Contacts API - Zion Recruit
 * List and create contacts for a client company.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/clients/[id]/contacts - List contacts for client
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

    const contacts = await db.clientContact.findMany({
      where: {
        clientId,
        isActive: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Erro ao buscar contatos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contatos' },
      { status: 500 }
    );
  }
}

// POST /api/clients/[id]/contacts - Create contact
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

    const { name, email, phone, role, isPrimary } = body;

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

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome do contato é obrigatório' },
        { status: 400 }
      );
    }

    // If isPrimary, set all others to false first
    if (isPrimary) {
      await db.clientContact.updateMany({
        where: { clientId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await db.clientContact.create({
      data: {
        clientId,
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        role: role || null,
        isPrimary: Boolean(isPrimary),
        isActive: true,
      },
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar contato:', error);
    return NextResponse.json(
      { error: 'Erro ao criar contato' },
      { status: 500 }
    );
  }
}
