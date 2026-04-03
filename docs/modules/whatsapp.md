# Módulo: WhatsApp Integration (Evolution API)

> **Versão:** 1.0 | **Status:** Produção | **Última atualização:** 2025

## Visão Geral

O módulo de integração WhatsApp conecta a plataforma Zion Recruit ao serviço de mensagens WhatsApp através da **Evolution API**, uma solução open-source de API não-oficial para WhatsApp Web. O módulo permite o envio e recebimento de mensagens, notificações automáticas de recrutamento e integração bidirecional com o módulo de Mensagens Omnichannel.

A implementação segue o padrão **Factory** para criação de instâncias do serviço, garantindo flexibilidade e testabilidade.

---

## Sumário

1. [Bibliotecas (Libs)](#bibliotecas-libs)
2. [Templates de Recrutamento](#templates-de-recrutamento)
3. [APIs REST](#apis-rest)
4. [Variáveis de Ambiente](#variáveis-de-ambiente)
5. [Componente de Interface](#componente-de-interface)
6. [Fluxo de Conexão](#fluxo-de-conexão)
7. [Fluxo de Webhook](#fluxo-de-webhook)
8. [Integração com Módulo de Mensagens](#integração-com-módulo-de-mensagens)
9. [Considerações Técnicas](#considerações-técnicas)

---

## Bibliotecas (Libs)

### `src/lib/whatsapp/evolution-service.ts`

**Exportação:** `EvolutionService` (classe), factory function

Serviço principal de integração com a Evolution API, implementado como classe singleton com padrão Factory.

#### Padrão Factory

```typescript
// Factory para criação da instância
function createEvolutionService(config?: EvolutionServiceConfig): EvolutionService;

// Instância singleton (lazy initialization)
const evolutionService = createEvolutionService();
```

#### Configuração

```typescript
interface EvolutionServiceConfig {
  apiUrl: string;    // EVOLUTION_API_URL
  apiKey: string;    // EVOLUTION_API_KEY
  instanceName?: string;  // Nome da instância (padrão: 'zion-recruit')
  timeout?: number;       // Timeout de requisições (padrão: 30000ms)
}
```

#### Métodos da Classe `EvolutionService`

| Método | Descrição | Retorno |
|---|---|---|
| `getStatus()` | Verifica status da conexão (configurada + conectada) | `{ configured: boolean, connected: boolean }` |
| `connect()` | Cria instância na Evolution API e inicia sessão WhatsApp | `{ instanceName, qrCode }` |
| `disconnect()` | Faz logout e desativa a instância | `{ success: boolean }` |
| `getQRCode()` | Obtém QR code para escaneamento | `{ qrCode: string }` |
| `sendMessage(phone, message)` | Envia mensagem de texto | `{ success: boolean, messageId?: string }` |
| `checkNumber(phone)` | Verifica se número existe no WhatsApp | `{ exists: boolean, jid?: string }` |
| `sendDISCTestLink(phone, candidateName, testUrl)` | Envia link de teste DISC | `SendMessageResult` |
| `sendInterviewReminderNotification(phone, candidateName, jobTitle, date, time)` | Envia lembrete de entrevista | `SendMessageResult` |
| `sendCandidateNotificationMessage(phone, candidateName, type, data)` | Envia notificação genérica ao candidato | `SendMessageResult` |
| `processWebhookEvent(event)` | Processa evento recebido do webhook | `void` |
| `formatPhoneNumber(phone)` | Formata número para padrão internacional | `string` |

#### Detalhamento dos Métodos Especializados

##### `sendDISCTestLink(phone, candidateName, testUrl)`

Envia mensagem formatada com link do teste DISC:

```
🧪 Teste DISC — Zion Recruit

Olá, {candidateName}! 👋

Você foi convidado(a) a realizar o teste de perfil comportamental DISC.

🔗 Acesse o teste: {testUrl}

⏱ Duração estimada: 15 minutos
📱 Recomendamos realizar em um computador

Boa sorte! 🎯
Equipe Zion Recruit
```

##### `sendInterviewReminderNotification(phone, candidateName, jobTitle, date, time)`

Envia lembrete de entrevista formatado:

```
📅 Lembrete de Entrevista — Zion Recruit

Olá, {candidateName}! 👋

Lembramos que sua entrevista está agendada:

📌 Vaga: {jobTitle}
📅 Data: {date}
🕐 Horário: {time}

Por favor, esteja disponível 10 minutos antes do horário agendado.

Boa sorte! 🍀
Equipe Zion Recruit
```

##### `sendCandidateNotificationMessage(phone, candidateName, type, data)`

Envia notificação ao candidato baseada no tipo:

| Tipo | Template |
|---|---|
| `welcome` | Mensagem de boas-vindas ao processo seletivo |
| `status_update` | Atualização de status no pipeline |
| `follow_up` | Follow-up de interação |
| `offer` | Proposta de contratação |
| `rejection` | Comunicação de não-avance no processo |

##### `formatPhoneNumber(phone)`

Normaliza números de telefone para o formato padrão internacional (E.164):

```typescript
// Exemplos
formatPhoneNumber('(11) 99999-9999')     // → '+5511999999999'
formatPhoneNumber('11999999999')          // → '+5511999999999'
formatPhoneNumber('+55 11 99999-9999')    // → '+5511999999999'
formatPhoneNumber('5511999999999')        // → '+5511999999999'
```

**Regras de formatação:**
1. Remove todos os caracteres não numéricos
2. Se não começa com `55` (código do Brasil), adiciona automaticamente
3. Se não começa com `+`, adiciona o prefixo `+`
4. Valida comprimento mínimo (10 dígitos com DDD)

---

### `src/lib/whatsapp/types.ts`

**Exportações:** Tipos e templates do módulo WhatsApp.

#### Tipos de Erro

```typescript
// Erro genérico do módulo
class WhatsAppError extends Error {
  code: string;
  details?: Record<string, any>;
  constructor(message: string, code: string, details?: Record<string, any>);
}

// Erro específico da Evolution API
class EvolutionAPIError extends WhatsAppError {
  statusCode: number;
  responseBody?: any;
  constructor(message: string, statusCode: number, responseBody?: any);
}
```

**Códigos de Erro:**

| Código | Descrição | Ação Sugerida |
|---|---|---|
| `NOT_CONFIGURED` | API URL ou Key não configuradas | Configurar variáveis de ambiente |
| `NOT_CONNECTED` | Instância não conectada ao WhatsApp | Escanear QR code novamente |
| `INVALID_PHONE` | Número de telefone inválido | Verificar formato do número |
| `PHONE_NOT_FOUND` | Número não encontrado no WhatsApp | Confirmar número com o candidato |
| `RATE_LIMITED` | Rate limit da API atingido | Aguardar e tentar novamente |
| `INSTANCE_ERROR` | Erro na criação/gestão da instância | Recriar instância |
| `API_ERROR` | Erro genérico da Evolution API | Verificar logs e status da API |
| `TIMEOUT` | Timeout na requisição | Verificar conectividade |

---

## Templates de Recrutamento

### `RECRUITMENT_TEMPLATES` — 7 Templates Predefinidos

Constante que define os templates de mensagem para cenários comuns de recrutamento.

```typescript
const RECRUITMENT_TEMPLATES = {
  DISC_TEST_INVITATION: {
    id: 'disc_test_invitation',
    name: 'Convite para Teste DISC',
    description: 'Convida o candidato a realizar o teste DISC',
    variables: ['candidateName', 'testUrl'],
  },
  INTERVIEW_REMINDER: {
    id: 'interview_reminder',
    name: 'Lembrete de Entrevista',
    description: 'Lembrete automático de entrevista agendada',
    variables: ['candidateName', 'jobTitle', 'date', 'time'],
  },
  WELCOME_CANDIDATE: {
    id: 'welcome_candidate',
    name: 'Boas-vindas ao Candidato',
    description: 'Mensagem de boas-vindas ao iniciar processo seletivo',
    variables: ['candidateName', 'companyName', 'jobTitle'],
  },
  STATUS_UPDATE: {
    id: 'status_update',
    name: 'Atualização de Status',
    description: 'Informa mudança de estágio no processo',
    variables: ['candidateName', 'jobTitle', 'newStage'],
  },
  INTERVIEW_CONFIRMED: {
    id: 'interview_confirmed',
    name: 'Confirmação de Entrevista',
    description: 'Confirma agendamento de entrevista',
    variables: ['candidateName', 'jobTitle', 'date', 'time', 'location'],
  },
  OFFER_LETTER: {
    id: 'offer_letter',
    name: 'Proposta de Contratação',
    description: 'Notificação de proposta de contratação',
    variables: ['candidateName', 'jobTitle', 'companyName'],
  },
  REJECTION_NOTICE: {
    id: 'rejection_notice',
    name: 'Comunicação de Não-avance',
    description: 'Comunica que o candidato não avançará no processo',
    variables: ['candidateName', 'jobTitle', 'companyName'],
  },
} as const;
```

### Detalhamento dos Templates

| # | ID | Nome | Variáveis | Quando é Usado |
|---|---|---|---|---|
| 1 | `DISC_TEST_INVITATION` | Convite para Teste DISC | `candidateName`, `testUrl` | Candidato no estágio DISC_TEST |
| 2 | `INTERVIEW_REMINDER` | Lembrete de Entrevista | `candidateName`, `jobTitle`, `date`, `time` | 24h antes da entrevista |
| 3 | `WELCOME_CANDIDATE` | Boas-vindas ao Candidato | `candidateName`, `companyName`, `jobTitle` | Nova candidatura recebida |
| 4 | `STATUS_UPDATE` | Atualização de Status | `candidateName`, `jobTitle`, `newStage` | Mudança de estágio no pipeline |
| 5 | `INTERVIEW_CONFIRMED` | Confirmação de Entrevista | `candidateName`, `jobTitle`, `date`, `time`, `location` | Candidato confirma entrevista |
| 6 | `OFFER_LETTER` | Proposta de Contratação | `candidateName`, `jobTitle`, `companyName` | Candidato aprovado e oferta enviada |
| 7 | `REJECTION_NOTICE` | Comunicação de Não-avance | `candidateName`, `jobTitle`, `companyName` | Candidato rejeitado no pipeline |

---

## APIs REST

### `GET /api/whatsapp`

Obtém status da conexão WhatsApp.

**Resposta:**
```json
{
  "configured": true,
  "connected": true,
  "instanceName": "zion-recruit",
  "phoneNumber": "+5511999999999",
  "lastSync": "2025-01-20T14:30:00Z"
}
```

---

### `POST /api/whatsapp`

Envia notificação ao candidato via WhatsApp.

**Body:**
```json
{
  "candidateId": "uuid",
  "type": "welcome",
  "data": {
    "jobTitle": "Desenvolvedor Frontend",
    "companyName": "TechCorp"
  }
}
```

**Tipos de Notificação:**

| Tipo | Descrição | Dados Obrigatórios |
|---|---|---|
| `welcome` | Boas-vindas ao processo | `jobTitle`, `companyName` |
| `status_update` | Atualização de status | `jobTitle`, `newStage` |
| `follow_up` | Follow-up de interação | `jobTitle` |
| `offer` | Proposta de contratação | `jobTitle`, `companyName` |
| `rejection` | Comunicação de rejeição | `jobTitle`, `companyName` |

**Resposta:**
```json
{
  "success": true,
  "messageId": "wamid_abc123",
  "phoneNumber": "+5511999999999",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

**Erros:**
| Status | Condição |
|---|---|
| `400` | Tipo de notificação inválido |
| `404` | Candidato não encontrado ou sem telefone |
| `503` | WhatsApp não conectado |

---

### `POST /api/whatsapp/connect`

Cria instância na Evolution API e inicia sessão WhatsApp.

**Body (opcional):**
```json
{
  "instanceName": "zion-recruit"
}
```

**Resposta:**
```json
{
  "success": true,
  "instanceName": "zion-recruit",
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "qrCodeText": "2@abc123..."
}
```

**Comportamento:**
1. Cria a instância na Evolution API (se não existir)
2. Inicia a sessão WhatsApp
3. Gera QR code para escaneamento
4. Retorna QR code em base64 (para renderização no `WhatsAppSettingsCard`)

---

### `POST /api/whatsapp/disconnect`

Desconecta e desativa a instância WhatsApp.

**Resposta:**
```json
{
  "success": true,
  "message": "WhatsApp desconectado com sucesso"
}
```

**Comportamento:**
1. Faz logout da sessão WhatsApp
2. Desativa a instância na Evolution API
3. Limpa estado local de conexão

---

### `POST /api/whatsapp/qrcode`

Obtém QR code para escaneamento (sem criar nova instância).

**Resposta:**
```json
{
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "qrCodeText": "2@abc123...",
  "expiresAt": "2025-01-20T14:35:00Z"
}
```

---

### `POST /api/whatsapp/send`

Envia mensagem de texto bruta para um número.

**Body:**
```json
{
  "phone": "+5511999999999",
  "message": "Olá! Esta é uma mensagem de teste da Zion Recruit."
}
```

**Resposta:**
```json
{
  "success": true,
  "messageId": "wamid_abc123",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

---

### `POST /api/whatsapp/check-number`

Verifica se um número de telefone existe no WhatsApp.

**Body:**
```json
{
  "phone": "+5511999999999"
}
```

**Resposta:**
```json
{
  "exists": true,
  "jid": "5511999999999@s.whatsapp.net",
  "formattedPhone": "+5511999999999"
}
```

---

### `POST /api/whatsapp/webhook`

Webhook receiver para eventos da Evolution API.

**Body (evento da Evolution API):**
```json
{
  "instance": "zion-recruit",
  "event": "messages.upsert",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "wamid_abc123"
    },
    "message": {
      "conversation": "Olá, gostaria de saber mais sobre a vaga."
    },
    "messageTimestamp": "1705764600"
  }
}
```

**Eventos Suportados:**

| Evento Evolution API | Ação no Sistema |
|---|---|
| `messages.upsert` | Processa mensagem recebida → cria Message no módulo de mensagens |
| `connection.update` | Atualiza status de conexão (connected/disconnected) |
| `QRCODE_UPDATED` | Gera novo QR code (sessão expirada) |

**Resposta:**
```json
{
  "success": true
}
```

---

## Variáveis de Ambiente

| Variável | Tipo | Obrigatória | Descrição |
|---|---|---|---|
| `EVOLUTION_API_URL` | `string` | Sim | URL base da Evolution API (ex: `http://localhost:8080`) |
| `EVOLUTION_API_KEY` | `string` | Sim | Chave de API para autenticação com a Evolution API |

**Exemplo de configuração (`.env`):**
```env
# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your-evolution-api-key-here
```

**Validação:**
O serviço verifica a presença dessas variáveis na inicialização. Se ausentes, o status de configuração é marcado como `configured: false` e as funcionalidades de envio são desabilitadas.

---

## Componente de Interface

### `WhatsAppSettingsCard`

Localizado no módulo de [Mensagens Omnichannel](./messages.md), este card fornece a interface de configuração do WhatsApp.

**Funcionalidades na Interface:**

```
┌─────────────────────────────────────────────────────────────────┐
│  📱 Configuração WhatsApp                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Status: 🟢 Conectado                                            │
│  Número: +55 (11) 99999-9999                                     │
│  Instância: zion-recruit                                         │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │              [ QR CODE AQUI ]                             │  │
│  │                                                           │  │
│  │           ⏳ Aguardando escaneamento...                   │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 📨 Mensagem de Teste                                      │  │
│  │ Para: [_________________________]                         │  │
│  │ [Enviar Mensagem de Teste]                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [          Desconectar WhatsApp          ]                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Estados Visuais:**

| Estado | Indicador | Ação Principal |
|---|---|---|
| Não configurado | 🔴 + "API não configurada" | Instruir a configurar env vars |
| Desconectado | 🟡 + "Clique para conectar" | Botão "Conectar" |
| Conectando | 🔄 + "Gerando QR Code..." | Loading spinner |
| Aguardando scan | 🔵 + "Escaneie o QR Code" | Exibir QR Code |
| Conectado | 🟢 + "Conectado" | Opções de teste e desconexão |
| Erro | 🔴 + mensagem de erro | Botão "Tentar novamente" |

---

## Fluxo de Conexão

```
  Recrutador                Backend                   Evolution API          WhatsApp
     │                        │                            │                     │
     │ 1. Clicar "Conectar"  │                            │                     │
     │ ─────────────────────→│                            │                     │
     │                        │                            │                     │
     │                        │ 2. POST /instances         │                     │
     │                        │ { instanceName }           │                     │
     │                        │ ─────────────────────────→│                     │
     │                        │ 3. 201 Created             │                     │
     │                        │ ←─────────────────────────│                     │
     │                        │                            │                     │
     │                        │ 4. POST /instance/connect  │                     │
     │                        │ ─────────────────────────→│                     │
     │                        │ 5. QR Code gerado          │                     │
     │                        │ ←─────────────────────────│                     │
     │                        │                            │                     │
     │ 6. QR Code retornado   │                            │                     │
     │ ←─────────────────────│                            │                     │
     │                        │                            │                     │
     │ 7. Escanear QR Code   │                            │                     │
     │ (no celular)           │                            │                     │
     │ ───────────────────────────────────────────────────────────────────→│
     │                        │                            │  8. Conexão OK     │
     │                        │                            │ ←──────────────────│
     │                        │  9. Webhook: connection.update                  │
     │                        │ ←─────────────────────────│                     │
     │                        │                            │                     │
     │ 10. Status: Conectado  │                            │                     │
     │ ←─────────────────────│                            │                     │
     │  (via WebSocket)       │                            │                     │
```

---

## Fluxo de Webhook

### Recebimento de Mensagem

```
  Candidato              WhatsApp          Evolution API        Backend              Módulo Mensagens
     │                     │                      │                │                        │
     │ 1. Envia mensagem   │                      │                │                        │
     │ ──────────────────→│                      │                │                        │
     │                     │                      │                │                        │
     │                     │ 2. Webhook           │                │                        │
     │                     │ messages.upsert      │                │                        │
     │                     │ ────────────────────→│                │                        │
     │                     │                      │                │                        │
     │                     │                      │ 3. POST        │                        │
     │                     │                      │ /webhook       │                        │
     │                     │                      │ ─────────────→│                        │
     │                     │                      │                │                        │
     │                     │                      │                │ 4. processWebhookEvent  │
     │                     │                      │                │  - Identificar candidato│
     │                     │                      │                │  - Buscar/criar conversa│
     │                     │                      │                │  - Criar Message        │
     │                     │                      │                │  - Emitir via Socket.IO │
     │                     │                      │                │ ───────────────────────→│
     │                     │                      │                │                        │
     │                     │                      │                │ 5. 200 OK              │
     │                     │                      │ ←─────────────│                        │
     │                     │                      │                │                        │
     │                     │ 6. 200 OK            │                │                        │
     │                     │ ←────────────────────│                │                        │
```

### Evento de Conexão

```
  Evolution API              Backend               WebSocket (3004)       Recrutadores
       │                      │                         │                      │
       │ 1. connection.update │                         │                      │
       │ { state: "open" }    │                         │                      │
       │ ────────────────────→│                         │                      │
       │                      │                         │                      │
       │                      │ 2. Atualizar status     │                      │
       │                      │ connected: true         │                      │
       │                      │                         │                      │
       │                      │ 3. Emitir               │                      │
       │                      │ whatsapp:status:changed │                      │
       │                      │ ───────────────────────→│                      │
       │                      │                         │ 4. Broadcast          │
       │                      │                         │ ────────────────────→│
       │                      │                         │                      │
       │                      │ 5. 200 OK               │                      │
       │ ←────────────────────│                         │                      │
```

---

## Integração com Módulo de Mensagens

O módulo WhatsApp integra-se bidirecionalmente com o [Módulo de Mensagens Omnichannel](./messages.md):

### Envio (Módulo Mensagens → WhatsApp)

```
Recrutador envia mensagem pelo ChatView (canal WHATSAPP)
    → POST /api/messages/conversations/[id]/messages
    → Verifica canal da conversação
    → Se WHATSAPP: EvolutionService.sendMessage()
    → Mensagem entregue via WhatsApp
    → Resposta salva no banco
```

### Recebimento (WhatsApp → Módulo Mensagens)

```
Candidato envia mensagem no WhatsApp
    → Evolution API webhook
    → POST /api/whatsapp/webhook
    → processWebhookEvent()
    → Identifica candidato pelo JID (número de telefone)
    → Busca conversação existente ou cria nova
    → Cria Message no banco
    → Emite via Socket.IO para clientes conectados
    → Recrutadores veem mensagem em tempo real no ChatView
```

### Mapeamento de Canais

| Canal no Módulo Mensagens | Integração WhatsApp |
|---|---|
| `WHATSAPP` | Direta — mensagens roteadas via Evolution API |
| `INTERNAL` | Sem integração — chat interno apenas |
| `EMAIL` | Sem integração — módulo separado |
| `SMS` | Sem integração — módulo separado |

---

## Considerações Técnicas

### Limitações da Evolution API

| Limitação | Impacto | Mitigação |
|---|---|---|
| API não-oficial | Pode parar de funcionar com atualizações do WhatsApp | Monitoramento de status + fallback para chat interno |
| Rate limiting | Limite de mensagens por minuto | Queue de mensagens + retry com backoff |
| Sessão expirável | QR code expira após ~60 segundos | Auto-refresh do QR code + notificação ao usuário |
| Conexão única | Uma instância = um número WhatsApp | Arquitetura permite múltiplas instâncias no futuro |

### Segurança

| Aspecto | Implementação |
|---|---|
| **API Key** | Armazenada em variável de ambiente, nunca exposta ao client |
| **Webhook validation** | Validação de origem e assinatura do webhook |
| **Sanitização de mensagens** | Conteúdo sanitizado antes do armazenamento |
| **Isolamento de tenant** | Mensagens filtradas por tenant ao processar webhook |

### Tratamento de Erros

| Erro | Ação |
|---|---|
| API não configurada | Exibe card com instruções de configuração |
| Conexão perdida | Notifica recrutadores via notificação in-app |
| Falha no envio | Retry automático (3 tentativas) + fallback para chat interno |
| QR code expirado | Gera novo QR code automaticamente |
| Número inválido | Validação prévia via `checkNumber` |
