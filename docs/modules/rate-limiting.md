# Módulo de Rate Limiting

> **Arquivo principal:** `src/lib/rate-limit.ts`
> **Middleware:** `src/middleware.ts`
> **Algoritmo:** Janela deslizante (Sliding Window) com Map em memória

---

## Visão Geral

O módulo de rate limiting protege a plataforma contra abuso, DDoS e uso excessivo de recursos. Utiliza o algoritmo de **janela deslizante** implementado com `Map` em memória para controle preciso do número de requisições por cliente. O middleware aplica automaticamente limites a todas as rotas `/api/*`, detectando o tipo de endpoint e aplicando a configuração adequada.

---

## Funções Exportadas

### `applyRateLimitEdge(request: NextRequest, identifier?: string): RateLimitResult`

Aplica rate limiting no contexto do Edge Middleware (Next.js).

- **Parâmetros:**
  - `request` — Objeto `NextRequest`
  - `identifier` (opcional) — Identificador personalizado (padrão: IP do cliente)
- **Retorno:** `RateLimitResult` com status da verificação

### `applyRateLimit(key: string, config?: Partial<RateLimitConfig>): RateLimitResult`

Aplica rate limiting no contexto do servidor Node.js.

- **Parâmetros:**
  - `key` — Identificador único (IP, userId, etc.)
  - `config` — Configuração customizada (sobrescreve padrões)
- **Retorno:** `RateLimitResult`

```typescript
const result = applyRateLimit(`user:${userId}`, {
  maxRequests: 50,
  windowMs: 60_000
});

if (!result.allowed) {
  return NextResponse.json(
    { error: 'Limite de requisições excedido' },
    { status: 429, headers: createRateLimitHeaders(result) }
  );
}
```

### `withRateLimit(handler: Function, config?: Partial<RateLimitConfig>): Function`

High-order function (HOF) que envolve um handler com rate limiting automático.

- **Parâmetros:**
  - `handler` — Função handler da rota
  - `config` — Configuração customizada
- **Retorno:** Handler com rate limiting aplicado

```typescript
export const POST = withRateLimit(async (req: NextRequest) => {
  // Lógica da rota
}, { endpointType: 'API' });
```

### `generateRateLimitKey(request: NextRequest, endpointType?: EndpointType): string`

Gera a chave de rate limiting baseada na requisição.

- **Parâmetros:**
  - `request` — Objeto `NextRequest`
  - `endpointType` — Tipo do endpoint
- **Retorno:** Chave única para identificação

### `getClientIP(request: NextRequest): string`

Extrai o endereço IP real do cliente, considerando headers de proxy.

- **Headers verificados (em ordem):** `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`
- **Fallback:** `request.ip` ou `'unknown'`

### `isInternalServiceRequest(request: NextRequest): boolean`

Verifica se a requisição é de um serviço interno (bypass de rate limit).

- **Critério:** Presença do header `x-internal-service-token` com valor válido

### `checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult`

Verifica o rate limit sem modificá-lo (somente leitura).

### `createRateLimitHeaders(result: RateLimitResult): Headers`

Gera os headers HTTP padrão de rate limiting.

### `createRateLimitExceededResponse(result: RateLimitResult): NextResponse`

Cria uma resposta HTTP 429 (Too Many Requests) com headers adequados.

### `getEndpointTypeFromPath(pathname: string): EndpointType`

Detecta automaticamente o tipo de endpoint baseado no caminho da URL.

| Padrão de caminho | Tipo detectado |
|---|---|
| `/api/auth/*` | `AUTH` |
| `/api/ai/*`, `/api/agents/*` | `AI` |
| `/api/webhooks/*` | `WEBHOOK` |
| `/api/public/*`, `/api/careers/*` | `PUBLIC` |
| Demais `/api/*` | `API` |

### `resetRateLimit(key: string): boolean`

Remove o registro de rate limiting de uma chave específica.

- **Retorno:** `true` se a chave existia e foi removida

### `getRateLimitStats(): RateLimitStats`

