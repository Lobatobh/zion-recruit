/**
 * Client Contact Detail API - Zion Recruit
 * Update and delete a specific contact for a client company.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// PUT /api/clients/[id]/contacts/[contactId] - Update contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: clientId, contactId } = await params;
    const body = await request.json();

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

    // Verify contact belongs to client
    const existing = await db.clientContact.findFirst({
      where: {
        id: contactId,
        clientId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Contato não encontrado' },
        { status: 404 }
      );
    }

    const { name, email, phone, role, isPrimary, isActive } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (role !== undefined) updateData.role = role || null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    // Handle primary contact change
    if (isPrimary === true && !existing.isPrimary) {
      await db.clientContact.updateMany({
        where: { clientId, isPrimary: true },
        data: { isPrimary: false },
      });
      updateData.isPrimary = true;
    } else if (isPrimary === false) {
      updateData.isPrimary = false;
    }

    const contact = await db.clientContact.update({
      where: { id: contactId },
      data: updateData,
    });

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Erro ao atualizar contato:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar contato' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id]/contacts/[contactId] - Delete contact
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: clientId, contactId } = await params;

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

    // Verify contact belongs to client
    const existing = await db.clientContact.findFirst({
      where: {
        id: contactId,
        clientId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Contato não encontrado' },
        { status: 404 }
      );
    }

    await db.clientContact.delete({
      where: { id: contactId },
    });

    return NextResponse.json({
      success: true,
      message: 'Contato removido com sucesso',
    });
  } catch (error) {
    console.error('Erro ao remover contato:', error);
    return NextResponse.json(
      { error: 'Erro ao remover contato' },
      { status: 500 }
    );
  }
}
