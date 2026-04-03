/**
 * Resend Email Service - Zion Recruit
 * Email service using Resend API for sending emails
 */

import { db } from '@/lib/db';
import type {
  EmailAttachment,
  EmailRecipient,
  SendEmailOptions,
  DISCInvitationEmailOptions,
  InterviewConfirmationEmailOptions,
  InterviewReminderEmailOptions,
  InterviewCancellationEmailOptions,
  CandidateStatusUpdateEmailOptions,
  EmailSendResult,
  EmailServiceConfig,
  EmailTemplateVariables,
  TemplateEmailOptions,
  EmailStatus,
  EmailType,
  ResendSendResponse,
  ResendErrorResponse,
  ResendWebhookEvent,
} from './types';

// ============================================
// CONSTANTS
// ============================================

const RESEND_API_URL = 'https://api.resend.com';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format recipient for Resend API
 */
function formatRecipient(recipient: string | EmailRecipient): string | { email: string; name?: string } {
  if (typeof recipient === 'string') {
    return recipient;
  }
  return {
    email: recipient.email,
    ...(recipient.name && { name: recipient.name }),
  };
}

/**
 * Format recipients array for Resend API
 */
function formatRecipients(recipients: string | EmailRecipient | Array<string | EmailRecipient>): (string | { email: string; name?: string })[] {
  if (Array.isArray(recipients)) {
    return recipients.map(formatRecipient);
  }
  return [formatRecipient(recipients)];
}

/**
 * Format attachment for Resend API
 */
function formatAttachment(attachment: EmailAttachment): Record<string, unknown> {
  const formatted: Record<string, unknown> = {
    filename: attachment.filename,
  };

  if (attachment.content) {
    formatted.content = typeof attachment.content === 'string' 
      ? attachment.content 
      : attachment.content.toString('base64');
  } else if (attachment.path) {
    formatted.path = attachment.path;
  }

  if (attachment.contentType) {
    formatted.content_type = attachment.contentType;
  }

  if (attachment.disposition) {
    formatted.disposition = attachment.disposition;
  }

  if (attachment.cid) {
    formatted.cid = attachment.cid;
  }

  return formatted;
}

/**
 * Format date for email display
 */
function formatDateForEmail(date: Date, timezone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone || 'America/Sao_Paulo',
  };
  return date.toLocaleDateString('pt-BR', options);
}

/**
 * Format time for email display
 */
function formatTimeForEmail(date: Date, timezone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone || 'America/Sao_Paulo',
  };
  return date.toLocaleTimeString('pt-BR', options);
}

/**
 * Get interview type label in Portuguese
 */
function getInterviewTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SCREENING: 'Triagem',
    TECHNICAL: 'Técnica',
    BEHAVIORAL: 'Comportamental',
    CULTURAL: 'Cultural',
    FINAL: 'Final',
    PHONE: 'Telefônica',
    VIDEO: 'Videochamada',
    ONSITE: 'Presencial',
  };
  return labels[type] || type;
}

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Built-in email templates
 */
