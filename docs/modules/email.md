# Módulo de Serviço de E-mail (Resend)

> **Bibliotecas:** `src/lib/email/email-service.ts`, `src/lib/email/types.ts`
> **Provedor:** Resend
> **Idioma dos templates:** Português (pt-BR)

---

## Visão Geral

O módulo de e-mail fornece uma camada abstrata para envio de e-mails transacionais via Resend, com templates prontos em português, suporte a anexos, CC/BCC, envios agendados e logging completo. É utilizado por múltiplos módulos da plataforma como autenticação de portal, envio de testes DISC, agendamento de entrevistas e notificações.

---

## Serviço de E-mail

**Arquivo:** `src/lib/email/email-service.ts`

### Classe `ResendEmailService`

Classe principal que encapsula toda a comunicação com a API do Resend.

```typescript
import { ResendEmailService } from '@/lib/email/email-service';

const emailService = new ResendEmailService();
```

### `sendEmail(params: SendEmailParams)`

Envia um e-mail transacional.

```typescript
await emailService.sendEmail({
  to: 'candidato@email.com',
  subject: 'Bem-vindo ao Zion Recruit',
  html: '<h1>Olá!</h1><p>Bem-vindo à plataforma.</p>',
  text: 'Olá! Bem-vindo à plataforma.',
  from: 'Zion Recruit <noreply@zionrecruit.com>',
  cc: ['rh@empresa.com'],
  bcc: ['auditoria@empresa.com'],
  attachments: [
    { filename: 'guia.pdf', content: pdfBuffer }
  ],
  headers: {
    'X-Custom-Header': 'value'
  },
  tags: [
    { name: 'category', value: 'onboarding' }
  ]
});
```

**Parâmetros:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `to` | `string \| string[]` | Sim | Destinatário(s) |
| `subject` | `string` | Sim | Assunto do e-mail |
| `html` | `string` | Sim* | Conteúdo HTML |
| `text` | `string` | Sim* | Conteúdo em texto plano |
| `from` | `string` | Não | Remetente (padrão: configurado globalmente) |
| `replyTo` | `string` | Não | Endereço de resposta |
| `cc` | `string \| string[]` | Não | Cópia |
| `bcc` | `string \| string[]` | Não | Cópia oculta |
| `attachments` | `Attachment[]` | Não | Anexos |
| `headers` | `Record<string, string>` | Não | Headers customizados |
| `tags` | `Array<{name, value}>` | Não | Tags para organização |

> *Pelo menos `html` ou `text` deve ser fornecido. Recomenda-se fornecer ambos.

**Resposta:**

```typescript
{
  emailId: 'email_abc123',
  providerId: 'msg_resend_xyz789',
  status: 'sent',
  from: 'Zion Recruit <noreply@zionrecruit.com>',
  to: ['candidato@email.com']
}
```

### `sendDISCInvitation(params: DISCInvitationParams)`

Envia convite para teste DISC.

```typescript
await emailService.sendDISCInvitation({
  candidateName: 'João Silva',
  candidateEmail: 'joao@email.com',
  assessmentUrl: 'https://zionrecruit.com/portal/disc/abc123',
  companyName: 'Empresa X',
  deadline: new Date('2025-01-20'),
  senderName: 'Maria Santos',
  senderRole: 'Recrutadora'
});
```

### `sendInterviewConfirmation(params: InterviewConfirmationParams)`

Envia confirmação de entrevista agendada.

```typescript
await emailService.sendInterviewConfirmation({
  candidateName: 'João Silva',
  candidateEmail: 'joao@email.com',
  jobTitle: 'Desenvolvedor Full Stack',
  interviewDate: new Date('2025-01-20T14:00:00'),
  interviewType: 'online',
  meetingLink: 'https://meet.google.com/abc-defg-hij',
  interviewerName: 'Maria Santos',
  companyName: 'Empresa X',
  notes: 'Trazir notebook com projetos anteriores'
});
```

### `sendCandidateStatusUpdate(params: CandidateStatusUpdateParams)`

Envia atualização de status do candidato no processo seletivo.

```typescript
await emailService.sendCandidateStatusUpdate({
  candidateName: 'João Silva',
  candidateEmail: 'joao@email.com',
  jobTitle: 'Desenvolvedor Full Stack',
  companyName: 'Empresa X',
  status: 'approved',
  nextSteps: 'Aguarde o contato da equipe de RH para definição de data de início.',
  feedback: 'Excelente desempenho nas entrevistas técnicas.'
});
```

---

## Tipos de E-mail

**Arquivo:** `src/lib/email/types.ts`

### `EmailType` (11 tipos)

```typescript
type EmailType =
  | 'DISC_INVITATION'           // Convite para teste DISC
  | 'INTERVIEW_CONFIRMATION'    // Confirmação de entrevista
  | 'INTERVIEW_REMINDER'        // Lembrete de entrevista
  | 'INTERVIEW_CANCELLATION'    // Cancelamento de entrevista
  | 'CANDIDATE_STATUS_UPDATE'   // Atualização de status do candidato
  | 'REJECTION'                 // Rejeição de candidato
  | 'WELCOME'                   // Boas-vindas ao portal
  | 'MAGIC_LINK'                // Link mágico de autenticação
  | 'PASSWORD_RESET'            // Redefinição de senha
  | 'TEAM_INVITE'               // Convite para equipe
  | 'NOTIFICATION'              // Notificação genérica
```

