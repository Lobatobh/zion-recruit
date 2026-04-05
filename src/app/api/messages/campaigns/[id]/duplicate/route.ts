/**
 * Campanha Duplicate API - Zion Recruit
 * POST /api/messages/campaigns/[id]/duplicate - Duplicar campanha
 *
 * Cria uma cópia da campanha com:
 * - status = DRAFT
 * - Métricas zeradas (sent, delivered, replied, interested, etc.)
 * - name = "Cópia de {nomeOriginal}"
 * - Sem startedAt / completedAt
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const DEMO_TENANT_ID = "cmn67w6by0000otpmwm26xoo8"

// POST /api/messages/campaigns/[id]/duplicate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })
    }

    // Check if campaign exists and belongs to tenant
    const original = await db.campaign.findFirst({
      where: { id, tenantId: DEMO_TENANT_ID },
    })

    if (!original) {
      return NextResponse.json(
        { error: "Campanha não encontrada" },
        { status: 404 }
      )
    }

    const campaign = await db.campaign.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: `Cópia de ${original.name}`,
        description: original.description,
        jobId: original.jobId,
        jobTitle: original.jobTitle,
        status: "DRAFT",
        source: original.source,
        aiTone: original.aiTone,
        aiLanguage: original.aiLanguage,
        autoSchedule: original.autoSchedule,
        aiInstructions: original.aiInstructions,
        messageTemplate: original.messageTemplate,
        totalTarget: original.totalTarget,
        // Reset all metrics to 0
        sent: 0,
        delivered: 0,
        replied: 0,
        interested: 0,
        notInterested: 0,
        failed: 0,
        // Reset timing
        startedAt: null,
        completedAt: null,
      },
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

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro ao duplicar campanha:", error)
    return NextResponse.json(
      { error: "Erro ao duplicar campanha" },
      { status: 500 }
    )
  }
}
