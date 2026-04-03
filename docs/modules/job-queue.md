# Módulo de Fila de Jobs em Background

> **Arquivos principais:** `src/lib/queue/job-types.ts`, `src/lib/queue/job-queue.ts`
> **Processadores:** `src/lib/queue/processors/`
> **Mini Service:** `mini-services/job-processor/index.ts` (porta 3005)

---

## Visão Geral

O módulo de fila de jobs em background permite o processamento assíncrono de tarefas pesadas como análise de currículos, triagem em lote, envio de e-mails e integrações com webhooks. Utiliza uma arquitetura híbrida com fila em memória para alta performance e persistência via SQLite (Prisma) para durabilidade.

---

## Arquitetura

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   API Routes │────▶│   JobQueue       │────▶│  Job Processor      │
│  /api/jobs   │     │  (memória+SQLite)│     │  (porta 3005)       │
└─────────────┘     └──────────────────┘     └─────────────────────┘
                                                     │
                                    ┌────────────────┼────────────────┐
                                    ▼                ▼                ▼
                             ┌──────────┐    ┌──────────┐    ┌──────────┐
                             │ Resume   │    │ Candidate│    │ Batch    │
                             │ Parser   │    │ Match    │    │ Screening│
                             └──────────┘    └──────────┘    └──────────┘
                                    ┌────────────────┼────────────────┐
                                    ▼                ▼                ▼
                             ┌──────────┐    ┌──────────┐    ┌──────────┐
                             │ Send     │    │ DISC     │    │ Webhook  │
                             │ Email    │    │ Analysis │    │ Dispatch │
                             └──────────┘    └──────────┘    └──────────┘
```

---

## Tipos de Job

Definidos em `src/lib/queue/job-types.ts`:

| Tipo | Constante | Descrição | Prioridade padrão |
|---|---|---|---|
| **Parse de Currículo** | `RESUME_PARSE` | Extrai dados estruturados de currículos (PDF, DOCX) | `MEDIUM` |
| **Match de Candidato** | `CANDIDATE_MATCH` | Calcula compatibilidade candidato × vaga | `MEDIUM` |
| **Triagem em Lote** | `BATCH_SCREENING` | Processa múltiplos candidatos simultaneamente | `LOW` |
| **Envio de E-mail** | `SEND_EMAIL` | Dispara e-mails transacionais e notificações | `HIGH` |
| **Análise DISC** | `DISC_ANALYSIS` | Processa e gera relatório DISC | `MEDIUM` |
| **Webhook Dispatch** | `WEBHOOK_DISPATCH` | Envia notificações para webhooks configurados | `HIGH` |

### Níveis de Prioridade

```typescript
type JobPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
```

| Prioridade | Ordem de processamento | Casos de uso |
|---|---|---|
| `CRITICAL` | 1° | Notificações urgentes |
| `HIGH` | 2° | E-mails, webhooks |
| `MEDIUM` | 3° | Parse, match, DISC |
| `LOW` | 4° | Triagem em lote |

---

## Fluxo de Status

```
PENDING → QUEUED → RUNNING → COMPLETED
                    ↓
                  FAILED → RETRY → RUNNING → ...
                    ↓
                 RETRY_EXHAUSTED
                    ↓
                  CANCELLED
```

### Status Possíveis

```typescript
type JobStatus =
  | 'PENDING'        // Aguardando processamento
  | 'QUEUED'         // Na fila, aguardando worker
  | 'RUNNING'        // Em execução por um worker
  | 'COMPLETED'      // Finalizado com sucesso
  | 'FAILED'         // Falhou (pode ser retentado)
  | 'CANCELLED'      // Cancelado pelo usuário
  | 'RETRY'          // Aguardando nova tentativa
  | 'STALLED'        // Travou (detecção automática);
```

---

## Classes de Erro

```typescript
// Erro genérico de job
class JobError extends Error {
  code: string;
  retryable: boolean;
}

// Job cancelado pelo usuário
class JobCancelledError extends JobError {}

// Timeout de execução
class JobTimeoutError extends JobError {}

