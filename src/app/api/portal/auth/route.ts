/**
 * Portal Authentication API
 * Sends magic link email to candidate for portal access
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import { ResendEmailService } from '@/lib/email/email-service';

// Token expiration: 7 days
const TOKEN_EXPIRATION_DAYS = 7;

interface PortalAuthRequest {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PortalAuthRequest;
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find candidate by email
    const candidates = await db.candidate.findMany({
      where: { email: email.toLowerCase() },
      include: {
        job: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!candidates.length) {
      // Don't reveal if email exists or not
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a portal access link has been sent.',
      });
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRATION_DAYS);

    // Create or update portal access for each candidate
    for (const candidate of candidates) {
      // Deactivate any existing tokens
      await db.candidatePortalAccess.updateMany({
        where: {
          candidateId: candidate.id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Create new token
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
    }

    // Send portal access email
    const firstCandidate = candidates[0];
    const tenant = firstCandidate.job.tenant;
    const portalUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/?view=portal&token=${token}`;

    // Try to send email via Resend
    try {
      const emailService = await ResendEmailService.createFromDatabase(tenant.id);
      
      if (emailService) {
        await emailService.sendEmail({
          to: { email, name: firstCandidate.name },
          subject: `Acesse seu Portal do Candidato - ${tenant.name}`,
          html: generatePortalAccessEmailHtml({
            candidateName: firstCandidate.name,
            companyName: tenant.name,
            companyLogo: tenant.logo,
            portalUrl,
            expiresIn: '7 dias',
          }),
          text: generatePortalAccessEmailText({
            candidateName: firstCandidate.name,
            companyName: tenant.name,
            portalUrl,
            expiresIn: '7 dias',
          }),
          tenantId: tenant.id,
          candidateId: firstCandidate.id,
          emailType: 'PORTAL_ACCESS',
        });
      }
    } catch (emailError) {
      console.error('Failed to send portal access email:', emailError);
      // Continue even if email fails - token is still valid
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a portal access link has been sent.',
    });
  } catch (error) {
    console.error('Portal auth error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

function generatePortalAccessEmailHtml(vars: {
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
  <title>Acesse seu Portal do Candidato</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${vars.companyLogo ? `<div style="text-align: center; margin-bottom: 30px;"><img src="${vars.companyLogo}" alt="${vars.companyName}" style="max-width: 150px; height: auto;"></div>` : ''}
  
  <div style="background-color: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin-top: 0;">Olá, ${vars.candidateName}! 👋</h1>
    
    <p>Você solicitou acesso ao Portal do Candidato da <strong>${vars.companyName}</strong>.</p>
    
    <p>Através do portal, você pode:</p>
    <ul>
      <li>Verificar o status das suas candidaturas</li>
      <li>Agendar e confirmar entrevistas</li>
      <li>Enviar documentos</li>
      <li>Comunicar-se com a equipe de recrutamento</li>
      <li>Realizar testes de avaliação</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${vars.portalUrl}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Acessar Portal</a>
    </div>
    
    <p style="color: #666; font-size: 14px; text-align: center;">⏰ Link válido por ${vars.expiresIn}</p>
    
    <div style="background-color: #e0f2fe; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;"><strong>Segurança:</strong> Este link é pessoal e intransferível. Não compartilhe com outras pessoas.</p>
    </div>
  </div>
  
  <p style="color: #666; font-size: 14px;">Se você não solicitou este acesso, pode ignorar este email.</p>
  
  <p>Atenciosamente,<br><strong>${vars.companyName}</strong></p>
</body>
</html>
  `;
}

function generatePortalAccessEmailText(vars: {
  candidateName: string;
  companyName: string;
  portalUrl: string;
  expiresIn: string;
}): string {
  return `
Olá, ${vars.candidateName}!

Você solicitou acesso ao Portal do Candidato da ${vars.companyName}.

Através do portal, você pode:
- Verificar o status das suas candidaturas
- Agendar e confirmar entrevistas
- Enviar documentos
- Comunicar-se com a equipe de recrutamento
- Realizar testes de avaliação

Acesse o portal através do link:
${vars.portalUrl}

⏰ Link válido por ${vars.expiresIn}

Segurança: Este link é pessoal e intransferível. Não compartilhe com outras pessoas.

Se você não solicitou este acesso, pode ignorar este email.

Atenciosamente,
${vars.companyName}
  `;
}
