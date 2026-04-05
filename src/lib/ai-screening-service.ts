/**
 * AI Screening Service - Zion Recruit
 * Handles AI-powered candidate screening conversations
 */

import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { SenderType, ContentType, ChannelType, MessageStatus, ConversationStatus } from "@prisma/client";

// Default tenant (fallback - actual tenant should come from session)
const DEFAULT_TENANT_ID = "cmn67w6by0000otpmwm26xoo8";

// AI Stages for screening flow
const AI_STAGES = {
  WELCOME: "welcome",
  INTRODUCTION: "introduction",
  EXPERIENCE_CHECK: "experience_check",
  AVAILABILITY_CHECK: "availability_check",
  SALARY_CHECK: "salary_check",
  SKILLS_CHECK: "skills_check",
  MOTIVATION_CHECK: "motivation_check",
  FIT_ANALYSIS: "fit_analysis",
  SCHEDULING: "scheduling",
  HANDOFF: "handoff",
  CLOSED: "closed",
} as const;

type AIStage = typeof AI_STAGES[keyof typeof AI_STAGES];

// Stage prompts for the AI recruiter
const STAGE_PROMPTS: Record<AIStage, string> = {
  [AI_STAGES.WELCOME]: `Você é uma assistente de recrutamento simpática e profissional chamada "Zoe" da Zion Recruit.
Seu objetivo é dar boas-vindas ao candidato e explicar que você fará uma triagem inicial rápida.
Seja calorosa, use emojis com moderação, e deixe o candidato à vontade.
Pergunte se ele tem alguns minutos para responder algumas perguntas sobre a vaga.`,

  [AI_STAGES.INTRODUCTION]: `Continue a conversa de forma amigável. O candidato concordou em prosseguir.
Agora faça uma pergunta sobre a experiência profissional dele relacionada à vaga.
Exemplo: "Conte um pouco sobre sua experiência mais recente na área de [área da vaga]..."
Seja específico mas não intimidador. Use tom de conversa, não de entrevista formal.`,

  [AI_STAGES.EXPERIENCE_CHECK]: `Avalie a resposta sobre experiência. Se a experiência for relevante, elogie e prossiga.
Se for vaga ou irrelevante, peça esclarecimentos gentilmente.
Depois de entender a experiência, pergunte sobre disponibilidade (horário, home office, etc).`,

  [AI_STAGES.AVAILABILITY_CHECK]: `Avalie a disponibilidade mencionada. Pergunte sobre pretensão salarial.
Use uma abordagem delicada: "Para continuarmos, você poderia me dar uma ideia da sua pretensão salarial para essa posição?"`,

  [AI_STAGES.SALARY_CHECK]: `Avalie a pretensão salarial. Se estiver dentro do range da vaga, ótimo.
Se estiver acima, pergunte se há flexibilidade.
Em seguida, pergunte sobre as principais habilidades técnicas relacionadas à vaga.`,

  [AI_STAGES.SKILLS_CHECK]: `Avalie as habilidades mencionadas. Compare com os requisitos da vaga.
Se as skills forem adequadas, pergunte sobre motivação para mudar de emprego/aceitar essa vaga.`,

  [AI_STAGES.MOTIVATION_CHECK]: `Avalie a motivação do candidato. Se estiver alinhado, faça uma análise de fit geral.
Prepare para recomendar agendamento de entrevista ou explicar próximos passos.`,

  [AI_STAGES.FIT_ANALYSIS]: `Você já coletou informações suficientes. Faça uma análise rápida do fit do candidato.
Se FIT ALTO: Parabenize e proponha agendar entrevista com recrutador.
Se FIT MÉDIO: Diga que vai passar para análise da equipe e retornará em breve.
Se FIT BAIXO: Agradeça gentilmente e explique que o perfil não é ideal para essa vaga, mas manterá no banco de talentos.`,

  [AI_STAGES.SCHEDULING]: `O candidato foi aprovado na triagem! Agende uma entrevista.
Pergunte preferência de data/horário e formato (vídeo ou presencial).
Seja entusiasmada e parabenize o candidato.`,

  [AI_STAGES.HANDOFF]: `O candidato solicitou falar com um humano ou você identificou que precisa de intervenção.
Explique que vai transferir para um recrutador. Agradeça a paciência.
Mantenha o tom profissional e tranquilizador.`,

  [AI_STAGES.CLOSED]: `A conversa foi encerrada. Agradeça pelo tempo do candidato.
Deseje boa sorte e mantenha as portas abertas para futuras oportunidades.`,
};

