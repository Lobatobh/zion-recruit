# Módulo de Auditoria (Audit Logs)

> **Componentes:** `src/components/audit/`
> **Bibliotecas:** `src/lib/audit/`
> **Registro automático de ações com redação de dados sensíveis**

---

## Visão Geral

O módulo de auditoria registra de forma abrangente todas as ações significativas realizadas na plataforma, fornecendo um trilha de auditoria completa para compliance, troubleshooting e análise de segurança. Cada evento captura automaticamente o usuário, IP, user agent, timestamp e metadados da operação, com redação automática de dados sensíveis.

---

## Componentes

### `AuditLogPage`

**Arquivo:** `audit-log-page.tsx`

Página principal do módulo de auditoria com layout integrado:

- **Visão geral de estatísticas** (cards com métricas-chave)
- **Filtros avançados** (ação, entidade, período, usuário)
- **Tabela paginada** de logs de auditoria
- **Botão de exportação** (CSV/JSON)

```typescript
import { AuditLogPage } from '@/components/audit/audit-log-page';
```

### `AuditLogTable`

**Arquivo:** `audit-log-table.tsx`

Tabela de logs com indicadores visuais:

- **Badges coloridos por ação:**
  - 🟢 Verde: ações de criação (`CREATE`)
  - 🔵 Azul: ações de leitura (`VIEW`)
  - 🟡 Amarelo: ações de atualização (`UPDATE`)
  - 🔴 Vermelho: ações de exclusão (`DELETE`)
  - 🟣 Roxo: ações de login/logout
  - 🟠 Laranja: exportações de dados
- **Paginação** configurável
- **Ordenação** por colunas (data, ação, usuário, entidade)

```typescript
import { AuditLogTable } from '@/components/audit/audit-log-table';
```

### `AuditFilters`

**Arquivo:** `audit-filters.tsx`

Painel de filtros com suporte a 20 tipos de ação e 14 tipos de entidade:

- **Tipo de ação:** Multi-select com busca
- **Tipo de entidade:** Multi-select com busca
- **Período:** Seletor de intervalo de datas (início/fim)
- **Usuário:** Busca por nome ou e-mail
- **Botão limpar:** Remove todos os filtros

```typescript
import { AuditFilters } from '@/components/audit/audit-filters';
```

### `AuditDetail`

**Arquivo:** `audit-detail.tsx`

Modal/sheet com detalhes completos de um log:

- **Diff de alterações:** Visualização lado a lado (antes/depois) para updates
- **Informações do IP:** Endereço IP e localização aproximada
- **User Agent:** Navegador, sistema operacional, dispositivo
- **Metadados:** Dados adicionais da operação
- **Timestamp:** Data e hora com fuso horário

```typescript
import { AuditDetail } from '@/components/audit/audit-detail';
```

### `AuditStats`

**Arquivo:** `audit-stats.tsx`

Painel de estatísticas com cards resumidos:

| Métrica | Descrição |
|---|---|
| **Total de eventos** | Número total de logs no período |
| **Ação mais comum** | Tipo de ação mais executada |
| **Usuário mais ativo** | Usuário com mais ações registradas |
| **Tendência 7 dias** | Mini gráfico de barras com volume diário |

```typescript
import { AuditStats } from '@/components/audit/audit-stats';
```

---

## Serviço de Auditoria

**Arquivo:** `src/lib/audit/audit-service.ts`

### `logAudit(data: AuditLogData)`

Registra um evento de auditoria manualmente.

```typescript
await logAudit({
  action: 'CREATE',
  entityType: 'CANDIDATE',
  entityId: 'clx123abc',
  description: 'Candidato João Silva criado',
  userId: 'user_456',
  metadata: { source: 'api', importType: 'manual' }
});
```

### `logAuditFromRequest(request: Request, data: Partial<AuditLogData>)`

Registra um evento extraindo automaticamente IP e user agent da requisição HTTP.

```typescript
await logAuditFromRequest(req, {
  action: 'UPDATE',
  entityType: 'JOB',
  entityId: 'job_789',
  description: 'Vaga atualizada',
  changes: {
    before: { title: 'Desenvolvedor Jr' },
    after: { title: 'Desenvolvedor Pleno' }
  }
});
```

