/**
 * AI Auto-Contact API - Zion Recruit
 * POST /api/messages/auto-contact
 * Initiates AI conversations with multiple candidates at once
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { startAutomatedScreening } from "@/lib/ai-screening-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const tenantId = session.user.tenantId as string;
    const body = await request.json();
    const { candidateIds, jobId } = body as {
      candidateIds?: string[];
      jobId?: string;
    };

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json(
        { error: "Lista de candidatos é obrigatória" },
        { status: 400 }
      );
    }

    if (candidateIds.length > 50) {
      return NextResponse.json(
        { error: "Máximo de 50 candidatos por requisição" },
        { status: 400 }
      );
    }

    // Validate that all candidates belong to the tenant
    const candidates = await db.candidate.findMany({
      where: {
        id: { in: candidateIds },
        tenantId,
      },
      select: {
        id: true,
        name: true,
        jobId: true,
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "Nenhum candidato encontrado para este tenant" },
        { status: 404 }
      );
    }

    const foundIds = new Set(candidates.map((c) => c.id));
    const invalidIds = candidateIds.filter((id) => !foundIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `${invalidIds.length} candidato(s) não encontrado(s) ou não pertencem ao seu tenant` },
        { status: 400 }
      );
    }

    // Resolve jobId - use explicit jobId from body, or fall back to each candidate's jobId
    const effectiveJobId = jobId || null;

    let conversationsCreated = 0;
    let aiMessagesSent = 0;
    const errors: string[] = [];

    for (const candidate of candidates) {
      try {
        const convJobId = effectiveJobId || candidate.jobId || null;

        // Check if conversation already exists for this candidate on CHAT channel
        const existing = await db.conversation.findFirst({
          where: {
            tenantId,
            candidateId: candidate.id,
            channel: "CHAT",
          },
        });

        let conversationId: string;

        if (existing) {
          // Reactivate existing conversation and restart AI screening
          await db.conversation.update({
            where: { id: existing.id },
            data: {
              status: "ACTIVE",
              aiMode: true,
              aiStage: "WELCOME",
              needsIntervention: false,
              interventionReason: null,
              collectedData: null,
              takenOverBy: null,
              takenOverAt: null,
              takenOverName: null,
              lastMessageAt: new Date(),
            },
          });
          conversationId = existing.id;
        } else {
          // Create new conversation
          const conversation = await db.conversation.create({
            data: {
              tenantId,
              candidateId: candidate.id,
              jobId: convJobId,
              channel: "CHAT",
              status: "ACTIVE",
              aiMode: true,
              aiStage: "WELCOME",
              lastMessageAt: new Date(),
              unreadCount: 0,
              needsIntervention: false,
            },
          });
          conversationId = conversation.id;
          conversationsCreated++;
        }

        // Trigger AI welcome message
        await startAutomatedScreening(conversationId);
        aiMessagesSent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        errors.push(`Candidato ${candidate.name}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalCandidates: candidates.length,
      conversationsCreated,
      aiMessagesSent,
      errors: errors.length > 0 ? errors : undefined,
      message:
        aiMessagesSent > 0
          ? `${aiMessagesSent} conversa(s) iniciada(s) com sucesso pela IA Zoe`
          : "Nenhuma conversa foi iniciada",
    });
  } catch (error) {
    console.error("Error in auto-contact:", error);
    return NextResponse.json(
      { error: "Falha ao iniciar contatos automáticos" },
      { status: 500 }
    );
  }
}
