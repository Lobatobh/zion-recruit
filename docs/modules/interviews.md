# Entrevistas

> **Categoria:** Recrutamento | **Status:** ✅ Estável
>
> Gestão completa de entrevistas com agendamento inteligente por IA, geração automática de links de videoconferência, feedback com sistema de 5 estrelas e recomendações de contratação.

---

## Descrição

O módulo de **Entrevistas** gerencia todo o ciclo de vida de uma entrevista no processo seletivo — desde o agendamento (manual ou via IA) até o feedback final com rating e recomendação. O sistema integra geração automática de links **Google Meet**, transições de status com atualização automática da etapa do candidato no pipeline, e acionamento de **teste DISC** quando aplicável.

A interface apresenta **cards de estatísticas** no topo, lista de entrevistas **agrupadas por data**, e um diálogo de detalhes com abas para informação, feedback e notas.

---

## Componentes

### `InterviewsPage`

**Arquivo:** `src/components/interviews/interviews-page.tsx`

Página principal de gerenciamento de entrevistas.

```typescript
export { InterviewsPage };
```

#### Composição

```
InterviewsPage
├── Stats Cards (4 métricas)
│   ├── Total de Entrevistas
│   ├── Agendadas (próximas)
│   ├── Realizadas (mês)
│   └── Taxa de Show (comparecimento)
├── Barra de Filtros
│   ├── Busca textual
│   ├── Filtro por status
│   ├── Filtro por tipo
│   └── Botão "Nova Entrevista" → NewInterviewDialog
├── Lista Agrupada por Data
│   ├── Data: "10 de Julho, 2025"
│   │   └── InterviewRow × N
│   ├── Data: "11 de Julho, 2025"
│   │   └── InterviewRow × N
│   └── ...
└── InterviewDetailDialog (ao clicar em entrevista)
```

#### Stats Cards

| Métrica | Ícone | Descrição |
|---------|-------|-----------|
| Total | `Calendar` | Total de entrevistas (todas) |
| Agendadas | `Clock` | Entrevistas futuras (status: SCHEDULED, CONFIRMED) |
| Realizadas | `CheckCircle` | Entrevistas completadas no mês atual |
| Taxa de Show | `TrendingUp` | % de comparecimento (completed / completed + no_show) |

---

### `InterviewDetailDialog`

**Arquivo:** `src/components/interviews/interview-detail-dialog.tsx`

Diálogo modal de detalhes completos da entrevista com abas.

```typescript
export { InterviewDetailDialog };

interface InterviewDetailDialogProps {
  interviewId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

#### Abas

| Aba | Conteúdo |
|------|----------|
| **Detalhes** | Informações gerais: título, tipo, data, duração, candidato, vaga |
| **Feedback** | Rating 5 estrelas, recomendação, notas detalhadas |
| **Histórico** | Timeline de mudanças de status |

#### Informações Exibidas

- Título da entrevista
- Tipo (Técnica, RH, Final, Painel)
- Data e horário agendados
- Duração prevista
- Link de videoconferência (Google Meet)
- Status atual com badge colorido
- Dados do candidato (nome, e-mail, score)
- Dados da vaga (título, departamento)
- Feedback e rating (quando disponível)

---

### `NewInterviewDialog`

**Arquivo:** `src/components/interviews/new-interview-dialog.tsx`

Diálogo modal para criação de nova entrevista.

```typescript
export { NewInterviewDialog };

interface NewInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId?: string;      // Candidato pré-selecionado
  jobId?: string;            // Vaga pré-selecionada
  onInterviewCreated?: (interview: Interview) => void;
}
```

#### Campos do Formulário

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `title` | Text | ✅ | Título da entrevista |
| `candidateId` | Select | ✅ | Candidato |
| `jobId` | Select | ✅ | Vaga relacionada |
| `type` | Select | ✅ | Tipo da entrevista |
| `scheduledAt` | DateTime | ✅ | Data e horário |
| `duration` | Number | ✅ | Duração em minutos (default: 60) |
| `notes` | Textarea | ❌ | Notas de preparação |

#### Tipos de Entrevista

| Tipo | Valor | Descrição |
|------|-------|-----------|
| **RH** | `HR` | Entrevista de recursos humanos |
| **Técnica** | `TECHNICAL` | Entrevista de avaliação técnica |
| **Final** | `FINAL` | Entrevista final com decisão |
| **Painel** | `PANEL` | Entrevista com múltiplos avaliadores |

---

### `InterviewScheduler`

**Arquivo:** `src/components/interviews/interview-scheduler.tsx`

Componente de agendamento inteligente com sugestões de horários.

```typescript
export { InterviewScheduler };

