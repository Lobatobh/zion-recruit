# Módulo de Credenciais de API

> **Componente:** `src/components/credentials/api-credentials-page.tsx`
> **Criptografia:** AES-256-GCM (via `src/lib/encryption.ts`)

---

## Visão Geral

O módulo de credenciais de API permite gerenciar de forma segura as chaves e tokens de serviços externos integrados à plataforma (OpenAI, Gemini, Anthropic, Resend, Evolution, etc.). Todas as credenciais sensíveis são criptografadas com AES-256-GCM antes de serem armazenadas no banco de dados, garantindo que dados como API keys nunca sejam expostos em texto plano.

---

## Componente

### `ApiCredentialsPage`

**Arquivo:** `api-credentials-page.tsx`

Página principal com layout integrado em 3 seções:

1. **Lista de credenciais:** Cards com status, provider, última verificação e ações
2. **Dashboard de uso:** Métricas de consumo (tokens, custos, requisições)
3. **Alertas:** Notificações de limites de uso e credenciais inválidas

```typescript
import { ApiCredentialsPage } from '@/components/credentials/api-credentials-page';
```

#### Recursos visuais

- **Cards de credenciais:** Badge do provider, status de conexão (🟢 online / 🔴 offline / 🟡 expirando)
- **Dashboard de uso:** Gráficos de consumo por provider e período
- **Alertas:** Lista com prioridade (crítica, aviso, informação)
- **Ações rápidas:** Editar, testar conexão, rotacionar key, excluir

---

## Providers Suportados

| Provider | Categoria | Descrição |
|---|---|---|
| **OpenAI** | `ai` | GPT-4o, GPT-3.5, embeddings, DALL-E |
| **Gemini** | `ai` | Google Gemini Pro/Ultra, embeddings |
| **OpenRouter** | `ai` | Gateway para múltiplos modelos de IA |
| **Anthropic** | `ai` | Claude 3.5 Sonnet, Claude 3 Opus |
| **Resend** | `communication` | Serviço de e-mail transacional |
| **Evolution** | `communication` | API WhatsApp (evolution-api) |

---

## Categorias

| Categoria | Descrição | Providers |
|---|---|---|
| `ai` | Modelos de inteligência artificial | OpenAI, Gemini, OpenRouter, Anthropic |
| `database` | Bancos de dados e storage | (extensível) |
| `communication` | E-mail, WhatsApp, SMS | Resend, Evolution |
| `integration` | Ferramentas de integração | (extensível) |
| `cloud` | Serviços de nuvem | (extensível) |

---

## APIs

### `GET /api/credentials`

Lista todas as credenciais do tenant.

> ⚠️ **Segurança:** Esta rota **NÃO retorna API keys** — apenas metadados.

**Parâmetros de query:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `provider` | `string` | Filtrar por provider (ex: `openai`) |
| `category` | `string` | Filtrar por categoria (ex: `ai`) |

**Resposta:**

