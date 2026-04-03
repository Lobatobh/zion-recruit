# Módulo: Agentes de IA

> **Versão:** 1.0 | **Última atualização:** 2025  
> **Status:** Estável | **Proprietário:** Equipe de IA

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes de UI](#componentes-de-ui)
4. [APIs REST](#apis-rest)
5. [Biblioteca de Agentes (src/lib/agents)](#biblioteca-de-agentes)
6. [Tipos de Agentes](#tipos-de-agentes)
7. [Fluxo de Execução](#fluxo-de-execução)
8. [Configuração](#configuração)
9. [Exemplos de Uso](#exemplos-de-uso)
10. [Considerações e Limitações](#consideracoes-e-limitacoes)

---

## Visão Geral

O módulo de **Agentes de IA** é o núcleo inteligente da plataforma Zion Recruit. Ele implementa um sistema de agentes especializados que automatizam tarefas-chave do processo de recrutamento e seleção, desde a análise de currículos até o agendamento de entrevistas.

Cada agente é projetado para:

- **Baixo consumo de tokens** — prompts concisos e estruturados
- **Alta confiabilidade** — lógica de retry e failover integrada
- **Supervisão humana** — tarefas podem ser marcadas como `requiresReview`
- **Rastreamento completo** — todas as execuções são registradas no banco de dados

### Principais Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Dashboard de Agentes | Visualização em tempo real de todos os agentes com estatísticas |
| Execução sob Demanda | Disparar execução manual de qualquer agente via interface ou API |
| Histórico de Tarefas | Registro completo de todas as execuções com detalhes de entrada/saída |
| Configuração por Agente | Habilitar/desabilitar, ajustar parâmetros e prompts de sistema |
| Agendamento | Execução automática de agentes em horários configuráveis |
| Orquestração | Workflows que encadeiam múltiplos agentes em sequência |

---

## Arquitetura

```
src/lib/agents/
├── base/
│   ├── BaseAgent.ts          # Classe base abstrata para todos os agentes
│   └── LLMService.ts         # Serviço de LLM otimizado (z-ai-web-dev-sdk)
├── specialized/
│   ├── JobParserAgent.ts     # Análise de descrições de vagas
│   ├── SourcingAgent.ts      # Busca multi-fonte de candidatos
│   ├── ScreeningAgent.ts     # Triagem automatizada de candidatos
│   ├── ContactAgent.ts       # Geração de mensagens de contato
│   ├── SchedulerAgent.ts     # Agendamento de entrevistas
│   ├── DISCAnalyzerAgent.ts  # Análise de resultados DISC
│   ├── MatchingAgent.ts      # Score de compatibilidade candidato-vaga
│   ├── ReportAgent.ts        # Geração de relatórios de candidatos
│   └── OrchestratorAgent.ts  # Orquestração de workflows
└── index.ts                  # Exportação centralizada de todos os agentes

src/components/agents/
├── agents-dashboard.tsx      # Dashboard principal de agentes
├── agent-card.tsx            # Card individual de agente
├── agent-detail-dialog.tsx   # Diálogo de detalhes do agente (3 abas)
├── agent-task-list.tsx       # Lista de tarefas do agente
└── run-agent-dialog.tsx      # Diálogo para executar agente

src/app/api/agents/
├── route.ts                  # GET (listar) / POST (executar)
├── [id]/
│   ├── route.ts              # GET (detalhes) / PUT (atualizar)
│   └── tasks/route.ts        # GET (tarefas do agente)
└── tasks/route.ts            # GET (todas as tarefas)
```

---

## Componentes de UI

### `agents-dashboard.tsx`

**Export:** `AgentsDashboard`

Dashboard principal que exibe o status completo de todos os agentes de IA do tenant.

| Seção | Descrição |
|---|---|
| **Stats Grid** | Grid de KPIs com total de agentes ativos, tarefas em execução, taxa de sucesso e tokens consumidos |
| **Agent Cards** | Grid responsivo com cards de cada agente (status, tipo, última execução, contadores) |
| **Recent Tasks Sidebar** | Barra lateral com as 10 tarefas mais recentes em formato de timeline |

**Estado Interno:**
- Carregamento de agentes via `GET /api/agents`
- Atualização automática a cada 30 segundos
- Filtros por status (`active`, `idle`, `error`) e tipo de agente

```tsx
// Exemplo de uso
<AgentsDashboard />
```

---

### `agent-card.tsx`

**Exportações:** `AgentCard`, `AgentStatus`, `AgentType`, `AIAgent`

Card visual para representar um agente individual com informações de status e performance.

**Tipos Exportados:**

```typescript
type AgentStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'ERROR' | 'DISABLED';
type AgentType = 'JOB_PARSER' | 'SOURCING' | 'SCREENING' | 'CONTACT' | 
                 'SCHEDULER' | 'DISC_ANALYZER' | 'MATCHING' | 'REPORT' | 
                 'ORCHESTRATOR';

interface AIAgent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  status: AgentStatus;
  enabled: boolean;
  totalRuns: number;
  successCount: number;
  errorCount: number;
  totalTokensUsed: number;
  lastRunAt: Date | null;
}
```

**Props do Componente `AgentCard`:**

| Prop | Tipo | Descrição |
|---|---|---|
| `agent` | `AIAgent` | Dados do agente |
| `onRun` | `(agent: AIAgent) => void` | Callback ao clicar em "Executar" |
| `onViewDetails` | `(agent: AIAgent) => void` | Callback ao clicar para ver detalhes |
| `onToggle` | `(agentId: string, enabled: boolean) => void` | Callback ao habilitar/desabilitar |

---

### `agent-detail-dialog.tsx`

**Export:** `AgentDetailDialog`

Diálogo modal que exibe informações detalhadas de um agente com três abas de navegação.

**Abas:**

| Aba | Conteúdo |
|---|---|
| **Overview** | Informações gerais, descrição, modelo LLM configurado, estatísticas agregadas (totalRuns, successRate, avgTokens, lastRunAt) |
| **Tasks** | Lista paginada das últimas 10 tarefas com status, duração, tokens e botão para ver output JSON |
| **Config** | Formulário para editar configurações: `enabled`, `status`, `config` (JSON), `prompts` (system prompt), `autoRun`, `schedule` (cron expression) |

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `agent` | `AIAgent \| null` | Dados do agente (null = fechado) |
| `open` | `boolean` | Controla visibilidade do diálogo |
| `onClose` | `() => void` | Callback ao fechar |
| `onUpdate` | `(agentId: string, data: UpdateAgentInput) => void` | Callback ao salvar configurações |

---

### `agent-task-list.tsx`

**Exportações:** `AgentTaskList`, `TaskStatus`, `AITask`

Componente de lista de tarefas com filtros e paginação.

**Tipos Exportados:**

```typescript
type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRY' | 'CANCELLED';

interface AITask {
  id: string;
  agentId: string;
  type: string;
  status: TaskStatus;
  input: string;        // JSON stringified
  output: string | null; // JSON stringified
  error: string | null;
  duration: number | null;  // em segundos
  tokensUsed: number | null;
  modelUsed: string | null;
  priority: number;
  attempts: number;
  maxAttempts: number;
  requiresReview: boolean;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}
```

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `tasks` | `AITask[]` | Lista de tarefas |
| `loading` | `boolean` | Estado de carregamento |
| `agentId` | `string \| null` | Filtrar por agente específico |
| `onViewOutput` | `(task: AITask) => void` | Callback para visualizar output |
| `onRetry` | `(taskId: string) => void` | Callback para retentar tarefa |

---

### `run-agent-dialog.tsx`

**Export:** `RunAgentDialog`

Diálogo para executar um agente com input específico. Apresenta campos de formulário dinâmicos baseados no tipo de agente.

**Funcionalidades:**
- Campos de input específicos por tipo de agente
- Suporte a entrada JSON para agentes avançados
- Validação de JSON antes do envio
- Exibição do resultado em tempo real (streaming quando disponível)
- Botão para copiar resultado para a área de transferência

**Inputs por Tipo de Agente:**

| Tipo de Agente | Campos de Input |
|---|---|
| `JOB_PARSER` | `jobDescription` (textarea) |
| `SOURCING` | `jobId`, `skills[]`, `location` |
| `SCREENING` | `candidateId`, `jobId` |
| `CONTACT` | `candidateId`, `jobId`, `channel` |
| `SCHEDULER` | `candidateId`, `jobId`, `preferredDates[]` |
| `DISC_ANALYZER` | `testId` (opcional) |
| `MATCHING` | `candidateId`, `jobId` |
| `REPORT` | `candidateId` |
| `ORCHESTRATOR` | `workflow` (select), `params` (JSON) |

---

## APIs REST

### `GET /api/agents`

Lista todos os agentes de IA do tenant.

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `status` | `string` | Filtrar por status (`IDLE`, `RUNNING`, `SUCCESS`, `ERROR`) |
| `type` | `string` | Filtrar por tipo de agente (`JOB_PARSER`, `SCREENING`, etc.) |
| `enabled` | `boolean` | Filtrar por status de habilitação |

**Resposta (200):**

```json
{
  "agents": [
    {
      "id": "agent_01",
      "type": "SCREENING",
      "name": "Agente de Triagem",
      "description": "Realiza triagem automatizada de candidatos",
      "status": "IDLE",
      "enabled": true,
      "model": "gpt-4o-mini",
      "maxTokens": 2000,
      "temperature": 0.3,
      "totalRuns": 145,
      "successCount": 138,
      "errorCount": 7,
      "totalTokensUsed": 234500,
      "lastRunAt": "2025-01-15T10:30:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### `POST /api/agents`

Executa um agente de IA.

**Request Body:**

```json
{
  "agentId": "agent_01",
  "type": "SCREENING",
  "input": {
    "candidateId": "cand_123",
    "jobId": "job_456"
  }
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `agentId` | `string` | Não | ID do agente (se não informado, usa o `type`) |
| `type` | `string` | Não | Tipo do agente (se não informado, usa o `agentId`) |
| `input` | `object` | Sim | Input específico do agente |

**Resposta (200):**

```json
{
  "taskId": "task_789",
  "agentId": "agent_01",
  "status": "RUNNING",
  "message": "Tarefa criada e iniciada com sucesso"
}
```

---

### `GET /api/agents/[id]`

Retorna detalhes de um agente específico, incluindo as últimas 10 tarefas e estatísticas computadas.

**Parâmetros de Rota:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | `string` | ID do agente |

**Resposta (200):**

```json
{
  "agent": {
    "id": "agent_01",
    "type": "SCREENING",
    "name": "Agente de Triagem",
    "description": "Realiza triagem automatizada de candidatos",
    "status": "IDLE",
    "enabled": true,
    "model": "gpt-4o-mini",
    "maxTokens": 2000,
    "temperature": 0.3,
    "totalRuns": 145,
    "successCount": 138,
    "errorCount": 7,
    "totalTokensUsed": 234500,
    "lastRunAt": "2025-01-15T10:30:00Z"
  },
  "stats": {
    "successRate": 95.2,
    "avgTokensPerRun": 1617,
    "avgDuration": 3200,
    "runsThisWeek": 23,
    "runsThisMonth": 89
  },
  "recentTasks": [ /* ... últimas 10 tarefas ... */ ]
}
```

---

### `PUT /api/agents/[id]`

Atualiza a configuração de um agente.

**Request Body:**

```json
{
  "enabled": true,
  "status": "IDLE",
  "config": {
    "maxTokens": 3000,
    "temperature": 0.5
  },
  "prompts": {
    "systemPrompt": "Você é um especialista em recrutamento..."
  },
  "autoRun": false,
  "schedule": "0 9 * * 1-5"
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `enabled` | `boolean` | Habilitar/desabilitar o agente |
| `status` | `string` | Forçar status do agente |
| `config` | `object` | Configurações do modelo (maxTokens, temperature) |
| `prompts` | `object` | Prompts de sistema do agente |
| `autoRun` | `boolean` | Execução automática |
| `schedule` | `string` | Expressão cron para agendamento |

---

### `GET /api/agents/tasks`

Lista todas as tarefas de todos os agentes com paginação e filtros.

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `page` | `number` | Página atual (padrão: 1) |
| `limit` | `number` | Itens por página (padrão: 20, máximo: 100) |
| `status` | `string` | Filtrar por status |
| `agentId` | `string` | Filtrar por agente |
| `agentType` | `string` | Filtrar por tipo de agente |
| `sortBy` | `string` | Ordenação (`createdAt`, `duration`, `tokensUsed`) |
| `sortOrder` | `string` | `asc` ou `desc` |
| `fromDate` | `string` | Data inicial (ISO 8601) |
| `toDate` | `string` | Data final (ISO 8601) |

---

### `GET /api/agents/[id]/tasks`

Lista tarefas de um agente específico.

**Parâmetros de Rota:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | `string` | ID do agente |

**Parâmetros de Query:** Mesmos de `GET /api/agents/tasks` (exceto `agentId`).

---

## Biblioteca de Agentes

### `base/BaseAgent.ts`

Classe base abstrata que define a estrutura e o comportamento comum a todos os agentes.

**Exportações:** `BaseAgent` (classe abstrata), `AgentConfig`, `TaskInput`, `TaskOutput`, `TaskResult`

**Métodos Principais:**

| Método | Descrição |
|---|---|
| `initialize()` | Busca ou cria registro do agente no banco de dados |
| `updateStatus(status)` | Atualiza o status do agente (`IDLE`, `RUNNING`, etc.) |
| `updateStats(success, tokensUsed, duration)` | Incrementa contadores de execução |
| `createTask(type, input, options)` | Cria registro de tarefa no banco |
| `getTask(taskId)` | Busca tarefa por ID |
| `startTask(taskId)` | Marca tarefa como em execução (`RUNNING`) |
| `completeTask(taskId, result)` | Marca tarefa como completa ou falha |
| `failTask(taskId, error)` | Marca tarefa como falha (com retry automático) |
| `execute(input)` | **Método abstrato** — deve ser implementado por cada agente |
| `parseJsonSafe<T>(text)` | Utilitário para parsing seguro de JSON (remove code blocks) |
| `truncateText(text, maxLength)` | Utilitário para truncar texto |
| `estimateTokens(text)` | Estimativa de tokens (~4 caracteres por token) |

**Interface `AgentConfig`:**

```typescript
interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  model?: string;           // Padrão: 'gpt-4o-mini'
  maxTokens?: number;       // Padrão: 2000
  temperature?: number;     // Padrão: 0.3
  systemPrompt?: string;
  autoRun?: boolean;
  schedule?: string;
}
```

**Interface `TaskResult`:**

```typescript
interface TaskResult<T = TaskOutput> {
  success: boolean;
  data?: T;
  error?: string;
  tokensUsed?: number;
  requiresReview?: boolean;
}
```

---

### `base/LLMService.ts`

Serviço de LLM otimizado para baixo consumo de tokens. Implementa wrapper sobre o `z-ai-web-dev-sdk`.

**Exportações:** `LLMService` (singleton), `llmService`, `callLLM`, `estimateTokens`

**Método Principal — `call<T>(request, cache?)`:**

```typescript
interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;       // Padrão: 500
  temperature?: number;     // Padrão: 0.3
  model?: string;           // Padrão: 'gpt-4o-mini'
  jsonMode?: boolean;       // Padrão: true
}

interface LLMResponse<T> {
  success: boolean;
  data?: T;
  rawContent?: string;
  tokensUsed?: number;
  cached?: boolean;
  error?: string;
}
```

**Prompts Otimizados Pré-construídos:**

| Método | Uso |
|---|---|
| `createJobParsingPrompt(description)` | Extrai skills, senioridade, keywords e perfil DISC ideal |
| `createResumeParsingPrompt(resume)` | Extrai dados pessoais, skills, experiência e educação |
| `createMatchingPrompt(candidate, job)` | Score de compatibilidade com strengths/gaps |
| `createDISCAnalysisPrompt(d, i, s, c, jobContext)` | Interpretação do perfil DISC |
| `createContactMessagePrompt(name, job, company)` | Gera mensagem de recrutamento em português |

**Caching em Memória:**

- Cache com TTL configurável (padrão: 7 dias)
- Chave de cache via SHA-256
- Limpeza automática de entradas expiradas

---

### `specialized/JobParserAgent.ts`

**Exportações:** `JobParserAgent`, `parseJob`

Analisa descrições de vagas e extrai informações estruturadas.

**Input Esperado:**

```typescript
{
  jobDescription: string;
  jobId?: string;
}
```

**Output:**

```typescript
{
  skills: string[];
  seniority: string;
  keywords: string[];
  discProfile: { D: number; I: number; S: number; C: number };
  summary: string;
}
```

---

### `specialized/SourcingAgent.ts`

**Exportações:** `SourcingAgent`, `sourceCandidates`

Executa busca multi-fonte de candidatos.

**Input Esperado:**

```typescript
{
  jobId?: string;
  skills?: string[];
  location?: string;
  experienceLevel?: string;
  sources?: string[];
}
```

---

### `specialized/ScreeningAgent.ts`

**Exportações:** `ScreeningAgent`, `screenCandidate`, `screenAllCandidates`

Realiza triagem automatizada de candidatos baseada em critérios da vaga.

**Input Esperado:**

```typescript
{
  candidateId: string;
  jobId: string;
}
```

**Output:**

```typescript
{
  passed: boolean;
  score: number;         // 0-100
  reasons: string[];
  recommendation: string; // 'proceed' | 'hold' | 'reject'
}
```

---

### `specialized/MatchingAgent.ts`

**Exportações:** `MatchingAgent`, `matchCandidate`, `matchAllCandidates`, `getTopCandidates`

Calcula score de compatibilidade entre candidato e vaga.

**Métodos:**

| Método | Descrição |
|---|---|
| `matchCandidate(candidateId, jobId)` | Score para candidato individual |
| `matchAllCandidates(jobId)` | Score para todos os candidatos de uma vaga |
| `getTopCandidates(jobId, limit)` | Retorna os N candidatos com maior score |

---

### `specialized/DISCAnalyzerAgent.ts`

**Exportações:** `DISCAnalyzerAgent`, `analyzeDISCResult`, `getQuickDISCInterpretation`

Analisa resultados de testes DISC e gera interpretações detalhadas.

**Input Esperado:**

```typescript
{
  testId?: string;
  scores?: { D: number; I: number; S: number; C: number };
  candidateId?: string;
  jobContext?: string;
}
```

---

### `specialized/ReportAgent.ts`

**Exportações:** `ReportAgent`, `generateCandidateReport`

Gera relatórios completos de candidatos.

---

### `specialized/SchedulerAgent.ts`

**Exportações:** `SchedulerAgent`, `scheduleInterview`, `getAvailableSlots`

Agenda entrevistas e identifica horários disponíveis.

**Métodos:**

| Método | Descrição |
|---|---|
| `scheduleInterview(candidateId, jobId, preferredDates)` | Agenda entrevista |
| `getAvailableSlots(jobId, dateRange)` | Busca horários disponíveis |

---

### `specialized/ContactAgent.ts`

**Exportações:** `ContactAgent`, `generateContactMessage`, `contactCandidates`

Gera mensagens de contato personalizadas para candidatos.

---

### `specialized/OrchestratorAgent.ts`

**Exportações:** `OrchestratorAgent`, `runWorkflow`, `getAvailableWorkflows`

Orquestra fluxos de trabalho que encadeiam múltiplos agentes.

**Workflows Disponíveis:**

| Workflow | Descrição | Agentes Envolvidos |
|---|---|---|
| `full_pipeline` | Pipeline completo de recrutamento | JobParser → Sourcing → Screening → Matching |
| `screening_pipeline` | Triagem de candidatos | Screening → Matching → DISC |
| `interview_pipeline` | Preparação de entrevista | Matching → Report → Scheduler |
| `sourcing_pipeline` | Busca e importação | JobParser → Sourcing → Contact |

---

### `index.ts`

Exportação centralizada de todos os agentes e tipos:

```typescript
// Base
export { BaseAgent } from './base/BaseAgent';
export type { AgentConfig, TaskInput, TaskOutput, TaskResult } from './base/BaseAgent';
export { llmService, callLLM } from './base/LLMService';

// Especializados
export { JobParserAgent, parseJob } from './specialized/JobParserAgent';
export { SourcingAgent, sourceCandidates } from './specialized/SourcingAgent';
export { ScreeningAgent, screenCandidate, screenAllCandidates } from './specialized/ScreeningAgent';
export { ContactAgent, generateContactMessage, contactCandidates } from './specialized/ContactAgent';
export { OrchestratorAgent, runWorkflow, getAvailableWorkflows } from './specialized/OrchestratorAgent';
export { DISCAnalyzerAgent, analyzeDISCResult, getQuickDISCInterpretation } from './specialized/DISCAnalyzerAgent';

// Tipos
export type { LLMRequest, LLMResponse } from './base/LLMService';
```

---

## Tipos de Agentes

| Tipo | Nome | Descrição | Modelo Padrão |
|---|---|---|---|
| `JOB_PARSER` | Parser de Vagas | Analisa descrições e extrai requisitos estruturados | gpt-4o-mini |
| `SOURCING` | Sourcing | Busca candidatos em múltiplas fontes | gpt-4o-mini |
| `SCREENING` | Triagem | Filtra candidatos baseado em critérios | gpt-4o-mini |
| `CONTACT` | Contato | Gera mensagens de recrutamento | gpt-4o-mini |
| `SCHEDULER` | Agendamento | Gerencia agendamento de entrevistas | gpt-4o-mini |
| `DISC_ANALYZER` | Analista DISC | Interpreta perfis comportamentais DISC | gpt-4o-mini |
| `MATCHING` | Matching | Calcula compatibilidade candidato-vaga | gpt-4o-mini |
| `REPORT` | Relatórios | Gera relatórios detalhados | gpt-4o-mini |
| `ORCHESTRATOR` | Orquestrador | Coordena workflows multi-agente | gpt-4o-mini |

---

## Fluxo de Execução

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Iniciar     │────▶│  Criar Tarefa │────▶│  Executar    │────▶│  Completar   │
│  Agente      │     │  (DB)        │     │  LLM Call    │     │  Tarefa      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │                     │                     │
                            ▼                     ▼                     ▼
                     status: PENDING       status: RUNNING       status: COMPLETED
                                                                 ou FAILED
                                                                          │
                                                                    ┌─────┴─────┐
                                                                    ▼           ▼
                                                              attempts <      attempts >=
                                                              maxAttempts?   maxAttempts
                                                                    │           │
                                                                    ▼           ▼
                                                              status: RETRY  status: FAILED
                                                              (aguarda +     (finaliza)
                                                              reexecuta)
```

---

## Configuração

### Variáveis de Ambiente

Não são necessárias variáveis de ambiente específicas para os agentes internos. O módulo utiliza o `z-ai-web-dev-sdk` que é configurado automaticamente.

### Configuração por Agente

Cada agente pode ser configurado individualmente via:

1. **UI** — A aba "Config" do `AgentDetailDialog`
2. **API** — `PUT /api/agents/[id]`
3. **Banco de Dados** — Tabela `AIAgent` no Prisma schema

### Parâmetros Configuráveis

| Parâmetro | Descrição | Padrão |
|---|---|---|
| `model` | Modelo LLM a ser utilizado | `gpt-4o-mini` |
| `maxTokens` | Máximo de tokens por resposta | `2000` |
| `temperature` | Temperatura de criatividade | `0.3` |
| `systemPrompt` | Prompt de sistema personalizado | Definido por agente |
| `autoRun` | Execução automática | `false` |
| `schedule` | Expressão cron | `null` |

---

## Exemplos de Uso

### Executar Triagem via API

```bash
curl -X POST /api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SCREENING",
    "input": {
      "candidateId": "cand_123",
      "jobId": "job_456"
    }
  }'
```

### Executar Workflow Completo

```bash
curl -X POST /api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ORCHESTRATOR",
    "input": {
      "workflow": "full_pipeline",
      "params": {
        "jobId": "job_456",
        "maxCandidates": 20
      }
    }
  }'
```

### Consultar Resultado de Tarefa

```bash
# Verificar status
GET /api/agents/tasks?agentId=agent_01&status=COMPLETED&limit=1

# Ver output detalhado
GET /api/agents/agent_01  # recentTasks inclui output
```

---

## Considerações e Limitações

| Aspecto | Detalhe |
|---|---|
| **Tokens** | Todos os prompts são otimizados para mínimo consumo (~500 tokens por chamada) |
| **Retry** | Tarefas falham automaticamente após `maxAttempts` (padrão: 3) |
| **Revisão Humana** | Tarefas podem ser marcadas com `requiresReview: true` |
| **Concorrência** | Agentes usam o Prisma ORM com transações para evitar condições de corrida |
| **Custo** | Use `totalTokensUsed` no dashboard para monitorar consumo |
| **Cache** | O `LLMService` possui cache em memória com TTL de 7 dias |
| **Privacidade** | Dados de candidatos são processados sem armazenamento no LLM |
