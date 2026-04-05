/**
 * Campaign Execution API - Zion Recruit
 *
 * POST /api/messages/campaigns/[id]/execute       - Execute/start a campaign
 * POST /api/messages/campaigns/[id]/execute/message - Send a specific message to a candidate from a campaign
 *
 * When a recruiter starts a campaign, the AI autonomously contacts candidates
 * by creating CHAT conversations and sending welcome messages.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendAIMessage } from "@/lib/ai-screening-service";
import ZAI from "z-ai-web-dev-sdk";
import type {
  SenderType,
  ContentType,
  ChannelType,
  MessageStatus,
  ConversationStatus,
} from "@prisma/client";

export const dynamic = "force-dynamic";

const DEMO_TENANT_ID = "cmn67w6by0000otpmwm26xoo8";
const CAMPAIGN_BATCH_SIZE = 10;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Resolve tenant ID from session, falling back to the demo tenant.
 */
async function resolveTenantId(): Promise<string> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.tenantId) {
      return session.user.tenantId;
    }
  } catch {
    // Session resolution failed – fall through to demo tenant.
  }
  return DEMO_TENANT_ID;
}

/**
 * Fetch a campaign and verify it belongs to the given tenant.
 */
async function getTenantCampaign(campaignId: string, tenantId: string) {
  return db.campaign.findFirst({
    where: { id: campaignId, tenantId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          department: true,
          description: true,
          requirements: true,
          salaryMin: true,
          salaryMax: true,
          location: true,
          workMode: true,
          contractType: true,
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Lazy ZAI singleton
// ---------------------------------------------------------------------------

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!_zai) {
    _zai = await ZAI.create();
  }
  return _zai;
}

// ---------------------------------------------------------------------------
// POST /api/messages/campaigns/[id]/execute
// ---------------------------------------------------------------------------

async function executeCampaign(
  campaignId: string,
  tenantId: string
): Promise<NextResponse> {
  // 1. Verify campaign exists and belongs to tenant
  const campaign = await getTenantCampaign(campaignId, tenantId);

  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found" },
      { status: 404 }
    );
  }

  if (!campaign.jobId) {
    return NextResponse.json(
      { error: "Campaign must be linked to a job before execution" },
      { status: 400 }
    );
  }

  // 2. Find candidates for the campaign's linked job
  //    - Status must be SOURCED
  //    - Must NOT already have an existing CHAT conversation
  const candidates = await db.candidate.findMany({
    where: {
      tenantId,
      jobId: campaign.jobId,
      status: "SOURCED",
      // Exclude candidates that already have a CHAT conversation
      conversations: {
        none: {
          channel: "CHAT" as ChannelType,
        },
      },
    },
    take: CAMPAIGN_BATCH_SIZE,
    orderBy: { createdAt: "asc" },
  });

  if (candidates.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No eligible candidates found for this campaign",
      contacted: 0,
      remaining: 0,
    });
  }

  // 3. Process each candidate
  let contactedCount = 0;
  let failedCount = 0;

  for (const candidate of candidates) {
    try {
      // a. Create a Conversation (channel: CHAT, aiMode: true, status: ACTIVE)
      const conversation = await db.conversation.create({
        data: {
          tenantId,
          candidateId: candidate.id,
          jobId: campaign.jobId,
          channel: "CHAT" as ChannelType,
          status: "ACTIVE" as ConversationStatus,
          aiMode: true,
          aiStage: "welcome",
        },
      });

      // b. Send AI welcome message using the existing screening service
      await sendAIMessage(
        conversation.id,
        generateWelcomeMessage(candidate.name, campaign),
        "welcome" as any
      );

      // c. Update candidate contactedAt
      await db.candidate.update({
        where: { id: candidate.id },
        data: { contactedAt: new Date() },
      });

      contactedCount++;
    } catch (error) {
      console.error(
        `Failed to contact candidate ${candidate.id}:`,
        error
      );
      failedCount++;
    }
  }

  // 4. Update campaign metrics and status
  await db.campaign.update({
    where: { id: campaignId },
    data: {
      sent: { increment: contactedCount },
      failed: { increment: failedCount },
      status: "ACTIVE",
      ...(campaign.startedAt ? {} : { startedAt: new Date() }),
    },
  });

  // 5. Count remaining eligible candidates for next batch
  const remainingCount = await db.candidate.count({
    where: {
      tenantId,
      jobId: campaign.jobId,
      status: "SOURCED",
      conversations: {
        none: {
          channel: "CHAT" as ChannelType,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    message: `Campaign executed successfully`,
    contacted: contactedCount,
    failed: failedCount,
    remaining: remainingCount,
    campaignId,
  });
}

/**
 * Generate a personalized welcome message for the candidate.
 * Uses the campaign's message template if available, otherwise builds a default.
 */
function generateWelcomeMessage(
  candidateName: string,
  campaign: {
    messageTemplate?: string | null;
    job?: { title?: string } | null;
    aiTone?: string;
    aiInstructions?: string | null;
  }
): string {
  const jobTitle = campaign.job?.title ?? "our open position";

  if (campaign.messageTemplate?.trim()) {
    return campaign.messageTemplate
      .replace(/\{\{candidateName\}\}/g, candidateName)
      .replace(/\{\{jobTitle\}\}/g, jobTitle);
  }

  // Default welcome messages per tone
  const toneMessages: Record<string, string> = {
    formal: `Olá, ${candidateName}.\n\nSomos da Zion Recruit e gostaríamos de apresentar uma oportunidade para a vaga de **${jobTitle}**.\n\nTeria alguns minutos para uma conversa rápida sobre o seu perfil?`,
    casual: `E aí, ${candidateName}! 👋\n\nTudo bem? Passando aqui da Zion Recruit pra te falar sobre uma vaga super legal de **${jobTitle}**.\n\nBora trocar uma ideia?`,
    friendly: `Olá, ${candidateName}! 👋\n\nSou a Zoe, assistente de recrutamento da Zion Recruit. Fiquei feliz em encontrar seu perfil para a vaga de **${jobTitle}**!\n\nGostaria de conhecer um pouco mais sobre você? Tem alguns minutos para uma conversa rápida?`,
  };

  const tone = campaign.aiTone || "friendly";
  return toneMessages[tone] || toneMessages.friendly;
}

// ---------------------------------------------------------------------------
// POST /api/messages/campaigns/[id]/execute/message
// ---------------------------------------------------------------------------

interface SendMessageBody {
  candidateId?: string;
  message?: string;
}

async function sendCampaignMessage(
  campaignId: string,
  tenantId: string,
  body: SendMessageBody
): Promise<NextResponse> {
  const { candidateId, message } = body;

  if (!candidateId || typeof candidateId !== "string") {
    return NextResponse.json(
      { error: "candidateId is required" },
      { status: 400 }
    );
  }

  // 1. Verify campaign belongs to tenant
  const campaign = await getTenantCampaign(campaignId, tenantId);

  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found" },
      { status: 404 }
    );
  }

  // 2. Verify candidate belongs to tenant
  const candidate = await db.candidate.findFirst({
    where: { id: candidateId, tenantId },
  });

  if (!candidate) {
    return NextResponse.json(
      { error: "Candidate not found" },
      { status: 404 }
    );
  }

  // 3. Find or create a CHAT conversation for this candidate
  let conversation = await db.conversation.findFirst({
    where: {
      tenantId,
      candidateId,
      channel: "CHAT" as ChannelType,
    },
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        tenantId,
        candidateId,
        jobId: campaign.jobId,
        channel: "CHAT" as ChannelType,
        status: "ACTIVE" as ConversationStatus,
        aiMode: true,
        aiStage: "welcome",
      },
    });
  }

  // 4. Generate AI message based on campaign context
  let messageContent: string;

  if (message?.trim()) {
    // If a base message is provided, let AI enhance it with campaign tone & job context
    messageContent = await generateEnhancedMessage(campaign, candidate, message);
  } else {
    // Otherwise generate a contextual message from scratch
    messageContent = await generateContextualMessage(campaign, candidate);
  }

  // 5. Save message to database
  const savedMessage = await db.message.create({
    data: {
      conversationId: conversation.id,
      senderType: "AI" as SenderType,
      senderName: "Zoe (IA)",
      content: messageContent,
      contentType: "TEXT" as ContentType,
      channel: "CHAT" as ChannelType,
      status: "SENT" as MessageStatus,
      isAiGenerated: true,
    },
  });

  // 6. Update conversation metadata
  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: messageContent.substring(0, 100),
    },
  });

  // 7. Update candidate contactedAt if not set
  if (!candidate.contactedAt) {
    await db.candidate.update({
      where: { id: candidateId },
      data: { contactedAt: new Date() },
    });
  }

  // 8. Increment campaign sent count
  await db.campaign.update({
    where: { id: campaignId },
    data: { sent: { increment: 1 } },
  });

  return NextResponse.json({
    success: true,
    message: savedMessage,
    conversationId: conversation.id,
  });
}