Retorna estatísticas globais do rate limiter.

```typescript
const stats = getRateLimitStats();
// {
//   totalKeys: 150,
//   totalRequests: 5000,
//   totalBlocked: 25,
//   keysByType: { AUTH: 30, API: 80, AI: 15, ... }
// }
```

### `clearAllRateLimits(): void`

Remove todos os registros de rate limiting (útil para testes).

---

## Tipos

### `EndpointType`

```typescript
type EndpointType = 'AUTH' | 'API' | 'AI' | 'WEBHOOK' | 'PUBLIC';
```

### `RateLimitConfig`

```typescript
interface RateLimitConfig {
  maxRequests: number;   // Número máximo de requisições
  windowMs: number;      // Janela de tempo em milissegundos
  endpointType: EndpointType;
  blockDurationMs?: number; // Duração do bloqueio (padrão: igual à janela)
}
```

### `RateLimitEntry`

```typescript
interface RateLimitEntry {
  timestamps: number[];  // Timestamps das requisições na janela
  blockedUntil?: number; // Timestamp até quando está bloqueado
}
```

### `RateLimitResult`

```typescript
interface RateLimitResult {
  allowed: boolean;        // Se a requisição é permitida
  remaining: number;       // Requisições restantes na janela
  reset: number;           // Timestamp do reset da janela (ms)
  limit: number;           // Limite total para a janela
  retryAfter?: number;     // Segundos para tentar novamente (se bloqueado)
}
```

---

## Configurações por Tipo de Endpoint

| Tipo | Limite | Janela | Descrição |
|---|---|---|---|
| **AUTH** | 5 requisições | 1 minuto | Login, registro, reset de senha |
| **API** | 100 requisições | 1 minuto | Endpoints gerais da API |
| **AI** | 20 requisições | 1 minuto | Chamadas de IA (custo computacional) |
| **WEBHOOK** | 1.000 requisições | 1 minuto | Recebimento de webhooks externos |
| **PUBLIC** | 60 requisições | 1 minuto | Endpoints públicos (careers, portal) |

---

## Headers HTTP

O módulo adiciona automaticamente os seguintes headers às respostas:

| Header | Descrição | Exemplo |
|---|---|---|
| `X-RateLimit-Limit` | Limite total de requisições na janela | `100` |
| `X-RateLimit-Remaining` | Requisições restantes | `75` |
| `X-RateLimit-Reset` | Timestamp Unix do reset da janela | `1715000000` |
| `Retry-After` | Segundos até o desbloqueio (somente em 429) | `45` |

### Exemplo de resposta com rate limit

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 94
X-RateLimit-Reset: 1715000060
Content-Type: application/json
```

### Exemplo de resposta 429 (Too Many Requests)

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1715000060
Retry-After: 45
Content-Type: application/json

{
  "error": "Limite de requisições excedido",
  "retryAfter": 45
}
```

---

## Middleware Automático

O middleware em `src/middleware.ts` aplica rate limiting automaticamente a **todas as rotas `/api/*`**:

```typescript
// src/middleware.ts
const result = await applyRateLimitEdge(request);

if (!result.allowed) {
  return createRateLimitExceededResponse(result);
}
```

### Fluxo do middleware

```
Requisição → /api/*
    ↓
Verifica se é serviço interno (x-internal-service-token)
    ↓ (não)
Detecta tipo de endpoint (getEndpointTypeFromPath)
    ↓
Aplica rate limiting (applyRateLimitEdge)
    ↓
Permitido? → Sim → Continua para handler
    ↓
           → Não → Retorna 429 com headers
```

---

## Bypass para Serviços Internos

Serviços internos (microservices) podem contornar o rate limit utilizando o header `x-internal-service-token`:

```typescript
// Requisição de serviço interno
fetch('/api/jobs', {
  headers: {
    'x-internal-service-token': process.env.INTERNAL_SERVICE_TOKEN
  }
});
```

> ⚠️ **Segurança:** O token interno deve ser mantido em segredo e nunca exposto ao cliente.

