# Módulo: Mensagens Omnichannel

> **Versão:** 2.0 | **Status:** Produção | **Última atualização:** 2025-06

## Visão Geral

O módulo de Mensagens Omnichannel é o centro de comunicação da plataforma Zion Recruit, permitindo a interação em tempo real com candidatos através de múltiplos canais (WhatsApp, Email, SMS, Chat interno). O sistema integra inteligência artificial para triagem automatizada de candidatos, com detecção de necessidade de intervenção humana e scoring de fit.

A arquitetura é baseada em um painel dividido (split-panel) com lista de conversas à esquerda e visualização de chat à direita, suportando tanto desktop (side-by-side) quanto mobile (slide overlay).

### v2.0 — Melhorias (Junho 2025)

- **Isolamento de Tenant:** Todas as APIs agora usam `getServerSession(authOptions)` para filtrar por `tenantId` — eliminou o `DEMO_TENANT_ID` hard-coded e o vazamento de dados entre tenants
- **Correção de Syntax:** Bug de bracket faltando na query de busca do endpoint `GET /api/messages/conversations`
- **Removido `DEMO_TENANT_ID`:** Substituído por `session.user.tenantId` em todos os endpoints (`conversations`, `messages`, `read`, `ai-process`)
- **`senderId` real:** Mensagens agora registram o `session.user.id` como remetente em vez de `null`
- **`unreadByCandidate`:** Campo atualizado no envio de mensagens recrutador
- **Read Receipts:** Endpoint `/read` agora marca mensagens individuais com `readAt` timestamp
- **Botões funcionais no Chat:** Ver perfil, Ver currículo, Ligar, Videochamada, Encerrar conversa, Copiar telefone, Copiar e-mail
- **Upload de arquivos:** Botão paperclip funcional com validação de tamanho (10MB)
- **Emoji Picker:** Popover com categorias (Frequentes, Caras, Gestos)
- **Respostas rápidas:** 8 templates pré-definidos (boas-vindas, disponibilidade, salário, etc.)
- **Sugestões IA dinâmicas:** Baseadas no estágio de triagem atual (WELCOME, EXPERIENCE_CHECK, etc.)
- **Nova conversa:** Dialog de composição com busca de candidatos e seleção de canal
- **Context menu:** Clique direito em mensagens para responder/copiar/fixar
- **Reply bar:** Indicador visual quando respondendo a uma mensagem
- **Connection status:** Indicador Online/Offline no header e barra de aviso quando offline
- **Triagem IA vazia:** Botão "Iniciar triagem com IA" quando não há mensagens
- **Textarea:** Campo de texto agora usa Textarea com suporte a Shift+Enter para nova linha
- **Link preview:** URLs em mensagens são renderizadas como links clicáveis

---

## Sumário