/**
 * Use z-ai-web-dev-sdk to enhance a base message with campaign tone and job context.
 */
async function generateEnhancedMessage(
  campaign: {
    aiTone?: string;
    aiInstructions?: string | null;
    job?: {
      title?: string;
      department?: string | null;
      description?: string | null;
      requirements?: string | null;
      location?: string | null;
      workMode?: string | null;
    } | null;
  },
  candidate: { name: string },
  baseMessage: string
): Promise<string> {
  try {
    const zai = await getZAI();

    const toneInstructions: Record<string, string> = {
      formal:
        "Use um tom formal e profissional. Evite emojis. Linguagem culta e respeitosa.",
      casual:
        "Use um tom descontraído e informal. Pode usar gírias leves e emojis. Linguagem jovem e acessível.",
      friendly:
        "Use um tom amigável e acolhedor. Equilibre profissionalismo com simpatia. Use 1-2 emojis por mensagem.",
    };

    const tone = campaign.aiTone || "friendly";
    const job = campaign.job;

    const systemPrompt = `Você é a Zoe, assistente de IA da Zion Recruit. Sua tarefa é melhorar a mensagem abaixo para um candidato.

Tom desejado: ${toneInstructions[tone] || toneInstructions.friendly}
${campaign.aiInstructions ? `\nInstruções adicionais do recrutador: ${campaign.aiInstructions}` : ""}

Contexto da vaga:
- Título: ${job?.title || "Não especificado"}
- Departamento: ${job?.department || "Não especificado"}
- Localização: ${job?.location || "Não especificado"}
- Modo de trabalho: ${job?.workMode || "Não especificado"}

Nome do candidato: ${candidate.name}

Regras:
- Mantenha a essência da mensagem original
- Melhore a clareza e o tom conforme o estilo solicitado
- Não adicione informações falsas sobre a vaga
- Responda APENAS com a mensagem final, sem aspas ou formatação adicional`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Melhore esta mensagem:\n\n${baseMessage}` },
      ],
      thinking: { type: "disabled" },
    });

    return (
      completion.choices[0]?.message?.content?.trim() || baseMessage
    );
  } catch (error) {
    console.error("AI message enhancement failed, using base message:", error);
    return baseMessage;
  }
}

/**
 * Use z-ai-web-dev-sdk to generate a fully contextual message for a candidate.
 */
async function generateContextualMessage(
  campaign: {
    aiTone?: string;
    aiInstructions?: string | null;
    job?: {
      title?: string;
      department?: string | null;
      description?: string | null;
      requirements?: string | null;
      salaryMin?: number | null;
      salaryMax?: number | null;
      location?: string | null;
      workMode?: string | null;
      contractType?: string | null;
    } | null;
  },
  candidate: { name: string; email: string }
): Promise<string> {
  try {
    const zai = await getZAI();

    const toneInstructions: Record<string, string> = {
      formal:
        "Use um tom formal e profissional. Evite emojis. Linguagem culta e respeitosa.",
      casual:
        "Use um tom descontraído e informal. Pode usar gírias leves e emojis. Linguagem jovem e acessível.",
      friendly:
        "Use um tom amigável e acolhedor. Equilibre profissionalismo com simpatia. Use 1-2 emojis por mensagem.",
    };

    const tone = campaign.aiTone || "friendly";
    const job = campaign.job;
    const salaryRange =
      job?.salaryMin && job?.salaryMax
        ? `R$ ${job.salaryMin.toLocaleString()} - R$ ${job.salaryMax.toLocaleString()}`
        : "A combinar";

    const systemPrompt = `Você é a Zoe, assistente de IA de recrutamento da Zion Recruit.
Gere uma mensagem de primeiro contato para um candidato sobre uma vaga.

Tom desejado: ${toneInstructions[tone] || toneInstructions.friendly}
${campaign.aiInstructions ? `\nInstruções adicionais do recrutador: ${campaign.aiInstructions}` : ""}

Contexto da vaga:
- Título: ${job?.title || "Não especificado"}
- Departamento: ${job?.department || "Não especificado"}
- Localização: ${job?.location || "Não especificado"}
- Modo de trabalho: ${job?.workMode || "Não especificado"}
- Tipo de contrato: ${job?.contractType || "Não especificado"}
- Faixa salarial: ${salaryRange}
- Requisitos: ${job?.requirements || "Não especificados"}
- Descrição: ${job?.description || "Não especificada"}

Nome do candidato: ${candidate.name}

Regras:
- Seja concisa (2-4 frases)
- Inclua saudação com nome do candidato
- Mencione a vaga e pergunte sobre interesse
- Termine com uma pergunta aberta para engajar o candidato
- Responda APENAS com a mensagem final, sem aspas`;

    const completion = await zai.chat.completions.create({
      messages: [{ role: "user", content: systemPrompt }],
      thinking: { type: "disabled" },
    });

    return (
      completion.choices[0]?.message?.content?.trim() ||
      `Olá, ${candidate.name}! Gostaria de falar sobre uma oportunidade que combina com seu perfil. Tem interesse?`
    );
  } catch (error) {
    console.error("AI message generation failed, using fallback:", error);
    return `Olá, ${candidate.name}! 👋\n\nTemos uma oportunidade que pode ser do seu interesse. Podemos conversar sobre isso?`;
  }
}

// ---------------------------------------------------------------------------
// Route handler – dispatches based on URL path
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 }
      );
    }

    // Resolve tenant from session
    const tenantId = await resolveTenantId();

    // Dispatch based on URL path
    const pathname = request.nextUrl.pathname;

    if (pathname.endsWith("/message")) {
      // POST /api/messages/campaigns/[id]/execute/message
      const body: SendMessageBody = await request.json();
      return sendCampaignMessage(id, tenantId, body);
    }

    // POST /api/messages/campaigns/[id]/execute
    return executeCampaign(id, tenantId);
  } catch (error) {
    console.error("[Campaign Execute] Unexpected error:", error);

    // Handle malformed JSON body gracefully
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while executing the campaign" },
      { status: 500 }
    );
  }
}