### `EmailStatus`

```typescript
type EmailStatus =
  | 'pending'    // Aguardando envio
  | 'sent'       // Enviado com sucesso
  | 'delivered'  // Entregue ao destinatário
  | 'opened'     // Aberto pelo destinatário
  | 'clicked'    // Link clicado
  | 'bounced'    // Endereço inválido / caixa cheia
  | 'failed'     // Falha no envio
```

### `EmailPriority`

```typescript
type EmailPriority = 'low' | 'normal' | 'high';
```

---

## Templates Incorporados

Todos os templates estão disponíveis em **HTML + texto plano**, totalmente em **Português (pt-BR)**, com design responsivo e identidade visual da plataforma.

### 1. DISC_INVITATION — Convite para Teste DISC

| Campo | Variável no template |
|---|---|
| Nome do candidato | `{{candidateName}}` |
| Link do teste | `{{assessmentUrl}}` |
| Nome da empresa | `{{companyName}}` |
| Prazo | `{{deadline}}` |
| Nome do remetente | `{{senderName}}` |

**Prévia do assunto:** `🧠 Convite para Teste DISC — {{companyName}}`

---

### 2. INTERVIEW_CONFIRMATION — Confirmação de Entrevista

| Campo | Variável no template |
|---|---|
| Nome do candidato | `{{candidateName}}` |
| Título da vaga | `{{jobTitle}}` |
| Data e hora | `{{interviewDate}}` |
| Tipo de entrevista | `{{interviewType}}` |
| Link da reunião | `{{meetingLink}}` |
| Nome do entrevistador | `{{interviewerName}}` |
| Empresa | `{{companyName}}` |
| Observações | `{{notes}}` |

**Prévia do assunto:** `📅 Confirmação de Entrevista — {{jobTitle}}`

---

### 3. INTERVIEW_REMINDER — Lembrete de Entrevista

| Campo | Variável no template |
|---|---|
| Nome do candidato | `{{candidateName}}` |
| Título da vaga | `{{jobTitle}}` |
| Data e hora | `{{interviewDate}}` |
| Link da reunião | `{{meetingLink}}` |
| Nome do entrevistador | `{{interviewerName}}` |
| Empresa | `{{companyName}}` |

**Prévia do assunto:** `⏰ Lembrete: Sua entrevista é amanhã — {{jobTitle}}`

---

### 4. INTERVIEW_CANCELLATION — Cancelamento de Entrevista

| Campo | Variável no template |
|---|---|
| Nome do candidato | `{{candidateName}}` |
| Título da vaga | `{{jobTitle}}` |
| Motivo | `{{reason}}` |
| Nova data (opcional) | `{{rescheduledDate}}` |
| Empresa | `{{companyName}}` |
| Nome do contato | `{{contactName}}` |

**Prévia do assunto:** `❌ Entrevista Cancelada — {{jobTitle}}`

---

### 5. CANDIDATE_STATUS_UPDATE — Atualização de Status

| Campo | Variável no template |
|---|---|
| Nome do candidato | `{{candidateName}}` |
| Título da vaga | `{{jobTitle}}` |
| Empresa | `{{companyName}}` |
| Status | `{{status}}` (approved/rejected/interview/standby) |
| Próximos passos | `{{nextSteps}}` |
| Feedback | `{{feedback}}` |

**Prévia do assunto:**
- Aprovado: `✅ Parabéns! Você avançou no processo — {{jobTitle}}`
- Rejeitado: `Resultado do processo seletivo — {{jobTitle}}`

---

### 6. REJECTION — Rejeição de Candidato

| Campo | Variável no template |
|---|---|
| Nome do candidato | `{{candidateName}}` |
| Título da vaga | `{{jobTitle}}` |
| Empresa | `{{companyName}}` |
| Feedback | `{{feedback}}` |
| Manter no banco | `{{keepInDatabase}}` |

**Prévia do assunto:** `Resultado do processo seletivo — {{jobTitle}}`

---

## Funcionalidades

### Anexos

Suporte a envio de anexos em qualquer e-mail:

```typescript
await emailService.sendEmail({
  to: 'candidato@email.com',
  subject: 'Guia de Preparação',
  html: '<p>Segue o guia anexo.</p>',
  text: 'Segue o guia anexo.',
  attachments: [
    {
      filename: 'guia-preparacao.pdf',
      content: Buffer.from(pdfBytes),
      contentType: 'application/pdf'
    },
    {
      filename: 'proposta.docx',
      content: Buffer.from(docxBytes),
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
  ]
});
```

### CC e BCC