// Collected data structure
interface CollectedData {
  experience?: string;
  availability?: string;
  salary?: string;
  skills?: string[];
  motivation?: string;
  fitScore?: number;
  fitReason?: string;
  interventionReason?: string;
}

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

/**
 * Process a candidate message and generate AI response
 */
export async function processCandidateMessage(
  conversationId: string,
  candidateMessage: string
): Promise<{
  response: string;
  nextStage: AIStage;
  needsIntervention: boolean;
  interventionReason?: string;
  collectedData: CollectedData;
}> {
  const zai = await getZAI();

  // Get conversation with context
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      candidate: {
        include: {
          job: {
            select: {
              title: true,
              department: true,
              description: true,
              requirements: true,
              salaryMin: true,
              salaryMax: true,
            },
          },
        },
      },
      messages: {
        orderBy: { sentAt: "asc" },
        take: 20, // Last 20 messages for context
      },
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const currentStage = (conversation.aiStage as AIStage) || AI_STAGES.WELCOME;
  const job = conversation.candidate?.job;

  // Parse existing collected data
  let collectedData: CollectedData = {};
  if (conversation.collectedData) {
    try {
      collectedData = JSON.parse(conversation.collectedData);
    } catch {
      collectedData = {};
    }
  }

  // Build system prompt based on stage and job context
  const systemPrompt = `${STAGE_PROMPTS[currentStage]}

## Contexto da Vaga
Título: ${job?.title || "Não especificado"}
Departamento: ${job?.department || "Não especificado"}
Requisitos: ${job?.requirements || "Não especificados"}
Faixa salarial: ${job?.salaryMin && job?.salaryMax ? `R$ ${job.salaryMin.toLocaleString()} - R$ ${job.salaryMax.toLocaleString()}` : "A combinar"}

## Diretrizes Gerais
- Seja sempre cordial e profissional
- Use linguagem natural, como uma conversa real
- Evite jargões corporativos excessivos
- Use emojis com moderação (1-2 por mensagem)
- Mantenha respostas concisas (2-4 frases)
- Se o candidato parecer confuso, esclareça
- Se o candidato pedir para falar com humano, concorde imediatamente

## Dados já coletados nesta conversa:
${JSON.stringify(collectedData, null, 2)}

## Deteção de Intervenção Humana
Acione intervenção humana se:
- Candidato pedir explicitamente para falar com alguém
- Candidato expressar frustração ou insatisfação
- Situação complexa que foge do script
- Candidato tiver dúvidas que você não consegue responder`;

  // Build conversation history
  const messages: Array<{ role: "assistant" | "user"; content: string }> = [
    { role: "assistant", content: systemPrompt },
  ];

  // Add conversation history
  for (const msg of conversation.messages) {
    if (msg.senderType === "CANDIDATE") {
      messages.push({ role: "user", content: msg.content });
    } else if (msg.senderType === "AI" || msg.senderType === "RECRUITER") {
      messages.push({ role: "assistant", content: msg.content });
    }
  }

  // Add current candidate message
  messages.push({ role: "user", content: candidateMessage });

  // Get AI response
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: "disabled" },
  });

  const aiResponse = completion.choices[0]?.message?.content || 
    "Desculpe, não consegui processar sua mensagem. Pode repetir?";

  // Analyze response and determine next stage
  const analysisResult = await analyzeAndProgress(
    zai,
    currentStage,
    candidateMessage,
    aiResponse,
    collectedData,
    job
  );

  return analysisResult;
}

