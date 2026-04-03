# Módulo: Notificações

> **Versão:** 1.0 | **Status:** Produção | **Última atualização:** 2025

## Visão Geral

O módulo de Notificações da plataforma Zion Recruit gerencia a comunicação assíncrona com usuários, fornecendo um sistema completo de criação, distribuição e gerenciamento de notificações in-app. O sistema suporta 22 categorias de eventos predefinidas, polling em tempo real, e integração com todos os demais módulos da plataforma.

A arquitetura é composta por um componente de interface (NotificationCenter), hooks reativos, serviço de backend com presets configuráveis e APIs REST para CRUD completo.

---

## Sumário

1. [Componentes](#componentes)
2. [Hooks](#hooks)
3. [Bibliotecas (Libs)](#bibliotecas-libs)
4. [APIs REST](#apis-rest)
5. [Tipos](#tipos)
6. [Presets de Notificação](#presets-de-notificação)
7. [Fluxo de Dados](#fluxo-de-dados)
8. [Considerações Técnicas](#considerações-técnicas)

---

## Componentes

### `notification-center.tsx`

**Exportação:** `NotificationCenter`

Componente de interface que fornece o ponto de acesso central às notificações.

**Implementação Atual:**
- Ícone de sino (bell icon) na barra de navegação
- **Status: Placeholder** — O dropdown de notificações e badge de contagem estão implementados como TODO

**Funcionalidades Planejadas:**
| Recurso | Status | Descrição |
|---|---|---|
| Ícone de sino | ✅ Implementado | Renderizado na navbar |
| Badge de contagem | 🔲 TODO | Contagem de não lidas |
| Dropdown de notificações | 🔲 TODO | Lista com scroll e ações |
| Marcar como lida | 🔲 TODO | Ação individual e em massa |
| Filtros por categoria | 🔲 TODO | Tabs ou dropdown de filtro |
| Link para recurso | 🔲 TODO | Navegação ao clicar na notificação |

**Estrutura futura do componente:**
```tsx
// Estrutura planejada
<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon">
      <Bell />
      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <NotificationList notifications={notifications} />
  </PopoverContent>
</Popover>
```

---

## Hooks

### `useNotifications` — `src/hooks/use-notifications.ts`

Hook para gerenciamento completo de notificações com estado local e feedback via toast.

**Estado Gerenciado:**

| Propriedade | Tipo | Descrição |
|---|---|---|
| `notifications` | `Notification[]` | Lista de notificações carregadas |
| `isLoading` | `boolean` | Estado de carregamento |
| `stats` | `NotificationStats` | Estatísticas (total, não lidas, etc.) |

**Métodos Disponíveis:**

```typescript
// CRUD
fetchNotifications(params?: {
  isRead?: boolean;
  category?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}) → Promise<void>

createNotification(data: CreateNotificationInput) → Promise<Notification>
updateNotification(id: string, data: UpdateNotificationInput) → Promise<Notification>
deleteNotification(id: string) → Promise<void>
markAsRead(id: string) → Promise<void>
markAllAsRead() → Promise<void>

// Utilitários
refetch() → Promise<void>
```

**Feedback via Toast:**
- ✅ Criação: "Notificação criada com sucesso"
- ✅ Atualização: "Notificação atualizada"
- ✅ Exclusão: "Notificação removida"
- ❌ Erro: "Erro ao processar notificação"

---

### `useNotificationPolling` — `src/hooks/use-notifications.ts`

Hook para polling periódico de estatísticas de notificações, garantindo dados atualizados.

**Configuração:**

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `interval` | `number` | `30000` (30s) | Intervalo de polling em milissegundos |
| `enabled` | `boolean` | `true` | Ativar/desativar o polling |
| `tenantId` | `string` | — | ID do tenant (obtido do contexto de autenticação) |

**Comportamento:**
- Polling automático via `setInterval` ao montar o componente
- Limpeza automática do intervalo ao desmontar
- Atualiza o store global de notificações a cada ciclo
- Pausa automaticamente quando a aba está em segundo plano (Page Visibility API)
- Retoma ao voltar para a aba ativa

**Fluxo:**
```
┌──────────┐    every 30s     ┌─────────────────┐    update     ┌──────────┐
│  Hook    │ ──────────────→  │ GET /api/       │ ───────────→ │  Store   │
│ montado  │                  │ notifications/  │              │ global   │
│          │ ←────────────── │ stats           │ ←─────────── │          │
│          │    stats data    └─────────────────┘   response   │          │
└──────────┘                                                  └──────────┘
```

---

## Bibliotecas (Libs)

### `src/lib/notification-service.ts`

Serviço de backend para criação e gerenciamento programático de notificações.

**Funções Exportadas:**

#### `createNotification(data)`

Cria uma notificação individual.

**Parâmetros:**
```typescript
{
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  metadata?: Record<string, any>;
  link?: string;
  expiresAt?: Date;
}
```

**Retorno:** `Notification`

---

#### `createNotificationFromPreset(preset, data)`

Cria uma notificação a partir de um preset predefinido, preenchendo automaticamente título, mensagem e metadados.

**Parâmetros:**
```typescript
{
  preset: string;           // Identificador do preset (ex: 'candidate_applied')
  tenantId: string;
  userId: string;
  data: Record<string, any>; // Variáveis para substituição no template
  priority?: NotificationPriority; // Override de prioridade
}
```

**Exemplo:**
```typescript
await createNotificationFromPreset('candidate_applied', {
  tenantId: 'tenant-123',
  userId: 'recruiter-456',
  data: {
    candidateName: 'João Silva',
    jobTitle: 'Desenvolvedor Frontend',
    jobDepartment: 'Tecnologia'
  }
});
// Resultado: Título "Nova candidatura recebida", mensagem preenchida automaticamente
```

---

#### `notifyAllMembers(preset, tenantId, data, options?)`

Envia notificação para todos os membros de um tenant.

**Parâmetros adicionais:**
```typescript
{
  excludeUserId?: string;  // Excluir usuário específico
  roles?: string[];        // Filtrar por roles
}
```

---

#### `notifyUser(userId, preset, data, priority?)`

Atalho para enviar notificação a um usuário específico.

**Retorno:** `Notification | null` (null se falhar)

---

#### `cleanupExpiredNotifications()`

Remove notificações expiradas do banco de dados.

**Execução:** Deve ser chamada periodicamente por um job agendado ou cron.

---

### `src/lib/notify.ts`

Biblioteca de conveniência com helpers para eventos específicos e notificações rápidas via toast.

#### `notifyEvent(eventName, data)` — 22 Helpers de Evento

Função unificada que roteia para o preset correto baseado no nome do evento.

**Eventos Suportados (22):**

| Evento | Categoria | Preset | Gatilho |
|---|---|---|---|
| `candidate_created` | CANDIDATE | Novo candidato cadastrado | Cadastro de candidato |
| `candidate_applied` | CANDIDATE | Nova candidatura | Candidato se aplica a vaga |
| `candidate_updated` | CANDIDATE | Candidato atualizado | Alteração em dados do candidato |
| `candidate_stage_changed` | CANDIDATE | Estágio alterado | Movimentação no pipeline |
| `candidate_disqualified` | CANDIDATE | Candidato desqualificado | Rejeição no pipeline |
| `job_created` | JOB | Nova vaga criada | Criação de vaga |
| `job_updated` | JOB | Vaga atualizada | Alteração em dados da vaga |
| `job_published` | JOB | Vaga publicada | Publicação no job board |
| `job_closed` | JOB | Vaga encerrada | Fechamento da vaga |
| `ai_screening_started` | AI | Triagem IA iniciada | Início da triagem |
| `ai_screening_completed` | AI | Triagem IA concluída | Conclusão da triagem |
| `ai_intervention_required` | AI | Intervenção necessária | Detecção de necessidade humana |
| `ai_fit_score_ready` | AI | Score de fit disponível | Cálculo do fit score |
| `message_received` | MESSAGE | Mensagem recebida | Nova mensagem no chat |
| `message_intervention` | MESSAGE | Intervenção solicitada | Solicitação via chat |
| `interview_scheduled` | INTERVIEW | Entrevista agendada | Agendamento |
| `interview_confirmed` | INTERVIEW | Entrevista confirmada | Confirmação pelo candidato |
| `interview_cancelled` | INTERVIEW | Entrevista cancelada | Cancelamento |
| `interview_reminder` | INTERVIEW | Lembrete de entrevista | Notificação de lembrete |
| `disc_test_completed` | DISC | Teste DISC concluído | Conclusão do teste |
| `disc_test_invited` | DISC | Convite DISC enviado | Envio de convite |
| `system_maintenance` | SYSTEM | Manutenção programada | Aviso do sistema |
| `api_error` | API | Erro de API | Falha em integração externa |
| `webhook_received` | API | Webhook recebido | Recebimento de webhook |
| `team_member_joined` | TEAM | Novo membro | Entrada de membro na equipe |
| `team_member_removed` | TEAM | Membro removido | Saída de membro da equipe |

---

#### `quickNotify(method, ...args)` — 5 Métodos Rápidos de Toast

Atalhos para exibir notificações toast sem persistência no banco:

```typescript
// Exibe toast de sucesso
quickNotify('success', 'Operação realizada com sucesso!');

// Exibe toast de erro
quickNotify('error', 'Falha ao processar requisição.');

// Exibe toast de informação
quickNotify('info', 'Dica: Você pode usar filtros para refinar a busca.');

// Exibe toast de aviso
quickNotify('warning', 'Atenção: Esta ação não pode ser desfeita.');

// Exibe toast customizado
quickNotify('custom', {
  title: 'Download completo',
  description: 'O arquivo relatório.csv foi baixado.',
  variant: 'default',
  duration: 5000
});
```

---

## APIs REST

### `GET /api/notifications`

Lista notificações com filtros e paginação.

**Parâmetros de Query:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `isRead` | `boolean` | Não | Filtrar por status de leitura |
| `category` | `NotificationCategory` | Não | Filtrar por categoria |
| `priority` | `NotificationPriority` | Não | Filtrar por prioridade |
| `limit` | `number` | Não | Limite (padrão: 20) |
| `offset` | `number` | Não | Deslocamento (padrão: 0) |

**Resposta:**
```json
{
  "notifications": [Notification],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

---

### `POST /api/notifications`

Cria uma nova notificação.

**Body:**
```json
{
  "title": "Nova candidatura recebida",
  "message": "João Silva se candidatou à vaga Desenvolvedor Frontend",
  "type": "CANDIDATE_APPLIED",
  "category": "CANDIDATE",
  "priority": "MEDIUM",
  "link": "/candidates/123",
  "metadata": {
    "candidateId": "123",
    "jobId": "456"
  }
}
```

**Resposta:** `Notification`

---

### `GET /api/notifications/[id]`

Obtém detalhes de uma notificação específica.

**Resposta:** `Notification`

---

### `PATCH /api/notifications/[id]`

Atualiza campos de uma notificação.

**Body (parcial):**
```json
{
  "isRead": true,
  "isArchived": false,
  "isPinned": true
}
```

**Resposta:** `Notification`

---

### `DELETE /api/notifications/[id]`

Remove uma notificação.

**Resposta:** `{ success: true }`

---

### `GET /api/notifications/stats`

Retorna estatísticas consolidadas de notificações.

**Resposta:**
```json
{
  "total": 450,
  "unread": 23,
  "recent": 8,
  "urgent": 2,
  "byCategory": {
    "CANDIDATE": 120,
    "JOB": 85,
    "AI": 45,
    "MESSAGE": 60,
    "INTERVIEW": 35,
    "DISC": 25,
    "API": 30,
    "TEAM": 20,
    "SYSTEM": 30
  },
  "byPriority": {
    "CRITICAL": 5,
    "HIGH": 18,
    "MEDIUM": 150,
    "LOW": 277
  }
}
```

**Campos:**
| Campo | Tipo | Descrição |
|---|---|---|
| `total` | `number` | Total de notificações ativas |
| `unread` | `number` | Não lidas |
| `recent` | `number` | Últimas 24 horas |
| `urgent` | `number` | Prioridade CRITICAL ou HIGH |
| `byCategory` | `Record<string, number>` | Contagem por categoria |
| `byPriority` | `Record<string, number>` | Contagem por prioridade |

---

### `POST /api/notifications/mark-all-read`

Marca todas as notificações do tenant como lidas.

**Resposta:**
```json
{
  "success": true,
  "updatedCount": 23
}
```

---

## Tipos

### `NotificationType` — 37 Valores

```typescript
type NotificationType =
  // Candidato (5)
  | 'CANDIDATE_CREATED'
  | 'CANDIDATE_APPLIED'
  | 'CANDIDATE_UPDATED'
  | 'CANDIDATE_STAGE_CHANGED'
  | 'CANDIDATE_DISQUALIFIED'
  // Vaga (4)
  | 'JOB_CREATED'
  | 'JOB_UPDATED'
  | 'JOB_PUBLISHED'
  | 'JOB_CLOSED'
  // IA (4)
  | 'AI_SCREENING_STARTED'
  | 'AI_SCREENING_COMPLETED'
  | 'AI_INTERVENTION_REQUIRED'
  | 'AI_FIT_SCORE_READY'
  // Mensagem (2)
  | 'MESSAGE_RECEIVED'
  | 'MESSAGE_INTERVENTION'
  // Entrevista (4)
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_CONFIRMED'
  | 'INTERVIEW_CANCELLED'
  | 'INTERVIEW_REMINDER'
  // DISC (2)
  | 'DISC_TEST_COMPLETED'
  | 'DISC_TEST_INVITED'
  // API (2)
  | 'API_ERROR'
  | 'WEBHOOK_RECEIVED'
  // Equipe (2)
  | 'TEAM_MEMBER_JOINED'
  | 'TEAM_MEMBER_REMOVED'
  // Sistema (3)
  | 'SYSTEM_MAINTENANCE'
  | 'SYSTEM_UPDATE'
  | 'SYSTEM_ALERT'
  // Faturamento (5)
  | 'BILLING_PAYMENT_SUCCESS'
  | 'BILLING_PAYMENT_FAILED'
  | 'BILLING_SUBSCRIPTION_CREATED'
  | 'BILLING_SUBSCRIPTION_CANCELLED'
  | 'BILLING_INVOICE_READY'
  // Portal (2)
  | 'PORTAL_LOGIN'
  | 'PORTAL_DOCUMENT_UPLOADED'
  // Geral (2)
  | 'GENERAL_INFO'
  | 'CUSTOM';
```

### `NotificationCategory` — 9 Valores

```typescript
type NotificationCategory =
  | 'CANDIDATE'    // Eventos relacionados a candidatos
  | 'JOB'          // Eventos relacionados a vagas
  | 'AI'           // Eventos de inteligência artificial
  | 'MESSAGE'      // Eventos de mensagens
  | 'INTERVIEW'    // Eventos de entrevistas
  | 'DISC'         // Eventos do teste DISC
  | 'API'          // Eventos de integrações e webhooks
  | 'TEAM'         // Eventos da equipe
  | 'SYSTEM';      // Eventos do sistema e manutenção
```

### `NotificationPriority` — 4 Valores

```typescript
type NotificationPriority =
  | 'CRITICAL'  // Requer atenção imediata (vermelho)
  | 'HIGH'      // Importante (laranja)
  | 'MEDIUM'    // Normal (azul)
  | 'LOW';      // Informativo (cinza)
```

**Mapeamento Visual:**

| Prioridade | Cor | Ícone | Uso Típico |
|---|---|---|---|
| `CRITICAL` | 🔴 Vermelho | AlertTriangle | Intervenção IA necessária, erro crítico |
| `HIGH` | 🟠 Laranja | AlertCircle | Nova candidatura, lembrete de entrevista |
| `MEDIUM` | 🔵 Azul | Info | Atualização de status, score pronto |
| `LOW` | ⚪ Cinza | Bell | Informações gerais, log de atividades |

---

## Presets de Notificação

### Configuração dos 22 Presets

Todos os presets estão configurados em português brasileiro e incluem templates com variáveis dinâmicas.

#### Presets de Candidato

| ID | Título | Mensagem Template | Prioridade |
|---|---|---|---|
| `candidate_created` | Novo candidato cadastrado | "{{candidateName}} foi adicionado à base de candidatos." | LOW |
| `candidate_applied` | Nova candidatura recebida | "{{candidateName}} se candidatou à vaga {{jobTitle}} no departamento {{jobDepartment}}." | HIGH |
| `candidate_updated` | Candidato atualizado | "Os dados de {{candidateName}} foram atualizados." | LOW |
| `candidate_stage_changed` | Estágio alterado | "{{candidateName}} foi movido para o estágio {{stage}} na vaga {{jobTitle}}." | MEDIUM |
| `candidate_disqualified` | Candidato desqualificado | "{{candidateName}} foi desqualificado da vaga {{jobTitle}}." | MEDIUM |

#### Presets de Vaga

| ID | Título | Mensagem Template | Prioridade |
|---|---|---|---|
| `job_created` | Nova vaga criada | "A vaga {{jobTitle}} foi criada no departamento {{jobDepartment}}." | MEDIUM |
| `job_updated` | Vaga atualizada | "A vaga {{jobTitle}} teve seus dados atualizados." | LOW |
| `job_published` | Vaga publicada | "A vaga {{jobTitle}} foi publicada no job board público." | MEDIUM |
| `job_closed` | Vaga encerrada | "A vaga {{jobTitle}} foi encerrada com {{applicationsCount}} candidaturas." | MEDIUM |

#### Presets de IA

| ID | Título | Mensagem Template | Prioridade |
|---|---|---|---|
| `ai_screening_started` | Triagem IA iniciada | "A triagem por IA de {{candidateName}} para a vaga {{jobTitle}} foi iniciada." | LOW |
| `ai_screening_completed` | Triagem IA concluída | "Triagem concluída para {{candidateName}}. Fit score: {{fitScore}}/100 — {{recommendation}}." | MEDIUM |
| `ai_intervention_required` | Intervenção necessária | "{{candidateName}} necessita de intervenção humana. Motivo: {{reason}}." | HIGH |
| `ai_fit_score_ready` | Score de fit disponível | "O score de fit de {{candidateName}} para {{jobTitle}} está disponível: {{fitScore}}/100." | MEDIUM |

#### Presets de Mensagem

| ID | Título | Mensagem Template | Prioridade |
|---|---|---|---|
| `message_received` | Mensagem recebida | "{{senderName}} enviou uma mensagem no canal {{channel}}." | MEDIUM |
| `message_intervention` | Intervenção solicitada | "{{senderName}} solicitou a intervenção de um recrutador na conversa." | HIGH |

#### Presets de Entrevista

| ID | Título | Mensagem Template | Prioridade |
|---|---|---|---|
| `interview_scheduled` | Entrevista agendada | "Entrevista de {{candidateName}} para {{jobTitle}} agendada para {{date}} às {{time}}." | HIGH |
| `interview_confirmed` | Entrevista confirmada | "{{candidateName}} confirmou a entrevista de {{date}} às {{time}}." | MEDIUM |
| `interview_cancelled` | Entrevista cancelada | "A entrevista de {{candidateName}} em {{date}} foi cancelada. Motivo: {{reason}}." | HIGH |
| `interview_reminder` | Lembrete de entrevista | "Lembrete: Entrevista de {{candidateName}} amanhã às {{time}} para a vaga {{jobTitle}}." | HIGH |

#### Presets DISC

| ID | Título | Mensagem Template | Prioridade |
|---|---|---|---|
| `disc_test_completed` | Teste DISC concluído | "{{candidateName}} concluiu o teste DISC. Perfil dominante: {{discProfile}}." | MEDIUM |
| `disc_test_invited` | Convite DISC enviado | "Convite para teste DISC enviado a {{candidateName}}." | LOW |

#### Presets de API/Sistema/Equipe

| ID | Título | Mensagem Template | Prioridade |
|---|---|---|---|
| `api_error` | Erro de integração | "Erro na integração com {{serviceName}}: {{errorMessage}}." | HIGH |
| `webhook_received` | Webhook recebido | "Webhook recebido de {{source}} — evento: {{event}}." | LOW |
| `system_maintenance` | Manutenção programada | "Manutenção programada para {{scheduledDate}} às {{scheduledTime}}. Duração estimada: {{duration}}." | MEDIUM |
| `team_member_joined` | Novo membro na equipe | "{{userName}} ({{userEmail}}) ingressou na equipe." | LOW |
| `team_member_removed` | Membro removido | "{{userName}} foi removido da equipe." | LOW |

---

## Fluxo de Dados

### Criação de Notificação via Evento

```
┌────────────────┐     ┌──────────────────┐     ┌────────────────┐
│ Módulo Origem  │ ──→ │ notifyEvent()    │ ──→ │ createFrom     │
│ (ex: Pipeline) │     │ lib/notify.ts    │     │ Preset()       │
└────────────────┘     └──────────────────┘     └───────┬────────┘
                                                       │
                       ┌───────────────────┐           │
                       │ Banco de Dados    │ ←──────────┘
                       │ (notifications)   │
                       └─────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ Polling  │ │ Socket   │ │ Refetch  │
              │ (30s)    │ │ (realtime)│ │ (manual) │
              └────┬─────┘ └────┬─────┘ └────┬─────┘
                   │            │            │
                   ▼            ▼            ▼
              ┌─────────────────────────────────┐
              │    UI - NotificationCenter       │
              │    (badge, dropdown, toast)      │
              └─────────────────────────────────┘
```

### Fluxo de Polling

```
Componente Monta
       │
       ▼
┌──────────────────┐     ┌─────────────────┐
│ setInterval(30s) │ ──→ │ GET /api/       │
│                  │     │ notifications/  │
└──────────────────┘     │ stats           │
       │                 └────────┬────────┘
       │ (30s)                      │
       ▼                           ▼
┌──────────────────┐     ┌─────────────────┐
│ Aba visível?     │ ──→ │ Atualizar store │
│ (Visibility API) │     │ Badge count     │
└──────────────────┘     └─────────────────┘
```

---

## Considerações Técnicas

### Performance

- **Polling otimizado:** Intervalo padrão de 30 segundos, pausado quando a aba está em segundo plano
- **Paginação:** API suporta offset-based pagination para listas grandes
- **Cleanup periódico:** Função `cleanupExpiredNotifications()` para remoção de notificações antigas
- **Batch updates:** `mark-all-read` opera em bulk para eficiência

### Segurança

- **Isolamento por tenant:** Todas as queries filtram por `tenantId`
- **Autorização:** Usuário só pode acessar suas próprias notificações
- **Sanitização:** Título e mensagem são sanitizados antes do armazenamento

### Extensibilidade

- **Presets customizáveis:** Novos presets podem ser adicionados ao array de configuração
- **Categorias flexíveis:** Enum de categorias pode ser expandido sem breaking changes
- **Metadata livre:** Campo `metadata` JSON para dados adicionais por evento
