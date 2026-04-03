# Módulo de Webhooks

> **Componentes:** `src/components/webhooks/`
> **Bibliotecas:** `src/lib/webhooks/`
> **Assinatura:** HMAC-SHA256

---

## Visão Geral

O módulo de webhooks permite que a plataforma notifique sistemas externos sobre eventos internos em tempo real. Cada webhook é configurado com uma URL de destino, eventos selecionados e um secret para verificação de assinatura. O sistema garante entrega confiável com retentativas automáticas, proteção contra replay attacks e monitoramento detalhado de entregas.

---

## Componentes

### `WebhooksPage`

**Arquivo:** `webhooks-page.tsx`

Página principal do módulo de webhooks com navegação por abas:

- **Aba Webhooks:** Lista todos os webhooks configurados com ações CRUD
- **Aba Histórico:** Histórico completo de entregas de todos os webhooks

```typescript
import { WebhooksPage } from '@/components/webhooks/webhooks-page';
```

### `WebhookForm`

**Arquivo:** `webhook-form.tsx`

Dialog para criação e edição de webhooks:

- URL de destino (validação de formato)
- Seleção de eventos (via `EventSelector`)
- Exibição do secret (mostrar/ocultar)
- Botão para regenerar secret
- Toggle de ativação/desativação

```typescript
import { WebhookForm } from '@/components/webhooks/webhook-form';
```

### `WebhookList`

**Arquivo:** `webhook-list.tsx`

Lista de webhooks com indicadores visuais:

- **Status indicator:** Bolinha verde (ativo) / cinza (inativo)
- **Event badges:** Badges coloridos para cada evento inscrito
- **Dropdown de ações:** Editar, testar, desativar, excluir
- **Última entrega:** Timestamp e status da última tentativa

```typescript
import { WebhookList } from '@/components/webhooks/webhook-list';
```

### `DeliveryHistory`

**Arquivo:** `delivery-history.tsx`

Histórico de entregas com detalhes:

- **Ícones de status:** ✅ sucesso, ❌ falha, 🔄 pendente
- **Tabela paginada** com filtros por webhook, status e período
- **Modal de detalhes:** Headers, body da requisição/resposta, tempo de resposta

```typescript
import { DeliveryHistory } from '@/components/webhooks/delivery-history';
```

### `EventSelector`

**File:** `event-selector.tsx`

Seletor de eventos agrupados por categoria:

- **Agrupamento visual:** Eventos organizados por categoria (Candidato, Vaga, Entrevista, etc.)
- **Selecionar todos:** Checkbox para selecionar todos os eventos de uma categoria
- **Busca:** Campo de busca para filtrar eventos rapidamente
- **Badges:** Contagem de eventos selecionados por categoria

```typescript
import { EventSelector } from '@/components/webhooks/event-selector';
```

---

## Tipos de Eventos

**Arquivo:** `src/lib/webhooks/event-types.ts`

### 14 Eventos em 6 Categorias

#### 🧑‍💼 Candidato (`candidate.*`)

| Evento | Descrição | Payload inclui |
|---|---|---|
| `candidate.created` | Novo candidato criado | Dados completos do candidato |
| `candidate.updated` | Candidato atualizado | Dados antigos e novos |
| `candidate.stage_changed` | Mudança de etapa no pipeline | Etapa anterior, nova etapa, jobId |
| `candidate.deleted` | Candidato removido | ID do candidato, dados finais |

#### 💼 Vaga (`job.*`)

| Evento | Descrição | Payload inclui |
|---|---|---|
| `job.created` | Nova vaga criada | Dados completos da vaga |
| `job.updated` | Vaga atualizada | Dados antigos e novos |
| `job.published` | Vaga publicada (pública) | URL pública da vaga |
| `job.closed` | Vaga fechada | Motivo do fechamento |

#### 📅 Entrevista (`interview.*`)

| Evento | Descrição | Payload inclui |
|---|---|---|
| `interview.scheduled` | Entrevista agendada | Data, horário, participantes, link |
| `interview.cancelled` | Entrevista cancelada | Motivo do cancelamento |

#### 🧠 DISC (`disc.*`)

| Evento | Descrição | Payload inclui |
|---|---|---|
| `disc.test_sent` | Teste DISC enviado ao candidato | Link do teste, prazo |
| `disc.test_completed` | Teste DISC concluído | Perfil DISC, scores |

#### 💬 Mensagem (`message.*`)

| Evento | Descrição | Payload inclui |
|---|---|---|
| `message.sent` | Mensagem enviada | Canal, conteúdo, remetente, destinatário |

#### ✅ Tarefa (`task.*`)

