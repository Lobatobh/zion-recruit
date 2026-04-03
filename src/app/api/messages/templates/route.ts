/**
 * Templates API - Zion Recruit
 * Handles message templates
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ChannelType } from "@prisma/client";

const DEMO_TENANT_ID = "cmmxleln70000px3a43u36vum";

// Default templates
const DEFAULT_TEMPLATES = [
  {
    trigger: "WELCOME",
    name: "Mensagem de Boas-vindas",
    category: "screening",
    body: `Olá, {candidateName}! 👋

Sou a assistente de recrutamento da {companyName} e estou muito feliz em entrar em contato sobre a vaga de {jobTitle}.

Recebi seu currículo e gostaria de conhecer melhor sua experiência. Tem alguns minutos para conversar?

Responderei suas dúvidas e farei algumas perguntas rápidas para entender melhor seu perfil.`,
    channel: "CHAT",
    variables: ["candidateName", "companyName", "jobTitle"],
  },
  {
    trigger: "SCREENING_START",
    name: "Início da Triagem",
    category: "screening",
    body: `Perfeito! Vou fazer algumas perguntas rápidas para conhecer melhor seu perfil.

Por favor, responda da forma que preferir - não há respostas certas ou erradas! 😊`,
    channel: "CHAT",
    variables: [],
  },
  {
    trigger: "SCHEDULE_INTERVIEW",
    name: "Agendar Entrevista",
    category: "scheduling",
    body: `Parabéns, {candidateName}! 🎉

Seu perfil se encaixa muito bem com o que buscamos para a vaga de {jobTitle}.

Gostaria de agendar uma conversa com nossa equipe de recrutamento? Por favor, me informe:
- Sua disponibilidade nos próximos dias
- Prefere reunião por vídeo ou presencial?

Nossos horários de atendimento são de segunda a sexta, das 9h às 18h.`,
    channel: "CHAT",
    variables: ["candidateName", "jobTitle"],
  },
  {
    trigger: "REJECT",
    name: "Feedback - Não Selecionado",
    category: "feedback",
    body: `Olá, {candidateName}

Agradecemos seu interesse na vaga de {jobTitle} na {companyName}.

Após análise cuidadosa do seu perfil, decidimos seguir com outros candidatos cujo perfil mais se adequa às necessidades atuais da posição.

Isso não significa que você não tenha qualificações valiosas. Guardaremos seu currículo em nosso banco de talentos para oportunidades futuras.

Desejamos muito sucesso em sua jornada profissional! 🙏`,
    channel: "CHAT",
    variables: ["candidateName", "jobTitle", "companyName"],
  },
  {
    trigger: "HANDOFF",
    name: "Transferência para Humano",
    category: "handoff",
    body: `Ótimo, {candidateName}! 

Vou transferir você para um de nossos recrutadores que poderá te ajudar melhor com isso. Aguarde um momento que logo alguém entrará em contato.

Enquanto isso, se tiver outras dúvidas, pode me perguntar! 😊`,
    channel: "CHAT",
    variables: ["candidateName"],
  },
];

// GET /api/messages/templates - List templates
export async function GET() {
  try {
    let templates = await db.messageTemplate.findMany({
      where: { tenantId: DEMO_TENANT_ID },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // If no templates, create defaults
    if (templates.length === 0) {
      templates = await Promise.all(
        DEFAULT_TEMPLATES.map((t) =>
          db.messageTemplate.create({
            data: {
              tenantId: DEMO_TENANT_ID,
              trigger: t.trigger,
              name: t.name,
              category: t.category,
              body: t.body,
              channel: t.channel as ChannelType,
              variables: JSON.stringify(t.variables),
              isActive: true,
              isDefault: true,
            },
          })
        )
      );
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Falha ao carregar templates" },
      { status: 500 }
    );
  }
}

// POST /api/messages/templates - Create template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, trigger, category, subject, body: templateBody, channel, variables } = body;

    if (!name || !trigger || !templateBody) {
      return NextResponse.json(
        { error: "Nome, trigger e corpo são obrigatórios" },
        { status: 400 }
      );
    }

    const template = await db.messageTemplate.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name,
        trigger,
        category: category || "custom",
        subject: subject || null,
        body: templateBody,
        channel: (channel || "CHAT") as ChannelType,
        variables: variables ? JSON.stringify(variables) : null,
        isActive: true,
        isDefault: false,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Falha ao criar template" },
      { status: 500 }
    );
  }
}