const EMAIL_TEMPLATES = {
  DISC_INVITATION: {
    subject: 'Convite para Avaliação DISC - {companyName}',
    html: (vars: EmailTemplateVariables) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para Avaliação DISC</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${vars.companyLogo ? `<div style="text-align: center; margin-bottom: 30px;"><img src="${vars.companyLogo}" alt="${vars.companyName}" style="max-width: 150px; height: auto;"></div>` : ''}
  
  <div style="background-color: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin-top: 0;">Olá, ${vars.candidateName}! 👋</h1>
    
    <p>Parabéns por avançar no processo seletivo para a vaga de <strong>${vars.jobTitle}</strong> na <strong>${vars.companyName}</strong>!</p>
    
    <p>Como próxima etapa, gostaríamos de convidá-lo(a) para realizar a <strong>Avaliação de Perfil Comportamental DISC</strong>.</p>
    
    <div style="background-color: #e0f2fe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;"><strong>O que é a avaliação DISC?</strong></p>
      <p style="margin: 10px 0 0 0;">A avaliação DISC é um ferramenta que ajuda a entender melhor seu estilo comportamental e como você se relaciona em ambientes de trabalho. Não há respostas certas ou erradas!</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${vars.discTestUrl}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Iniciar Avaliação DISC</a>
    </div>
    
    ${vars.discTestExpiresAt ? `<p style="color: #666; font-size: 14px; text-align: center;">⏰ Link válido até: ${vars.discTestExpiresAt}</p>` : ''}
    
    <p>A avaliação leva aproximadamente 10-15 minutos e pode ser feita pelo celular ou computador.</p>
  </div>
  
  <p style="color: #666; font-size: 14px;">Se tiver alguma dúvida, não hesite em nos contatar.</p>
  
  <p>Atenciosamente,<br><strong>${vars.companyName}</strong></p>
</body>
</html>`,
    text: (vars: EmailTemplateVariables) => `
Olá, ${vars.candidateName}!

Parabéns por avançar no processo seletivo para a vaga de ${vars.jobTitle} na ${vars.companyName}!

Como próxima etapa, gostaríamos de convidá-lo(a) para realizar a Avaliação de Perfil Comportamental DISC.

O que é a avaliação DISC?
A avaliação DISC é um ferramenta que ajuda a entender melhor seu estilo comportamental e como você se relaciona em ambientes de trabalho. Não há respostas certas ou erradas!

Para iniciar a avaliação, acesse o link abaixo:
${vars.discTestUrl}

${vars.discTestExpiresAt ? `⏰ Link válido até: ${vars.discTestExpiresAt}` : ''}

A avaliação leva aproximadamente 10-15 minutos e pode ser feita pelo celular ou computador.

Se tiver alguma dúvida, não hesite em nos contatar.

Atenciosamente,
${vars.companyName}
`,
  },

  INTERVIEW_CONFIRMATION: {
    subject: 'Confirmação de Entrevista - {companyName}',
    html: (vars: EmailTemplateVariables) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação de Entrevista</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${vars.companyLogo ? `<div style="text-align: center; margin-bottom: 30px;"><img src="${vars.companyLogo}" alt="${vars.companyName}" style="max-width: 150px; height: auto;"></div>` : ''}
  
  <div style="background-color: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #10b981; margin-top: 0;">🎉 Entrevista Agendada!</h1>
    
    <p>Olá, <strong>${vars.candidateName}</strong>!</p>
    
    <p>Sua entrevista para a vaga de <strong>${vars.jobTitle}</strong> na <strong>${vars.companyName}</strong> está agendada!</p>
    
    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>📅 Data:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${vars.interviewDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>🕐 Horário:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${vars.interviewTime}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>⏱️ Duração:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${vars.interviewDuration}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>📋 Tipo:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${vars.interviewType}</td>
        </tr>
        ${vars.interviewerName ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>👤 Entrevistador:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${vars.interviewerName}</td>
        </tr>
        ` : ''}
        ${vars.meetingUrl ? `
        <tr>
          <td style="padding: 10px 0;"><strong>🔗 Local:</strong></td>
          <td style="padding: 10px 0;">${vars.meetingProvider ? `${vars.meetingProvider} - ` : ''}<a href="${vars.meetingUrl}">Acessar Reunião</a></td>
        </tr>
        ` : ''}
        ${vars.interviewLocation && !vars.meetingUrl ? `
        <tr>
          <td style="padding: 10px 0;"><strong>📍 Local:</strong></td>
          <td style="padding: 10px 0;">${vars.interviewLocation}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    ${vars.meetingUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${vars.meetingUrl}" style="background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Entrar na Reunião</a>
    </div>
    ` : ''}
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;"><strong>⚠️ Importante:</strong></p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px;">
        <li>Por favor, confirme sua presença respondendo este e-mail</li>
        <li>Chegue com 5 minutos de antecedência</li>
        <li>Em caso de imprevisto, nos avise com pelo menos 24h de antecedência</li>
      </ul>
    </div>
  </div>
  
  <p style="color: #666; font-size: 14px;">Estamos ansiosos para conhecê-lo(a)!</p>
  
  <p>Atenciosamente,<br><strong>Equipe de Recrutamento - ${vars.companyName}</strong></p>
</body>
</html>`,
    text: (vars: EmailTemplateVariables) => `
🎉 ENTREVISTA AGENDADA!

Olá, ${vars.candidateName}!

Sua entrevista para a vaga de ${vars.jobTitle} na ${vars.companyName} está agendada!

DETALHES DA ENTREVISTA:
━━━━━━━━━━━━━━━━━━━━━━
📅 Data: ${vars.interviewDate}
🕐 Horário: ${vars.interviewTime}
⏱️ Duração: ${vars.interviewDuration}
📋 Tipo: ${vars.interviewType}
${vars.interviewerName ? `👤 Entrevistador: ${vars.interviewerName}` : ''}
${vars.meetingUrl ? `🔗 Link: ${vars.meetingUrl}` : ''}
${vars.interviewLocation && !vars.meetingUrl ? `📍 Local: ${vars.interviewLocation}` : ''}
━━━━━━━━━━━━━━━━━━━━━━

⚠️ IMPORTANTE:
• Por favor, confirme sua presença respondendo este e-mail
• Chegue com 5 minutos de antecedência
• Em caso de imprevisto, nos avise com pelo menos 24h de antecedência

Estamos ansiosos para conhecê-lo(a)!

Atenciosamente,
Equipe de Recrutamento - ${vars.companyName}
`,
  },

  INTERVIEW_REMINDER: {
    subject: '⏰ Lembrete: Entrevista em breve - {companyName}',
    html: (vars: EmailTemplateVariables) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete de Entrevista</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${vars.companyLogo ? `<div style="text-align: center; margin-bottom: 30px;"><img src="${vars.companyLogo}" alt="${vars.companyName}" style="max-width: 150px; height: auto;"></div>` : ''}
  
  <div style="background-color: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #f59e0b; margin-top: 0;">⏰ Lembrete de Entrevista</h1>
    
    <p>Olá, <strong>${vars.candidateName}</strong>!</p>
    
    <p>Sua entrevista para a vaga de <strong>${vars.jobTitle}</strong> está chegando!</p>
    
    <div style="background-color: white; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #666;">Sua entrevista será em:</p>
      <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #f59e0b;">${vars.interviewDate}</p>
      <p style="margin: 5px 0 0 0; font-size: 20px; color: #333;">${vars.interviewTime}</p>
    </div>
    
    ${vars.meetingUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${vars.meetingUrl}" style="background-color: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Entrar na Reunião</a>
    </div>
    ` : ''}
    
    <div style="background-color: #e0f2fe; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;"><strong>💡 Dicas para a entrevista:</strong></p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px;">
        <li>Teste sua câmera e microfone antes</li>
        <li>Escolha um local tranquilo e bem iluminado</li>
        <li>Tenha seu currículo em mãos</li>
      </ul>
    </div>
  </div>
  
  <p style="color: #666; font-size: 14px;">Nos vemos em breve!</p>
  
  <p>Atenciosamente,<br><strong>${vars.companyName}</strong></p>