```json
{
  "credentials": [
    {
      "id": "cred_abc123",
      "provider": "openai",
      "category": "ai",
      "name": "OpenAI Principal",
      "apiKey": "sk-...4242",
      "isActive": true,
      "lastVerifiedAt": "2025-01-15T10:00:00.000Z",
      "lastUsedAt": "2025-01-15T14:30:00.000Z",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

> 📌 Observe que `apiKey` retorna mascarado (`sk-...4242`). O valor completo nunca é retornado em endpoints de listagem.

---

### `POST /api/credentials`

Cria uma nova credencial. Os campos sensíveis são automaticamente criptografados com AES-256-GCM.

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `provider` | `string` | Sim | Identificador do provider (`openai`, `gemini`, etc.) |
| `category` | `string` | Sim | Categoria da credencial (`ai`, `communication`, etc.) |
| `name` | `string` | Sim | Nome descritivo da credencial |
| `apiKey` | `string` | Sim | Chave de API (será criptografada) |
| `isActive` | `boolean` | Não | Status inicial (padrão: `true`) |
| `settings` | `object` | Não | Configurações adicionais do provider |

**Exemplo — OpenAI:**

```json
{
  "provider": "openai",
  "category": "ai",
  "name": "OpenAI Principal",
  "apiKey": "sk-proj-abc123def456ghi789",
  "isActive": true,
  "settings": {
    "model": "gpt-4o",
    "maxTokens": 4096
  }
}
```

**Exemplo — Evolution (WhatsApp):**

```json
{
  "provider": "evolution",
  "category": "communication",
  "name": "WhatsApp Principal",
  "apiKey": "evo_xyz789abc456",
  "settings": {
    "baseUrl": "http://localhost:8080",
    "instanceName": "zion-whatsapp"
  }
}
```

**Resposta:**

```json
{
  "id": "cred_abc123",
  "provider": "openai",
  "category": "ai",
  "name": "OpenAI Principal",
  "apiKey": "sk-...4242",
  "isActive": true,
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

---

### `GET /api/credentials/[id]`

Retorna detalhes de uma credencial específica.

**Resposta:**

```json
{
  "id": "cred_abc123",
  "provider": "openai",
  "category": "ai",
  "name": "OpenAI Principal",
  "apiKey": "sk-...4242",
  "isActive": true,
  "settings": {
    "model": "gpt-4o",
    "maxTokens": 4096
  },
  "lastVerifiedAt": "2025-01-15T10:00:00.000Z",
  "lastUsedAt": "2025-01-15T14:30:00.000Z",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

---

### `PUT /api/credentials/[id]`

Atualiza uma credencial existente.

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | `string` | Não | Novo nome |
| `apiKey` | `string` | Não | Nova API key (será criptografada) |
| `isActive` | `boolean` | Não | Ativar/desativar |
| `settings` | `object` | Não | Novas configurações |

> ⚠️ Se `apiKey` for fornecido, a key anterior é substituída. O módulo de auditoria registra a alteração.

---

### `DELETE /api/credentials/[id]`

Remove uma credencial permanentemente.

> ⚠️ A remoção de uma credencial ativa pode interromper funcionalidades que dependam dela. O sistema emite um alerta antes da exclusão.

**Resposta:**

```json
{
  "success": true,
  "message": "Credencial removida com sucesso"
}
```

---

### `GET /api/credentials/stats`

Retorna estatísticas de uso das credenciais do tenant.

**Resposta:**

```json
{
  "totals": {
    "tokens": 2450000,
    "cost": 185.50,
    "requests": 12500
  },
  "byProvider": {
    "openai": {
      "tokens": 1800000,
      "cost": 145.00,
      "requests": 9000,
      "avgResponseTime": 1200,
      "errorRate": 0.02
    },
    "anthropic": {
      "tokens": 650000,
      "cost": 40.50,
      "requests": 3500,
      "avgResponseTime": 1500,
      "errorRate": 0.01
    }
  },
  "byPeriod": {
    "currentMonth": { "tokens": 320000, "cost": 25.00, "requests": 1800 },
    "previousMonth": { "tokens": 290000, "cost": 22.00, "requests": 1600 }
  },
  "topModels": [
    { "model": "gpt-4o", "provider": "openai", "requests": 5000, "tokens": 1200000 },
    { "model": "claude-3.5-sonnet", "provider": "anthropic", "requests": 3000, "tokens": 500000 }
  ]
}
```

---

### `GET /api/credentials/alerts`

Retorna alertas de threshold e problemas com credenciais.

**Resposta:**

```json
{
  "alerts": [
    {
      "id": "alert_001",
      "type": "threshold",
      "severity": "warning",
      "provider": "openai",
      "message": "Uso de tokens atingiu 80% do limite mensal",
      "details": {
        "current": 2400000,
        "limit": 3000000,
        "percentage": 80
      },
      "createdAt": "2025-01-15T08:00:00.000Z"
    },
    {
      "id": "alert_002",
      "type": "invalid_key",
      "severity": "critical",
      "provider": "resend",
      "message": "API key inválida ou expirada",
      "details": {
        "errorCode": "api_key_invalid",
        "lastAttempt": "2025-01-15T09:30:00.000Z"
      },
      "createdAt": "2025-01-15T09:30:00.000Z"
    }
  ]
}
```

---

### `GET /api/credentials/alerts/[id]`

Retorna detalhes de um alerta específico.

**Resposta:**

```json
{
  "id": "alert_001",
  "type": "threshold",
  "severity": "warning",
  "provider": "openai",
  "credentialId": "cred_abc123",
  "message": "Uso de tokens atingiu 80% do limite mensal",
  "details": {
    "current": 2400000,
    "limit": 3000000,
    "percentage": 80,
    "estimatedExhaustDate": "2025-01-22"
  },
  "isRead": false,
  "createdAt": "2025-01-15T08:00:00.000Z"
}
```

---

## Segurança

### Criptografia AES-256-GCM

Todas as API keys são criptografadas antes de serem armazenadas:

```
API Key original: sk-proj-abc123def456ghi789
    ↓
encrypt(apiKey) via src/lib/encryption.ts
    ↓
Armazenado no banco: iv:authTag:ciphertext (hex-encoded)
    ↓
decrypt(stored) quando necessário para uso interno
```

### Mascaramento

API keys são sempre mascaradas nas respostas da API:

```
sk-proj-abc123def456ghi789  →  sk-...789
```

### Auditoria

Todas as operações em credenciais são registradas no log de auditoria:

- `CREDENTIAL.CREATE` — Nova credencial criada
- `CREDENTIAL.UPDATE` — Credencial atualizada (inclui rotação de key)
- `CREDENTIAL.DELETE` — Credencial removida

### Controle de Acesso

- Apenas usuários com papel de **OWNER** ou **ADMIN** podem gerenciar credenciais
- API keys completas nunca são retornadas via API
- Credenciais são scoped por tenant

---

## Integração com Outros Módulos

| Módulo | Utilização das credenciais |
|---|---|
| **Agentes de IA** | Utiliza credenciais `ai` (OpenAI, Gemini, Anthropic) para processamento |
| **E-mail** | Utiliza credencial `Resend` para envio de e-mails transacionais |
| **Mensagens** | Utiliza credencial `Evolution` para integração com WhatsApp |
| **DISC** | Utiliza credenciais `ai` para análise de perfis comportamentais |
| **Sourcing** | Utiliza credenciais `ai` para busca e análise de talentos |

---

## Fluxo de Uso de Credencial

```
Serviço solicita credencial (ex: agente de IA precisa de OpenAI)
    ↓
Busca credencial ativa do provider (getActiveCredential('openai'))
    ↓
Descriptografa API key (decrypt via AES-256-GCM)
    ↓
Utiliza key na requisição ao serviço externo
    ↓
Registra uso (tokens, custo, latência)
    ↓
Verifica limites e gera alertas se necessário
    ↓
Atualiza lastUsedAt da credencial
```

---

## Exemplos de Uso

### Criar credencial via API

```typescript
const response = await fetch('/api/credentials', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'anthropic',
    category: 'ai',
    name: 'Claude para Análise',
    apiKey: 'sk-ant-abc123def456',
    settings: {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 8192
    }
  })
});

const credential = await response.json();
console.log('ID:', credential.id);
```

### Verificar estatísticas

```typescript
const response = await fetch('/api/credentials/stats');
const stats = await response.json();

console.log(`Total: ${stats.totals.requests} requisições`);
console.log(`Custo: R$ ${stats.totals.cost.toFixed(2)}`);
console.log(`Tokens: ${stats.totals.tokens.toLocaleString()}`);
```

---

## Considerações de Produção

1. **Rotação de keys:** Rotacione periodicamente as API keys dos providers
2. **Múltiplas credenciais:** Configure mais de uma credencial por provider para failover
3. **Monitoramento:** Monitore alertas de threshold para evitar surpresas na fatura
4. **Backup:** Faça backup da `ENCRYPTION_KEY` — sem ela, as credenciais armazenadas são irrecuperáveis
5. **Revogação:** Revogue imediatamente credenciais comprometidas
6. **Custo:** Defina limites de uso e alertas para controlar custos com IA
