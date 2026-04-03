# Módulo de Cobrança (Stripe Billing)

> **Componentes:** `src/components/billing/`
> **Bibliotecas:** `src/lib/stripe/`
> **Gateway de pagamento:** Stripe

---

## Visão Geral

O módulo de cobrança integra a plataforma com o Stripe para gerenciamento de assinaturas, pagamentos e faturamento. Oferece quatro planos (Free, Starter, Professional e Enterprise), com suporte a checkout sessions, customer portal para gerenciamento de assinatura, webhook handling automático e controle de limites por plano.

---

## Componentes

### `BillingPage`

**Arquivo:** `billing-page.tsx`

Página principal de cobrança com 3 abas:

- **Planos:** Exibe os cards de preços com comparação
- **Assinatura:** Status atual da assinatura, uso vs limites
- **Histórico:** Lista de faturas com opção de download em PDF

```typescript
import { BillingPage } from '@/components/billing/billing-page';
```

### `PricingCards`

**Arquivo:** `pricing-cards.tsx`

Grid de 4 cards de planos com:

- **Nome e preço** do plano
- **Lista de funcionalidades** incluídas (✅ / ❌)
- **Destaque do plano atual** com badge "Plano Atual"
- **Botão de ação:** "Assinar" / "Fazer Upgrade" / "Contate-nos"
- **Comparação visual** com largura proporcional ao nível

```typescript
import { PricingCards } from '@/components/billing/pricing-cards';
```

### `SubscriptionStatus`

**Arquivo:** `subscription-status.tsx`

Card com status detalhado da assinatura:

- **Badge de status:** Ativa, Cancelada, Trial, Past Due
- **Período de cobrança:** Data início → próxima cobrança
- **Uso vs Limites:** Barras de progresso para cada métrica (candidatos, vagas, membros, etc.)
- **Informações de pagamento:** Últimos 4 dígitos do cartão, bandeira
- **Ações:** Gerenciar assinatura (Stripe Portal), Cancelar

```typescript
import { SubscriptionStatus } from '@/components/billing/subscription-status';
```

### `BillingHistory`

**Arquivo:** `billing-history.tsx`

Tabela de histórico de faturas:

- **Data da fatura** e número
- **Valor** formatado em BRL (R$)
- **Status:** Paga, Pendente, Falhou
- **Download em PDF** (link para o Stripe)
- **Paginação** para histórico extenso

```typescript
import { BillingHistory } from '@/components/billing/billing-history';
```

---

## Planos

**Arquivo:** `src/lib/stripe/products.ts`

### Tabela Comparativa de Planos

| Funcionalidade | Free | Starter | Professional | Enterprise |
|---|---|---|---|---|
| **Preço** | R$ 0/mês | R$ 49/mês | R$ 149/mês | Sob consulta |
| **Membros da equipe** | 3 | 10 | 25 | Ilimitado |
| **Vagas ativas** | 5 | 25 | 100 | Ilimitado |
| **Candidatos** | 100 | 2.000 | 10.000 | Ilimitado |
| **Análises DISC** | 5/mês | 50/mês | 500/mês | Ilimitado |
| **Agentes de IA** | ❌ | 2 | 5 | Ilimitado |
| **Triagem em lote** | ❌ | ✅ | ✅ | ✅ |
| **API Keys** | ❌ | 3 | 10 | Ilimitado |
| **Webhooks** | ❌ | 5 | 25 | Ilimitado |
| **Exportação de dados** | ❌ | ✅ | ✅ | ✅ |
| **Portal do candidato** | ✅ | ✅ | ✅ | ✅ |
| **Busca de talentos (sourcing)** | ❌ | ❌ | ✅ | ✅ |
| **Support** | Comunidade | E-mail | Prioritário | Dedicado |
| **SLA** | — | 99,5% | 99,9% | 99,99% |

### Identificadores

```typescript
const PLANS = {
  FREE: { id: 'free', name: 'Free', price: 0, currency: 'BRL' },
  STARTER: { id: 'starter', name: 'Starter', price: 49, currency: 'BRL' },
  PROFESSIONAL: { id: 'professional', name: 'Professional', price: 149, currency: 'BRL' },
  ENTERPRISE: { id: 'enterprise', name: 'Enterprise', price: 0, currency: 'BRL' }
};
```

---

## Bibliotecas do Stripe

### `client.ts`

Configuração base do Stripe:

```typescript
import Stripe from 'stripe';

// Instância do Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

// Verificar se Stripe está configurado
isStripeConfigured(): boolean

// Obter secret do webhook
getWebhookSecret(): string

// Obter Price ID do plano
getPriceId(planId: string): string | null
```

