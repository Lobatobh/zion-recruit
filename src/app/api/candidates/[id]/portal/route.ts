/**
 * Candidate Portal Invitation API - Zion Recruit
 * Admin-side endpoint to generate/regenerate portal access tokens
 * and send invitation emails to candidates
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const TOKEN_EXPIRATION_DAYS = 7;

// POST /api/candidates/[id]/portal - Generate portal token & optionally send email
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: candidateId } = await params;
    const body = await request.json();
    const { sendEmail = false } = body;

    // Verify candidate belongs to organization
    const candidate = await db.candidate.findFirst({
      where: {
        id: candidateId,
        tenantId: session.user.tenantId,
      },
      include: {
        job: {
          include: {
            tenant: {
              select: { id: true, name: true, logo: true },
            },
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRATION_DAYS);

    // Deactivate any existing tokens
    await db.candidatePortalAccess.updateMany({
      where: {
        candidateId: candidate.id,
        isActive: true,
      },
      data: { isActive: false },
    });

    // Create new portal access
    await db.candidatePortalAccess.create({
      data: {
        candidateId: candidate.id,
        token,
        expiresAt,
        isActive: true,
      },
    });

    // Update candidate with token reference
    await db.candidate.update({
      where: { id: candidate.id },
      data: { candidateToken: token },
    });

    // Build portal URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const portalUrl = `${baseUrl}/?view=portal&token=${token}`;

    // Optionally send email
    let emailSent = false;
    if (sendEmail && candidate.job?.tenant) {
      try {
        const tenant = candidate.job.tenant;

        // Try to find Resend credentials for this tenant
        const resendCred = await db.apiCredential.findFirst({
          where: {
            tenantId: tenant.id,
            provider: "RESEND",
            isActive: true,
          },
        });

        if (resendCred) {
          const apiKey = resendCred.apiKey;
          const fromEmail = resendCred.defaultModel || "onboarding@resend.dev";

          // Dynamic import to avoid issues if resend not installed
          const { Resend } = await import("resend");
          const resend = new Resend(apiKey);

          await resend.emails.send({
            from: fromEmail,
            to: candidate.email,
            subject: `Acesse seu Portal do Candidato - ${tenant.name}`,
            html: generatePortalEmailHtml({
              candidateName: candidate.name,
              companyName: tenant.name,
              companyLogo: tenant.logo,
              portalUrl,
              expiresIn: "7 dias",
            }),
            text: generatePortalEmailText({
              candidateName: candidate.name,
              companyName: tenant.name,
              portalUrl,
              expiresIn: "7 dias",
            }),
          });

          emailSent = true;
        }
      } catch (emailError) {
        console.error("Failed to send portal invitation email:", emailError);
        // Continue - token is still valid
      }
    }

    return NextResponse.json({
      success: true,
      token,
      portalUrl,
      expiresAt: expiresAt.toISOString(),
      emailSent,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
    });
  } catch (error) {
    console.error("Error generating portal invitation:", error);
    return NextResponse.json(
      { error: "Erro ao gerar convite do portal" },
      { status: 500 }
    );
  }
}

// GET /api/candidates/[id]/portal - Get existing portal access info
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: candidateId } = await params;

    // Verify candidate belongs to organization
    const candidate = await db.candidate.findFirst({
      where: {
        id: candidateId,
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        candidateToken: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    // Find active portal access
    const portalAccess = await db.candidatePortalAccess.findUnique({
      where: { candidateId: candidate.id },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const hasActiveToken =
      portalAccess?.isActive &&
      portalAccess.expiresAt > new Date();

    return NextResponse.json({
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      hasActiveToken,
      expiresAt: portalAccess?.expiresAt?.toISOString() || null,
      lastAccessAt: portalAccess?.lastAccessAt?.toISOString() || null,
      portalUrl: hasActiveToken && candidate.candidateToken
        ? `${baseUrl}/?view=portal&token=${candidate.candidateToken}`
        : null,
    });
  } catch (error) {
    console.error("Error fetching portal info:", error);
    return NextResponse.json(
      { error: "Erro ao buscar informações do portal" },
      { status: 500 }
    );
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function generatePortalEmailHtml(vars: {
  candidateName: string;
  companyName: string;
  companyLogo?: string | null;
  portalUrl: string;
  expiresIn: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portal do Candidato</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${vars.companyLogo ? `<div style="text-align: center; margin-bottom: 30px;"><img src="${vars.companyLogo}" alt="${vars.companyName}" style="max-width: 150px; height: auto;"></div>` : ''}

  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #059669; margin-top: 0; font-size: 22px;">Olá, ${vars.candidateName}!</h1>

    <p>A <strong>${vars.companyName}</strong> convida você a acompanhar o seu processo seletivo em tempo real.</p>

    <p style="font-weight: 600; margin-top: 16px;">Pelo Portal do Candidato você pode:</p>
    <ul style="line-height: 2;">
      <li>📊 Ver em qual etapa do processo você está</li>
      <li>📋 Acompanhar todas as fases do processo seletivo</li>
      <li>📅 Gerenciar suas entrevistas (confirmar/reagendar)</li>
      <li>🧠 Realizar testes de perfil comportamental (DISC)</li>
      <li>💬 Enviar mensagens para a equipe de recrutamento</li>
      <li>📝 Atualizar seus dados cadastrais</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${vars.portalUrl}" style="background-color: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Acessar meu Portal</a>
    </div>

    <p style="color: #666; font-size: 13px; text-align: center;">⏰ Link válido por ${vars.expiresIn}</p>

    <div style="background-color: #ecfdf5; border-radius: 8px; padding: 12px; margin-top: 16px;">
      <p style="margin: 0; font-size: 13px; color: #065f46;"><strong>🔒 Segurança:</strong> Este link é pessoal e intransferível.</p>
    </div>
  </div>

  <p style="color: #666; font-size: 13px;">Se você não solicitou este acesso, pode ignorar este email.</p>

  <p>Atenciosamente,<br><strong>${vars.companyName}</strong><br><span style="color: #999; font-size: 12px;">Powered by Zion Recruit</span></p>
</body>
</html>
  `;
}

function generatePortalEmailText(vars: {
  candidateName: string;
  companyName: string;
  portalUrl: string;
  expiresIn: string;
}): string {
  return `
Olá, ${vars.candidateName}!

A ${vars.companyName} convida você a acompanhar o seu processo seletivo em tempo real.

Pelo Portal do Candidato você pode:
- Ver em qual etapa do processo você está
- Acompanhar todas as fases do processo seletivo
- Gerenciar suas entrevistas (confirmar/reagendar)
- Realizar testes de perfil comportamental (DISC)
- Enviar mensagens para a equipe de recrutamento
- Atualizar seus dados cadastrais

Acesse o portal através do link:
${vars.portalUrl}

Link válido por ${vars.expiresIn}.

Segurança: Este link é pessoal e intransferível.

Se você não solicitou este acesso, pode ignorar este email.

Atenciosamente,
${vars.companyName}
Powered by Zion Recruit
  `;
}