</body>
</html>`,
    text: (vars: EmailTemplateVariables) => `
⏰ LEMBRETE DE ENTREVISTA

Olá, ${vars.candidateName}!

Sua entrevista para a vaga de ${vars.jobTitle} está chegando!

Sua entrevista será em:
📅 ${vars.interviewDate}
🕐 ${vars.interviewTime}

${vars.meetingUrl ? `Link para a reunião: ${vars.meetingUrl}` : ''}

💡 DICAS PARA A ENTREVISTA:
• Teste sua câmera e microfone antes
• Escolha um local tranquilo e bem iluminado
• Tenha seu currículo em mãos

Nos vemos em breve!

Atenciosamente,
${vars.companyName}
`,
  },

  INTERVIEW_CANCELLATION: {
    subject: 'Cancelamento de Entrevista - {companyName}',
    html: (vars: EmailTemplateVariables) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancelamento de Entrevista</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${vars.companyLogo ? `<div style="text-align: center; margin-bottom: 30px;"><img src="${vars.companyLogo}" alt="${vars.companyName}" style="max-width: 150px; height: auto;"></div>` : ''}
  
  <div style="background-color: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #ef4444; margin-top: 0;">❌ Entrevista Cancelada</h1>
    
    <p>Olá, <strong>${vars.candidateName}</strong>,</p>
    
    <p>Infelizmente, precisamos cancelar sua entrevista para a vaga de <strong>${vars.jobTitle}</strong> na <strong>${vars.companyName}</strong>.</p>
    
    ${vars.customMessage ? `
    <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;">${vars.customMessage}</p>
    </div>
    ` : ''}
    
    <p>Pedimos desculpas pelo inconveniente e agradecemos sua compreensão.</p>
    
    ${vars.customFields?.rescheduleUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${vars.customFields.rescheduleUrl}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reagendar Entrevista</a>
    </div>
    ` : ''}
    
    <p>Em breve entraremos em contato para agendar uma nova data.</p>
  </div>
  
  <p>Atenciosamente,<br><strong>Equipe de Recrutamento - ${vars.companyName}</strong></p>