1. [Componentes](#componentes)
2. [Store - Zustand](#store---zustand)
3. [Tipos (Types)](#tipos-types)
4. [Hooks](#hooks)
5. [APIs REST](#apis-rest)
6. [Mini Serviço WebSocket](#mini-serviço-websocket)
7. [Serviço de Triagem IA](#serviço-de-triagem-ia)
8. [Integrações](#integrações)
9. [Considerações Técnicas](#considerações-técnicas)

---

## Componentes

### `messages-page.tsx`

**Exportação:** `MessagesPage`

Componente principal do módulo que implementa o layout de painel dividido (split-panel).

**Responsabilidades:**
- Renderização do layout responsivo: desktop com painéis lado a lado, mobile com slide overlay
- Coordenação entre `ConversationsList` e `ChatView`
- Gerenciamento do estado de conversa selecionada
- Integração com `WhatsAppSettingsCard` no painel de configurações

**Comportamento Responsivo:**
| Dispositivo | Layout |
|---|---|
| Desktop (≥1024px) | Painéis lado a lado (side-by-side) |
| Tablet (768px–1023px) | Painel colapsável |
| Mobile (<768px) | Slide overlay com botão de voltar |

---

### `conversations-list.tsx`

**Exportação:** `ConversationsList`

Lista de conversas com funcionalidades de busca e filtros avançados.

**Funcionalidades:**
- **Busca textual:** Filtro por nome do candidato ou conteúdo da mensagem
- **Filtro por status:** Aberto, Em Triagem IA, Fechado, Arquivado
- **Filtro por canal:** WhatsApp, Email, SMS, Chat Interno
- **Toggle de intervenção:** Filtrar apenas conversas que necessitam de intervenção humana
- **Ordenação:** Por data da última mensagem (mais recente primeiro)
- **Indicadores visuais:** Badge de mensagens não lidas, avatar do candidato, preview da última mensagem

**Filtros Disponíveis:**
| Filtro | Tipo | Valores |
|---|---|---|
| `status` | Select | `OPEN`, `AI_SCREENING`, `CLOSED`, `ARCHIVED` |
| `channel` | Select | `WHATSAPP`, `EMAIL`, `SMS`, `INTERNAL` |
| `search` | Text | Busca livre |
| `needsIntervention` | Toggle | `true` / `false` |
| `jobId` | UUID | Filtrar por vaga específica |

---

### `chat-view.tsx`

**Exportação:** `ChatView`

Visualização de chat com mensagens agrupadas por data e recursos de IA.

**Funcionalidades:**
- **Agrupamento por data:** Mensagens separadas por cabeçalhos de data (Hoje, Ontem, etc.)
- **Banner de intervenção:** Indicador visual quando a conversa requer atenção humana
- **Toggle de IA:** Ativar/desativar o modo de triagem por IA
- **Indicador de digitação:** Animação de "digitando..." em tempo real via WebSocket
- **Chips de sugestão IA:** Botões de ação rápida sugeridos pela IA durante a triagem
- **Envio de mensagens:** Campo de texto com suporte a envio por Enter e botão de envio
- **Timeline de status:** Indicador visual do estágio atual da triagem IA

**Chips de Sugestão IA:**
Contextuais ao estágio atual da triagem, podem incluir:
- "Solicitar experiência profissional"
- "Verificar disponibilidade"
- "Perguntar sobre pretensão salarial"
- "Agendar entrevista"
- "Transferir para humano"

---

### `compose-message-dialog.tsx`

**Exportação:** `ComposeMessageDialog`

Dialog para criação de nova conversa com um candidato.

**Funcionalidades:**
- **Busca de candidatos:** Busca textual por nome ou e-mail com debounce de 300ms
- **Seleção de canal:** Chat interno, WhatsApp, E-mail
- **Mensagem inicial:** Campo opcional para enviar uma mensagem de abertura junto com a criação
- **Layout em steps:** Busca → Compor, com animação de transição
- **Badge de vaga:** Exibe a vaga do candidato na lista de resultados

---

### `whatsapp-settings-card.tsx`

**Exportação:** `WhatsAppSettingsCard`

Card de configuração do canal WhatsApp integrado com Evolution API.

**Funcionalidades:**
- **Escaneamento de QR Code:** Exibe QR code para conexão com WhatsApp
- **Envio de mensagem de teste:** Valida a conexão enviando uma mensagem teste
- **Desconexão:** Logout e desativação da instância WhatsApp
- **Status de conexão:** Indicador visual do estado da conexão (conectado/desconectado/conectando)

---

## Store - Zustand

### `useMessagingStore` — `src/stores/messaging-store.ts`

Store global de gerenciamento de estado do módulo de mensagens, implementado com Zustand.

**Propriedades de Estado (40+):**

| Categoria | Propriedades | Descrição |
|---|---|---|
| **Conversas** | `conversations`, `selectedConversationId`, `conversationsFilter`, `conversationsLoading` | Lista, seleção, filtros e estado de carregamento |
| **Mensagens** | `messages`, `messagesLoading`, `hasMoreMessages`, `cursor` | Lista de mensagens do chat ativo e paginação |
| **Busca** | `searchQuery`, `searchResults`, `isSearching` | Estado da busca textual |
| **Filtros** | `statusFilter`, `channelFilter`, `needsInterventionFilter`, `jobFilter` | Filtros ativos da lista de conversas |
| **WebSocket** | `isConnected`, `typingUsers`, `socket` | Estado da conexão WebSocket e usuários digitando |
| **IA** | `aiMode`, `aiStage`, `aiSuggestions`, `isProcessing` | Modo IA, estágio de triagem e sugestões |
| **UI** | `isMobilePanelOpen`, `isSettingsOpen`, `isComposing` | Estados da interface |
| **Paginação** | `conversationsPage`, `conversationsHasMore`, `conversationsTotalCount` | Paginação da lista de conversas |

**Ações Principais:**

```typescript
// Conversas
fetchConversations(params?) → Promise<void>
selectConversation(id: string) → Promise<void>
createConversation(input: CreateConversationInput) → Promise<Conversation>
updateConversation(id: string, data) → Promise<Conversation>
archiveConversation(id: string) → Promise<void>

// Mensagens
fetchMessages(conversationId: string, cursor?) → Promise<void>
sendMessage(conversationId: string, input: SendMessageInput) → Promise<Message>
loadMoreMessages() → Promise<void>

// IA
toggleAIMode(conversationId: string, enabled: boolean) → Promise<void>
processAI(conversationId: string) → Promise<void>

// WebSocket
setConnected(connected: boolean) → void
addTypingUser(userId: string) → void
removeTypingUser(userId: string) → void
handleNewMessage(message: Message) → void

// UI
setSearchQuery(query: string) → void
setMobilePanelOpen(open: boolean) → void
setFilters(filters) → void
```

---

## Tipos (Types)

### Arquivo: `src/types/messaging.ts`

```typescript
// Tipos principais
type Conversation = {
  id: string;
  candidateId: string;
  jobId?: string;
  channel: ChannelType;
  status: ConversationStatus;
  aiMode: boolean;
  aiStage?: AIStage;
  notes?: string;
  needsIntervention: boolean;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

type ConversationWithDetails = Conversation & {
  candidate: { id: string; name: string; email: string; phone?: string; avatarUrl?: string };
  job?: { id: string; title: string; department: string };
  lastMessage?: Message;
  unreadCount: number;
}

type Message = {
  id: string;
  conversationId: string;
  content: string;
  senderType: 'CANDIDATE' | 'AGENT' | 'AI';
  senderId?: string;
  messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO';
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

type MessageChannel = {
  id: string;
  type: ChannelType;
  name: string;
  isActive: boolean;
  config: Record<string, any>;
}

type MessageTemplate = {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  isActive: boolean;
}

// Enums
type ConversationStatus = 'OPEN' | 'AI_SCREENING' | 'CLOSED' | 'ARCHIVED';
type ChannelType = 'WHATSAPP' | 'EMAIL' | 'SMS' | 'INTERNAL';
type AIStage = 'WELCOME' | 'INTRODUCTION' | 'EXPERIENCE_CHECK' | 'AVAILABILITY_CHECK' | 'SALARY_CHECK' | 'SKILLS_CHECK' | 'MOTIVATION_CHECK' | 'FIT_ANALYSIS' | 'SCHEDULING' | 'HANDOFF' | 'CLOSED';

// Inputs
type SendMessageInput = {
  content: string;
  messageType?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO';
  metadata?: Record<string, any>;
}

type CreateConversationInput = {
  candidateId: string;
  jobId?: string;
  channel?: ChannelType;
}
```

---

## Hooks

### `useMessagingSocket` — `src/hooks/use-messaging-socket.ts`

Hook para gerenciamento da conexão Socket.IO com o mini-serviço de mensagens.

**Configuração:**
- **URL:** `http://localhost:3004`
- **Transporte:** WebSocket com fallback polling
- **Reconexão automática:** Habilitada com backoff exponencial

**Eventos Escutados:**

| Evento | Descrição | Payload |
|---|---|---|
| `connect` | Conexão estabelecida | — |
| `disconnect` | Conexão perdida | — |
| `conversation:message` | Nova mensagem recebida | `Message` |
| `conversation:typing` | Indicador de digitação | `{ conversationId, userId }` |
| `conversation:read` | Conversa marcada como lida | `{ conversationId, userId }` |
| `ai:process:complete` | Triagem IA finalizada | `{ conversationId, stage, fitScore }` |
| `conversation:status` | Status da conversa alterado | `{ conversationId, status }` |

**Eventos Emitidos:**

| Evento | Descrição | Payload |
|---|---|---|
| `join:tenant` | Entrar na sala do tenant | `{ tenantId }` |
| `join:conversation` | Entrar na sala de conversa | `{ conversationId }` |
| `leave:conversation` | Sair da sala de conversa | `{ conversationId }` |
| `message:send` | Enviar mensagem | `{ conversationId, content, messageType }` |
| `typing:start` | Iniciar digitação | `{ conversationId }` |
| `typing:stop` | Parar digitação | `{ conversationId }` |
| `conversation:read` | Marcar como lida | `{ conversationId }` |

---

## APIs REST

### Conversações

#### `GET /api/messages/conversations`

Lista todas as conversações com filtros e paginação.

**Parâmetros de Query:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `status` | `ConversationStatus` | Não | Filtrar por status |
| `channel` | `ChannelType` | Não | Filtrar por canal |
| `jobId` | `string` | Não | Filtrar por vaga |
| `search` | `string` | Não | Busca textual |
| `needsIntervention` | `boolean` | Não | Apenas com necessidade de intervenção |
| `page` | `number` | Não | Página atual (padrão: 1) |
| `limit` | `number` | Não | Itens por página (padrão: 20) |

**Resposta:**
```json
{
  "conversations": [ConversationWithDetails],
  "pagination": { "page": 1, "limit": 20, "total": 150, "hasMore": true }
}
```

#### `POST /api/messages/conversations`

Cria uma nova conversação.

**Body:**
```json
{
  "candidateId": "uuid",
  "jobId": "uuid (opcional)",
  "channel": "WHATSAPP (opcional, padrão: INTERNAL)"
}
```

**Resposta:** `Conversation`

#### `GET /api/messages/conversations/[id]`

Obtém detalhes de uma conversação com dados do candidato e vaga.

**Resposta:** `ConversationWithDetails`

#### `PATCH /api/messages/conversations/[id]`

Atualiza uma conversação.

**Body (parcial):**
```json
{
  "status": "AI_SCREENING",
  "aiMode": true,
  "notes": "Candidato promissor, agendar entrevista"
}
```

**Resposta:** `Conversation`

#### `DELETE /api/messages/conversations/[id]`

Arquiva uma conversação (soft delete).

**Resposta:** `{ success: true }`

---

### Mensagens

#### `GET /api/messages/conversations/[id]/messages`

Lista mensagens de uma conversação com paginação via cursor.

**Parâmetros de Query:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `before` | `string` | Não | Cursor (ID da mensagem mais antiga carregada) |
| `limit` | `number` | Não | Limite de mensagens (padrão: 50) |

**Resposta:**
```json
{
  "messages": [Message],
  "cursor": "message-id (ou null se não há mais)",
  "hasMore": true
}
```

#### `POST /api/messages/conversations/[id]/messages`

Envia uma mensagem na conversação.

**Body:**
```json
{
  "content": "Olá, candidato! Gostaria de agendar uma entrevista?",
  "messageType": "TEXT"
}
```

**Resposta:** `Message`

---

### IA

#### `POST /api/messages/conversations/[id]/ai-process`

Inicia ou continua o processo de triagem IA para a conversação.

**Resposta:**
```json
{
  "stage": "INTRODUCTION",
  "message": "Mensagem gerada pela IA",
  "fitScore": null,
  "needsIntervention": false
}
```

---

### Canais

#### `GET /api/messages/channels`

Lista todos os canais de mensagens configurados.

**Resposta:** `MessageChannel[]`

#### `POST /api/messages/channels`

Cria um novo canal de mensagens.

**Body:**
```json
{
  "type": "WHATSAPP",
  "name": "WhatsApp Principal",
  "config": { "instanceId": "xyz" }
}
```

**Resposta:** `MessageChannel`

---

### Templates

#### `GET /api/messages/templates`

Lista templates de mensagem. Auto-cria 5 templates padrão se não existirem.

**Templates padrão criados automaticamente:**
1. **Boas-vindas** — Saudação inicial ao candidato
2. **Confirmação de Entrevista** — Detalhes da entrevista agendada
3. **Atualização de Status** — Informação sobre andamento do processo
4. **Solicitação de DISC** — Convite para realizar o teste DISC
5. **Agradecimento/Recusa** — Mensagem de encerramento

**Resposta:** `MessageTemplate[]`

#### `POST /api/messages/templates`

Cria um novo template de mensagem.

**Body:**
```json
{
  "name": "Lembrete de Entrevista",
  "content": "Olá {{candidateName}}, lembramos que sua entrevista para a vaga {{jobTitle}} é amanhã às {{interviewTime}}.",
  "category": "INTERVIEW",
  "variables": ["candidateName", "jobTitle", "interviewTime"]
}
```

**Resposta:** `MessageTemplate`

---

## Mini Serviço WebSocket

### `mini-services/messaging-ws` — Porta 3004

Servidor Socket.IO dedicado para comunicação em tempo real do módulo de mensagens.

### Salas (Rooms)

| Tipo | Identificador | Descrição |
|---|---|---|
| **Tenant** | `tenant:{tenantId}` | Broadcast para todos os usuários do tenant |
| **Conversa** | `conversation:{conversationId}` | Broadcast para usuários na conversa |

### Rastreamento de Usuários

O servidor mantém um mapa de usuários conectados por tenant e por conversa:

```typescript
// Estrutura interna
userRooms: Map<socketId, { tenantId, conversationIds: Set<string> }>
tenantUsers: Map<tenantId, Set<socketId>>
conversationUsers: Map<conversationId, Set<socketId>>
```

### Eventos Suportados

| Evento | Direção | Descrição |
|---|---|---|
| `join:tenant` | Cliente → Servidor | Entrar na sala do tenant |
| `join:conversation` | Cliente → Servidor | Entrar em uma sala de conversa específica |
| `leave:conversation` | Cliente → Servidor | Sair de uma sala de conversa |
| `message:send` | Cliente → Servidor | Enviar mensagem (broadcast para sala da conversa) |
| `typing:start` | Cliente → Servidor | Iniciar indicador de digitação |
| `typing:stop` | Cliente → Servidor | Parar indicador de digitação |
| `conversation:read` | Cliente → Servidor | Marcar conversa como lida |
| `ai:process:complete` | Servidor → Cliente | Notificar conclusão da triagem IA |

### Fluxo de Eventos - Envio de Mensagem

```
1. Cliente emite "message:send" com { conversationId, content }
2. Servidor recebe e persiste a mensagem no banco de dados
3. Servidor emite "conversation:message" para a sala da conversa
4. Todos os clientes na sala recebem a nova mensagem em tempo real
5. Store do Zustand é atualizado automaticamente
```

### Fluxo de Eventos - Digitação

```
1. Usuário inicia digitação → emite "typing:start"
2. Servidor broadcast "conversation:typing" para sala da conversa
3. Outros usuários veem indicador de digitação
4. Usuário para de digitar (3s timeout) → emite "typing:stop"
5. Servidor notifica remoção do indicador
```

---

## Serviço de Triagem IA

### `src/lib/ai-screening-service.ts`

Serviço que implementa o fluxo multi-estágio de triagem automatizada de candidatos via IA.

### Persona da IA

- **Nome:** Zoe
- **Empresa:** Zion Recruit
- **Tom:** Profissional, acolhedor e objetivo
- **Idioma:** Português brasileiro

### Fluxo de Estágios (Pipeline)

```
┌─────────────────────────────────────────────────────────────────┐
│                     PIPELINE DE TRIAGEM IA                      │
├──────────┬──────────────────────────────────────────────────────┤
│ Estágio  │ Descrição                                            │
├──────────┼──────────────────────────────────────────────────────┤
│ WELCOME  │ Mensagem de boas-vindas ao candidato                 │
│ INTRODUCTION │ Apresentação do processo seletivo             │
│ EXPERIENCE_CHECK │ Verificação de experiência profissional   │
│ AVAILABILITY_CHECK │ Checagem de disponibilidade            │
│ SALARY_CHECK │ Alinhamento de pretensão salarial             │
│ SKILLS_CHECK │ Avaliação de habilidades técnicas              │
│ MOTIVATION_CHECK │ Motivação e interesse na vaga             │
│ FIT_ANALYSIS │ Análise consolidada do fit do candidato      │
│ SCHEDULING │ Agendamento de entrevista (se aprovado)          │
│ HANDOFF │ Transferência para recrutador humano                │
│ CLOSED │ Processo encerrado                                  │
└──────────┴──────────────────────────────────────────────────────┘
```

### Detalhamento dos Estágios

| Estágio | Objetivo | Informações Coletadas |
|---|---|---|
| `WELCOME` | Saudação inicial e estabelecimento de rapport | — |
| `INTRODUCTION` | Explicar o processo seletivo da vaga | Confirmação de interesse |
| `EXPERIENCE_CHECK` | Avaliar experiência profissional relevante | Tempo de experiência, empresas anteriores, cargos |
| `AVAILABILITY_CHECK` | Verificar disponibilidade para trabalho | Início imediato, período de aviso, turno |
| `SALARY_CHECK` | Alinhar pretensão salarial | Faixa salarial pretendida |
| `SKILLS_CHECK` | Avaliar habilidades técnicas específicas | Tecnologias, ferramentas, certificações |
| `MOTIVATION_CHECK` | Compreender motivação e interesse | Razão de interesse na vaga/empresa |
| `FIT_ANALYSIS` | Consolidar análise do candidato | Score de fit (0-100) |
| `SCHEDULING` | Agendar entrevista com recrutador | Datas e horários disponíveis |
| `HANDOFF` | Transferir para recrutador humano | Resumo da triagem |
| `CLOSED` | Encerrar o processo | Motivo do encerramento |

### Detecção de Intervenção Humana

O sistema monitora automaticamente situações que requerem intervenção humana:

- **Sentimento negativo:** Candidato demonstra insatisfação ou frustração
- **Pergunta complexa:** Questão fora do escopo da triagem automatizada
- **Solicitação explícita:** Candidato pede para falar com alguém
- **Rejeição de estágio:** Candidato não coopera com o fluxo atual
- **Score de fit baixo:** Candidato não atende requisitos mínimos

Quando detectada, a propriedade `needsIntervention` da conversação é marcada como `true` e um banner visual é exibido na interface.

### Cálculo do Fit Score

O score de fit é calculado com base em múltiplos fatores:

```typescript
interface FitAnalysis {
  experienceFit: number;    // 0-100: Alinhamento de experiência
  availabilityFit: number;  // 0-100: Compatibilidade de disponibilidade
  salaryFit: number;        // 0-100: Alinhamento salarial
  skillsFit: number;        // 0-100: Correspondência de habilidades
  motivationFit: number;    // 0-100: Nível de motivação
  overallScore: number;     // 0-100: Score consolidado (média ponderada)
  recommendation: 'PROCEED' | 'HOLD' | 'REJECT';
  reasoning: string;        // Explicação textual da análise
}
```

**Pesos padrão:**
| Fator | Peso |
|---|---|
| `experienceFit` | 25% |
| `skillsFit` | 25% |
| `availabilityFit` | 20% |
| `motivationFit` | 15% |
| `salaryFit` | 15% |

---

## Integrações

### WhatsApp (Evolution API)

O módulo integra-se com o WhatsApp através do [módulo WhatsApp](./whatsapp.md) e da Evolution API:

- Mensagens enviadas pelo canal `WHATSAPP` são roteadas via Evolution API
- Webhook da Evolution API encaminha mensagens recebidas para o módulo de mensagens
- Status de conexão monitorado via `WhatsAppSettingsCard`

### Portal do Candidato

Mensagens trocadas no [Portal do Candidato](./portal.md) aparecem na conversa correspondente no módulo de mensagens:

- Canal: `INTERNAL`
- Candidato identificado pelo token de portal

### Sistema de Notificações

Eventos do módulo de mensagens geram notificações:

- Nova mensagem recebida → Notificação push in-app
- Solicitação de intervenção → Notificação prioritária ao recrutador
- Triagem IA finalizada → Notificação com resultado

---

## Considerações Técnicas

### Consultas SQL Brutas (Raw SQL)

Devido a limitações de cache do Prisma Client, o módulo utiliza consultas SQL brutas para operações críticas em conversações:

```typescript
// Exemplo: Busca de conversas com detalhes (evita cache stale do Prisma)
const conversations = await db.$queryRaw`
  SELECT c.*, 
    cand.name as candidate_name, cand.email as candidate_email,
    j.title as job_title, j.department as job_department,
    (SELECT COUNT(*) FROM messages m 
     WHERE m.conversationId = c.id AND m.isRead = 0 
     AND m.senderType = 'CANDIDATE') as unread_count
  FROM conversations c
  LEFT JOIN candidates cand ON c.candidateId = cand.id
  LEFT JOIN jobs j ON c.jobId = j.id
  WHERE c.tenantId = ${tenantId}
  ORDER BY c.lastMessageAt DESC
  LIMIT ${limit} OFFSET ${offset}
`;
```

**Razão:** O Prisma Client mantém um cache de resultados que pode causar dados desatualizados em cenários de alta concorrência com WebSocket. As consultas SQL garantem consistência em tempo real.

### Paginação por Cursor

Mensagens utilizam paginação por cursor (não por offset) para melhor performance:

- **Cursor:** ID da última mensagem carregada
- **Direção:** Sempre para trás (mensagens mais antigas)
- **Limite:** 50 mensagens por requisição
- **Vantagem:** Performance consistente independente do total de mensagens

### Conexão Socket.IO

O hook `useMessagingSocket` gerencia automaticamente:

- Reconexão automática com backoff exponencial
- Limpeza de salas ao desconectar
- Throttle de eventos de digitação (debounce de 300ms)
- Re-entrada automática nas salas ao reconectar

### Tratamento de Erros

| Erro | Ação |
|---|---|
| WebSocket desconectado | Indicador visual de "reconectando..." |
| Falha ao enviar mensagem | Toast de erro + repositório local |
| Triagem IA falhou | Marcar `needsIntervention: true` |
| Rate limit atingido | Feedback visual + retry automático |
