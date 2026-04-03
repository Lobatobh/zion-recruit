# Módulo: Google Calendar Integration

> **Versão:** 1.0 | **Status:** Produção | **Última atualização:** 2025

## Visão Geral

O módulo de integração Google Calendar conecta a plataforma Zion Recruit ao Google Calendar, permitindo o gerenciamento automatizado de entrevistas diretamente da plataforma. A integração utiliza OAuth2 para autenticação segura, cria automaticamente links de videoconferência Hangouts Meet e fornece sugestões de horários disponíveis baseadas em janela comercial.

O serviço é implementado como singleton e oferece métodos para conectar, desconectar, listar eventos e gerenciar disponibilidade.

---

## Sumário

1. [Biblioteca (Lib)](#biblioteca-lib)
2. [Interfaces e Tipos](#interfaces-e-tipos)
3. [Funcionalidades](#funcionalidades)
4. [APIs REST](#apis-rest)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Componente de Interface](#componente-de-interface)
7. [Fluxo de Conexão OAuth2](#fluxo-de-conexão-oauth2)
8. [Geração de Slots Disponíveis](#geração-de-slots-disponíveis)
9. [Integração com Módulo de Entrevistas](#integração-com-módulo-de-entrevistas)
10. [Considerações Técnicas](#considerações-técnicas)

---

## Biblioteca (Lib)

### `src/lib/google-calendar-service.ts`

**Exportação:** `googleCalendarService` (singleton), `formatEventDate`, `generateDefaultSlots`

Serviço singleton de integração com Google Calendar API v3.

#### Instanciação

```typescript
// Singleton — mesma instância em toda a aplicação
import { googleCalendarService } from '@/lib/google-calendar-service';

// Uso
const events = await googleCalendarService.listEvents(userId);
```

#### Métodos do Serviço

| Método | Descrição | Retorno |
|---|---|---|
| `connect(userId)` | Inicia fluxo OAuth2 e retorna URL de autorização | `{ authUrl: string }` |
| `handleCallback(code, userId)` | Processa callback OAuth2 e salva tokens | `{ success: boolean, email: string }` |
| `disconnect(userId)` | Revoga tokens e remove credenciais | `{ success: boolean }` |
| `getStatus(userId)` | Verifica status da conexão | `CalendarConnectionStatus` |
| `listEvents(userId, params?)` | Lista eventos do calendário | `CalendarEvent[]` |
| `createEvent(userId, event)` | Cria evento no calendário | `ScheduledEvent` |
| `updateEvent(userId, eventId, event)` | Atualiza evento existente | `ScheduledEvent` |
| `deleteEvent(userId, eventId)` | Remove evento do calendário | `{ success: boolean }` |
| `getAvailableSlots(userId, dateRange)` | Retorna slots disponíveis | `AvailableSlot[]` |
| `refreshAccessToken(userId)` | Renova token de acesso expirado | `{ accessToken: string }` |

---

### Funções Utilitárias

#### `formatEventDate(date: Date | string): FormattedDate`

Formata data para exibição consistente no padrão brasileiro.

```typescript
formatEventDate('2025-01-25T14:00:00-03:00');
// Retorna:
{
  date: '25/01/2025',
  time: '14:00',
  dayOfWeek: 'Sábado',
  monthYear: 'Janeiro 2025',
  iso: '2025-01-25T14:00:00-03:00',
  relative: 'em 5 dias'
}
```

#### `generateDefaultSlots(startDate?, days?, intervalMinutes?)`

Gera slots de horário disponíveis para agendamento.

```typescript
generateDefaultSlots();
// Retorna (próximos 30 dias úteis, 9h-18h, intervalo de 30min):
[
  { date: '2025-01-20', time: '09:00', datetime: '...' },
  { date: '2025-01-20', time: '09:30', datetime: '...' },
  { date: '2025-01-20', time: '10:00', datetime: '...' },
  // ... (dias úteis apenas, 9h-18h)
]
```

**Parâmetros:**
| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `startDate` | `Date` | Hoje | Data inicial |
| `days` | `number` | `30` | Número de dias para gerar slots |
| `intervalMinutes` | `number` | `30` | Intervalo entre slots |

---

## Interfaces e Tipos

### `CalendarEvent`

```typescript
interface CalendarEvent {
  id: string;                    // ID do evento no Google Calendar
  summary: string;               // Título do evento
  description?: string;          // Descrição do evento
  location?: string;             // Localização física
  hangoutLink?: string;          // Link Hangouts Meet
  start: {
    dateTime: string;            // ISO 8601
    timeZone: string;            // Ex: 'America/Sao_Paulo'
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus: 'needsAction' | 'accepted' | 'declined' | 'tentative';
    displayName?: string;
  }>;
  creator?: {
    email: string;
    displayName?: string;
  };
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;             // Link para evento no Google Calendar
  created: string;               // ISO 8601
  updated: string;               // ISO 8601
}
```

### `InterviewScheduleInput`

```typescript
interface InterviewScheduleInput {
  candidateId: string;           // ID do candidato
  candidateEmail: string;        // Email do candidato
  candidateName: string;         // Nome do candidato
  jobId: string;                 // ID da vaga
  jobTitle: string;              // Título da vaga
  recruiterId: string;           // ID do recrutador (dono do calendário)
  scheduledAt: string;           // Data/hora ISO 8601
  duration: number;              // Duração em minutos
  type: 'TECHNICAL' | 'CULTURAL' | 'FINAL' | 'HR';
  notes?: string;                // Notas adicionais
  createMeetLink?: boolean;      // Criar link Hangouts Meet (padrão: true)
}
```

### `ScheduledEvent`

```typescript
interface ScheduledEvent {
  id: string;                    // ID do evento criado
  htmlLink: string;              // Link para o Google Calendar
  hangoutLink?: string;          // Link Hangouts Meet (se criado)
  start: string;                 // ISO 8601
  end: string;                   // ISO 8601
  title: string;                 // Título formatado
  description: string;           // Descrição formatada
  attendees: string[];           // Emails dos participantes
  meetLink: string;              // Link Meet (alias para hangoutLink)
}
```

### `CalendarConnectionStatus`

```typescript
interface CalendarConnectionStatus {
  connected: boolean;            // Se o calendário está conectado
  configured: boolean;           // Se as credenciais OAuth estão configuradas
  email?: string;                // Email da conta Google conectada
  lastSync?: string;             // Última sincronização
  error?: string;                // Mensagem de erro (se houver)
}
```

---

## Funcionalidades

### OAuth2 - Autenticação

- **Fluxo:** Authorization Code Flow com PKCE
- **Scopes solicitados:**
  - `https://www.googleapis.com/auth/calendar` — Leitura e escrita de eventos
  - `https://www.googleapis.com/auth/calendar.events` — Gerenciamento de eventos
- **Token storage:** Criptografado no banco de dados (por usuário)
- **Refresh automático:** Tokens de acesso são renovados automaticamente quando expirados

### Gestão de Tokens de Acesso

```
┌─────────────────────────────────────────────────────────────────┐
│                    Ciclo de Vida dos Tokens                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. OAuth2 Callback                                             │
│     └─→ Recebe authorization_code                               │
│     └─→ Troca por access_token + refresh_token                  │
│     └─→ Salva ambos no banco (criptografados)                   │
│                                                                  │
│  2. Uso Normal                                                   │
│     └─→ access_token usado em chamadas à API                   │
│     └─→ Expira em ~60 minutos                                   │
│                                                                  │
│  3. Refresh Automático                                          │
│     └─→ Detecta erro 401 (token expirado)                      │
│     └─→ Usa refresh_token para obter novo access_token         │
│     └─→ Atualiza no banco                                       │
│     └─→ Retenta a requisição original                           │
│                                                                  │
│  4. Revogação                                                    │
│     └─→ Revoga refresh_token no Google                         │
│     └─→ Remove credenciais do banco                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Links Hangouts Meet

Eventos criados podem gerar automaticamente links de videoconferência:

- **Ativação:** `createMeetLink: true` no `InterviewScheduleInput`
- **Resultado:** Link Meet incluído no evento e retornado no `ScheduledEvent`
- **Notificação:** Link enviado automaticamente ao candidato via email/notificação

**Formato do Link:**
```
https://meet.google.com/xxx-xxxx-xxx
```

### Slots Disponíveis

Sistema de geração de horários disponíveis para agendamento:

- **Dias:** Apenas dias úteis (segunda a sexta)
- **Horário:** 9:00 às 18:00 (horário de Brasília)
- **Intervalo:** 30 minutos entre slots
- **Exclusão:** Slots que conflitam com eventos existentes são removidos

---

## APIs REST

### `POST /api/calendar/connect`

Inicia o fluxo OAuth2 para conectar o Google Calendar.

**Body (opcional):**
```json
{
  "redirectUrl": "https://app.zionrecruit.com/settings/calendar/callback"
}
```

**Resposta:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=...&redirect_uri=...&scope=...&access_type=offline&prompt=consent"
}
```

**Comportamento:**
1. Gera URL de autorização OAuth2 com scopes necessários
2. Armazena estado OAuth para validação do callback (CSRF protection)
3. Retorna URL para redirecionamento do cliente

---

### `POST /api/calendar/disconnect`

Desconecta o Google Calendar do usuário.

**Resposta:**
```json
{
  "success": true,
  "message": "Google Calendar desconectado com sucesso"
}
```

**Comportamento:**
1. Revoga o refresh_token no Google OAuth2
2. Remove credenciais criptografadas do banco de dados
3. Eventos existentes **não são removidos** do Google Calendar

---

### `GET /api/calendar/events`

Lista eventos do calendário conectado.

**Parâmetros de Query:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `timeMin` | `string` (ISO 8601) | Não | Data/hora mínima (padrão: agora) |
| `timeMax` | `string` (ISO 8601) | Não | Data/hora máxima (padrão: +30 dias) |
| `maxResults` | `number` | Não | Máximo de eventos (padrão: 50) |
| `q` | `string` | Não | Termo de busca (livre) |

**Resposta:**
```json
{
  "events": [
    {
      "id": "event-id-123",
      "summary": "Entrevista - João Silva - Desenvolvedor Frontend",
      "description": "Entrevista técnica para vaga de Desenvolvedor Frontend",
      "hangoutLink": "https://meet.google.com/abc-defg-hij",
      "start": { "dateTime": "2025-01-25T14:00:00-03:00", "timeZone": "America/Sao_Paulo" },
      "end": { "dateTime": "2025-01-25T15:00:00-03:00", "timeZone": "America/Sao_Paulo" },
      "attendees": [
        { "email": "joao@email.com", "responseStatus": "accepted", "displayName": "João Silva" },
        { "email": "recruiter@zion.com", "responseStatus": "needsAction" }
      ],
      "status": "confirmed",
      "htmlLink": "https://calendar.google.com/event?id=..."
    }
  ],
  "total": 1
}
```

---

### `GET /api/calendar/status`

Verifica o status da conexão com o Google Calendar.

**Resposta (conectado):**
```json
{
  "connected": true,
  "configured": true,
  "email": "recruiter@zionrecruit.com",
  "lastSync": "2025-01-20T14:30:00Z"
}
```

**Resposta (não conectado):**
```json
{
  "connected": false,
  "configured": true,
  "error": null
}
```

**Resposta (não configurado):**
```json
{
  "connected": false,
  "configured": false,
  "error": "Credenciais OAuth2 não configuradas. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET."
}
```

**Campos:**

| Campo | Tipo | Descrição |
|---|---|---|
| `connected` | `boolean` | Se o calendário está ativo e conectado |
| `configured` | `boolean` | Se as credenciais OAuth estão presentes no env |
| `email` | `string?` | Email da conta Google conectada |
| `lastSync` | `string?` | Timestamp da última sincronização |
| `error` | `string?` | Mensagem de erro (se houver) |

---

## Variáveis de Ambiente

| Variável | Tipo | Obrigatória | Descrição |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | `string` | Sim | Client ID do projeto no Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `string` | Sim | Client Secret do projeto no Google Cloud Console |

**Exemplo de configuração (`.env`):**
```env
# Google Calendar
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
```

**Obtenção das Credenciais:**
1. Acessar [Google Cloud Console](https://console.cloud.google.com/)
2. Criar ou selecionar projeto
3. Ativar Google Calendar API
4. Criar credenciais OAuth 2.0 (tipo: Aplicação Web)
5. Configurar URI de redirecionamento autorizado
6. Copiar Client ID e Client Secret

**URI de Redirecionamento:**
```
https://app.zionrecruit.com/api/calendar/callback
```

---

## Componente de Interface

### `CalendarSettingsCard`

Localizado no [módulo de Configurações](./settings.md), este card fornece a interface de configuração do Google Calendar.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Google Calendar                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Status: 🟢 Conectado                                           │
│  Conta: recruiter@zionrecruit.com                               │
│  Última sincronização: 20/01/2025 14:30                         │
│                                                                  │
│  ── Próximos Eventos ─────────────────────────────────────────  │
│                                                                  │
│  📌 25/01 14:00 — 15:00                                        │
│     Entrevista - João Silva - Desenvolvedor Frontend             │
│     📍 Hangouts Meet · 👥 2 participantes                       │
│                                                                  │
│  📌 28/01 10:00 — 11:00                                        │
│     Entrevista - Maria Santos - UX Designer                      │
│     📍 Hangouts Meet · 👥 2 participantes                       │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Slots Disponíveis (próximos 7 dias): 23                         │
│                                                                  │
│  [     Sincronizar Calendário     ]                              │
│  [       Desconectar Google Calendar    ]                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Estados Visuais:**

| Estado | Indicador | Ações Disponíveis |
|---|---|---|
| Não configurado | 🔴 + "Credenciais não configuradas" | Link para documentação de setup |
| Não conectado | 🟡 + "Conectar Google Calendar" | Botão "Conectar" |
| Conectando | 🔄 + "Conectando..." | Loading state |
| Conectado | 🟢 + Email da conta | Sincronizar, Desconectar |
| Erro | 🔴 + Mensagem de erro | Tentar novamente, Reconectar |

---

## Fluxo de Conexão OAuth2

```
  Recrutador              Frontend              Backend              Google OAuth2        Google Calendar
     │                      │                     │                        │                     │
     │ 1. Clicar            │                     │                        │                     │
     │ "Conectar"           │                     │                        │                     │
     │ ────────────────────→│                     │                        │                     │
     │                      │                     │                        │                     │
     │                      │ 2. POST             │                        │                     │
     │                      │ /api/calendar/      │                        │                     │
     │                      │ connect             │                        │                     │
     │                      │ ──────────────────→│                        │                     │
     │                      │                     │                        │                     │
     │                      │                     │ 3. Gerar authUrl      │                     │
     │                      │                     │ (com state CSRF)      │                     │
     │                      │                     │                        │                     │
     │                      │ 4. { authUrl }      │                        │                     │
     │                      │ ←──────────────────│                        │                     │
     │                      │                     │                        │                     │
     │                      │ 5. window.location  │                        │                     │
     │                      │ = authUrl           │                        │                     │
     │                      │ ──────────────────────────────────────────→ │                     │
     │                      │                     │                        │                     │
     │                      │                     │                        │ 6. Tela de          │
     │                      │                     │                        │ consentimento       │
     │                      │                     │                        │ Google              │
     │                      │                     │                        │                     │
     │                      │                     │ 7. Callback            │                     │
     │                      │                     │ /api/calendar/         │                     │
     │                      │                     │ callback?code=xxx      │                     │
     │                      │                     │ ←──────────────────────│                     │
     │                      │                     │                        │                     │
     │                      │                     │ 8. Trocar code         │                     │
     │                      │                     │ por tokens             │                     │
     │                      │                     │ ──────────────────────→│                     │
     │                      │                     │                        │ 9. Tokens           │
     │                      │                     │                        │ (access + refresh)  │
     │                      │                     │ ←──────────────────────│                     │
     │                      │                     │                        │                     │
     │                      │                     │ 10. Salvar tokens      │                     │
     │                      │                     │ (criptografados)       │                     │
     │                      │                     │                        │                     │
     │                      │ 11. Redirect         │                        │                     │
     │                      │ /settings/calendar   │                        │                     │
     │                      │ ←──────────────────│                        │                     │
     │                      │                     │                        │                     │
     │ 12. Card mostra       │                     │                        │                     │
     │ "Conectado"           │                     │                        │                     │
     │ ←─────────────────── │                     │                        │                     │
```

---

## Geração de Slots Disponíveis

### Regras de Negócio

```
┌─────────────────────────────────────────────────────────────────┐
│               REGRA DE GERAÇÃO DE SLOTS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Dias úteis: Segunda (1) a Sexta (5)                             │
│  Horário:    09:00 às 18:00                                     │
│  Intervalo:  30 minutos                                          │
│  Duração:    Configurável (padrão: 60 min)                       │
│  Fuso:       America/Sao_Paulo (BRT)                             │
│                                                                  │
│  Almoço:     12:00 — 13:00 (slot removido)                     │
│                                                                  │
│  Slots por dia:                                                  │
│  09:00, 09:30, 10:00, 10:30, 11:00, 11:30                      │
│  [almoço: 12:00-13:00 removido]                                 │
│  13:00, 13:30, 14:00, 14:30, 15:00, 15:30                      │
│  16:00, 16:30, 17:00, 17:30                                     │
│  = 15 slots/dia                                                  │
│                                                                  │
│  Exclusão:                                                       │
│  - Feriados nacionais brasileiros                                │
│  - Eventos existentes no calendário                              │
│  - Slots no passado                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Exemplo de Saída

```json
{
  "slots": [
    { "date": "2025-01-20", "dayOfWeek": "Segunda", "time": "09:00", "label": "Seg, 20 Jan - 09:00", "available": true },
    { "date": "2025-01-20", "dayOfWeek": "Segunda", "time": "09:30", "label": "Seg, 20 Jan - 09:30", "available": true },
    { "date": "2025-01-20", "dayOfWeek": "Segunda", "time": "10:00", "label": "Seg, 20 Jan - 10:00", "available": false, "reason": "Evento: Reunião de equipe" },
    { "date": "2025-01-20", "dayOfWeek": "Segunda", "time": "10:30", "label": "Seg, 20 Jan - 10:30", "available": false, "reason": "Evento: Reunião de equipe" },
    { "date": "2025-01-20", "dayOfWeek": "Segunda", "time": "11:00", "label": "Seg, 20 Jan - 11:00", "available": true },
    "..."
  ],
  "totalAvailable": 148,
  "totalSlots": 150
}
```

### Cálculo de Disponibilidade

```
1. Gerar todos os slots teóricos (dias úteis × horários)
2. Buscar eventos no Google Calendar no período
3. Para cada evento existente:
   a. Identificar slots que conflitam
   b. Marcar como unavailable com motivo
4. Ordenar por data/hora
5. Retornar lista com flag de disponibilidade
```

---

## Integração com Módulo de Entrevistas

O módulo Google Calendar integra-se com o sistema de entrevistas da plataforma:

### Agendamento de Entrevista

```
1. Recrutador agenda entrevista no sistema
   └─→ Seleciona data/hora nos slots disponíveis
   
2. POST /api/calendar/events (criação do evento)
   └─→ Evento criado no Google Calendar
   └─→ Link Hangouts Meet gerado automaticamente
   
3. Dados sincronizados
   └─→ Entrevista salva no banco com meetLink
   └─→ Candidato notificado com detalhes + link Meet
   
4. Convites automáticos
   └─→ Candidato adicionado como attendee
   └─→ Email de convite enviado pelo Google Calendar
```

### Ações do Candidato (via Portal)

| Ação Candidato | Efeito no Calendar |
|---|---|
| Confirmar entrevista | Atualizar status do attendee → `accepted` |
| Solicitar reagendamento | Criar novo evento + cancelar anterior |
| Cancelar entrevista | Atualizar status → `declined` + marcar evento como `cancelled` |

### Notificações Automáticas

| Evento | Notificação |
|---|---|
| Entrevista criada | Notificação ao recrutador + email ao candidato |
| Candidato confirma | Atualização no calendário + toast |
| Candidato cancela | Notificação prioritária ao recrutador |
| Lembrete (24h antes) | Email automático + notificação in-app |

---

## Considerações Técnicas

### Segurança

| Aspecto | Implementação |
|---|---|
| **Tokens criptografados** | Access token e refresh token armazenados com criptografia AES-256 |
| **State CSRF** | Token de estado OAuth2 para prevenção de CSRF no callback |
| **PKCE** | Proof Key for Code Exchange para segurança adicional |
| **Scopes mínimos** | Apenas scopes necessários para funcionalidade |
| **Revogação** | Refresh token revogado no Google ao desconectar |

### Performance

| Otimização | Descrição |
|---|---|
| **Singleton** | Uma instância do serviço compartilhada |
| **Token cache** | Tokens em memória para evitar lookup no banco a cada request |
| **Batch events** | Listagem de eventos com paginação e cache |
| **Slot pre-computation** | Slots gerados uma vez e filtrados contra eventos existentes |

### Tratamento de Erros

| Erro | Ação |
|---|---|
| Token expirado | Refresh automático + retry |
| Refresh token inválido | Desconectar + notificar usuário |
| API indisponível | Queue + retry com backoff exponencial |
| Rate limit (Google) | Respeitar headers de rate limit + delay |
| Permissão insuficiente | Notificar + re-solicitar consentimento |
| Evento conflitante | Notificar + sugerir slots alternativos |

### Limitações Conhecidas

| Limitação | Detalhe |
|---|---|
| **Conta por usuário** | Cada recrutador conecta sua própria conta Google |
| **Sem compartilhamento** | Eventos criados na conta do recrutador conectado |
| **Meet links** | Requer que Hangouts Meet esteja disponível na organização |
| **Fuso horário** | Assume America/Sao_Paulo como padrão |
| **Feriados** | Feriados municipais/estaduais não são considerados automaticamente |
