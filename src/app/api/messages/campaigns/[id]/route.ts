/**
 * Campanha Detail API - Zion Recruit
 * GET    /api/messages/campaigns/[id] - Buscar campanha por ID
 * PATCH  /api/messages/campaigns/[id] - Atualizar campanha
 * DELETE /api/messages/campaigns/[id] - Excluir campanha
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { CampaignStatus, CampaignSource } from "@prisma/client"

export const dynamic = "force-dynamic"

const DEMO_TENANT_ID = "cmn67w6by0000otpmwm26xoo8"

function formatCampaign(campaign: Record<string, unknown>) {
  return campaign
}

// GET /api/messages/campaigns/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })
    }

    const campaign = await db.campaign.findFirst({
      where: { id, tenantId: DEMO_TENANT_ID },
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

    if (!campaign) {
      return NextResponse.json(
        { error: "Campanha não encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      campaign: formatCampaign({
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
      }),
    })
  } catch (error) {
    console.error("Erro ao buscar campanha:", error)
    return NextResponse.json(
      { error: "Erro ao buscar campanha" },
      { status: 500 }
    )
  }
}

// PATCH /api/messages/campaigns/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })
    }

    const body = await request.json()

    // Check if campaign exists and belongs to tenant
    const existing = await db.campaign.findFirst({
      where: { id, tenantId: DEMO_TENANT_ID },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Campanha não encontrada" },
        { status: 404 }
      )
    }

    // Build update data
    const data: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: "O nome da campanha é obrigatório" },
          { status: 400 }
        )
      }
      data.name = body.name.trim()
    }

    if (body.description !== undefined) {
      data.description = body.description?.trim() || null
    }

    if (body.jobId !== undefined) {
      data.jobId = body.jobId || null
    }

    if (body.jobTitle !== undefined) {
      data.jobTitle = body.jobTitle?.trim() || null
    }

    if (body.source !== undefined) {
      if (!Object.values(CampaignSource).includes(body.source)) {
        return NextResponse.json(
          { error: `Fonte inválida. Valores aceitos: ${Object.values(CampaignSource).join(", ")}` },
          { status: 400 }
        )
      }
      data.source = body.source
    }

    if (body.aiTone !== undefined) {
      data.aiTone = body.aiTone
    }

    if (body.aiLanguage !== undefined) {
      data.aiLanguage = body.aiLanguage
    }

    if (body.autoSchedule !== undefined) {
      data.autoSchedule = Boolean(body.autoSchedule)
    }

    if (body.aiInstructions !== undefined) {
      data.aiInstructions = body.aiInstructions?.trim() || null
    }

    if (body.messageTemplate !== undefined) {
      data.messageTemplate = body.messageTemplate?.trim() || null
    }

    // Metrics updates
    if (body.totalTarget !== undefined) {
      data.totalTarget = typeof body.totalTarget === "number" ? body.totalTarget : 0
    }
    if (body.sent !== undefined) {
      data.sent = typeof body.sent === "number" ? Math.max(0, body.sent) : 0
    }
    if (body.delivered !== undefined) {
      data.delivered = typeof body.delivered === "number" ? Math.max(0, body.delivered) : 0
    }
    if (body.replied !== undefined) {
      data.replied = typeof body.replied === "number" ? Math.max(0, body.replied) : 0
    }
    if (body.interested !== undefined) {
      data.interested = typeof body.interested === "number" ? Math.max(0, body.interested) : 0
    }
    if (body.notInterested !== undefined) {
      data.notInterested = typeof body.notInterested === "number" ? Math.max(0, body.notInterested) : 0
    }
    if (body.failed !== undefined) {
      data.failed = typeof body.failed === "number" ? Math.max(0, body.failed) : 0
    }

    // Status change with special handling
    if (body.status !== undefined) {
      if (!Object.values(CampaignStatus).includes(body.status)) {
        return NextResponse.json(
          { error: `Status inválido. Valores aceitos: ${Object.values(CampaignStatus).join(", ")}` },
          { status: 400 }
        )
      }
      data.status = body.status

      // When status changes to ACTIVE and startedAt is null, set startedAt = now()
      if (body.status === "ACTIVE" && !existing.startedAt) {
        data.startedAt = new Date()
      }

      // When status changes to COMPLETED and completedAt is null, set completedAt = now()
      if (body.status === "COMPLETED" && !existing.completedAt) {
        data.completedAt = new Date()
      }
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
      campaign: formatCampaign({
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
      }),
    })
  } catch (error) {
    console.error("Erro ao atualizar campanha:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar campanha" },
      { status: 500 }
    )
  }
}

// DELETE /api/messages/campaigns/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })
    }

    // Check if campaign exists and belongs to tenant
    const existing = await db.campaign.findFirst({
      where: { id, tenantId: DEMO_TENANT_ID },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Campanha não encontrada" },
        { status: 404 }
      )
    }

    await db.campaign.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir campanha:", error)
    return NextResponse.json(
      { error: "Erro ao excluir campanha" },
      { status: 500 }
    )
  }
}