---

## API de Administração

### `GET /api/admin/rate-limit`

Endpoint administrativo para monitoramento e gerenciamento de rate limits.

#### Parâmetros de Query

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `action` | `string` | Ação: `stats` (padrão) ou `reset` |
| `key` | `string` | Chave para reset (obrigatório se `action=reset`) |

#### Resposta — Estatísticas

```json
{
  "stats": {
    "totalKeys": 150,
    "totalRequests": 5000,
    "totalBlocked": 25,
    "blockedKeys": ["ip:192.168.1.100:API", "ip:10.0.0.5:AUTH"]
  },
  "config": {
    "AUTH": { "maxRequests": 5, "windowMs": 60000 },
    "API": { "maxRequests": 100, "windowMs": 60000 },
    "AI": { "maxRequests": 20, "windowMs": 60000 },
    "WEBHOOK": { "maxRequests": 1000, "windowMs": 60000 },
    "PUBLIC": { "maxRequests": 60, "windowMs": 60000 }
  }
}
```

---

## Limpeza Automática

O módulo executa limpeza automática dos registros expirados a cada **5 minutos**:

- Remove entradas cuja janela de tempo já expirou
- Remove bloqueios expirados
- Previne vazamento de memória (memory leak)

```typescript
// Executado internamente a cada 5 minutos
setInterval(() => {
  cleanupExpiredEntries();
}, 5 * 60 * 1000);
```

---

## Algoritmo — Janela Deslizante

O rate limiting utiliza o algoritmo de **janela deslizante (sliding window)** implementado com `Map` em memória:

### Funcionamento

1. **Identificação:** Cada cliente é identificado por uma chave única (`ip:endpointType` ou `userId:endpointType`)
2. **Armazenamento:** Cada entrada armazena os timestamps de todas as requisições dentro da janela
3. **Verificação:** A cada nova requisição, entradas antigas são removidas e o total é comparado com o limite
4. **Bloqueio:** Se excedido, o cliente é bloqueado até o final da janela

### Vantagens do Sliding Window

| Característica | Benefício |
|---|---|
| **Precisão** | Não permite bursts no limite da janela (diferente do fixed window) |
| **Simplicidade** | Implementação leve sem dependências externas |
| **Performance** | Operação O(n) no pior caso, O(1) no caso médio |
| **Baixa latência** | Processamento em memória, sem I/O |

---

## Exemplos de Uso

### Rate limiting manual em uma rota

```typescript
import { applyRateLimit, createRateLimitHeaders, createRateLimitExceededResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const result = applyRateLimit(`${ip}:custom-endpoint`, {
    maxRequests: 10,
    windowMs: 60_000,
    endpointType: 'API'
  });

  if (!result.allowed) {
    return createRateLimitExceededResponse(result);
  }

  // Processar requisição...
  return NextResponse.json(
    { data: 'ok' },
    { headers: createRateLimitHeaders(result) }
  );
}
```

### Rate limiting com HOF

```typescript
import { withRateLimit } from '@/lib/rate-limit';

export const GET = withRateLimit(async (req: NextRequest) => {
  return NextResponse.json({ data: 'ok' });
}, { endpointType: 'API' });
```

### Reset manual de rate limit

```typescript
import { resetRateLimit } from '@/lib/rate-limit';

// Reset para IP específico
resetRateLimit('192.168.1.100:API');

// Reset para usuário específico
resetRateLimit('user:abc123:AI');
```

---

## Considerações de Produção

1. **Distribuído:** Em ambientes com múltiplas instâncias, considere utilizar Redis para sincronização dos contadores
2. **Monitoring:** Monitore `totalBlocked` para detectar ataques em andamento
3. **Ajuste fino:** Ajuste os limites conforme o perfil de uso dos clientes
4. **Bypass interno:** Mantenha o `x-internal-service-token` seguro e rotativo
5. **Webhooks:** O limite de 1000/min para webhooks garante integrações estáveis com serviços externos