/**
 * Analyze conversation progress and determine next stage
 */
async function analyzeAndProgress(
  zai: NonNullable<typeof zaiInstance>,
  currentStage: AIStage,
  candidateMessage: string,
  aiResponse: string,
  collectedData: CollectedData,
  job: { title?: string; salaryMin?: number | null; salaryMax?: number | null } | null
): Promise<{
  response: string;
  nextStage: AIStage;
  needsIntervention: boolean;
  interventionReason?: string;
  collectedData: CollectedData;
}> {
  let nextStage = currentStage;
  let needsIntervention = false;
  let interventionReason: string | undefined;

  // Check for intervention triggers in candidate message
  const lowerMessage = candidateMessage.toLowerCase();
  if (
    lowerMessage.includes("falar com") ||
    lowerMessage.includes("atendente") ||
    lowerMessage.includes("humano") ||
    lowerMessage.includes("pessoa") ||
    lowerMessage.includes("recrutador")
  ) {
    needsIntervention = true;
    interventionReason = "Candidato solicitou falar com humano";
    nextStage = AI_STAGES.HANDOFF;
    return {
      response: aiResponse,
      nextStage,
      needsIntervention,
      interventionReason,
      collectedData,
    };
  }

  // Progress through stages based on current stage
  const stageOrder: AIStage[] = [
    AI_STAGES.WELCOME,
    AI_STAGES.INTRODUCTION,
    AI_STAGES.EXPERIENCE_CHECK,
    AI_STAGES.AVAILABILITY_CHECK,
    AI_STAGES.SALARY_CHECK,
    AI_STAGES.SKILLS_CHECK,
    AI_STAGES.MOTIVATION_CHECK,
    AI_STAGES.FIT_ANALYSIS,
    AI_STAGES.SCHEDULING,
  ];

  const currentIndex = stageOrder.indexOf(currentStage);
  
  // Extract data based on stage
  if (currentStage === AI_STAGES.INTRODUCTION || currentStage === AI_STAGES.EXPERIENCE_CHECK) {
    collectedData.experience = candidateMessage;
  } else if (currentStage === AI_STAGES.AVAILABILITY_CHECK) {
    collectedData.availability = candidateMessage;
  } else if (currentStage === AI_STAGES.SALARY_CHECK) {
    collectedData.salary = candidateMessage;
  } else if (currentStage === AI_STAGES.SKILLS_CHECK) {
    collectedData.skills = candidateMessage.split(/[,;]/).map((s) => s.trim());
  } else if (currentStage === AI_STAGES.MOTIVATION_CHECK) {
    collectedData.motivation = candidateMessage;
  }

  // For FIT_ANALYSIS stage, use AI to calculate fit score
  if (currentStage === AI_STAGES.FIT_ANALYSIS || currentStage === AI_STAGES.MOTIVATION_CHECK) {
    const fitAnalysis = await calculateFitScore(zai, collectedData, job);
    collectedData.fitScore = fitAnalysis.score;
    collectedData.fitReason = fitAnalysis.reason;

    if (fitAnalysis.score >= 70) {
      nextStage = AI_STAGES.SCHEDULING;
    } else if (fitAnalysis.score >= 40) {
      // Medium fit - needs human review
      needsIntervention = true;
      interventionReason = `Fit médio (${fitAnalysis.score}%) - Requer análise humana`;
      nextStage = AI_STAGES.HANDOFF;
    } else {
      // Low fit - still inform gently
      nextStage = AI_STAGES.CLOSED;
    }
  } else if (currentIndex < stageOrder.length - 1) {
    // Progress to next stage
    nextStage = stageOrder[currentIndex + 1];
  }

  return {
    response: aiResponse,
    nextStage,
    needsIntervention,
    interventionReason,
    collectedData,
  };
}