</body>
</html>`,
    text: (vars: EmailTemplateVariables) => `
❌ ENTREVISTA CANCELADA

Olá, ${vars.candidateName},

Infelizmente, precisamos cancelar sua entrevista para a vaga de ${vars.jobTitle} na ${vars.companyName}.

${vars.customMessage || ''}

Pedimos desculpas pelo inconveniente e agradecemos sua compreensão.

${vars.customFields?.rescheduleUrl ? `Para reagendar, acesse: ${vars.customFields.rescheduleUrl}` : 'Em breve entraremos em contato para agendar uma nova data.'}

Atenciosamente,
Equipe de Recrutamento - ${vars.companyName}
`,
  },

  CANDIDATE_STATUS_UPDATE: {
    subject: 'Atualização do Processo Seletivo - {companyName}',
    html: (vars: EmailTemplateVariables) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atualização do Processo Seletivo</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${vars.companyLogo ? `<div style="text-align: center; margin-bottom: 30px;"><img src="${vars.companyLogo}" alt="${vars.companyName}" style="max-width: 150px; height: auto;"></div>` : ''}
  
  <div style="background-color: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin-top: 0;">📋 Atualização do Processo Seletivo</h1>
    
    <p>Olá, <strong>${vars.candidateName}</strong>!</p>
    
    <p>Temos uma atualização sobre sua candidatura para a vaga de <strong>${vars.jobTitle}</strong> na <strong>${vars.companyName}</strong>.</p>
    
    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 10px 0; color: #666;">Status anterior:</td>
          <td style="padding: 10px 0; font-weight: bold;">${vars.previousStatus}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666;">Novo status:</td>
          <td style="padding: 10px 0; font-weight: bold; color: #10b981;">${vars.newStatus}</td>
        </tr>
      </table>
    </div>
    
    ${vars.statusMessage ? `
    <div style="background-color: #e0f2fe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Mensagem:</strong></p>
      <p style="margin: 10px 0 0 0;">${vars.statusMessage}</p>
    </div>
    ` : ''}
    
    ${vars.customFields?.nextSteps ? `
    <div style="background-color: #d1fae5; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;"><strong>📍 Próximos passos:</strong></p>
      <p style="margin: 10px 0 0 0;">${vars.customFields.nextSteps}</p>
    </div>
    ` : ''}
  </div>
  
  <p style="color: #666; font-size: 14px;">Se tiver alguma dúvida, responda este e-mail.</p>
  
  <p>Atenciosamente,<br><strong>Equipe de Recrutamento - ${vars.companyName}</strong></p>
</body>
</html>`,
    text: (vars: EmailTemplateVariables) => `
📋 ATUALIZAÇÃO DO PROCESSO SELETIVO

Olá, ${vars.candidateName}!

Temos uma atualização sobre sua candidatura para a vaga de ${vars.jobTitle} na ${vars.companyName}.

━━━━━━━━━━━━━━━━━━━━━━
Status anterior: ${vars.previousStatus}
Novo status: ${vars.newStatus}
━━━━━━━━━━━━━━━━━━━━━━

${vars.statusMessage ? `Mensagem: ${vars.statusMessage}` : ''}

${vars.customFields?.nextSteps ? `📍 Próximos passos: ${vars.customFields.nextSteps}` : ''}

Se tiver alguma dúvida, responda este e-mail.

Atenciosamente,
Equipe de Recrutamento - ${vars.companyName}
`,
  },

  REJECTION: {
    subject: 'Feedback sobre sua candidatura - {companyName}',
    html: (vars: EmailTemplateVariables) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback sobre Candidatura</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${vars.companyLogo ? `<div style="text-align: center; margin-bottom: 30px;"><img src="${vars.companyLogo}" alt="${vars.companyName}" style="max-width: 150px; height: auto;"></div>` : ''}
  
  <div style="background-color: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #6b7280; margin-top: 0;">Obrigado pelo seu interesse</h1>
    
    <p>Olá, <strong>${vars.candidateName}</strong>,</p>
    
    <p>Agradecemos seu interesse na vaga de <strong>${vars.jobTitle}</strong> na <strong>${vars.companyName}</strong>.</p>
    
    <div style="background-color: #fee2e2; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;">Após análise cuidadosa do seu perfil, decidimos seguir com outros candidatos cujo perfil mais se adequa às necessidades atuais da posição.</p>
    </div>
    
    <p>Isso não significa que você não tenha qualificações valiosas. Guardaremos seu currículo em nosso banco de talentos para oportunidades futuras.</p>
    
    ${vars.statusMessage ? `
    <div style="background-color: #e0f2fe; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Feedback:</strong></p>
      <p style="margin: 10px 0 0 0;">${vars.statusMessage}</p>
    </div>
    ` : ''}
    
    <p>Desejamos muito sucesso em sua jornada profissional! 🙏</p>
  </div>
  
  <p>Atenciosamente,<br><strong>Equipe de Recrutamento - ${vars.companyName}</strong></p>
</body>
</html>`,
    text: (vars: EmailTemplateVariables) => `
OBRIGADO PELO SEU INTERESSE

Olá, ${vars.candidateName},

Agradecemos seu interesse na vaga de ${vars.jobTitle} na ${vars.companyName}.

Após análise cuidadosa do seu perfil, decidimos seguir com outros candidatos cujo perfil mais se adequa às necessidades atuais da posição.

Isso não significa que você não tenha qualificações valiosas. Guardaremos seu currículo em nosso banco de talentos para oportunidades futuras.

${vars.statusMessage ? `Feedback: ${vars.statusMessage}` : ''}

Desejamos muito sucesso em sua jornada profissional! 🙏

Atenciosamente,
Equipe de Recrutamento - ${vars.companyName}
`,
  },
};

// ============================================
// RESEND EMAIL SERVICE CLASS
// ============================================

export class ResendEmailService {
  private config: EmailServiceConfig;

  constructor(config: EmailServiceConfig) {
    this.config = config;
  }

  /**
   * Create an email service instance from database credentials
   */
  static async createFromDatabase(tenantId: string): Promise<ResendEmailService | null> {
    const credential = await db.apiCredential.findFirst({
      where: {
        tenantId,
        provider: 'RESEND',
        isActive: true,
      },
    });

    if (!credential) {
      return null;
    }

    // Decrypt API key if encrypted (for now, assume it's stored as-is)
    const apiKey = credential.apiKey;
    
    const config: EmailServiceConfig = {
      apiKey,
      defaultFrom: credential.endpoint || 'noreply@example.com',
      defaultFromName: credential.name || 'Zion Recruit',
    };

    return new ResendEmailService(config);
  }

  /**
   * Get the default from address
   */
  private getFromAddress(from?: string | EmailRecipient): string | { email: string; name?: string } {
    if (from) {
      return formatRecipient(from);
    }
    
    return {
      email: this.config.defaultFrom,
      ...(this.config.defaultFromName && { name: this.config.defaultFromName }),
    };
  }

  /**
   * Make an API request to Resend
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<{ data?: T; error?: ResendErrorResponse }> {
    const url = `${RESEND_API_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      return { error: responseData as ResendErrorResponse };
    }

    return { data: responseData as T };
  }

  /**
   * Log email to database
   */
  private async logEmail(
    options: SendEmailOptions,
    result: EmailSendResult,
    emailType: EmailType
  ): Promise<void> {
    if (!options.tenantId) return;

    try {
      await db.apiUsageLog.create({
        data: {
          tenantId: options.tenantId,
          credentialId: '', // Will be linked if needed
          requestType: 'email_send',
          model: 'resend',
          provider: 'RESEND',
          status: result.success ? 'SUCCESS' : 'ERROR',
          errorMessage: result.error,
          candidateId: options.candidateId,
          jobId: options.jobId,
          // Store email details in metadata
          // Note: For full tracking, consider adding an EmailLog model
        },
      });

      // Update credential last used
      await db.apiCredential.updateMany({
        where: {
          tenantId: options.tenantId,
          provider: 'RESEND',
          isActive: true,
        },
        data: {
          lastUsedAt: new Date(),
          ...(result.error && {
            lastError: result.error,
            lastErrorAt: new Date(),
          }),
        },
      });
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  /**
   * Send an email using Resend API
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const requestBody: Record<string, unknown> = {
      from: this.getFromAddress(options.from),
      to: formatRecipients(options.to),
      subject: options.subject,
    };

    if (options.html) {
      requestBody.html = options.html;
    }

    if (options.text) {
      requestBody.text = options.text;
    }

    if (options.cc) {
      requestBody.cc = formatRecipients(options.cc);
    }

    if (options.bcc) {
      requestBody.bcc = formatRecipients(options.bcc);
    }

    if (options.replyTo) {
      requestBody.reply_to = formatRecipient(options.replyTo);
    }

    if (options.attachments && options.attachments.length > 0) {
      requestBody.attachments = options.attachments.map(formatAttachment);
    }

    if (options.headers) {
      requestBody.headers = options.headers;
    }

    if (options.tags && options.tags.length > 0) {
      requestBody.tags = options.tags;
    }

    if (options.scheduledAt) {
      requestBody.scheduled_at = options.scheduledAt.toISOString();
    }

    const { data, error } = await this.makeRequest<ResendSendResponse>('/emails', 'POST', requestBody);

    const result: EmailSendResult = {
      success: !!data,
      messageId: data?.id,
      error: error?.message,
      errorCode: error?.name,
    };

    // Log the email
    await this.logEmail(options, result, options.emailType || 'CUSTOM');

    return result;
  }

  /**
   * Send a template-based email
   */
  async sendTemplateEmail(options: TemplateEmailOptions): Promise<EmailSendResult> {
    const template = EMAIL_TEMPLATES[options.templateId as keyof typeof EMAIL_TEMPLATES];
    
    if (!template) {
      return {
        success: false,
        error: `Template '${options.templateId}' not found`,
      };
    }

    const subject = template.subject.replace(/\{(\w+)\}/g, (_, key) => 
      (options.variables as Record<string, string>)[key] || ''
    );

    const html = template.html(options.variables);
    const text = template.text(options.variables);

    return this.sendEmail({
      to: options.to,
      from: options.from,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      subject,
      html,
      text,
      attachments: options.attachments,
      tenantId: options.tenantId,
      candidateId: options.candidateId,
      jobId: options.jobId,
      emailType: options.emailType,
      metadata: options.metadata,
    });
  }

  // ============================================
  // SPECIALIZED EMAIL METHODS
  // ============================================

  /**
   * Send DISC test invitation email
   */
  async sendDISCInvitation(options: DISCInvitationEmailOptions): Promise<EmailSendResult> {
    const variables: EmailTemplateVariables = {
      candidateName: options.candidateName,
      candidateEmail: options.candidateEmail,
      companyName: options.companyName,
      companyLogo: options.companyLogo,
      jobTitle: options.jobTitle,
      discTestUrl: options.discTestUrl,
      discTestExpiresAt: options.expiresAt 
        ? formatDateForEmail(options.expiresAt) 
        : undefined,
    };

    return this.sendTemplateEmail({
      templateId: 'DISC_INVITATION',
      variables,
      to: { email: options.candidateEmail, name: options.candidateName },
      from: options.from,
      tenantId: options.tenantId,
      candidateId: options.candidateId,
      emailType: 'DISC_INVITATION',
      metadata: {
        discTestId: options.discTestId,
      },
    });
  }

  /**
   * Send interview confirmation email
   */
  async sendInterviewConfirmation(options: InterviewConfirmationEmailOptions): Promise<EmailSendResult> {
    const variables: EmailTemplateVariables = {
      candidateName: options.candidateName,
      candidateEmail: options.candidateEmail,
      companyName: options.companyName,
      companyLogo: options.companyLogo,
      jobTitle: options.jobTitle,
      interviewDate: formatDateForEmail(options.interviewDate, options.timezone),
      interviewTime: formatTimeForEmail(options.interviewDate, options.timezone),
      interviewDuration: `${options.interviewDuration} minutos`,
      interviewType: getInterviewTypeLabel(options.interviewType),
      interviewerName: options.interviewerName,
      meetingUrl: options.meetingUrl,
      meetingProvider: options.meetingProvider,
      interviewLocation: options.interviewLocation,
    };

    return this.sendTemplateEmail({
      templateId: 'INTERVIEW_CONFIRMATION',
      variables,
      to: { email: options.candidateEmail, name: options.candidateName },
      from: options.from,
      tenantId: options.tenantId,
      candidateId: options.candidateId,
      emailType: 'INTERVIEW_CONFIRMATION',
      metadata: {
        interviewId: options.interviewId,
      },
    });
  }

  /**
   * Send interview reminder email
   */
  async sendInterviewReminder(options: InterviewReminderEmailOptions): Promise<EmailSendResult> {
    const variables: EmailTemplateVariables = {
      candidateName: options.candidateName,
      candidateEmail: options.candidateEmail,
      companyName: options.companyName,
      companyLogo: options.companyLogo,
      jobTitle: options.jobTitle,
      interviewDate: formatDateForEmail(options.interviewDate, options.timezone),
      interviewTime: formatTimeForEmail(options.interviewDate, options.timezone),
      interviewDuration: `${options.interviewDuration} minutos`,
      interviewType: getInterviewTypeLabel(options.interviewType),
      interviewerName: options.interviewerName,
      meetingUrl: options.meetingUrl,
      meetingProvider: options.meetingProvider,
      interviewLocation: options.interviewLocation,
    };

    return this.sendTemplateEmail({
      templateId: 'INTERVIEW_REMINDER',
      variables,
      to: { email: options.candidateEmail, name: options.candidateName },
      from: options.from,
      tenantId: options.tenantId,
      candidateId: options.candidateId,
      emailType: 'INTERVIEW_REMINDER',
      metadata: {
        interviewId: options.interviewId,
        reminderType: options.reminderType,
      },
    });
  }

  /**
   * Send interview cancellation email
   */
  async sendInterviewCancellation(options: InterviewCancellationEmailOptions): Promise<EmailSendResult> {
    const variables: EmailTemplateVariables = {
      candidateName: options.candidateName,
      candidateEmail: options.candidateEmail,
      companyName: options.companyName,
      companyLogo: options.companyLogo,
      jobTitle: options.jobTitle,
      customMessage: options.cancellationReason,
      customFields: options.rescheduleUrl ? { rescheduleUrl: options.rescheduleUrl } : undefined,
    };

    return this.sendTemplateEmail({
      templateId: 'INTERVIEW_CANCELLATION',
      variables,
      to: { email: options.candidateEmail, name: options.candidateName },
      from: options.from,
      tenantId: options.tenantId,
      candidateId: options.candidateId,
      emailType: 'INTERVIEW_CANCELLATION',
      metadata: {
        interviewId: options.interviewId,
      },
    });
  }

  /**
   * Send candidate status update email
   */
  async sendCandidateStatusUpdate(options: CandidateStatusUpdateEmailOptions): Promise<EmailSendResult> {
    const variables: EmailTemplateVariables = {
      candidateName: options.candidateName,
      candidateEmail: options.candidateEmail,
      companyName: options.companyName,
      companyLogo: options.companyLogo,
      jobTitle: options.jobTitle,
      previousStatus: options.previousStatus,
      newStatus: options.newStatus,
      statusMessage: options.statusMessage,
      customFields: options.nextSteps ? { nextSteps: options.nextSteps.join('\n') } : undefined,
    };

    return this.sendTemplateEmail({
      templateId: 'CANDIDATE_STATUS_UPDATE',
      variables,
      to: { email: options.candidateEmail, name: options.candidateName },
      from: options.from,
      tenantId: options.tenantId,
      candidateId: options.candidateId,
      jobId: options.jobId,
      emailType: 'CANDIDATE_STATUS_UPDATE',
    });
  }

  /**
   * Send rejection email
   */
  async sendRejectionEmail(options: {
    tenantId: string;
    candidateId: string;
    candidateEmail: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
    companyLogo?: string;
    feedback?: string;
    from?: string | EmailRecipient;
  }): Promise<EmailSendResult> {
    const variables: EmailTemplateVariables = {
      candidateName: options.candidateName,
      candidateEmail: options.candidateEmail,
      companyName: options.companyName,
      companyLogo: options.companyLogo,
      jobTitle: options.jobTitle,
      statusMessage: options.feedback,
    };

    return this.sendTemplateEmail({
      templateId: 'REJECTION',
      variables,
      to: { email: options.candidateEmail, name: options.candidateName },
      from: options.from,
      tenantId: options.tenantId,
      candidateId: options.candidateId,
      jobId: options.jobId,
      emailType: 'REJECTION',
    });
  }

  /**
   * Send email with attachments
   */
  async sendEmailWithAttachments(
    options: SendEmailOptions & { attachments: EmailAttachment[] }
  ): Promise<EmailSendResult> {
    return this.sendEmail(options);
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  /**
   * Handle webhook event from Resend
   */
  async handleWebhookEvent(event: ResendWebhookEvent): Promise<void> {
    const emailId = event.data.email_id;
    
    // Find the email log by external ID and update status
    // Note: For full implementation, add an EmailLog model to track status changes
    
    const statusMap: Record<string, EmailStatus> = {
      'email.sent': 'SENT',
      'email.delivered': 'DELIVERED',
      'email.opened': 'OPENED',
      'email.clicked': 'CLICKED',
      'email.bounced': 'BOUNCED',
      'email.complained': 'COMPLAINED',
      'email.delivery_delayed': 'QUEUED',
    };

    console.log(`Email ${emailId} status updated: ${statusMap[event.type]}`);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Verify API key is valid
   */
  async verifyApiKey(): Promise<boolean> {
    try {
      const { error } = await this.makeRequest('/domains');
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get available templates
   */
  static getAvailableTemplates(): string[] {
    return Object.keys(EMAIL_TEMPLATES);
  }
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

/**
 * Send a simple email
 */
export async function sendEmail(
  tenantId: string,
  options: Omit<SendEmailOptions, 'tenantId'>
): Promise<EmailSendResult> {
  const service = await ResendEmailService.createFromDatabase(tenantId);
  
  if (!service) {
    return {
      success: false,
      error: 'Resend API credentials not configured for this tenant',
    };
  }

  return service.sendEmail({ ...options, tenantId });
}

/**
 * Send DISC test invitation
 */
export async function sendDISCInvitation(
  options: DISCInvitationEmailOptions
): Promise<EmailSendResult> {
  const service = await ResendEmailService.createFromDatabase(options.tenantId);
  
  if (!service) {
    return {
      success: false,
      error: 'Resend API credentials not configured for this tenant',
    };
  }

  return service.sendDISCInvitation(options);
}

/**
 * Send interview confirmation
 */
export async function sendInterviewConfirmation(
  options: InterviewConfirmationEmailOptions
): Promise<EmailSendResult> {
  const service = await ResendEmailService.createFromDatabase(options.tenantId);
  
  if (!service) {
    return {
      success: false,
      error: 'Resend API credentials not configured for this tenant',
    };
  }

  return service.sendInterviewConfirmation(options);
}

/**
 * Send candidate status update
 */
export async function sendCandidateStatusUpdate(
  options: CandidateStatusUpdateEmailOptions
): Promise<EmailSendResult> {
  const service = await ResendEmailService.createFromDatabase(options.tenantId);
  
  if (!service) {
    return {
      success: false,
      error: 'Resend API credentials not configured for this tenant',
    };
  }

  return service.sendCandidateStatusUpdate(options);
}

// Default export
export default ResendEmailService;