// Tentativas esgotadas
class JobRetryExhaustedError extends JobError {}
```

---

## APIs

### `POST /api/jobs` — Criar Job

Cria um novo job na fila para processamento assíncrono.

**Body da requisição:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `type` | `JobType` | Sim | Tipo do job |
| `input` | `object` | Sim | Dados de entrada (varia por tipo) |
| `priority` | `JobPriority` | Não | Prioridade (padrão: `MEDIUM`) |
| `runAt` | `string` (ISO) | Não | Agendamento para execução futura |
| `maxAttempts` | `number` | Não | Tentativas máximas (padrão: 3) |
| `description` | `string` | Não | Descrição legível do job |

**Exemplo — Parse de currículo:**

```json
{
  "type": "RESUME_PARSE",
  "input": {
    "candidateId": "clx123abc",
    "fileUrl": "/uploads/resume.pdf",
    "fileName": "joao-silva-curriculo.pdf"
  },
  "priority": "MEDIUM",
  "description": "Parse do currículo de João Silva"
}
```

**Exemplo — Agendado:**

```json
{
  "type": "SEND_EMAIL",
  "input": {
    "to": "candidato@email.com",
    "templateType": "INTERVIEW_REMINDER",
    "data": { "candidateName": "João", "interviewDate": "2025-01-20" }
  },
  "runAt": "2025-01-19T14:00:00.000Z",
  "description": "Lembrete de entrevista"
}
```

**Resposta:**

```json
{
  "id": "job_abc123",
  "type": "RESUME_PARSE",
  "status": "PENDING",
  "priority": "MEDIUM",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

---

### `GET /api/jobs` — Listar Jobs

Lista jobs com filtros e paginação.

**Parâmetros de query:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `status` | `JobStatus` | Filtrar por status |
| `type` | `JobType` | Filtrar por tipo |
| `tenantId` | `string` | Filtrar por tenant |
| `relatedType` | `string` | Filtrar por tipo de entidade relacionada |
| `relatedId` | `string` | Filtrar por ID da entidade relacionada |
| `limit` | `number` | Itens por página (padrão: 20) |
| `offset` | `number` | Offset para paginação |

**Resposta:**

```json
{
  "jobs": [
    {
      "id": "job_abc123",
      "type": "RESUME_PARSE",
      "status": "COMPLETED",
      "priority": "MEDIUM",
      "progress": 100,
      "input": { "candidateId": "clx123abc" },
      "output": { "extractedData": { ... } },
      "createdAt": "2025-01-15T10:00:00.000Z",
      "startedAt": "2025-01-15T10:00:05.000Z",
      "completedAt": "2025-01-15T10:00:15.000Z",
      "attempts": 1,
      "description": "Parse do currículo de João Silva"
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

### `GET /api/jobs/[id]` — Detalhes do Job

Retorna informações detalhadas de um job específico.

**Resposta:**

```json
{
  "id": "job_abc123",
  "type": "RESUME_PARSE",
  "status": "COMPLETED",
  "priority": "MEDIUM",
  "progress": 100,
  "input": { ... },
  "output": { ... },
  "error": null,
  "attempts": 1,
  "maxAttempts": 3,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "startedAt": "2025-01-15T10:00:05.000Z",
  "completedAt": "2025-01-15T10:00:15.000Z",
  "description": "Parse do currículo de João Silva"
}
```

---

### `POST /api/jobs/[id]/cancel` — Cancelar Job

Cancela um job que ainda não foi concluído.

**Condições:** Job deve estar em status `PENDING`, `QUEUED`, `RUNNING` ou `RETRY`.

**Resposta:**

```json
{
  "id": "job_abc123",
  "status": "CANCELLED",
  "cancelledAt": "2025-01-15T10:00:30.000Z"
}
```

---

## Mini Service — Job Processor

**Arquivo:** `mini-services/job-processor/index.ts`
**Porta:** 3005

O mini service é um processo independente que:

1. **Polling:** Consulta periodicamente a tabela `BackgroundJob` no banco de dados
2. **Processamento:** Executa jobs conforme a disponibilidade de workers
3. **Resiliência:** Trata falhas com retry e exponential backoff
4. **Graceful Shutdown:** Finaliza jobs em andamento antes de encerrar

### Endpoints HTTP

#### `GET /health`

Health check do processador.

```json
{
  "status": "healthy",
  "uptime": 86400,
  "activeJobs": 2,
  "queuedJobs": 15,
  "completedJobs": 1250
}
```

#### `GET /stats`

Estatísticas detalhadas do processador.

```json
{
  "concurrency": 3,
  "activeWorkers": 2,
  "jobs": {
    "pending": 15,
    "running": 2,
    "completed": 1250,
    "failed": 12,
    "cancelled": 3
  },
  "byType": {
    "RESUME_PARSE": { "completed": 400, "failed": 3 },
    "SEND_EMAIL": { "completed": 600, "failed": 2 },
    "CANDIDATE_MATCH": { "completed": 200, "failed": 5 }
  },
  "avgProcessingTime": 8500
}
```

---

## Processadores

Cada tipo de job possui um processador dedicado em `src/lib/queue/processors/`:

| Processador | Arquivo | Descrição |
|---|---|---|
| `resume-parse` | `processors/resume-parse.ts` | Extrai dados de currículos (nome, experiência, habilidades, educação) |
| `candidate-match` | `processors/candidate-match.ts` | Calcula score de compatibilidade entre candidato e vaga |
| `batch-screening` | `processors/batch-screening.ts` | Processa triagem de múltiplos candidatos para uma vaga |
| `send-email` | `processors/send-email.ts` | Envia e-mails transacionais via Resend |
| `disc-analysis` | `processors/disc-analysis.ts` | Processa teste DISC e gera relatório comportamental |
| `webhook-dispatch` | `processors/webhook-dispatch.ts` | Dispara eventos para webhooks configurados |

---

## Funcionalidades

### Concorrência Configurável

```typescript
const queue = new JobQueue({
  concurrency: 3, // Processa 3 jobs simultaneamente (padrão)
});
```

### Backoff Exponencial

Em caso de falha, o retry utiliza backoff exponencial:

| Tentativa | Tempo de espera |
|---|---|
| 1ª | 5 segundos |
| 2ª | 15 segundos |
| 3ª | 45 segundos |
| 4ª | 2 minutos |
| 5ª | 5 minutos |

### Detecção de Stalled Jobs

Jobs em status `RUNNING` há mais de **30 segundos** sem atualização de progresso são marcados como `STALLED` e colocados para retry automático.

### Tracking de Progresso

Jobs podem reportar progresso de 0% a 100%:

```typescript
async function processJob(job: Job, updateProgress: (p: number) => void) {
  updateProgress(10); // Iniciando
  const data = await fetchData();
  updateProgress(50); // Dados carregados
  const result = await analyze(data);
  updateProgress(100); // Concluído
  return result;
}
```

### Agendamento

Jobs podem ser agendados para execução futura:

```typescript
await queue.add({
  type: 'SEND_EMAIL',
  input: { ... },
  runAt: new Date('2025-01-20T09:00:00Z')
});
```

### Eventos

O sistema emite eventos para cada mudança de status:

```typescript
queue.on('job:completed', (job) => {
  console.log(`Job ${job.id} concluído`);
});

queue.on('job:failed', (job, error) => {
  console.error(`Job ${job.id} falhou:`, error);
});

queue.on('job:progress', (jobId, progress) => {
  console.log(`Job ${jobId}: ${progress}%`);
});
```

### Auto-limpeza

Jobs concluídos e falhos são removidos automaticamente:

| Status | Tempo de retenção |
|---|---|
| `COMPLETED` | 24 horas |
| `FAILED` | 7 dias |
| `CANCELLED` | 24 horas |

---

## Interface de Input/Output por Tipo

### RESUME_PARSE

```typescript
interface ResumeParseInput {
  candidateId: string;
  fileUrl: string;
  fileName: string;
}

interface ResumeParseOutput {
  extractedData: {
    name: string;
    email: string;
    phone: string;
    summary: string;
    experience: WorkExperience[];
    education: Education[];
    skills: string[];
    languages: Language[];
  };
}
```

### CANDIDATE_MATCH

```typescript
interface CandidateMatchInput {
  candidateId: string;
  jobId: string;
}

interface CandidateMatchOutput {
  score: number; // 0-100
  matchDetails: {
    skills: { matched: string[]; missing: string[] };
    experience: { required: number; candidate: number };
    education: { required: string; candidate: string };
  };
}
```

### BATCH_SCREENING

```typescript
interface BatchScreeningInput {
  jobId: string;
  candidateIds: string[];
  criteria: ScreeningCriteria;
}

interface BatchScreeningOutput {
  results: Array<{
    candidateId: string;
    score: number;
    status: 'APPROVED' | 'REJECTED' | 'REVIEW';
  }>;
}
```

### SEND_EMAIL

```typescript
interface SendEmailInput {
  to: string;
  templateType: EmailType;
  data: Record<string, any>;
  cc?: string[];
  bcc?: string[];
  attachments?: Attachment[];
}

interface SendEmailOutput {
  emailId: string;
  status: 'sent' | 'queued';
  providerId: string;
}
```

### DISC_ANALYSIS

```typescript
interface DiscAnalysisInput {
  assessmentId: string;
  answers: Record<string, number>;
}

interface DiscAnalysisOutput {
  profile: DiscProfile; // D, I, S, C scores
  description: string;
  strengths: string[];
  challenges: string[];
  recommendations: string[];
}
```

### WEBHOOK_DISPATCH

```typescript
interface WebhookDispatchInput {
  webhookId: string;
  eventType: string;
  payload: Record<string, any>;
}

interface WebhookDispatchOutput {
  success: boolean;
  statusCode: number;
  responseTime: number;
  deliveryId: string;
}
```

---

## Hooks — React

**Arquivo:** `src/hooks/use-job-status.ts`

### `useJobStatus(jobId: string | null)`

Hook para acompanhar o status de um job em tempo real.

```typescript
const { job, isLoading, error } = useJobStatus('job_abc123');

// job.status → 'RUNNING'
// job.progress → 65
```

### `useJobs(filters?: JobFilters)`

Hook para listar e filtrar jobs.

```typescript
const { jobs, total, isLoading } = useJobs({
  status: 'COMPLETED',
  type: 'RESUME_PARSE',
  limit: 10
});
```

### `useCreateJob()`

Hook para criar novos jobs.

```typescript
const { createJob, isCreating } = useCreateJob();

const job = await createJob({
  type: 'RESUME_PARSE',
  input: { candidateId: 'clx123', fileUrl: '/resume.pdf' }
});
```

---

## Considerações de Produção

1. **Instância única:** Execute apenas uma instância do job processor para evitar processamento duplicado
2. **Monitoramento:** Monitore `/health` e `/stats` regularmente
3. **Graceful Shutdown:** Sinalize SIGTERM para encerramento seguro
4. **Recursos:** Ajuste a concorrência conforme os recursos disponíveis do servidor
5. **Retenção:** Configure a auto-limpeza conforme a necessidade de auditoria
