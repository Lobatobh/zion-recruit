# Módulo: Multi-Provider LLM Service

> **Versão:** 1.0 | **Última atualização:** 2025  
> **Status:** Estável | **Proprietário:** Equipe de Infraestrutura

---

## Sumário

1. [Visão Geral](#visao-geral)
2. [Arquitetura](#arquitetura)
3. **Providers Suportados](#providers-suportados)
4. [Tipos (src/lib/llm/types.ts)](#tipos-srclibllmtypesst)
5. [Serviço Principal (src/lib/llm/llm-service.ts)](#servico-principal-srclibllmllm-servicets)
6. [Seleção de Provider](#selecao-de-provider)
7. [Failover Automático](#failover-automatico)
8. [Rastreamento de Uso](#rastreamento-de-uso)
9. [Caching](#caching)
10. [Streaming](#streaming)
11. [Health Checks](#health-checks)
12. [Custo](#custo)
13. [Variáveis de Ambiente](#variaveis-de-ambiente)
14. [Consumidores do Serviço](#consumidores-do-servico)
15. [Exemplos de Uso](#exemplos-de-uso)

---

## Visão Geral

O módulo **Multi-Provider LLM Service** é a camada de abstração para chamadas a modelos de linguagem na plataforma Zion Recruit. Ele implementa uma arquitetura robusta que suporta múltiplos providers (OpenAI, Google Gemini, OpenRouter) com failover automático, otimização de custo e rastreamento completo de uso.

O serviço foi projetado para:

- **Resiliência** — Failover automático entre providers com retry exponencial
- **Economia** — Seleção automática do provider mais barato
- **Transparência** — Rastreamento completo de tokens e custos por chamada
- **Observabilidade** — Alerts baseados em thresholds de uso
- **Flexibilidade** — Suporte a streaming, JSON mode e múltiplos modelos

### Funcionalidades Principais

| Funcionalidade | Descrição |
|---|---|
| Failover Automático | Troca automática entre providers em caso de falha |
| Otimização de Custo | Seleciona o provider mais barato disponível |
| Rastreamento de Tokens | Registra prompt_tokens, completion_tokens e custo por chamada |
| Alerts de Threshold | Alertas quando uso atinge percentual do limite mensal |
| Caching em Memória | Cache de respostas com TTL configurável |
| Streaming | Suporte a respostas em streaming (SSE) |
| JSON Mode | Força saída em formato JSON estruturado |
| Health Checks | Verificação periódica de saúde dos providers |

---

## Arquitetura

```
src/lib/llm/
├── types.ts         # Definições de tipos completas
└── llm-service.ts   # Classe MultiProviderLLMService

┌─────────────────────────────────────────────────────────────┐
│                  Consumidores do Serviço                     │
│  ai-service.ts | matching-service.ts | screening agents |    │
│  sourcing agents | DISC analyzer | report agent             │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  MultiProvider  │
                    │  LLMService     │
                    ├─────────────────┤
                    │ • Cache         │
                    │ • Failover      │
                    │ • Custo         │
                    │ • Tracking      │
                    │ • Alerts        │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼──────┐ ┌────▼───────┐ ┌────▼──────────┐
     │    OpenAI     │ │   Gemini   │ │  OpenRouter    │
     │  gpt-4o-mini  │ │ 1.5-flash │ │  gpt-4o-mini   │
     │  gpt-4o       │ │ 1.5-pro   │ │  claude-3-haiku│
     │  gpt-3.5-turbo│ │ gemini-pro│ │  llama-3-8b     │
     └───────────────┘ └────────────┘ └────────────────┘
              │              │              │
     ┌────────▼──────────────────────────────────▼────────┐
     │                  Banco de Dados                     │
     │  api_credentials | api_usage_logs | api_alerts     │
     └───────────────────────────────────────────────────┘
```

---

## Providers Suportados

### Prioridade Padrão

```
OPENAI → GEMINI → OPENROUTER
```

### Modelos por Provider

#### OpenAI

| Modelo | Custo Input/1K tokens | Custo Output/1K tokens | Max Tokens | Context | JSON | Streaming |
|---|---|---|---|---|---|---|
| `gpt-4o-mini` | $0.0015 | $0.006 | 16.384 | 128K | ✅ | ✅ |
| `gpt-4o` | $0.0025 | $0.010 | 4.096 | 128K | ✅ | ✅ |
| `gpt-3.5-turbo` | $0.0005 | $0.0015 | 4.096 | 16K | ✅ | ✅ |

#### Google Gemini

| Modelo | Custo Input/1K tokens | Custo Output/1K tokens | Max Tokens | Context | JSON | Streaming |
|---|---|---|---|---|---|---|
| `gemini-1.5-flash` | $0.000075 | $0.0003 | 8.192 | 1M | ✅ | ✅ |
| `gemini-1.5-pro` | $0.00125 | $0.005 | 8.192 | 2M | ✅ | ✅ |
| `gemini-pro` | $0.000125 | $0.000375 | 2.048 | 32K | ✅ | ✅ |

#### OpenRouter

| Modelo | Custo Input/1K tokens | Custo Output/1K tokens | Max Tokens | Context | JSON | Streaming |
|---|---|---|---|---|---|---|
| `openai/gpt-4o-mini` | $0.0015 | $0.006 | 16.384 | 128K | ✅ | ✅ |
| `anthropic/claude-3-haiku` | $0.00025 | $0.00125 | 4.096 | 200K | ✅ | ✅ |
| `google/gemini-pro` | $0.000125 | $0.000375 | 2.048 | 32K | ✅ | ✅ |
| `meta-llama/llama-3-8b-instruct` | $0.00002 | $0.00002 | 8.192 | 8K | ❌ | ✅ |

### Configuração por Provider

Cada provider possui configuração completa:

```typescript
interface ProviderConfig {
  name: LLMProvider;
  baseUrl: string;
  defaultModel: string;
  models: ModelConfig[];
  headerFormat: (apiKey: string) => Record<string, string>;
  transformRequest: (request, model) => ProviderRequest;
  transformResponse: (response) => ChatCompletionResponse;
  parseError: (error) => LLMError;
}
```

---

## Tipos (src/lib/llm/types.ts)

Arquivo com todas as definições de tipos do serviço LLM.

### Tipos de Chat

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  stream?: boolean;
  jsonMode?: boolean;
  responseFormat?: { type: 'text' | 'json_object' };
}

interface ChatCompletionResponse {
  id: string;
  provider: LLMProvider;
  model: string;
  choices: ChatCompletionChoice[];
  usage: TokenUsage;
  created: number;
  latencyMs: number;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
```

### Tipos de Streaming

```typescript
interface StreamChunk {
  id: string;
  provider: LLMProvider;
  model: string;
  choices: StreamChoice[];
  created: number;
}

interface StreamChoice {
  index: number;
  delta: { role?: string; content?: string };
  finishReason: string | null;
}

type StreamCallback = (chunk: StreamChunk) => void;
```

### Tipos de Provider

```typescript
type LLMProvider = 'OPENAI' | 'GEMINI' | 'OPENROUTER';

interface SelectedProvider {
  provider: LLMProvider;
  model: string;
  credential: CredentialInfo;
  estimatedCost: number; // em centavos
}

interface CredentialInfo {
  id: string;
  provider: ApiProvider;
  apiKey: string;
  endpoint?: string;
  defaultModel?: string;
  maxTokensPerCall?: number;
  temperature?: number;
  monthlyLimit?: number;
  alertThreshold?: number;
  currentUsage: number;
}
```

### Tipos de Resultado

```typescript
interface LLMResult<T = unknown> {
  success: boolean;
  data?: T;
  rawContent?: string;
  provider: LLMProvider;
  model: string;
  tokensUsed: TokenUsage;
  costCents: number;
  latencyMs: number;
  cached?: boolean;
  error?: LLMError;
  usageLogId?: string;
}
```

### Tipos de Erro

```typescript
interface LLMError {
  code: LLMErrorCode;
  message: string;
  provider?: LLMProvider;
  httpStatus?: number;
  retryable: boolean;
  rawError?: unknown;
}

enum LLMErrorCode {
  // Erros de provider
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMITED = 'RATE_LIMITED',
  INSUFFICIENT_QUOTA = 'INSUFFICIENT_QUOTA',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  CONTEXT_LENGTH_EXCEEDED = 'CONTEXT_LENGTH_EXCEEDED',
  CONTENT_FILTERED = 'CONTENT_FILTERED',
  
  // Erros de rede
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Erros de request
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  
  // Erros internos
  NO_CREDENTIALS = 'NO_CREDENTIALS',
  ALL_PROVIDERS_FAILED = 'ALL_PROVIDERS_FAILED',
  UNKNOWN = 'UNKNOWN',
}
```

### Tipos de Failover

```typescript
interface FailoverConfig {
  maxRetries: number;           // Padrão: 3
  retryDelayMs: number;         // Padrão: 1000
  exponentialBackoff: boolean;  // Padrão: true
  maxRetryDelayMs: number;      // Padrão: 10000
  failoverOnRateLimit: boolean; // Padrão: true
  failoverOnTimeout: boolean;   // Padrão: true
  failoverOnError: boolean;     // Padrão: true
}

interface FailoverState {
  attemptNumber: number;
  currentProvider: LLMProvider;
  triedProviders: LLMProvider[];
  lastError?: LLMError;
}
```

### Tipos de Custo e Health

```typescript
interface CostEstimate {
  promptCostCents: number;
  completionCostCents: number;
  totalCostCents: number;
  provider: LLMProvider;
  model: string;
}

interface ProviderHealth {
  provider: LLMProvider;
  isHealthy: boolean;
  lastCheck: Date;
  latencyMs?: number;
  errorRate?: number;
  lastError?: string;
}

interface HealthCheckResult {
  providers: ProviderHealth[];
  overallHealthy: boolean;
  checkedAt: Date;
}
```

### Constantes

```typescript
const DEFAULT_FAILOVER_CONFIG: FailoverConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  exponentialBackoff: true,
  maxRetryDelayMs: 10000,
  failoverOnRateLimit: true,
  failoverOnTimeout: true,
  failoverOnError: true,
};

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  OPENAI: 'gpt-4o-mini',
  GEMINI: 'gemini-1.5-flash',
  OPENROUTER: 'openai/gpt-4o-mini',
};

const PROVIDER_PRIORITY: LLMProvider[] = ['OPENAI', 'GEMINI', 'OPENROUTER'];
```

---

## Serviço Principal (src/lib/llm/llm-service.ts)

**Exportação:** `MultiProviderLLMService`

### Construtor

```typescript
const llm = new MultiProviderLLMService(timeout?: number = 30000);
```

| Parâmetro | Padrão | Descrição |
|---|---|---|
| `timeout` | 30000ms | Timeout global para requisições |

### Métodos Principais

#### `chatCompletion<T>(request, options): Promise<LLMResult<T>>`

Método principal para chamadas ao LLM com todas as funcionalidades integradas.

**Parâmetros:**

```typescript
interface LLMCallOptions extends LLMServiceOptions {
  cache?: CacheOptions;
}

interface LLMServiceOptions {
  tenantId: string;
  agentType?: string;
  jobId?: string;
  candidateId?: string;
  taskId?: string;
  preferredProvider?: LLMProvider;
  preferredModel?: string;
  costOptimization?: boolean;
  failover?: Partial<FailoverConfig>;
  timeout?: number;
}

interface CacheOptions {
  enabled: boolean;
  ttlMs?: number;    // Padrão: 7 dias
  cacheKey?: string;
}
```

**Fluxo Completo:**

```
chatCompletion()
    │
    ├── 1. Verificar cache
    │   └── Cache hit → retornar imediatamente (cached: true)
    │
    ├── 2. Selecionar provider
    │   ├── Respeitar preferredProvider
    │   ├── Verificar constraints (JSON, streaming, context)
    │   ├── Verificar limites de uso mensal
    │   └── Otimizar custo se habilitado
    │
    ├── 3. Executar com failover
    │   ├── Tentar provider selecionado
    │   ├── Se erro retryable → tentar próximo provider
    │   ├── Respeitar maxRetries (padrão: 3)
    │   └── Backoff exponencial entre tentativas
    │
    ├── 4. Processar resposta
    │   ├── Parse JSON se jsonMode = true
    │   ├── Calcular custo
    │   └── Logar uso no banco
    │
    ├── 5. Atualizar estatísticas
    │   ├── Incrementar uso da credencial
    │   └── Verificar threshold de alerta
    │
    └── 6. Salvar no cache (se habilitado)
```

#### `streamCompletion(request, options, onChunk): Promise<LLMResult>`

Método para chamadas em streaming.

**Parâmetros adicionais:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `onChunk` | `StreamCallback` | Callback invocado para cada chunk recebido |

**Retorna:** `StreamingResult` com `abort()` para cancelar.

#### `calculateCost(provider, modelId, promptTokens, completionTokens): number`

Calcula o custo em centavos de uma chamada.

#### `estimateCost(provider, modelId, promptTokens, completionTokens): CostEstimate`

Retorna estimativa detalhada de custo.

#### `checkProviderHealth(tenantId, provider): Promise<ProviderHealth>`

Verifica saúde de um provider específico.

#### `checkAllProvidersHealth(tenantId): Promise<HealthCheckResult>`

Verifica saúde de todos os providers configurados.

---

## Seleção de Provider

O processo de seleção considera múltiplos fatores:

```
1. Respeitar PROVIDER_PRIORITY (OPENAI → GEMINI → OPENROUTER)
2. Mover preferredProvider para o início da lista
3. Para cada provider:
   a. Verificar se há credencial ativa
   b. Verificar se o modelo suporta os requisitos (JSON, streaming, context)
   c. Verificar se o limite mensal não foi atingido
   d. Calcular custo estimado
4. Se costOptimization = true → ordenar por custo (mais barato primeiro)
5. Retornar o primeiro candidato válido
```

**Critérios de Filtro:**

| Critério | Descrição |
|---|---|
| `preferredProvider` | Provider preferido pelo chamador |
| `requireJson` | Modelo deve suportar JSON mode |
| `requireStreaming` | Modelo deve suportar streaming |
| `minContextWindow` | Tamanho mínimo da janela de contexto |
| `excludeProviders` | Providers a excluir (usado no failover) |
| `excludeModels` | Modelos específicos a excluir |
| `monthlyLimit` | Limite mensal da credencial (currentUsage < monthlyLimit) |

**Balanceamento de Carga:**

Credenciais são ordenadas por `isDefault DESC, lastUsedAt ASC`, priorizando credenciais padrão e utilizando as menos recentemente usadas para distribuir carga.

---

## Failover Automático

### Configuração Padrão

```typescript
{
  maxRetries: 3,
  retryDelayMs: 1000,
  exponentialBackoff: true,
  maxRetryDelayMs: 10000,
  failoverOnRateLimit: true,
  failoverOnTimeout: true,
  failoverOnError: true,
}
```

### Algoritmo de Retry com Exponencial

```
Tentativa 1: Provider A → Falha (RATE_LIMITED)
  Delay: 1000ms (1s × 2^0)
Tentativa 2: Provider B → Falha (TIMEOUT)
  Delay: 2000ms (1s × 2^1)
Tentativa 3: Provider C → Sucesso ✓
```

### Erros Retryáveis

| Código | Provider | Ação |
|---|---|---|
| `RATE_LIMITED` | Todos | Failover para próximo provider |
| `TIMEOUT` | Todos | Retry com backoff |
| `NETWORK_ERROR` | Todos | Failover para próximo provider |
| `SERVICE_UNAVAILABLE` | GEMINI | Failover para próximo provider |

### Erros Não-Retryáveis

| Código | Descrição |
|---|---|
| `INVALID_API_KEY` | Chave de API inválida |
| `INSUFFICIENT_QUOTA` | Sem cota disponível |
| `CONTEXT_LENGTH_EXCEEDED` | Texto excede janela de contexto |
| `CONTENT_FILTERED` | Conteúdo filtrado pelo provider |

---

## Rastreamento de Uso

### Registro no Banco

Toda chamada ao LLM é registrada na tabela `api_usage_logs`:

```typescript
interface UsageLogInput {
  tenantId: string;
  credentialId: string;
  requestType: string;        // 'chat_completion' | 'chat_completion_stream'
  model: string;
  provider: ApiProvider;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costCents: number;
  durationMs: number;
  status: ApiCallStatus;      // SUCCESS | ERROR | RATE_LIMITED | TIMEOUT
  errorMessage?: string;
  agentType?: string;         // Qual agente fez a chamada
  jobId?: string;
  candidateId?: string;
  taskId?: string;
}
```

### Atualização de Credencial

Após cada chamada, a credencial é atualizada:

```typescript
await db.apiCredential.update({
  where: { id: credentialId },
  data: {
    currentUsage: { increment: totalTokens },
    lastUsedAt: new Date(),
  },
});
```

### Alertas de Threshold

O sistema verifica automaticamente se o uso ultrapassou os thresholds configurados:

1. **Threshold de Alerta** — Quando `currentUsage >= (monthlyLimit × alertThreshold/100)`
   - Cria alerta do tipo `USAGE_THRESHOLD` com severidade `WARNING`
   
2. **Limite Atingido** — Quando `currentUsage >= monthlyLimit`
   - Cria alerta do tipo `LIMIT_REACHED` com severidade `ERROR`

### Resumo de Uso

```typescript
interface UsageSummary {
  totalTokens: number;
  totalCostCents: number;
  totalCalls: number;
  successRate: number;
  byProvider: Record<LLMProvider, ProviderUsageStats>;
  byModel: Record<string, ModelUsageStats>;
}
```

---

## Caching

### Implementação

Cache em memória usando `Map` com TTL:

```typescript
private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();
```

### Chave de Cache

Deve ser fornecida pelo chamador via `options.cache.cacheKey`. Recomenda-se usar um hash SHA-256 do conteúdo relevante:

```typescript
import crypto from 'crypto';
const cacheKey = crypto.createHash('sha256')
  .update(JSON.stringify({ messages, model }))
  .digest('hex');
```

### TTL Padrão

7 dias (`7 × 24 × 60 × 60 × 1000 = 604.800.000 ms`)

### Limpeza

Entradas expiradas são removidas automaticamente ao serem acessadas (lazy eviction).

---

## Streaming

O serviço suporta streaming de respostas via `streamCompletion()`:

**Fluxo:**

```
1. Selecionar provider (deve suportar streaming)
2. Fazer request com stream: true
3. Ler response.body como ReadableStream
4. Decodificar chunks (TextDecoder)
5. Parsear linhas SSE (data: ...)
6. Para cada chunk:
   a. Parsear JSON
   b. Transformar para StreamChunk
   c. Invocar callback onChunk
7. Calcular tokens e custo estimados
8. Logar uso e retornar resultado
```

**Cancelamento:**

```typescript
const result = await llm.streamCompletion(request, options, (chunk) => {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
});

// Para cancelar (não disponível diretamente — usar AbortController no request)
```

---

## Health Checks

### Verificação Individual

```typescript
const health = await llm.checkProviderHealth(tenantId, 'OPENAI');
// {
//   provider: 'OPENAI',
//   isHealthy: true,
//   lastCheck: Date,
//   latencyMs: 150,
//   errorRate: 0
// }
```

**Implementação:**
1. Busca credencial ativa do provider
2. Faz request mínimo: `{ messages: [{ role: 'user', content: 'ping' }], maxTokens: 5 }`
3. Timeout de 5 segundos
4. Retorna status baseado em `response.ok`

### Verificação de Todos

```typescript
const health = await llm.checkAllProvidersHealth(tenantId);
// {
//   providers: [
//     { provider: 'OPENAI', isHealthy: true, latencyMs: 120 },
//     { provider: 'GEMINI', isHealthy: true, latencyMs: 200 },
//     { provider: 'OPENROUTER', isHealthy: false, lastError: 'No active credentials' }
//   ],
//   overallHealthy: true,
//   checkedAt: Date
// }
```

**`overallHealthy`** é `true` se pelo menos um provider está saudável.

---

## Custo

### Cálculo

```typescript
costCents = Math.ceil(
  (promptTokens × inputCostPer1kTokens) / 1000 +
  (completionTokens × outputCostPer1kTokens) / 1000
);
```

### Estimativa

```typescript
const estimate = llm.estimateCost('OPENAI', 'gpt-4o-mini', 1000, 500);
// {
//   promptCostCents: 1,      // 1000 × 0.015 / 1000
//   completionCostCents: 3,  // 500 × 0.06 / 1000
//   totalCostCents: 4,       // $0.04
//   provider: 'OPENAI',
//   model: 'gpt-4o-mini'
// }
```

### Comparação de Custo (1000 tokens prompt + 500 completion)

| Provider + Modelo | Custo Total |
|---|---|
| OpenAI gpt-3.5-turbo | $0.0013 |
| OpenAI gpt-4o-mini | $0.0045 |
| Gemini gemini-1.5-flash | $0.0002 |
| Gemini gemini-1.5-pro | $0.0038 |
| OpenRouter llama-3-8b | $0.00003 |

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `OPENAI_API_KEY` | Não* | Chave de API da OpenAI |
| `GEMINI_API_KEY` | Não* | Chave de API do Google Gemini |
| `OPENROUTER_API_KEY` | Não* | Chave de API do OpenRouter |

\* Ao menos uma chave deve estar configurada para o funcionamento. Chaves também podem ser configuradas via API de Credenciais (`/api/credentials`) com criptografia AES-256-GCM.

**Alternativa via API de Credenciais:**

As credenciais podem ser gerenciadas pela interface de configurações em `/settings` → "Integrações", onde são armazenadas com criptografia AES-256-GCM no banco de dados.

---

## Consumidores do Serviço

O Multi-Provider LLM Service é utilizado por:

| Consumidor | Arquivo | Uso |
|---|---|---|
| **AI Service** | `src/lib/ai-service.ts` | Serviço geral de IA (matching, screening) |
| **Matching Service** | `src/lib/matching-service.ts` | Score de compatibilidade candidato-vaga |
| **LLM Service (Agentes)** | `src/lib/agents/base/LLMService.ts` | Serviço de LLM otimizado dos agentes |
| **Job Parser Agent** | `src/lib/agents/specialized/JobParserAgent.ts` | Análise de vagas |
| **Screening Agent** | `src/lib/agents/specialized/ScreeningAgent.ts` | Triagem de candidatos |
| **Sourcing Agent** | `src/lib/agents/specialized/SourcingAgent.ts` | Busca de candidatos |
| **DISC Analyzer** | `src/lib/agents/specialized/DISCAnalyzerAgent.ts` | Análise DISC |
| **Report Agent** | `src/lib/agents/specialized/ReportAgent.ts` | Geração de relatórios |
| **Contact Agent** | `src/lib/agents/specialized/ContactAgent.ts` | Geração de mensagens |
| **Orchestrator Agent** | `src/lib/agents/specialized/OrchestratorAgent.ts` | Orquestração de workflows |

---

## Exemplos de Uso

### Chamada Básica

```typescript
import { MultiProviderLLMService } from '@/lib/llm/llm-service';

const llm = new MultiProviderLLMService();

const result = await llm.chatCompletion({
  messages: [
    { role: 'system', content: 'Você é um recrutador especialista.' },
    { role: 'user', content: 'Analise este currículo para a vaga de Desenvolvedor Senior.' },
  ],
  maxTokens: 2000,
  temperature: 0.3,
  jsonMode: true,
}, {
  tenantId: 'tenant_123',
  agentType: 'SCREENING',
  candidateId: 'cand_456',
});

if (result.success) {
  console.log('Provider:', result.provider);
  console.log('Model:', result.model);
  console.log('Tokens:', result.tokensUsed.totalTokens);
  console.log('Custo:', result.costCents, 'centavos');
  console.log('Latência:', result.latencyMs, 'ms');
  console.log('Data:', result.data);
} else {
  console.error('Erro:', result.error?.message);
  console.error('Código:', result.error?.code);
}
```

### Com Cache

```typescript
import crypto from 'crypto';

const cacheKey = crypto.createHash('sha256')
  .update(JSON.stringify({ prompt: 'Analisar candidato X' }))
  .digest('hex');

const result = await llm.chatCompletion(
  { messages, jsonMode: true },
  {
    tenantId: 'tenant_123',
    cache: {
      enabled: true,
      cacheKey,
      ttlMs: 24 * 60 * 60 * 1000, // 1 dia
    },
  }
);

console.log('Cached:', result.cached); // true se veio do cache
```

### Com Otimização de Custo

```typescript
const result = await llm.chatCompletion(
  { messages, maxTokens: 500 },
  {
    tenantId: 'tenant_123',
    costOptimization: true, // Seleciona provider mais barato
  }
);
```

### Com Provider Preferido

```typescript
const result = await llm.chatCompletion(
  { messages },
  {
    tenantId: 'tenant_123',
    preferredProvider: 'GEMINI',
    preferredModel: 'gemini-1.5-flash',
  }
);
```

### Com Failover Personalizado

```typescript
const result = await llm.chatCompletion(
  { messages },
  {
    tenantId: 'tenant_123',
    failover: {
      maxRetries: 5,
      retryDelayMs: 2000,
      exponentialBackoff: true,
      maxRetryDelayMs: 30000,
    },
  }
);
```

### Streaming

```typescript
let fullContent = '';

const result = await llm.streamCompletion(
  {
    messages: [
      { role: 'user', content: 'Gere um relatório de candidato' },
    ],
    maxTokens: 3000,
  },
  {
    tenantId: 'tenant_123',
    agentType: 'REPORT',
  },
  (chunk) => {
    const content = chunk.choices[0]?.delta?.content || '';
    fullContent += content;
    process.stdout.write(content); // Stream em tempo real
  }
);

console.log('\n\nTotal tokens:', result.tokensUsed.totalTokens);
console.log('Custo:', result.costCents, 'centavos');
```

### Verificar Saúde dos Providers

```typescript
const health = await llm.checkAllProvidersHealth('tenant_123');

health.providers.forEach(p => {
  const status = p.isHealthy ? '✅' : '❌';
  console.log(`${status} ${p.provider}: ${p.latencyMs}ms`);
});

console.log('System healthy:', health.overallHealthy);
```

### Estimar Custo

```typescript
const estimate = llm.estimateCost('OPENAI', 'gpt-4o-mini', 2000, 1000);
console.log(`Custo estimado: $${estimate.totalCostCents / 100}`);
// Custo estimado: $0.09
```