```typescript
await emailService.sendEmail({
  to: 'candidato@email.com',
  cc: ['gerente@empresa.com'],
  bcc: ['rh@empresa.com', 'auditoria@empresa.com'],
  subject: 'Atualização do processo',
  html: '<p>Atualização disponível no portal.</p>',
  text: 'Atualização disponível no portal.'
});
```

### Envio Agendado

E-mails podem ser agendados para envio futuro:

```typescript
await emailService.sendEmail({
  to: 'candidato@email.com',
  subject: 'Lembrete de entrevista',
  html: '<p>Não se esqueça da entrevista amanhã!</p>',
  text: 'Não se esqueça da entrevista amanhã!',
  scheduledAt: new Date('2025-01-19T08:00:00Z') // Enviar 24h antes
});
```

### Logging de E-mails

Todos os e-mails enviados são registrados automaticamente:

- **Destinatário** e assunto
- **Status de entrega** (sent → delivered → opened)
- **Timestamps** de cada mudança de status
- **ID do provider** (Resend) para rastreamento

### Tratamento de Webhooks do Resend

O sistema processa webhooks do Resend para atualizar o status dos e-mails:

| Evento | Ação |
|---|---|
| `email.sent` | Marca como enviado |
| `email.delivered` | Marca como entregue |
| `email.opened` | Marca como aberto |
| `email.clicked` | Marca como clicado |
| `email.bounced` | Marca como bounced (inválido) |
| `email.complained` | Marca como reclamação de spam |

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `RESEND_API_KEY` | Sim | Chave de API do Resend (`re_...`) |
| `EMAIL_FROM` | Não | Endereço remetente padrão (padrão: `noreply@zionrecruit.com`) |
| `EMAIL_FROM_NAME` | Não | Nome do remetente padrão (padrão: `Zion Recruit`) |

---

## Módulos Consumidores

O serviço de e-mail é utilizado por vários módulos da plataforma:

| Módulo | Template(s) Utilizado(s) | Gatilho |
|---|---|---|
| **Portal (Autenticação)** | `MAGIC_LINK`, `WELCOME` | Registro, login sem senha |
| **DISC** | `DISC_INVITATION` | Recrutador envia teste DISC |
| **Entrevistas** | `INTERVIEW_CONFIRMATION`, `INTERVIEW_REMINDER`, `INTERVIEW_CANCELLATION` | Agendamento, lembrete, cancelamento |
| **Pipeline** | `CANDIDATE_STATUS_UPDATE`, `REJECTION` | Mudança de etapa, rejeição |
| **Configurações** | `TEAM_INVITE` | Convite de membro para equipe |
| **Notificações** | `NOTIFICATION` | Alertas e notificações genéricas |

---

## Fluxo de Envio

```
Módulo solicita envio (ex: sendDISCInvitation)
    ↓
ResendEmailService recebe parâmetros
    ↓
Seleciona template (HTML + texto) e preenche variáveis
    ↓
Cria registro de e-mail no banco (status: PENDING)
    ↓
Envia para Resend API
    ↓
┌── Sucesso → Atualiza status para SENT, registra providerId
│
└── Falha → Atualiza status para FAILED, registra erro
           → Log de auditoria da falha
    ↓
Resend processa entrega
    ↓
Webhook do Resend → Atualiza status (delivered/opened/bounced)
```

---

## Exemplos de Uso

### Envio simples

```typescript
import { ResendEmailService } from '@/lib/email/email-service';

const service = new ResendEmailService();

await service.sendEmail({
  to: 'joao@email.com',
  subject: 'Bem-vindo!',
  html: '<h1>Olá, João!</h1><p>Sua conta foi criada.</p>',
  text: 'Olá, João! Sua conta foi criada.'
});
```

### Envio com template DISC

```typescript
await service.sendDISCInvitation({
  candidateName: 'João Silva',
  candidateEmail: 'joao@email.com',
  assessmentUrl: 'https://app.zionrecruit.com/portal/disc/tkn_abc123',
  companyName: 'Empresa X',
  deadline: new Date('2025-01-25'),
  senderName: 'Maria Santos',
  senderRole: 'Recrutadora Sênior'
});
```

### Envio de rejeição com feedback

```typescript
await service.sendCandidateStatusUpdate({
  candidateName: 'João Silva',
  candidateEmail: 'joao@email.com',
  jobTitle: 'Desenvolvedor Pleno',
  companyName: 'Empresa X',
  status: 'rejected',
  nextSteps: 'Recomendamos que continue se candidatando para futuras vagas.',
  feedback: 'Seu perfil é excelente, mas optamos por outro candidato com mais experiência na stack técnica específica do projeto.'
});
```

---

## Considerações de Produção

1. **Domínio verificado:** Configure e verifique o domínio de envio no painel do Resend
2. **Rate limit:** O Resend tem limites por plano — monitore o volume de envios
3. **Template design:** Teste todos os templates em diferentes clientes de e-mail (Gmail, Outlook, Apple Mail)
4. **Bounces:** Monitore endereços bounced e implemente lista de supressão
5. **Unsubscribe:** Para e-mails em massa, inclua link de descadastramento
6. **Fallback:** Configure um provedor de backup caso o Resend fique indisponível