| Evento | Descrição | Payload inclui |
|---|---|---|
| `task.created` | Tarefa criada | Título, responsável, prazo |
| `task.completed` | Tarefa concluída | Data de conclusão |

### `buildWebhookPayload(eventType: string, data: Record<string, any>): WebhookPayload`

Função utilitária para construir o payload padrão de um webhook:

```typescript
const payload = buildWebhookPayload('candidate.created', {
  id: 'clx123',
  name: 'João Silva',
  email: 'joao@email.com'
});

// Resultado:
// {
//   event: 'candidate.created',
//   timestamp: '2025-01-15T10:00:00.000Z',
//   tenantId: 'tenant_abc',
//   data: { id: 'clx123', name: 'João Silva', email: 'joao@email.com' }
// }
```

---

## Assinatura de Webhooks

**Arquivo:** `src/lib/webhooks/webhook-signature.ts`

### HMAC-SHA256

Cada entrega é assinada utilizando HMAC-SHA256 para garantir autenticidade e integridade.

#### Headers de Assinatura

| Header | Descrição | Exemplo |
|---|---|---|
| `X-Webhook-Signature` | Assinatura HMAC-SHA256 | `sha256=a1b2c3d4e5f6...` |
| `X-Webhook-Timestamp` | Timestamp Unix da entrega | `1715000000` |
| `X-Webhook-Id` | ID único da entrega | `del_abc123` |
| `X-Webhook-Event` | Tipo do evento | `candidate.created` |

#### Cálculo da Assinatura

```typescript
import { verifyWebhookSignature } from '@/lib/webhooks/webhook-signature';

const isValid = verifyWebhookSignature({
  payload: rawBody,        // Body bruto (string) da requisição
  signature: req.headers['x-webhook-signature'],
  timestamp: req.headers['x-webhook-timestamp'],
  secret: webhookSecret
});
```

### Proteção contra Replay Attack

- **Janela de tolerância:** 5 minutos
- O timestamp do webhook é comparado com o horário atual do servidor
- Assinaturas com timestamp fora da janela são rejeitadas automaticamente

### Comparação Timing-Safe

A verificação da assinatura utiliza comparação de tempo constante para prevenir ataques de timing:

```typescript
import crypto from 'crypto';

// Timing-safe comparison
const isValid = crypto.timingSafeEqual(
  Buffer.from(expectedSig),
  Buffer.from(receivedSig)
);
```

### Verificação no Consumidor

```typescript
// Exemplo de verificação no endpoint que recebe webhooks
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
```

---

## Dispatcher

**Arquivo:** `src/lib/webhooks/webhook-dispatcher.ts`

Responsável pelo envio assíncrono de webhooks com políticas de retry e auto-desativação.

### Configuração de Retry

| Tentativa | Tempo de espera |
|---|---|
| 1ª (após falha) | 1 minuto |
| 2ª | 5 minutos |
| 3ª | 15 minutos |
| 4ª | 1 hora |
| 5ª | 4 horas |

### Timeout

- **Timeout de conexão + resposta:** 30 segundos
- Após o timeout, a entrega é marcada como falha e entra no ciclo de retry

### Auto-desativação

Webhooks que acumulam **10 falhas consecutivas** são automaticamente desativados para evitar sobrecarga:

```json
{
  "status": "DISABLED",
  "consecutiveFailures": 10,
  "disabledAt": "2025-01-15T10:30:00.000Z",
  "disabledReason": "auto_disabled_after_10_failures"
}
```

> 📌 O webhook pode ser reativado manualmente pela interface ou API.

---

## Serviço de Webhooks

**Arquivo:** `src/lib/webhooks/webhook-service.ts`

### `createWebhook(data)`

Cria um novo webhook. Retorna o **secret uma única vez** — não é armazenado em texto plano.

### `getWebhooks(tenantId: string)`

Lista todos os webhooks do tenant.

### `getWebhookById(id: string)`

Retorna detalhes de um webhook específico.

### `updateWebhook(id: string, data)`

Atualiza URL, eventos e status de um webhook.

### `deleteWebhook(id: string)`

Remove um webhook permanentemente.

### `regenerateSecret(id: string)`

Gera um novo secret para o webhook. **O secret anterior é invalidado imediatamente.**

```typescript
const { secret } = await regenerateSecret('wh_abc123');
// ⚠️ Mostre este secret apenas uma vez ao usuário!
```

### `testWebhook(id: string)`

Envia um evento de teste (`ping`) para a URL configurada:

```json
{
  "event": "ping",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "data": {
    "message": "Teste de webhook do Zion Recruit",
    "webhookId": "wh_abc123"
  }
}
```

### `getDeliveryHistory(filters?)`

Retorna o histórico de entregas com filtros.