interface InterviewSchedulerProps {
  candidateId: string;
  jobId?: string;
  onScheduled: (interview: Interview) => void;
  onCancel: () => void;
}
```

#### Funcionalidades

- Exibe **slots de horário disponíveis** (obtidos via `GET /api/scheduling`)
- Seleção de data e horário
- Opção de **agendamento por IA** (via `POST /api/scheduling`)
- Duração configurável
- Confirmação com preview dos detalhes

---

## Types

```typescript
enum InterviewStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

enum InterviewType {
  HR = 'HR',
  TECHNICAL = 'TECHNICAL',
  FINAL = 'FINAL',
  PANEL = 'PANEL',
}

interface Interview {
  id: string;
  tenantId: string;
  title: string;
  candidateId: string;
  jobId: string;
  type: InterviewType;
  scheduledAt: string;       // ISO datetime
  duration: number;          // Duração em minutos
  status: InterviewStatus;
  meetingUrl?: string;       // Link Google Meet
  feedback?: string;         // Notas de feedback do avaliador
  rating?: number;           // Rating de 1 a 5 estrelas
  recommendation?: 'HIRE' | 'NO_HIRE' | 'MAYBE'; // Recomendação
  notes?: string;            // Notas de preparação
  candidate: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    matchScore?: number;
  };
  job: {
    id: string;
    title: string;
    department: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

---

## APIs

### `GET /api/interviews`

Lista entrevistas com filtros avançados.

#### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `status` | string | Filtrar por status |
| `type` | string | Filtrar por tipo |
| `candidateId` | string | Filtrar por candidato |
| `jobId` | string | Filtrar por vaga |
| `upcoming` | boolean | Apenas futuras (`true`) |
| `past` | boolean | Apenas passadas (`true`) |
| `page` | number | Página atual (default: 1) |
| `limit` | number | Itens por página (default: 20) |

#### Request

```http
GET /api/interviews?status=SCHEDULED&upcoming=true HTTP/1.1
```

#### Response (`200 OK`)

```json
{
  "interviews": [
    {
      "id": "int_abc123",
      "title": "Entrevista Técnica - Desenvolvedor Full-Stack",
      "candidateId": "cand_001",
      "jobId": "job_001",
      "type": "TECHNICAL",
      "scheduledAt": "2025-07-15T14:00:00-03:00",
      "duration": 60,
      "status": "SCHEDULED",
      "meetingUrl": "https://meet.google.com/abc-defg-hij",
      "candidate": {
        "id": "cand_001",
        "name": "Maria Silva",
        "email": "maria@email.com",
        "matchScore": 87
      },
      "job": {
        "id": "job_001",
        "title": "Desenvolvedor Full-Stack Senior",
        "department": "Engenharia"
      },
      "createdAt": "2025-07-10T10:00:00Z"
    }
  ],
  "stats": {
    "total": 45,
    "upcoming": 8,
    "completedThisMonth": 12,
    "showRate": 83.3
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### `POST /api/interviews`

Cria uma nova entrevista.

#### Comportamento Automático

1. **Gera link de reunião** — Cria URL do Google Meet automaticamente
2. **Atualiza status do candidato** — Move para etapa correspondente no pipeline

#### Request

```http
POST /api/interviews HTTP/1.1
Content-Type: application/json
```

```json
{
  "title": "Entrevista Técnica - Desenvolvedor Full-Stack",
  "candidateId": "cand_001",
  "jobId": "job_001",
  "type": "TECHNICAL",
  "scheduledAt": "2025-07-15T14:00:00-03:00",
  "duration": 60,
  "notes": "Avaliar experiência com React e Node.js"
}
```

#### Response (`201 Created`)

```json
{
  "id": "int_abc123",
  "title": "Entrevista Técnica - Desenvolvedor Full-Stack",
  "type": "TECHNICAL",
  "scheduledAt": "2025-07-15T14:00:00-03:00",
  "duration": 60,
  "status": "SCHEDULED",
  "meetingUrl": "https://meet.google.com/abc-defg-hij",
  "candidateStatusUpdated": true,
  "createdAt": "2025-07-10T10:00:00Z"
}
```

---

### `PUT /api/interviews`

Atualiza o status ou dados de uma entrevista existente.

#### Transições de Status

```
SCHEDULED ──→ CONFIRMED ──→ COMPLETED
    │              │              │
    ↓              ↓              ↓
CANCELLED      CANCELLED     (feedback obrigatório)
                                    
                    NO_SHOW ──→ (feedback obrigatório)
```

| De | Para | Condições |
|----|------|-----------|
| `SCHEDULED` | `CONFIRMED` | Sem condição |
| `SCHEDULED` | `CANCELLED` | Sem condição |
| `CONFIRMED` | `COMPLETED` | **Feedback obrigatório** (rating + texto) |
| `CONFIRMED` | `CANCELLED` | Sem condição |
| `CONFIRMED` | `NO_SHOW` | Sem condição |
| `NO_SHOW` | `COMPLETED` | Feedback obrigatório |

#### Request — Confirmar

```http
PUT /api/interviews HTTP/1.1
Content-Type: application/json
```

```json
{
  "id": "int_abc123",
  "status": "CONFIRMED"
}
```

#### Request — Completar com Feedback

```json
{
  "id": "int_abc123",
  "status": "COMPLETED",
  "feedback": "Candidato demonstrou excelente domínio de React e Node.js. Boa comunicação e resolução de problemas.",
  "rating": 4,
  "recommendation": "HIRE"
}
```

#### Response (`200 OK`)

```json
{
  "id": "int_abc123",
  "status": "COMPLETED",
  "feedback": "Candidato demonstrou excelente domínio...",
  "rating": 4,
  "recommendation": "HIRE",
  "candidateStageUpdated": true,
  "updatedAt": "2025-07-15T15:30:00Z"
}
```

#### Response (`400 Bad Request` — Feedback obrigatório)

```json
{
  "error": "Feedback obrigatório",
  "message": "Para marcar a entrevista como completada, é necessário fornecer feedback e rating"
}
```

---

### `DELETE /api/interviews`

Remove uma entrevista existente.

#### Request

```http
DELETE /api/interviews?interviewId=int_abc123 HTTP/1.1
```

#### Response (`200 OK`)

```json
{
  "message": "Entrevista removida com sucesso",
  "deletedId": "int_abc123"
}
```

---

### `GET /api/scheduling`

Obtém slots de horário disponíveis para agendamento.

#### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `date` | string | Data no formato `YYYY-MM-DD` |
| `duration` | number | Duração desejada em minutos (default: 60) |
| `candidateId` | string | ID do candidato (para evitar conflitos) |

#### Request

```http
GET /api/scheduling?date=2025-07-15&duration=60&candidateId=cand_001 HTTP/1.1
```

#### Response (`200 OK`)

```json
{
  "date": "2025-07-15",
  "slots": [
    {
      "start": "2025-07-15T09:00:00-03:00",
      "end": "2025-07-15T10:00:00-03:00",
      "available": true
    },
    {
      "start": "2025-07-15T10:00:00-03:00",
      "end": "2025-07-15T11:00:00-03:00",
      "available": false,
      "reason": "Conflito com outra entrevista"
    },
    {
      "start": "2025-07-15T11:00:00-03:00",
      "end": "2025-07-15T12:00:00-03:00",
      "available": true
    },
    {
      "start": "2025-07-15T14:00:00-03:00",
      "end": "2025-07-15T15:00:00-03:00",
      "available": true
    },
    {
      "start": "2025-07-15T15:00:00-03:00",
      "end": "2025-07-15T16:00:00-03:00",
      "available": true
    }
  ],
  "workingHours": {
    "start": "09:00",
    "end": "18:00",
    "timezone": "America/Sao_Paulo"
  }
}
```

---

### `POST /api/scheduling`

Solicita agendamento de entrevista via IA.

A IA analisa a disponibilidade do candidato, da equipe e da vaga para sugerir o melhor horário.

#### Request

```http
POST /api/scheduling HTTP/1.1
Content-Type: application/json
```

```json
{
  "candidateId": "cand_001",
  "jobId": "job_001",
  "type": "TECHNICAL",
  "duration": 60,
  "preferredDates": ["2025-07-15", "2025-07-16", "2025-07-17"],
  "preferences": {
    "timeOfDay": "morning",
    "avoidFridays": true
  }
}
```

#### Response (`200 OK`)

```json
{
  "suggestedSlot": {
    "start": "2025-07-15T10:00:00-03:00",
    "end": "2025-07-15T11:00:00-03:00",
    "confidence": 0.92,
    "reason": "Horário com menor conflito e alinhado com preferências do candidato"
  },
  "alternatives": [
    {
      "start": "2025-07-16T09:00:00-03:00",
      "end": "2025-07-16T10:00:00-03:00",
      "confidence": 0.85
    },
    {
      "start": "2025-07-17T14:00:00-03:00",
      "end": "2025-07-17T15:00:00-03:00",
      "confidence": 0.78
    }
  ],
  "interviewCreated": false,
  "requiresConfirmation": true
}
```

---

### `PUT /api/scheduling`

Reagenda uma entrevista existente via IA.

#### Request

```http
PUT /api/scheduling HTTP/1.1
Content-Type: application/json
```

```json
{
  "interviewId": "int_abc123",
  "reason": "Candidato solicitou reagendamento",
  "preferredDates": ["2025-07-18", "2025-07-19"]
}
```

#### Response (`200 OK`)

```json
{
  "interviewId": "int_abc123",
  "previousScheduledAt": "2025-07-15T14:00:00-03:00",
  "newScheduledAt": "2025-07-18T10:00:00-03:00",
  "meetingUrl": "https://meet.google.com/new-url-xyz",
  "candidateNotified": true,
  "rescheduledAt": "2025-07-14T16:00:00Z"
}
```

---

## Funcionalidades

### Stats Cards

Quatro cards de estatísticas no topo da página:

| Card | Dado | Cálculo |
|------|------|---------|
| **Total de Entrevistas** | Número total | `COUNT(*)` de todas as entrevistas do tenant |
| **Agendadas** | Próximas | `status IN (SCHEDULED, CONFIRMED) AND scheduledAt > NOW()` |
| **Realizadas no Mês** | Mês atual | `status = COMPLETED AND MONTH = current_month` |
| **Taxa de Show** | Percentual | `(completed) / (completed + no_show) * 100` |

### Agrupamento por Data

Entrevistas são agrupadas visualmente por data:

```
── 10 de Julho, 2025 ──────────────
┌──────────────────────────────────┐
│ 09:00 - Entrevista RH           │
│ Maria Silva • Desenv. Full-Stack │
└──────────────────────────────────┘
┌──────────────────────────────────┐
│ 14:00 - Entrevista Técnica      │
│ João Santos • Dev Front-end      │
└──────────────────────────────────┘

── 11 de Julho, 2025 ──────────────
┌──────────────────────────────────┐
│ 10:00 - Entrevista Final        │
│ Ana Costa • Designer UX          │
└──────────────────────────────────┘
```

### Transições de Status

Fluxo completo de transições com validações:

| Status | Cor | Ações disponíveis |
|--------|-----|-------------------|
| `SCHEDULED` | Azul | Confirmar, Cancelar |
| `CONFIRMED` | Verde | Completar, Cancelar, Marcar No-Show |
| `COMPLETED` | Verde escuro | Exibir feedback |
| `CANCELLED` | Cinza | Reagendar |
| `NO_SHOW` | Vermelho | Exibir, Marcar como completada depois |

### Feedback com 5 Estrelas

Sistema de avaliação ao completar uma entrevista:

- **Rating** — 1 a 5 estrelas (obrigatório para completar)
- **Recomendação** — HIRE, NO_HIRE, MAYBE (obrigatório para completar)
- **Texto livre** — Notas detalhadas do avaliador
- **Atualização automática** — Atualiza o status e a etapa do candidato no pipeline

#### Visualização das Estrelas

```
Rating: ★★★★☆ (4/5)
Recomendação: ✅ CONTRATAR
```

### Teste DISC Trigger

Quando uma entrevista técnica é **confirmada** (`status → CONFIRMED` e `type === TECHNICAL`), o sistema pode automaticamente:

1. Verificar se o candidato já possui teste DISC
2. Se não possuir, disparar notificação para realizar o teste
3. O teste DISC fica disponível no perfil do candidato

### Link de Videoconferência

Geração automática de link Google Meet:

- Gerado automaticamente ao criar a entrevista (`POST /api/interviews`)
- Atualizado ao reagendar (`PUT /api/scheduling`)
- Exibido como botão clicável no diálogo de detalhes
- Abre em nova aba: `target="_blank"`

---

## Considerações Técnicas

| Aspecto | Detalhe |
|---------|---------|
| **Renderização** | Client-side (`'use client'`) |
| **Estado** | Local (useState/useEffect) — sem store global |
| **Timezone** | Todas as datas em ISO 8601 com timezone (`-03:00`) |
| **Link Meet** | Gerado via API do Google Calendar |
| **Notificações** | Email automático ao candidato ao criar/confirmar/reagendar |
| **Validação** | Feedback obrigatório para status COMPLETED |
| **Acessibilidade** | ARIA labels nos controles de rating e status |
| **Performance** | Paginação + lazy loading de detalhes |

---

> **←** [Voltar ao Índice](./INDEX.md)