### `getAuditLogs(filters: AuditLogFilters)`

Consulta logs com paginação e filtros.

### `getAuditLogById(id: string)`

Retorna os detalhes completos de um log específico.

### `getAuditStats(period?: string)`

Retorna estatísticas agregadas.

### `exportAuditLogsCsv(filters: AuditLogFilters)`

Exporta logs em formato CSV.

### `exportAuditLogsJson(filters: AuditLogFilters)`

Exporta logs em formato JSON.

### `redactSensitiveData(data: Record<string, any>): Record<string, any>`

Redige automaticamente dados sensíveis antes de armazenar.

---

## Helpers de Domínio

**Arquivo:** `src/lib/audit/audit-helpers.ts`

Funções especializadas para registro de eventos específicos, simplificando a criação de logs em todo o sistema.

### Candidatos

```typescript
// Candidato criado
await logCandidateCreated(candidateId, candidateData, userId);

// Candidato atualizado
await logCandidateUpdated(candidateId, oldData, newData, userId);

// Candidato excluído
await logCandidateDeleted(candidateId, candidateData, userId);

// Mudança de etapa no pipeline
await logCandidateStageChange(candidateId, jobId, oldStage, newStage, userId);
```

### Vagas

```typescript
// Vaga criada
await logJobCreated(jobId, jobData, userId);

// Vaga atualizada
await logJobUpdated(jobId, oldData, newData, userId);

// Vaga excluída
await logJobDeleted(jobId, jobData, userId);

// Vaga publicada
await logJobPublished(jobId, userId);

// Vaga fechada
await logJobClosed(jobId, reason, userId);
```

### Usuários

```typescript
// Login
await logUserLogin(userId, request);

// Logout
await logUserLogout(userId, request);

// Perfil atualizado
await logUserUpdated(userId, oldData, newData);
```

### API Keys

```typescript
// API key criada
await logApiKeyCreated(keyId, keyName, userId);

// API key revogada
await logApiKeyRevoked(keyId, keyName, userId);
```

### Agentes de IA

```typescript
// Execução de agente
await logAgentRun(agentId, agentName, input, output, userId);
```

### Entrevistas

```typescript
// Entrevista agendada
await logInterviewScheduled(interviewId, candidateId, jobId, userId);

// Entrevista cancelada
await logInterviewCancelled(interviewId, reason, userId);
```

### DISC

```typescript
// Teste DISC enviado
await logDiscTestSent(assessmentId, candidateId, userId);
```

### Mensagens

```typescript
// Mensagem enviada
await logMessageSent(messageId, channel, recipientId, userId);
```

### Dados

```typescript
// Exportação de dados
await logDataExport(format, entityType, filters, userId);
```

### Configurações

```typescript
// Alteração de configurações
await logSettingsChange(settingKey, oldValue, newValue, userId);

// Alteração de permissões
await logPermissionChange(userId, targetUserId, oldRole, newRole);
```

### Utilitário — `createDiff(oldData, newData)`

Gera um objeto diff entre dois estados para registro de alterações:

```typescript
const diff = createDiff(
  { name: 'João', role: 'admin', email: 'joao@old.com' },
  { name: 'João Silva', role: 'admin', email: 'joao@new.com' }
);
// {
//   name: { before: 'João', after: 'João Silva' },
//   email: { before: 'joao@old.com', after: 'joao@new.com' }
//   // role omitido (não mudou)
// }
```

---

## Middleware de Auditoria

**Arquivo:** `src/lib/audit/audit-middleware.ts`

### `withAudit(handler, options?)`

HOF que envolve handlers de API com registro automático de auditoria:

```typescript
import { withAudit } from '@/lib/audit/audit-middleware';

export const PUT = withAudit(async (req: NextRequest) => {
  // Lógica da rota
  return NextResponse.json({ success: true });
}, {
  entityType: 'CANDIDATE',
  getEntityId: (req) => req.nextUrl.pathname.split('/')[3],
  getAction: (req) => req.method === 'POST' ? 'CREATE' : 'UPDATE'
});
```