### `products.ts`

Gerenciamento de planos e preços:

```typescript
// Buscar plano por ID
getPlanById(planId: string): Plan | undefined

// Listar todos os planos
getAllPlans(): Plan[]

// Obter limites de um plano
getPlanLimits(planId: string): PlanLimits

// Formatar preço em BRL
formatPrice(price: number, currency?: string): string
// formatPrice(49) → "R$ 49,00/mês"
```

### `customer.ts`

Gerenciamento de clientes Stripe:

```typescript
// Criar cliente Stripe
createStripeCustomer(data: CreateCustomerData): Promise<Stripe.Customer>

// Obter ou criar cliente (para tenant)
getOrCreateStripeCustomer(tenantId: string): Promise<Stripe.Customer>

// Atualizar dados do cliente
updateStripeCustomer(stripeCustomerId: string, data): Promise<Stripe.Customer>

// Buscar cliente
getStripeCustomer(stripeCustomerId: string): Promise<Stripe.Customer | null>
```

### `subscriptions.ts`

Gerenciamento de assinaturas:

```typescript
// Criar sessão de checkout
createCheckoutSession(params: {
  tenantId: string;
  planId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }>

// Criar assinatura diretamente
createSubscription(tenantId: string, planId: string): Promise<Subscription>

// Atualizar plano da assinatura
updateSubscription(subscriptionId: string, newPlanId: string): Promise<Subscription>

// Cancelar assinatura (accessa até o final do período)
cancelSubscription(subscriptionId: string): Promise<Subscription>

// Reativar assinatura cancelada
reactivateSubscription(subscriptionId: string): Promise<Subscription>

// Criar sessão do portal de gerenciamento
createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }>

// Sincronizar status do Stripe com banco local
syncSubscriptionFromStripe(subscriptionId: string): Promise<Subscription>
```

### `webhooks.ts`

Processamento de eventos do Stripe:

```typescript
// Handler principal de webhooks
async function handleStripeWebhook(rawBody: string, signature: string): Promise<void>
```

#### Eventos Suportados (9)

| Evento Stripe | Ação Realizada |
|---|---|
| `checkout.session.completed` | Ativa assinatura após checkout concluído |
| `customer.subscription.created` | Registra nova assinatura no banco |
| `customer.subscription.updated` | Sincroniza mudanças de plano/status |
| `customer.subscription.deleted` | Marca assinatura como cancelada |
| `customer.subscription.paused` | Suspende funcionalidades |
| `customer.subscription.resumed` | Reativa funcionalidades |
| `invoice.paid` | Registra pagamento, atualiza período |
| `invoice.payment_failed` | Notifica falha de pagamento, marca past_due |
| `invoice.payment_action_required` | Notifica necessidade de ação do cliente |

---

## APIs

### `GET /api/billing`

Lista os planos disponíveis com funcionalidades e preços.

**Resposta:**

```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "currency": "BRL",
      "features": [
        { "name": "Membros da equipe", "value": "3", "included": true },
        { "name": "Vagas ativas", "value": "5", "included": true },
        { "name": "Agentes de IA", "value": null, "included": false }
      ],
      "limits": {
        "maxTeamMembers": 3,
        "maxActiveJobs": 5,
        "maxCandidates": 100,
        "maxDiscAssessmentsPerMonth": 5,
        "maxAiAgents": 0,
        "maxApiKeys": 0,
        "maxWebhooks": 0
      }
    }
  ],
  "currentPlan": "free"
}
```

---

### `POST /api/billing`

Cria uma sessão de checkout para assinatura de um plano.

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `planId` | `string` | Sim | ID do plano (`starter`, `professional`) |

**Resposta:**

```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_live_abc123...",
  "sessionId": "cs_live_abc123"
}
```

> 📌 O usuário é redirecionado para a página de checkout do Stripe. Após o pagamento (ou trial), é redirecionado de volta com a assinatura ativa.

#### Trial de 14 dias

Planos pagos incluem **14 dias de trial gratuito**. Durante o trial:

- O usuário tem acesso total ao plano escolhido
- Nenhuma cobrança é realizada até o final do trial
- O Stripe notifica automaticamente antes do fim do trial

---

### `GET /api/billing/subscription`

Retorna os detalhes da assinatura atual do tenant.

**Resposta:**

