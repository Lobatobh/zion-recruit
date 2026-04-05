/**
 * Campanha Toggle API - Zion Recruit
 * POST /api/messages/campaigns/[id]/toggle - Alternar status da campanha
 *
 * Regras:
 * - DRAFT → ACTIVE (primeira ativação, define startedAt)
 * - ACTIVE → PAUSED
 * - PAUSED → ACTIVE
 * - COMPLETED / CANCELLED não podem ser alternados
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper'

export const dynamic = "force-dynamic"

// POST /api/messages/campaigns/[id]/toggle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth()
    const tenantId = requireTenant(user)
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })
    }

    // Check if campaign exists and belongs to tenant
    const existing = await db.campaign.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Campanha não encontrada" },
        { status: 404 }
      )
    }

    // Determine new status
    const data: Record<string, unknown> = {}

    switch (existing.status) {
      case "DRAFT":
        data.status = "ACTIVE"
        // First activation: set startedAt
        data.startedAt = new Date()
        break
      case "ACTIVE":
        data.status = "PAUSED"
        break
      case "PAUSED":
        data.status = "ACTIVE"
        break
      case "COMPLETED":
        return NextResponse.json(
          { error: "Campanhas concluídas não podem ser alternadas" },
          { status: 400 }
        )
      case "CANCELLED":
        return NextResponse.json(
          { error: "Campanhas canceladas não podem ser alternadas" },
          { status: 400 }
        )
      default:
        return NextResponse.json(
          { error: "Status desconhecido" },
          { status: 400 }
        )
    }

    const campaign = await db.campaign.update({
      where: { id },
      data,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        tenantId: campaign.tenantId,
        name: campaign.name,
        description: campaign.description,
        jobId: campaign.jobId,
        jobTitle: campaign.jobTitle,
        job: campaign.job,
        status: campaign.status,
        source: campaign.source,
        aiTone: campaign.aiTone,
        aiLanguage: campaign.aiLanguage,
        autoSchedule: campaign.autoSchedule,
        aiInstructions: campaign.aiInstructions,
        messageTemplate: campaign.messageTemplate,
        totalTarget: campaign.totalTarget,
        sent: campaign.sent,
        delivered: campaign.delivered,
        replied: campaign.replied,
        interested: campaign.interested,
        notInterested: campaign.notInterested,
        failed: campaign.failed,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
    })
  } catch (error) {
    console.error("Erro ao alternar campanha:", error)
    return NextResponse.json(
      { error: "Erro ao alternar status da campanha" },
      { status: 500 }
    )
  }
}