### `withAuditResponse(handler, options?)`

Similar ao `withAudit`, mas também captura automaticamente os dados da resposta.

### `AuditLogger`

Classe para criação de instâncias de logger com configurações pré-definidas:

```typescript
const logger = new AuditLogger({
  defaultEntityType: 'JOB',
  defaultUserId: 'system'
});

await logger.log('CREATE', 'job_123', 'Vaga criada automaticamente');
```

### `createCrudAuditHandlers(entityType)`

Gera automaticamente handlers de auditoria para operações CRUD:

```typescript
const auditHandlers = createCrudAuditHandlers('CANDIDATE');

// Retorna: { onCreate, onUpdate, onDelete }
// Prontos para uso nos handlers de API
```

---

## APIs

### `GET /api/audit`

Lista logs de auditoria com filtros e paginação.

**Parâmetros de query:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `userId` | `string` | Filtrar por usuário |
| `action` | `string` | Filtrar por tipo de ação |
| `entityType` | `string` | Filtrar por tipo de entidade |
| `entityId` | `string` | Filtrar por ID da entidade |
| `startDate` | `string` | Data inicial (ISO 8601) |
| `endDate` | `string` | Data final (ISO 8601) |
| `page` | `number` | Página atual (padrão: 1) |
| `limit` | `number` | Itens por página (padrão: 20, máx: 100) |

**Resposta:**

```json
{
  "logs": [
    {
      "id": "audit_abc123",
      "action": "CREATE",
      "entityType": "CANDIDATE",
      "entityId": "clx123abc",
      "description": "Candidato João Silva criado",
      "userId": "user_456",
      "userName": "Maria Santos",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "metadata": { "source": "manual" },
      "changes": null,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 20
}
```

---

### `GET /api/audit?id=`

Retorna detalhes completos de um log específico.

**Parâmetro de query:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `id` | `string` | ID do log de auditoria |

**Resposta:**