```json
{
  "subscription": {
    "id": "sub_abc123",
    "status": "active",
    "planId": "professional",
    "planName": "Professional",
    "currentPeriodStart": "2025-01-01T00:00:00.000Z",
    "currentPeriodEnd": "2025-02-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "trialEnd": null
  },
  "usage": {
    "teamMembers": { "current": 8, "limit": 25 },
    "activeJobs": { "current": 15, "limit": 100 },
    "candidates": { "current": 2300, "limit": 10000 },
    "discAssessments": { "current": 45, "limit": 500, "resetsAt": "2025-02-01" },
    "aiAgents": { "current": 3, "limit": 5 },
    "apiKeys": { "current": 4, "limit": 10 },
    "webhooks": { "current": 8, "limit": 25 }
  },
  "paymentMethod": {
    "brand": "visa",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2026
  }
}
```

---

### `POST /api/billing/portal`

Cria uma sessão do Stripe Customer Portal para gerenciamento da assinatura.

**Resposta:**

```json
{
  "url": "https://billing.stripe.com/p/session_abc123"
}
```

> 📌 O Stripe Customer Portal permite ao cliente atualizar dados de pagamento, trocar de plano, cancelar e baixar faturas.

---

### `POST /api/billing/webhook`

Endpoint que recebe webhooks do Stripe (configurado no Stripe Dashboard).

**Headers obrigatórios:**
- `Stripe-Signature` — Assinatura HMAC do Stripe

**Processamento:**
1. Verifica a assinatura do webhook
2. Identifica o tipo do evento
3. Executa a ação correspondente
4. Retorna `200 OK` para confirmar recebimento

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `STRIPE_SECRET_KEY` | Sim | Chave secreta da API do Stripe (sk_live_... ou sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | Sim | Secret do webhook endpoint do Stripe (whsec_...) |
| `STRIPE_STARTER_PRICE_ID` | Sim | Price ID do plano Starter no Stripe |
| `STRIPE_PROFESSIONAL_PRICE_ID` | Sim | Price ID do plano Professional no Stripe |

---

## Fluxo de Assinatura

```
Usuário clica "Assinar" no plano Starter
    ↓
POST /api/billing → Cria Checkout Session (14 dias trial)
    ↓
Redireciona para checkout.stripe.com
    ↓
Usuário preenche dados de pagamento
    ↓
Stripe processa pagamento (ou inicia trial)
    ↓
Stripe envia webhook: checkout.session.completed
    ↓
POST /api/billing/webhook → Ativa assinatura no banco
    ↓
Stripe envia webhook: customer.subscription.created
    ↓
Atualiza plano do tenant → Libera funcionalidades
```

## Fluxo de Cancelamento

```
Usuário cancela via Portal ou API
    ↓
Assinatura marcada como cancel_at_period_end = true
    ↓
Usuário mantém acesso até o final do período
    ↓
Stripe envia webhook: customer.subscription.deleted
    ↓
Downgrade automático para plano Free
    ↓
Funcionalidades limitadas aplicadas
```

---

## Controle de Limites

**Função:** `getPlanLimits(planId: string): PlanLimits`

```typescript
const limits = getPlanLimits('professional');
// {
//   maxTeamMembers: 25,
//   maxActiveJobs: 100,
//   maxCandidates: 10000,
//   maxDiscAssessmentsPerMonth: 500,
//   maxAiAgents: 5,
//   maxApiKeys: 10,
//   maxWebhooks: 25,
//   allowBatchScreening: true,
//   allowDataExport: true,
//   allowSourcing: true,
//   allowCustomBranding: false
// }
```

### Verificação em tempo real

Antes de operações sensíveis, o sistema verifica os limites:

```typescript
import { getPlanLimits } from '@/lib/stripe/products';
import { getCurrentUsage } from '@/lib/stripe/subscriptions';

const limits = getPlanLimits(currentPlan);
const usage = await getCurrentUsage(tenantId);

if (usage.activeJobs >= limits.maxActiveJobs) {
  throw new Error('Limite de vagas atingido. Faça upgrade do plano.');
}
```

---

## Considerações de Produção

1. **Webhooks:** Configure o endpoint no Stripe Dashboard e utilize o `STRIPE_WEBHOOK_SECRET`
2. **Modo teste:** Utilize `sk_test_` e `pk_test_` durante desenvolvimento
3. **Retry de webhook:** Implemente idempotência — o Stripe pode reenviar eventos
4. **Portal:** Forneça o Customer Portal para autoatendimento do cliente
5. **Notificações:** Configure e-mails do Stripe para lembretes de pagamento
6. **Migração:** Ao fazer downgrade, garanta que dados não sejam perdidos (somente acesso restrito)