### `triggerWebhookEvent(eventType: string, data: Record<string, any>)`

Dispara um evento para todos os webhooks ativos que estão inscritos no tipo de evento.

---

## APIs

### `GET /api/webhooks`

Lista todos os webhooks do tenant autenticado.

**Resposta:**

```json
{
  "webhooks": [
    {
      "id": "wh_abc123",
      "url": "https://external-system.com/webhook",
      "events": ["candidate.created", "candidate.updated"],
      "isActive": true,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "lastDeliveryAt": "2025-01-15T14:30:00.000Z",
      "lastDeliveryStatus": "success"
    }
  ]
}
```

---

### `POST /api/webhooks`

Cria um novo webhook.

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `url` | `string` | Sim | URL de destino (HTTPS obrigatório em produção) |
| `events` | `string[]` | Sim | Lista de eventos para inscrever |
| `isActive` | `boolean` | Não | Status inicial (padrão: `true`) |

**Resposta:**

```json
{
  "id": "wh_abc123",
  "url": "https://external-system.com/webhook",
  "events": ["candidate.created", "candidate.updated"],
  "isActive": true,
  "secret": "whsec_a1b2c3d4e5f6g7h8i9j0",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

> ⚠️ O campo `secret` é retornado **apenas na criação**. Guarde-o com segurança.

---

### `GET /api/webhooks/[id]`

Retorna detalhes de um webhook.

---

### `PUT /api/webhooks/[id]`

Atualiza um webhook existente.

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `url` | `string` | Não | Nova URL de destino |
| `events` | `string[]` | Não | Nova lista de eventos |
| `isActive` | `boolean` | Não | Ativar/desativar |

---

### `DELETE /api/webhooks/[id]`

Remove um webhook permanentemente. Não é possível desfazer esta operação.

---

### `GET /api/webhooks/deliveries`

Retorna o histórico de entregas de todos os webhooks do tenant.

**Parâmetros de query:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `webhookId` | `string` | Filtrar por webhook |
| `status` | `string` | Filtrar por status (`success`, `failed`, `pending`) |
| `limit` | `number` | Itens por página |
| `offset` | `number` | Offset para paginação |

---

### `GET /api/webhooks/[id]/deliveries`

Retorna o histórico de entregas de um webhook específico.

---

## Fluxo Completo de Entrega

```
Evento interno (ex: candidato criado)
    ↓
triggerWebhookEvent('candidate.created', data)
    ↓
Busca webhooks ativos com este evento
    ↓
Para cada webhook:
    ↓
Cria registro de entrega (PENDING)
    ↓
Calcula assinatura HMAC-SHA256
    ↓
Envia HTTP POST com headers de assinatura
    ↓
┌── Sucesso (2xx) ──→ Marca como SUCCESS
│
├── Falha (5xx/timeout) ──→ Marca como FAILED
│   ↓
│   Retry 1 (1 min) → Retry 2 (5 min) → Retry 3 (15 min)
│   → Retry 4 (1h) → Retry 5 (4h)
│   ↓
│   10 falhas consecutivas → AUTO-DESATIVAR webhook
│
└── Erro de validação (4xx) → Marca como FAILED (sem retry)
```

---

## Exemplos de Uso

### Criar webhook via API

```typescript
const response = await fetch('/api/webhooks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://my-crm.com/hooks/zion',
    events: [
      'candidate.created',
      'candidate.stage_changed',
      'job.closed'
    ]
  })
});

const { id, secret } = await response.json();
console.log('Guarde o secret:', secret);
```

### Verificar assinatura no consumidor (Node.js)

```typescript
import crypto from 'crypto';

function handler(req, res) {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  
  // Verificar timestamp (5 min)
  const age = Date.now() / 1000 - parseInt(timestamp);
  if (age > 300) {
    return res.status(400).json({ error: 'Timestamp expirado' });
  }
  
  // Verificar assinatura
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('hex');
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
  
  if (!isValid) {
    return res.status(401).json({ error: 'Assinatura inválida' });
  }
  
  // Processar evento
  const event = req.body;
  console.log(`Evento: ${event.event}`, event.data);
  
  return res.status(200).json({ received: true });
}
```

---

## Considerações de Produção

1. **HTTPS obrigatório:** Sempre utilize URLs HTTPS para webhooks em produção
2. **Secret seguro:** Nunca exponha o secret no frontend ou logs
3. **Idempotência:** Processe eventos de forma idempotente no consumidor (eventos podem ser reenviados)
4. **Monitoramento:** Monitore entregas com falha para identificar problemas de integração
5. **Timeout:** Garanta que o endpoint de destino responda em menos de 30 segundos
6. **Retry:** O sistema retentará automaticamente — não implemente retry no consumidor