```json
{
  "id": "audit_abc123",
  "action": "UPDATE",
  "entityType": "JOB",
  "entityId": "job_789",
  "description": "Título da vaga atualizado",
  "userId": "user_456",
  "userName": "Maria Santos",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "metadata": {},
  "changes": {
    "title": {
      "before": "Desenvolvedor Jr",
      "after": "Desenvolvedor Pleno"
    }
  },
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

---

### `GET /api/audit/export`

Exporta logs em formato CSV ou JSON.

**Parâmetros de query:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `format` | `string` | `csv` ou `json` (padrão: `csv`) |
| `startDate` | `string` | Data inicial |
| `endDate` | `string` | Data final |
| `action` | `string` | Filtrar por ação |
| `entityType` | `string` | Filtrar por entidade |

**Resposta:** Download do arquivo (Content-Disposition: attachment)

---

### `GET /api/audit/stats`

Retorna estatísticas agregadas de auditoria.

**Resposta:**

```json
{
  "total": 5420,
  "byAction": {
    "VIEW": 2500,
    "UPDATE": 1200,
    "CREATE": 800,
    "LOGIN": 450,
    "DELETE": 200,
    "EXPORT": 150,
    "LOGOUT": 120
  },
  "byEntityType": {
    "CANDIDATE": 1800,
    "JOB": 1200,
    "USER": 800,
    "INTERVIEW": 500,
    "API_KEY": 200
  },
  "topUsers": [
    { "userId": "user_456", "name": "Maria Santos", "count": 450 },
    { "userId": "user_789", "name": "João Oliveira", "count": 320 }
  ],
  "trend7Days": [
    { "date": "2025-01-09", "count": 680 },
    { "date": "2025-01-10", "count": 720 },
    { "date": "2025-01-11", "count": 590 },
    { "date": "2025-01-12", "count": 320 },
    { "date": "2025-01-13", "count": 750 },
    { "date": "2025-01-14", "count": 810 },
    { "date": "2025-01-15", "count": 550 }
  ]
}
```

---

## 20 Tipos de Ação

| Ação | Descrição | Cor do Badge |
|---|---|---|
| `CREATE` | Criação de registro | 🟢 Verde |
| `READ` / `VIEW` | Visualização de dados | 🔵 Azul |
| `UPDATE` | Atualização de registro | 🟡 Amarelo |
| `DELETE` | Exclusão de registro | 🔴 Vermelho |
| `LOGIN` | Login de usuário | 🟣 Roxo |
| `LOGOUT` | Logout de usuário | 🟣 Roxo |
| `LOGIN_FAILED` | Tentativa de login falhada | 🔴 Vermelho |
| `EXPORT` | Exportação de dados | 🟠 Laranja |
| `IMPORT` | Importação de dados | 🟠 Laranja |
| `STAGE_CHANGE` | Mudança de etapa | 🔵 Azul |
| `PUBLISH` | Publicação de vaga | 🟢 Verde |
| `CLOSE` | Fechamento de vaga | 🔴 Vermelho |
| `SEND` | Envio de mensagem/e-mail | 🔵 Azul |
| `ASSIGN` | Atribuição de responsável | 🟡 Amarelo |
| `REVOKE` | Revogação de acesso | 🔴 Vermelho |
| `SCHEDULE` | Agendamento | 🔵 Azul |
| `CANCEL` | Cancelamento | 🔴 Vermelho |
| `RUN` | Execução (agentes IA) | 🟣 Roxo |
| `SETTINGS_CHANGE` | Alteração de configurações | 🟡 Amarelo |
| `PERMISSION_CHANGE` | Alteração de permissões | 🔴 Vermelho |

---

## 14 Tipos de Entidade

| Entidade | Descrição |
|---|---|
| `CANDIDATE` | Candidatos |
| `JOB` | Vagas |
| `USER` | Usuários |
| `TEAM_MEMBER` | Membros da equipe |
| `INTERVIEW` | Entrevistas |
| `MESSAGE` | Mensagens |
| `NOTE` | Anotações |
| `API_KEY` | Chaves de API |
| `WEBHOOK` | Webhooks configurados |
| `CREDENTIAL` | Credenciais de API |
| `ASSESSMENT` | Avaliações DISC |
| `PIPELINE` | Pipeline de candidatos |
| `TAG` | Tags/etiquetas |
| `SETTINGS` | Configurações do sistema |

---

## Redação de Dados Sensíveis

A função `redactSensitiveData` remove automaticamente informações sensíveis antes de armazenar nos logs:

| Padrão detectado | Substituído por |
|---|---|
| Senhas / `password` | `***REDACTED***` |
| API keys / `apiKey` | `***REDACTED***` |
| Tokens / `token` / `accessToken` | `***REDACTED***` |
| Secrets / `secret` | `***REDACTED***` |
| Cartões de crédito | `****-****-****-1234` |
| CPF (parcial) | `***.***.***-12` |
| E-mail (corpo) | `j***@email.com` |

---

## Metadados Capturados Automaticamente

| Campo | Fonte | Descrição |
|---|---|---|
| `userId` | Sessão autenticada | ID do usuário que realizou a ação |
| `ip` | `x-forwarded-for` / `x-real-ip` | Endereço IP do cliente |
| `userAgent` | Header `User-Agent` | Navegador e sistema operacional |
| `timestamp` | Servidor | Data/hora UTC do evento |
| `metadata` | Contexto | Dados adicionais específicos da ação |
| `changes` | Diff | Dados antes/depois (para updates) |

---

## Considerações de Produção

1. **Retenção:** Defina política de retenção de logs conforme requisitos de compliance
2. **Performance:** O registro de audit é síncrono — para alta volumetria, considere filas assíncronas
3. **Índices:** Garanta índices no banco de dados para `userId`, `entityType`, `createdAt`
4. **Privacidade:** A redação automática protege dados sensíveis, mas revise periodicamente os padrões
5. **Exportação:** Utilize exportação assíncrona para grandes volumes de dados
6. **Compliance:** Logs de auditoria são imutáveis — não implemente edição ou exclusão
