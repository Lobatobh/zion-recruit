# Zion Recruit - Documentação da Plataforma

## Visão Geral

**Zion Recruit** é uma plataforma SaaS de recrutamento inteligente, alimentada por Inteligência Artificial, projetada para automatizar e otimizar todo o ciclo de recrutamento e seleção de talentos.

### Parte do Ecossistema Zion Assessment

A plataforma integra o ecossistema Zion Assessment, oferecendo soluções completas para gestão de talentos, avaliação comportamental (DISC) e recrutamento inteligente.

---

## Índice

1. [Arquitetura](#arquitetura)
2. [Funcionalidades](#funcionalidades)
3. [Módulos](#módulos)
4. [Agentes de IA](#agentes-de-ia)
5. [API](#api)
6. [Segurança](#segurança)
7. [Instalação](#instalação)
8. [Configuração](#configuração)
9. [Deploy](#deploy)

---

## Arquitetura

### Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Linguagem** | TypeScript 5 |
| **Banco de Dados** | SQLite (dev) / PostgreSQL (prod) |
| **ORM** | Prisma |
| **Autenticação** | NextAuth.js v4 |
| **UI** | Shadcn/ui + Tailwind CSS 4 |
| **Animações** | Framer Motion |
| **Gráficos** | Recharts |
| **Pagamentos** | Stripe |

### Estrutura de Diretórios

```
src/
├── app/
│   ├── api/              # API Routes (56+ endpoints)
│   │   ├── agents/       # Agentes de IA
│   │   ├── billing/      # Stripe integration
│   │   ├── candidates/   # Gestão de candidatos
│   │   ├── jobs/         # Gestão de vagas
│   │   ├── analytics/    # Métricas e relatórios
│   │   ├── audit/        # Logs de auditoria
│   │   ├── webhooks/     # Webhooks externos
│   │   ├── portal/       # Portal do candidato
│   │   ├── public/       # Job board público
│   │   └── sourcing/     # Busca de candidatos
│   │
│   └── page.tsx          # Página principal (SPA)
│
├── components/
│   ├── ui/               # Componentes base (shadcn)
│   ├── agents/           # Dashboard de agentes
│   ├── analytics/        # Dashboards analíticos
│   ├── audit/            # Logs de auditoria
│   ├── billing/          # Planos e pagamentos
│   ├── candidates/       # Gestão de candidatos
│   ├── disc/             # Avaliação DISC
│   ├── jobs/             # Gestão de vagas
│   ├── messaging/        # Comunicação omnichannel
│   ├── pipeline/         # Kanban de pipeline
│   ├── portal/           # Portal do candidato
│   ├── public/           # Job board público
│   ├── sourcing/         # Busca de candidatos
│   └── webhooks/         # Gestão de webhooks
│
├── lib/
│   ├── agents/           # Implementação dos agentes IA
│   ├── analytics/        # Cálculo de métricas
│   ├── audit/            # Serviço de auditoria
│   ├── disc/             # Calculadora DISC
│   ├── email/            # Serviço de email (Resend)
│   ├── encryption.ts     # Criptografia AES-256
│   ├── llm/              # Multi-provider LLM
│   ├── queue/            # Fila de jobs assíncronos
│   ├── rate-limit.ts     # Rate limiting
│   ├── sourcing/         # Busca multi-fonte
│   ├── stripe/           # Integração Stripe
│   └── webhooks/         # Sistema de webhooks
│
├── hooks/                # React hooks customizados
│
├── prisma/
│   └── schema.prisma     # Schema do banco de dados
│
└── middleware.ts         # Rate limiting global
```

### Padrões de Arquitetura

1. **Multi-Tenancy**: Isolamento completo por tenant com roles
2. **Agent System**: Arquitetura modular de agentes IA especializados
3. **Event-Driven**: Sistema de eventos para webhooks e notificações
4. **Background Jobs**: Fila assíncrona para tarefas pesadas
5. **Multi-Provider LLM**: Failover automático entre provedores de IA

---

## Funcionalidades

### Core Features

| Feature | Descrição |
|---------|-----------|
| **Gestão de Vagas** | CRUD completo com parsing automático de requisitos |
| **Pipeline Kanban** | Visualização drag-and-drop com 8 estágios configuráveis |
| **Parsing de Currículos** | Extração automática de skills, experiência, educação |
| **Match Scoring** | IA calcula compatibilidade candidato-vaga |
| **Avaliação DISC** | Teste completo de 28 questões com análise de perfil |
| **Comunicação Omnichannel** | Email, WhatsApp, Chat unificado |
| **Agendamento de Entrevistas** | Integração Google Calendar com lembretes |
| **Templates de Email** | Convites, confirmações, feedbacks |

### Enterprise Features

| Feature | Descrição |
|---------|-----------|
| **Analytics Dashboard** | Time-to-hire, conversão, efetividade por fonte |
| **Billing Stripe** | 4 planos com gestão de assinaturas |
| **Job Board Público** | SEO otimizado com sitemap automático |
| **Portal do Candidato** | Self-service com magic link |
| **Audit Logs** | Rastreamento completo de ações |
| **Webhooks** | 15+ eventos para integração externa |
| **Sourcing Agent** | Busca multi-fonte (LinkedIn, GitHub, Indeed) |

---

## Módulos

### 1. Dashboard (`/?view=dashboard`)

Painel principal com métricas em tempo real:
- Vagas ativas
- Total de candidatos
- Candidatos em processo
- Contratações do mês
- Agentes IA ativos
- Tarefas recentes

### 2. Gestão de Vagas (`/?view=jobs`)

- Criação/edição de vagas
- Parsing automático de requisitos via IA
- Definição de salário, localização, tipo
- Publicação no Job Board
- Métricas por vaga

### 3. Candidatos (`/?view=candidates`)

- Lista completa com filtros
- Parsing automático de currículos
- Score de compatibilidade
- Histórico de interações
- Tags e avaliações

### 4. Pipeline (`/?view=pipeline`)

- Visualização Kanban
- Drag-and-drop entre estágios
- Filtros por vaga
- Métricas de conversão

### 5. Analytics (`/?view=analytics`)

- Time-to-hire
- Taxa de conversão por estágio
- Efetividade por fonte
- Performance dos agentes IA
- Distribuição DISC
- Export CSV/JSON

### 6. Agentes IA (`/?view=agents`)

- 9 agentes especializados
- Configuração de prompts
- Histórico de execuções
- Métricas de performance
- Agendamento de tarefas

### 7. Sourcing (`/?view=sourcing`)

- Busca multi-fonte
- LinkedIn, GitHub, Indeed, Pool Interno
- Preview de candidatos
- Importação em massa
- Tags automáticas

### 8. Webhooks (`/?view=webhooks`)

- 15+ eventos disponíveis
- Retry automático
- Histórico de entregas
- Teste de webhook
- Assinaturas HMAC-SHA256

### 9. Audit Logs (`/?view=audit`)

- Rastreamento de todas as ações
- Filtros por usuário, ação, entidade
- Export para compliance
- Retenção configurável

### 10. Job Board (`/?view=careers`)

- Página pública sem autenticação
- SEO otimizado
- Sitemap automático
- Formulário de candidatura
- Tracking de fonte (UTM)

### 11. Portal do Candidato (`/?view=portal`)

- Magic link authentication
- Status da candidatura
- Agendamento de entrevistas
- Teste DISC
- Mensagens com recrutadores

### 12. Configurações (`/?view=settings`)

- Perfil da empresa
- Membros da equipe
- Integrações
- Notificações

---

## Agentes de IA

### Arquitetura de Agentes

```
BaseAgent (Abstract)
├── OrchestratorAgent    - Coordena todos os agentes
├── JobParserAgent       - Extrai requisitos de vagas
├── ScreeningAgent       - Avalia candidatos
├── MatchingAgent        - Calcula match score
├── ContactAgent         - Gera mensagens de outreach
├── SchedulerAgent       - Agenda entrevistas
├── SourcingAgent        - Busca candidatos externos
├── DISCAnalyzerAgent    - Analisa perfis DISC
└── ReportAgent          - Gera relatórios
```

### Tipos de Agentes

| Agente | Tipo | Função |
|--------|------|--------|
| **JOB_PARSER** | Síncrono | Extrai skills, senioridade, requisitos |
| **SCREENING** | Assíncrono | Avalia candidatos vs requisitos |
| **MATCHING** | Assíncrono | Calcula score de compatibilidade |
| **CONTACT** | Síncrono | Gera mensagens personalizadas |
| **SCHEDULER** | Síncrono | Coordena agendamentos |
| **SOURCING** | Assíncrono | Busca candidatos externos |
| **DISC_ANALYZER** | Síncrono | Interpreta resultados DISC |
| **REPORT** | Assíncrono | Gera relatórios completos |

### Multi-Provider LLM

Suporte a múltiplos provedores com failover automático:

| Provedor | Modelos | Uso |
|----------|---------|-----|
| **OpenAI** | gpt-4o-mini, gpt-4o | Primário |
| **Google Gemini** | gemini-1.5-flash, gemini-1.5-pro | Secundário |
| **OpenRouter** | claude-3, llama-3 | Terciário |
| **Anthropic** | claude-3-haiku, claude-3-sonnet | Via OpenRouter |

---

## API

### Autenticação

Todas as APIs requerem autenticação via NextAuth.js (exceto rotas públicas).

### Rate Limiting

| Tipo | Limite | Rotas |
|------|--------|-------|
| AUTH | 5/min | /api/auth/* |
| API | 100/min | /api/* |
| AI | 20/min | /api/agents/*, /api/ai/* |
| WEBHOOK | 1000/min | /webhook/* |
| PUBLIC | 60/min | /api/public/* |

### Endpoints Principais

#### Candidatos

```
GET    /api/candidates          # Lista candidatos
POST   /api/candidates          # Cria candidato
GET    /api/candidates/:id      # Detalhes
PUT    /api/candidates/:id      # Atualiza
DELETE /api/candidates/:id      # Remove
POST   /api/candidates/:id/match # Calcula match
```

#### Vagas

```
GET    /api/jobs                # Lista vagas
POST   /api/jobs                # Cria vaga
GET    /api/jobs/:id            # Detalhes
PUT    /api/jobs/:id            # Atualiza
DELETE /api/jobs/:id            # Remove
```

#### Analytics

```
GET    /api/analytics/overview    # Métricas gerais
GET    /api/analytics/pipeline    # Funil de conversão
GET    /api/analytics/sources     # Efetividade por fonte
GET    /api/analytics/export      # Export CSV/JSON
```

---

## Segurança

### Criptografia

- **AES-256-GCM** para credenciais de API
- **PBKDF2** para derivação de chaves (100.000 iterações)
- **HMAC-SHA256** para assinaturas de webhook

### Autenticação

- **NextAuth.js** com sessões JWT
- **Magic Link** para portal do candidato

### Auditoria

- Log de todas as ações sensíveis
- IP e User Agent registrados
- Retenção configurável
- Export para compliance

---

## Instalação

### Requisitos

- Node.js 18+
- Bun (recomendado) ou npm
- PostgreSQL (produção) ou SQLite (desenvolvimento)

### Desenvolvimento Local

```bash
# Clonar repositório
git clone https://github.com/zion-recruit/platform.git
cd platform

# Instalar dependências
bun install

# Configurar variáveis de ambiente
cp .env.example .env

# Sincronizar banco de dados
bun run db:push

# Iniciar servidor
bun run dev
```

---

## Planos e Limites

| Plano | Preço | Vagas | Candidatos | Membros |
|-------|-------|-------|------------|---------|
| FREE | $0 | 1 | 50 | 1 |
| STARTER | $49/mês | 5 | 500 | 3 |
| PROFESSIONAL | $149/mês | 25 | 5.000 | 10 |
| ENTERPRISE | Sob consulta | ∞ | ∞ | ∞ |

---

**Versão**: 2.0.0  
**Última Atualização**: Janeiro 2025