/**
 * Calculate fit score based on collected data
 */
async function calculateFitScore(
  zai: NonNullable<typeof zaiInstance>,
  collectedData: CollectedData,
  job: { title?: string; salaryMin?: number | null; salaryMax?: number | null } | null
): Promise<{ score: number; reason: string }> {
  const analysisPrompt = `Você é um analista de recrutamento. Analise os dados coletados do candidato e dê uma pontuação de fit de 0 a 100.

## Dados do Candidato
Experiência: ${collectedData.experience || "Não informada"}
Disponibilidade: ${collectedData.availability || "Não informada"}
Pretensão Salarial: ${collectedData.salary || "Não informada"}
Skills: ${collectedData.skills?.join(", ") || "Não informadas"}
Motivação: ${collectedData.motivation || "Não informada"}

## Vaga
Título: ${job?.title || "Não especificado"}
Faixa salarial: ${job?.salaryMin && job?.salaryMax ? `R$ ${job.salaryMin} - R$ ${job.salaryMax}` : "A combinar"}

Responda APENAS com um JSON no formato:
{"score": <número de 0 a 100>, "reason": "<breve justificativa de 1 frase>"}`;

  const completion = await zai.chat.completions.create({
    messages: [{ role: "assistant", content: analysisPrompt }],
    thinking: { type: "disabled" },
  });

  const response = completion.choices[0]?.message?.content || '{"score": 50, "reason": "Análise inconclusiva"}';

  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[^}]+\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback
  }

  return { score: 50, reason: "Análise padrão aplicada" };
}

/**
 * Send AI message to conversation
 */
export async function sendAIMessage(
  conversationId: string,
  content: string,
  aiStage?: AIStage,
  collectedData?: CollectedData,
  needsIntervention?: boolean,
  interventionReason?: string
): Promise<void> {
  // Create message
  await db.message.create({
    data: {
      conversationId,
      senderType: "AI" as SenderType,
      senderName: "Zoe (IA)",
      content,
      contentType: "TEXT" as ContentType,
      channel: "CHAT" as ChannelType,
      status: "SENT" as MessageStatus,
      isAiGenerated: true,
    },
  });

  // Update conversation
  const updateData: Record<string, unknown> = {
    lastMessageAt: new Date(),
    lastMessagePreview: content.substring(0, 100),
  };

  if (aiStage) updateData.aiStage = aiStage;
  if (collectedData) updateData.collectedData = JSON.stringify(collectedData);
  if (needsIntervention !== undefined) {
    updateData.needsIntervention = needsIntervention;
    updateData.interventionReason = interventionReason;
  }

  await db.conversation.update({
    where: { id: conversationId },
    data: updateData,
  });

  // Create intervention record if needed
  if (needsIntervention) {
    await db.humanIntervention.create({
      data: {
        conversationId,
        triggeredBy: "AI",
        reason: interventionReason || "Intervenção necessária",
      },
    });
  }
}

/**
 * Start automated screening for a new conversation
 */
export async function startAutomatedScreening(conversationId: string): Promise<void> {
  // Get conversation
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      candidate: {
        include: {
          job: {
            select: { title: true },
          },
        },
      },
    },
  });

  if (!conversation || !conversation.aiMode) {
    return;
  }

  const candidateName = conversation.candidate?.name || "Candidato";
  const jobTitle = conversation.candidate?.job?.title || "nossa vaga";

  // Generate welcome message
  const welcomeMessage = `Olá, ${candidateName}! 👋

Sou a Zoe, assistente de recrutamento da Zion Recruit. Fiquei feliz em receber seu currículo para a vaga de **${jobTitle}**!

Gostaria de conhecer melhor seu perfil. Tem alguns minutos para responder algumas perguntas rápidas?`;

  await sendAIMessage(conversationId, welcomeMessage, AI_STAGES.WELCOME);
}

export { AI_STAGES };
export type { AIStage, CollectedData };
