/**
 * Campanhas IA API - Zion Recruit
 * GET  /api/messages/campaigns - Listar campanhas com estatísticas
 * POST /api/messages/campaigns - Criar nova campanha
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { CampaignStatus, CampaignSource } from "@prisma/client"

export const dynamic = "force-dynamic"

const DEMO_TENANT_ID = "cmn67w6by0000otpmwm26xoo8"

// GET /api/messages/campaigns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const source = searchParams.get("source")

    // Build where clause
    const where: Record<string, unknown> = { tenantId: DEMO_TENANT_ID }

    if (status && Object.values(CampaignStatus).includes(status as CampaignStatus)) {
      where.status = status
    }

    if (source && Object.values(CampaignSource).includes(source as CampaignSource)) {
      where.source = source
    }

    // Fetch campaigns ordered by most recent first
    const campaigns = await db.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

    // Aggregate stats across ALL campaigns for this tenant (not filtered)
    const allCampaigns = await db.campaign.findMany({
      where: { tenantId: DEMO_TENANT_ID },
      select: {
        status: true,
        sent: true,
        replied: true,
        interested: true,
      },
    })

    const total = allCampaigns.length
    const active = allCampaigns.filter((c) => c.status === "ACTIVE").length
    const totalSent = allCampaigns.reduce((sum, c) => sum + c.sent, 0)
    const totalReplied = allCampaigns.reduce((sum, c) => sum + c.replied, 0)
    const totalInterested = allCampaigns.reduce((sum, c) => sum + c.interested, 0)

    return NextResponse.json({
      campaigns: campaigns.map((c) => ({
        id: c.id,
        tenantId: c.tenantId,
        name: c.name,
        description: c.description,
        jobId: c.jobId,
        jobTitle: c.jobTitle,
        job: c.job,
        status: c.status,
        source: c.source,
        aiTone: c.aiTone,
        aiLanguage: c.aiLanguage,
        autoSchedule: c.autoSchedule,
        aiInstructions: c.aiInstructions,
        messageTemplate: c.messageTemplate,
        totalTarget: c.totalTarget,
        sent: c.sent,
        delivered: c.delivered,
        replied: c.replied,
        interested: c.interested,
        notInterested: c.notInterested,
        failed: c.failed,
        startedAt: c.startedAt,
        completedAt: c.completedAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      stats: {
        total,
        active,
        totalSent,
        totalReplied,
        totalInterested,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar campanhas:", error)
    return NextResponse.json(
      { error: "Erro ao buscar campanhas" },
      { status: 500 }
    )
  }
}

// POST /api/messages/campaigns
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      description,
      jobId,
      jobTitle,
      source = "MULTI_CHANNEL",
      aiTone = "friendly",
      aiLanguage = "pt-BR",
      autoSchedule = false,
      aiInstructions,
      messageTemplate,
      totalTarget = 0,
    } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "O nome da campanha é obrigatório" },
        { status: 400 }
      )
    }

    // Validate source if provided
    if (source && !Object.values(CampaignSource).includes(source as CampaignSource)) {
      return NextResponse.json(
        { error: `Fonte inválida. Valores aceitos: ${Object.values(CampaignSource).join(", ")}` },
        { status: 400 }
      )
    }

    const campaign = await db.campaign.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: name.trim(),
        description: description?.trim() || null,
        jobId: jobId || null,
        jobTitle: jobTitle || null,
        status: "DRAFT",
        source,
        aiTone,
        aiLanguage,
        autoSchedule,
        aiInstructions: aiInstructions?.trim() || null,
        messageTemplate: messageTemplate?.trim() || null,
        totalTarget: typeof totalTarget === "number" ? totalTarget : 0,
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
      { campaign: {
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
      }},
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro ao criar campanha:", error)
    return NextResponse.json(
      { error: "Erro ao criar campanha" },
      { status: 500 }
    )
  }
}
