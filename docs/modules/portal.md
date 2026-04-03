# Módulo: Portal do Candidato

> **Versão:** 1.0 | **Status:** Produção | **Última atualização:** 2025

## Visão Geral

O Portal do Candidato é uma interface pública e autônoma que permite aos candidatos gerenciarem seu processo seletivo diretamente, sem necessidade de acesso à plataforma principal da Zion Recruit. O portal é acessível via views públicas (sem autenticação do sistema principal) e utiliza autenticação stateless baseada em tokens mágicos (magic link) enviados por email.

O sistema oferece uma experiência completa com 5 seções principais: Visão Geral, Candidaturas, Entrevistas, Mensagens e Perfil.

---

## Sumário

1. [Autenticação](#autenticação)
2. [Componentes](#componentes)
3. [APIs REST](#apis-rest)
4. [Views Públicas](#views-públicas)
5. [Fluxo de Autenticação](#fluxo-de-autenticação)
6. [Estrutura de Dados](#estrutura-de-dados)
7. [Considerações de Segurança](#considerações-de-segurança)
8. [Considerações Técnicas](#considerações-técnicas)

---

## Autenticação

### Token-Based Stateless Authentication

O portal utiliza autenticação sem estado (stateless) baseada em tokens, **independente** do sistema NextAuth.js da plataforma principal.

**Características:**
- **Método:** Magic link enviado por email
- **Token:** String hexadecimal de 32 bytes (64 caracteres hex)
- **Validade:** 7 dias a partir da emissão
- **Transporte:** Header HTTP `x-portal-token`
- **Armazenamento:** `localStorage` no navegador do candidato
- **Uso único:** Token invalidado após verificação (single-use)

**Diferencial:** Não há sessão server-side. A validação é feita a cada requisição via lookup do token no banco de dados.

---

## Componentes

### `portal-auth.tsx`

**Exportação:** `PortalAuth`

Componente de autenticação do portal com fluxo de magic link em duas etapas.

**Fluxo de Interface:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ETAPA 1: Solicitar Token                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔐 Acesse seu Portal do Candidato                      │   │
│  │                                                          │   │
│  │  Email: [____________________________________]           │   │
│  │                                                          │   │
│  │  [                Enviar Link de Acesso               ]   │
│  │                                                          │   │
│  │  ⓘ Enviaremos um link de acesso seguro para seu email.  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (token enviado)
┌─────────────────────────────────────────────────────────────────┐
│                    ETAPA 2: Inserir Token                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📧 Verifique seu email                                  │   │
│  │                                                          │   │
│  │  Insira o código de acesso recebido:                     │   │
│  │  Token: [____________________________________]           │   │
│  │                                                          │   │
│  │  [                  Acessar Portal                     ]   │
│  │                                                          │   │
│  │  ⓘ Verifique também sua caixa de spam.                  │   │
│  │  [Reenviar código]                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Estados da Interface:**

| Estado | Descrição |
|---|---|
| `idle` | Formulário inicial — aguardando email |
| `sending` | Enviando email — loading state |
| `sent` | Email enviado — exibe etapa 2 |
| `verifying` | Verificando token — loading state |
| `error` | Erro — exibe mensagem com opção de retry |
| `success` | Token verificado — redireciona ao dashboard |

---

### `portal-dashboard.tsx`

**Exportação:** `PortalDashboard`

Layout principal do portal com navegação por abas (5 seções).

**Estrutura de Abas:**

```
┌──────────────────────────────────────────────────────────────────┐
│  🏠 Portal do Candidato                                         │
│  Bem-vindo, João Silva!                                         │
├──────────┬──────────┬──────────┬──────────┬──────────────────────┤
│ Visão    │ Candida- │ Entrevis-│ Mensa-   │ Perfil               │
│ Geral    │ turas    │ tas      │ gens     │                      │
├──────────┴──────────┴──────────┴──────────┴──────────────────────┤
│                                                                  │
│                   [ Conteúdo da Aba Ativa ]                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Conteúdo por Aba:**

| Aba | Componente | Descrição |
|---|---|---|
| **Visão Geral** | Built-in | Resumo: candidaturas ativas, próximas entrevistas, mensagens não lidas, progresso DISC |
| **Candidaturas** | `ApplicationStatus` | Lista de candidaturas com timeline do pipeline |
| **Entrevistas** | `InterviewSchedule` | Entrevistas agrupadas (próximas, passadas, canceladas) |
| **Mensagens** | `PortalMessages` | Conversas com recrutadores |
| **Perfil** | `ProfileEditor` | Dados pessoais e links profissionais |

---

### `application-status.tsx`

**Exportação:** `ApplicationStatus`

Lista de candidaturas com accordion interativo mostrando a timeline do pipeline.

**Estrutura:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Candidaturas (3)                                                │
├─────────────────────────────────────────────────────────────────┤
│ ▼ Desenvolvedor Frontend — TechCorp                             │
│   📅 Candidatou em 15/01/2025                                   │
│   📍 Estágio atual: Entrevista Técnica                          │
│                                                                 │
│   ┌─ Timeline ──────────────────────────────────────────────┐   │
│   │ ✅ Candidatura Recebida    15/01/2025                   │   │
│   │ ✅ Triagem Inicial          17/01/2025                   │   │
│   │ ✅ Teste DISC              18/01/2025                   │   │
│   │ ✅ Triagem IA (Fit: 82/100) 19/01/2025                  │   │
│   │ 🔵 Entrevista Técnica      — Agendada para 25/01       │   │
│   │ ⚪ Entrevista Final         — Pendente                   │   │
│   │ ⚪ Proposta                — Pendente                    │   │
│   └────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ ▶ Analista de Dados — DataDriven                               │
│   📅 Candidatou em 10/01/2025 · Estágio: Triagem IA           │
├─────────────────────────────────────────────────────────────────┤
│ ▶ UX Designer — Creative Studio                                │
│   📅 Candidatou em 08/01/2025 · Estágio: Candidatura Recebida │
└─────────────────────────────────────────────────────────────────┘
```

**Estágios do Pipeline:**
1. Candidatura Recebida
2. Triagem Inicial
3. Teste DISC
4. Triagem IA (com score de fit)
5. Entrevista Técnica
6. Entrevista Final
7. Proposta
8. Contratação

**Indicadores Visuais:**
| Símbolo | Significado |
|---|---|
| ✅ | Concluído |
| 🔵 | Em andamento (atual) |
| ⚪ | Pendente (futuro) |
| ❌ | Rejeitado |

---

### `interview-schedule.tsx`

**Exportação:** `InterviewSchedule`

Gerenciamento de entrevistas com ações de confirmação, reagendamento e cancelamento.

**Ações Disponíveis para o Candidato:**

| Ação | Endpoint | Descrição |
|---|---|---|
| **Confirmar** | `POST /api/portal/interviews` | Confirma presença na entrevista |
| **Reagendar** | `POST /api/portal/interviews` | Solicita novo horário (com motivo) |
| **Cancelar** | `POST /api/portal/interviews` | Cancela participação (com motivo) |

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Entrevistas                                                     │
├─────────────────────────────────────────────────────────────────┤
│ 📅 Próximas (2)                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Entrevista Técnica — Desenvolvedor Frontend                  │ │
│ │ Data: 25/01/2025 · 14:00 — 15:00                           │ │
│ │ Local: Google Meet (link enviado por email)                  │ │
│ │ Entrevistador: Maria Santos                                  │ │
│ │                                                              │ │
│ │ [✅ Confirmar]  [📅 Reagendar]  [❌ Cancelar]               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Entrevista Final — UX Designer                               │ │
│ │ Data: 28/01/2025 · 10:00 — 11:00                           │ │
│ │ ...                                                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 📁 Passadas (3)                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Triagem Inicial — Analista de Dados · 12/01/2025 ✅         │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 🚫 Canceladas (1)                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Entrevista Técnica — Data Scientist · 20/01/2025 ❌         │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

### `messages.tsx`

**Exportação:** `PortalMessages`

Visualização de conversas e chat integrado do lado do candidato.

**Layout de 4 Colunas (Desktop):**

```
┌──────────────────┬──────────────────────────────────────────────┐
│ Conversas (1)    │ Chat                                         │
├──────────────────┤──────────────────────────────────────────────┤
│ 🔍 Buscar...     │ Desenvolvedor Frontend — TechCorp            │
│                  │ ──────────────────────────────────           │
│ ▶ TechCorp       │                                              │
│   Desenvolvedor  │ 🤖 Zoe (IA) — Hoje, 14:30                   │
│   Frontend       │ Olá João! Tudo bem? Sou a Zoe da Zion       │
│   · Última msg   │ Recruit. Gostaria de começar nossa          │
│   há 5 min       │ conversa sobre a vaga de Desenvolvedor       │
│                  │ Frontend. Você tem experiência com React?     │
│                  │                                              │
│                  │ 💬 Você — Hoje, 14:32                        │
│                  │ Sim! Trabalho com React há 3 anos...          │
│                  │                                              │
│                  │ ┌──────────────────────────────────────┐     │
│                  │ │ [Digite sua mensagem...]    [Enviar] │     │
│                  │ └──────────────────────────────────────┘     │
└──────────────────┴──────────────────────────────────────────────┘
```

**Comportamento Responsivo:**
| Dispositivo | Layout |
|---|---|
| Desktop (≥1024px) | 4 colunas (lista + chat) |
| Tablet (768px–1023px) | Painel alternado |
| Mobile (<768px) | Stack com navegação por abas |

---

### `disc-test.tsx`

**Exportação:** `PortalDiscTest`

Interface para realização do teste DISC avaliação comportamental, apresentado pergunta a pergunta.

**Fluxo:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Teste DISC — Avaliação Comportamental                           │
│ Pergunta 15 de 40                                               │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░ 37.5%                     │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ Em uma situação de pressão no trabalho, eu costumo:              │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ○  Tomar a liderança e buscar soluções rápidas            │  │
│ │ ○  Analisar cuidadosamente os dados antes de agir          │  │
│ │ ○  Conversar com a equipe para buscar consenso             │  │
│ │ ○  Seguir os processos estabelecidos                       │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│                       [← Anterior]  [Próxima →]                │
└─────────────────────────────────────────────────────────────────┘
```

**Características:**
- Exibição pergunta a pergunta (uma por vez)
- Barra de progresso visual
- Navegação entre perguntas (anterior/próxima)
- Timer opcional (configurável)
- Auto-save de respostas intermediárias
- Resultado calculado ao final e exibido imediatamente

---

### `profile-editor.tsx`

**Exportação:** `ProfileEditor`

Editor de perfil do candidato com seções de informações pessoais, localização e links profissionais.

**Seções:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 📝 Meu Perfil                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 👤 Informações Pessoais                                         │
│ ┌────────────────────────┬───────────────────────────────────┐  │
│ │ Nome Completo          │ João Pedro Silva                  │  │
│ │ Email                  │ joao@email.com (não editável)     │  │
│ │ Telefone               │ (11) 99999-9999                   │  │
│ └────────────────────────┴───────────────────────────────────┘  │
│                                                                  │
│ 📍 Localização                                                  │
│ ┌────────────────────────┬───────────────────────────────────┐  │
│ │ Cidade                 │ São Paulo                          │  │
│ │ Estado                 │ São Paulo                          │  │
│ │ País                   │ Brasil                             │  │
│ └────────────────────────┴───────────────────────────────────┘  │
│                                                                  │
│ 🔗 Links Profissionais                                         │
│ ┌────────────────────────┬───────────────────────────────────┐  │
│ │ LinkedIn               │ linkedin.com/in/joaopedro         │  │
│ │ GitHub                 │ github.com/joaopedro              │  │
│ │ Portfolio              │ joaopedro.dev                     │  │
│ └────────────────────────┴───────────────────────────────────┘  │
│                                                                  │
│                              [Salvar Alterações]                │
└─────────────────────────────────────────────────────────────────┘
```

---

## APIs REST

Todas as APIs do portal (exceto auth) requerem o header `x-portal-token` para autenticação.

### Autenticação

#### `POST /api/portal/auth`

Envia um email com token de acesso mágico.

**Body:**
```json
{
  "email": "joao@email.com"
}
```

**Comportamento:**
- Gera token hexadecimal de 32 bytes (64 caracteres)
- Armazena hash do token no banco com validade de 7 dias
- Envia email com o token
- Sempre retorna `200 OK` (prevenção de enumeração de emails)

**Resposta:**
```json
{
  "success": true,
  "message": "Se existir uma conta com este email, um link de acesso foi enviado."
}
```

---

#### `POST /api/portal/verify`

Verifica o token e retorna os dados completos do portal.

**Body:**
```json
{
  "token": "a1b2c3d4e5f6... (64 caracteres hex)"
}
```

**Resposta (dados completos do portal):**
```json
{
  "token": "a1b2c3d4...",
  "candidate": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@email.com"
  },
  "applications": [...],
  "interviews": { "upcoming": [...], "past": [...], "cancelled": [...] },
  "conversations": [...]
}
```

---

### Perfil

#### `GET /api/portal/profile`

**Header:** `x-portal-token: {token}`

Obtém o perfil do candidato.

**Resposta:**
```json
{
  "id": "uuid",
  "name": "João Pedro Silva",
  "email": "joao@email.com",
  "phone": "(11) 99999-9999",
  "linkedin": "linkedin.com/in/joaopedro",
  "github": "github.com/joaopedro",
  "portfolio": "joaopedro.dev",
  "city": "São Paulo",
  "state": "São Paulo",
  "country": "Brasil"
}
```

#### `PUT /api/portal/profile`

Atualiza o perfil do candidato.

**Body (parcial):**
```json
{
  "name": "João Pedro Silva",
  "phone": "(11) 99999-9999",
  "linkedin": "linkedin.com/in/joaopedro",
  "github": "github.com/joaopedro",
  "portfolio": "joaopedro.dev",
  "city": "São Paulo",
  "state": "São Paulo",
  "country": "Brasil"
}
```

**Resposta:** Perfil atualizado

---

### Candidaturas

#### `GET /api/portal/applications`

Lista todas as candidaturas do candidato com timeline do pipeline.

**Resposta:**
```json
{
  "applications": [
    {
      "id": "uuid",
      "job": {
        "id": "uuid",
        "title": "Desenvolvedor Frontend",
        "company": "TechCorp",
        "department": "Tecnologia"
      },
      "currentStage": "INTERVIEW_TECHNICAL",
      "appliedAt": "2025-01-15T10:00:00Z",
      "timeline": [
        { "stage": "APPLICATION_RECEIVED", "enteredAt": "2025-01-15T10:00:00Z", "exitedAt": "2025-01-17T09:00:00Z" },
        { "stage": "INITIAL_SCREENING", "enteredAt": "2025-01-17T09:00:00Z", "exitedAt": "2025-01-18T14:00:00Z" },
        { "stage": "DISC_TEST", "enteredAt": "2025-01-18T14:00:00Z", "exitedAt": "2025-01-19T10:00:00Z" },
        { "stage": "AI_SCREENING", "enteredAt": "2025-01-19T10:00:00Z", "exitedAt": null, "fitScore": 82 }
      ],
      "discResult": {
        "completed": true,
        "profile": "DC",
        "completedAt": "2025-01-18T15:30:00Z"
      }
    }
  ]
}
```

---

### Entrevistas

#### `GET /api/portal/interviews`

Lista entrevistas agrupadas por status.

**Resposta:**
```json
{
  "upcoming": [
    {
      "id": "uuid",
      "job": { "id": "uuid", "title": "Desenvolvedor Frontend" },
      "scheduledAt": "2025-01-25T14:00:00Z",
      "duration": 60,
      "type": "TECHNICAL",
      "location": "Google Meet",
      "meetLink": "https://meet.google.com/xxx",
      "interviewer": { "name": "Maria Santos" },
      "status": "SCHEDULED"
    }
  ],
  "past": [...],
  "cancelled": [...]
}
```

#### `POST /api/portal/interviews`

Executa ações em entrevistas.

**Body:**
```json
{
  "interviewId": "uuid",
  "action": "confirm"
}
```

**Ações Suportadas:**

| Ação | Body Adicional | Efeito |
|---|---|---|
| `confirm` | — | Marca entrevista como confirmada |
| `reschedule` | `{ "requestedDate": "...", "reason": "..." }` | Solicita reagendamento |
| `cancel` | `{ "reason": "..." }` | Cancela a entrevista |

**Resposta:**
```json
{
  "success": true,
  "interview": { "status": "CONFIRMED" },
  "message": "Entrevista confirmada com sucesso!"
}
```

---

### Documentos

#### `GET /api/portal/documents`

Lista documentos do candidato.

**Resposta:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "type": "RESUME",
      "name": "curriculo_joao_silva.pdf",
      "url": "/api/portal/documents/uuid/download",
      "uploadedAt": "2025-01-15T10:00:00Z",
      "size": 245000
    }
  ]
}
```

#### `POST /api/portal/documents`

Faz upload ou atualiza documento.

**Body:** `FormData` com campo `file`

**Tipos aceitos:** PDF, DOC, DOCX, JPG, PNG (máximo 10MB)

**Resposta:** Documento criado/atualizado

#### `DELETE /api/portal/documents`

Remove um documento.

**Body:**
```json
{
  "documentId": "uuid"
}
```

---

### Mensagens

#### `GET /api/portal/messages`

Lista conversas com mensagens do candidato.

**Resposta:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "job": { "title": "Desenvolvedor Frontend" },
      "channel": "INTERNAL",
      "lastMessage": { "content": "Olá João! ...", "createdAt": "..." },
      "unreadCount": 2,
      "messages": [
        { "id": "uuid", "content": "...", "senderType": "AI", "createdAt": "..." },
        { "id": "uuid", "content": "...", "senderType": "CANDIDATE", "createdAt": "..." }
      ]
    }
  ]
}
```

#### `POST /api/portal/messages`

Envia mensagem em uma conversa.

**Body:**
```json
{
  "conversationId": "uuid",
  "content": "Olá! Gostaria de saber mais sobre a vaga."
}
```

**Resposta:** `Message`

---

## Views Públicas

O portal define as seguintes views públicas que **não requerem autenticação** da plataforma principal:

| View | Rota | Descrição |
|---|---|---|
| `portal` | `/portal` | Página de autenticação (magic link) |
| `portal-dashboard` | `/portal/dashboard` | Dashboard principal (requer token de portal) |
| `portal-interviews` | `/portal/interviews` | Gerenciamento de entrevistas |
| `portal-messages` | `/portal/messages` | Conversas e chat |

**Nota:** Embora as views sejam públicas (sem NextAuth), o acesso aos dados protegidos exige o token de portal (`x-portal-token`). A view de auth (login) é a única que funciona sem qualquer token.

---

## Fluxo de Autenticação

```
  Candidato                              Servidor                         Banco de Dados
     │                                      │                                  │
     │  1. POST /api/portal/auth            │                                  │
     │  { email: "joao@email.com" }         │                                  │
     │ ───────────────────────────────────→ │                                  │
     │                                      │  2. Buscar candidato por email   │
     │                                      │ ───────────────────────────────→│
     │                                      │  3. Candidato encontrado         │
     │                                      │ ←───────────────────────────────│
     │                                      │                                  │
     │                                      │  4. Gerar token (32 bytes hex)   │
     │                                      │  5. Hash token + salvar (7 dias) │
     │                                      │ ───────────────────────────────→│
     │                                      │  6. Token salvo                   │
     │                                      │ ←───────────────────────────────│
     │                                      │                                  │
     │                                      │  7. Enviar email com token       │
     │                                      │  (serviço de email)              │
     │                                      │                                  │
     │  8. 200 OK (sempre)                 │                                  │
     │ ←─────────────────────────────────── │                                  │
     │                                      │                                  │
     │  9. Candidato recebe email           │                                  │
     │  10. Insere token no form            │                                  │
     │                                      │                                  │
     │  11. POST /api/portal/verify         │                                  │
     │  { token: "a1b2c3..." }             │                                  │
     │ ───────────────────────────────────→ │                                  │
     │                                      │  12. Hash token + buscar          │
     │                                      │ ───────────────────────────────→│
     │                                      │  13. Token válido + não expirado │
     │                                      │ ←───────────────────────────────│
     │                                      │                                  │
     │                                      │  14. Invalidar token (single-use)│
     │                                      │ ───────────────────────────────→│
     │                                      │                                  │
     │                                      │  15. Buscar dados completos      │
     │                                      │ ───────────────────────────────→│
     │                                      │  16. Dados do portal             │
     │                                      │ ←───────────────────────────────│
     │                                      │                                  │
     │  17. { token, candidate, apps, ... } │                                  │
     │ ←─────────────────────────────────── │                                  │
     │                                      │                                  │
     │  18. Salvar token em localStorage    │                                  │
     │  19. Redirecionar ao dashboard      │                                  │
```

---

## Estrutura de Dados

### Token no Banco de Dados

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `UUID` | Identificador único |
| `tokenHash` | `String` | Hash SHA-256 do token (nunca armazenado em plaintext) |
| `candidateId` | `UUID` | Referência ao candidato |
| `createdAt` | `DateTime` | Data de criação |
| `expiresAt` | `DateTime` | Data de expiração (createdAt + 7 dias) |
| `usedAt` | `DateTime?` | Data de uso (null = não usado) |
| `ipAddress` | `String?` | IP de solicitação (auditoria) |

---

## Considerações de Segurança

| Ameaça | Mitigação |
|---|---|
| **Token interception** | Transporte via HTTPS |
| **Token brute-force** | 32 bytes (64 caracteres hex) = 2^256 combinações |
| **Token reuse** | Invalidação após primeiro uso (single-use) |
| **Email enumeration** | Endpoint auth sempre retorna 200 OK |
| **Token storage** | Hash SHA-256 no banco; plaintext nunca persistido |
| **Cross-tenant access** | Token vinculado ao candidateId; validação em cada request |
| **Session hijacking** | Stateless — sem sessão server-side; token no localStorage |
| **Exposure prolongada** | Expiração de 7 dias; cleanup de tokens expirados |

---

## Considerações Técnicas

### Independência do NextAuth

O portal **não utiliza** o sistema NextAuth.js da plataforma principal. A autenticação é completamente isolada:

- Não há cookies de sessão (`next-auth.session-token`)
- Não há JWT tokens do NextAuth
- O header `x-portal-token` é o único mecanismo de autenticação
- Tokens são validados via lookup no banco a cada request

### Rate Limiting

O endpoint de auth (`POST /api/portal/auth`) está sujeito a rate limiting:

- **Limite:** 5 solicitações por email por hora
- **Propósito:** Prevenir abuso de envio de emails

### Responsividade

Todos os componentes do portal são responsivos:

| Componente | Breakpoint Mobile | Breakpoint Desktop |
|---|---|---|
| `PortalAuth` | Stack vertical | Card centralizado |
| `PortalDashboard` | Tabs horizontais scrolláveis | Tabs com ícones |
| `ApplicationStatus` | Accordion vertical | Accordion com mais detalhes |
| `InterviewSchedule` | Cards empilhados | Cards em grid |
| `PortalMessages` | Chat fullscreen | 4 colunas |
| `PortalDiscTest` | Pergunta fullscreen | Card centralizado |
| `ProfileEditor` | Campos empilhados | Grid 2 colunas |
