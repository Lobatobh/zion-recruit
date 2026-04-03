# Zion Recruit - Referência de Módulos

> **Versão:** 2.0.0 | **Última atualização:** Julho 2025
>
> Documentação técnica completa do sistema Zion Recruit — plataforma de recrutamento e seleção com inteligência artificial.
>
> **Convenção:** Toda atualização no código deve refletir no arquivo MD correspondente.

---

## Visão Geral do Sistema

O **Zion Recruit** é uma plataforma SaaS completa de recrutamento e seleção, projetada para automatizar e otimizar todo o ciclo de vida do processo seletivo. Construída sobre Next.js 16 com App Router, integra IA avançada para análise comportamental (DISC), pareamento candidato-vaga, geração de relatórios e agendamento inteligente.

### Arquitetura

| Camada | Tecnologia |
|--------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Linguagem** | TypeScript 5 |
| **Estilização** | Tailwind CSS 4 + shadcn/ui (New York) |
| **Banco de Dados** | SQLite via Prisma ORM |
| **Estado (Cliente)** | Zustand |
| **Animações** | Framer Motion |
| **IA** | z-ai-web-dev-sdk (server-side) |
| **Drag & Drop** | @dnd-kit/core |
| **Autenticação** | NextAuth.js v4 |
| **WebSocket** | Socket.IO (mini-service porta 3004) |
| **Job Queue** | Mini-service (porta 3005) |

---

## Mapa Completo de Módulos (28 módulos)

### 🟢 Core (1)

| Módulo | Arquivo | Descrição |
|--------|---------|-----------|
| Visão Geral | [`overview.md`](./overview.md) | Dashboard com métricas, ações rápidas, pipeline, candidatos recentes |

### 🔵 Recrutamento (5)

| Módulo | Arquivo | Descrição |
|--------|---------|-----------|
| Vagas | [`jobs.md`](./jobs.md) | CRUD de vagas, análise DISC, perfil ideal IA |
| Candidatos | [`candidates.md`](./candidates.md) | Cadastro, parsing de currículos, scoring, relatórios IA |
| Pipeline | [`pipeline.md`](./pipeline.md) | Kanban drag-and-drop, estágios customizáveis |
| Entrevistas | [`interviews.md`](./interviews.md) | Agendamento, feedback 5-estrelas, Google Meet |
| Matching | [`matching.md`](./matching.md) | Engine de compatibilidade (Skills 50%, Exp 30%, Edu 20%) |

### 🟣 Comunicação (5)

| Módulo | Arquivo | Descrição |
|--------|---------|-----------|
| Mensagens | [`messages.md`](./messages.md) | Omnichannel, IA "Zoe", 11 estágios, WebSocket |
| Notificações | [`notifications.md`](./notifications.md) | 37 tipos, 22 presets, polling 30s |
| Portal Candidato | [`portal.md`](./portal.md) | Magic link, 5 abas, DISC in-portal |
| Job Board Público | [`public-jobs.md`](./public-jobs.md) | SEO, UTM, candidaturas sem login |
| WhatsApp | [`whatsapp.md`](./whatsapp.md) | Evolution API, 7 templates, QR code |

### 🟡 IA & Inteligência (4)

| Módulo | Arquivo | Descrição |
|--------|---------|-----------|
| Agentes IA | [`agents.md`](./agents.md) | 9 tipos, dashboard, execução manual/automática |
| DISC | [`disc.md`](./disc.md) | 28 questões, 3 gráficos, 12 combinações, análise IA |
| Sourcing | [`sourcing.md`](./sourcing.md) | LinkedIn/Indeed/GitHub/Internal, deduplicação |
| Analytics | [`analytics.md`](./analytics.md) | 6 KPIs, funil, fontes, time-to-hire, exportação |
| LLM Multi-Provider | [`llm.md`](./llm.md) | OpenAI/Gemini/OpenRouter, failover, custo, streaming |

### 🟠 Infraestrutura (9)

| Módulo | Arquivo | Descrição |
|--------|---------|-----------|
| Criptografia | [`encryption.md`](./encryption.md) | AES-256-GCM, PBKDF2, 100k iterações |
| Rate Limiting | [`rate-limiting.md`](./rate-limiting.md) | Sliding window, 5 tiers, middleware global |
| Job Queue | [`job-queue.md`](./job-queue.md) | 6 tipos, backoff exponencial, progress |
| Webhooks | [`webhooks.md`](./webhooks.md) | 14 eventos, HMAC-SHA256, retry, auto-disable |
| Audit Logs | [`audit.md`](./audit.md) | 20 ações, 14 entidades, redação automática |
| Credenciais API | [`api-credentials.md`](./api-credentials.md) | 6 providers, AES-256, alertas, stats |
| Billing | [`billing.md`](./billing.md) | Stripe, 4 planos, trial 14 dias, portal |
| Configurações | [`settings.md`](./settings.md) | Org, equipe, perfil, integrações |
| Documentação | [`docs-module.md`](./docs-module.md) | Docs interna, sidebar, busca |

### 🔗 Integrações (3)

| Módulo | Arquivo | Descrição |
|--------|---------|-----------|
| E-mail (Resend) | [`email.md`](./email.md) | 6 templates pt-BR, anexos, agendamento |
| Google Calendar | [`calendar.md`](./calendar.md) | OAuth2, Meet links, slots 9h-18h |
| WhatsApp | [`whatsapp.md`](./whatsapp.md) | Evolution API, QR, templates recrutamento |

---

## Fluxo do Processo Seletivo

```
┌──────────┐   ┌───────────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐
│ Criar    │──▶│ Receber   │──▶│ Pipeline │──▶│ Entrevista│──▶│Contratar │
│ Vaga+DISC│   │ Candidatos│   │ Kanban   │   │ +Feedback │   │          │
└──────────┘   └───────────┘   └──────────┘   └───────────┘   └──────────┘
     │              │               │               │
     ▼              ▼               ▼               ▼
  Análise IA     Parsing IA      Drag & Drop    Agendamento
  Perfil IDEAL   Auto-score      Progressão     5-estrelas
```

---

## Índice Rápido

| Ação | Módulo |
|------|--------|
| Métricas e dashboard | [overview.md](./overview.md) |
| Criar/editar vaga | [jobs.md](./jobs.md) |
| Perfil DISC ideal da vaga | [jobs.md](./jobs.md) |
| Cadastrar candidato | [candidates.md](./candidates.md) |
| Parsing de currículo | [candidates.md](./candidates.md) |
| Score de compatibilidade | [matching.md](./matching.md) |
| Relatório IA completo | [candidates.md](./candidates.md) |
| Board Kanban | [pipeline.md](./pipeline.md) |
| Entrevistas | [interviews.md](./interviews.md) |
| Chat com candidato (IA) | [messages.md](./messages.md) |
| Teste DISC | [disc.md](./disc.md) |
| Sourcing multi-fonte | [sourcing.md](./sourcing.md) |
| Agentes de IA | [agents.md](./agents.md) |
| Analytics | [analytics.md](./analytics.md) |
| Portal do candidato | [portal.md](./portal.md) |
| Job board público | [public-jobs.md](./public-jobs.md) |
| Webhooks | [webhooks.md](./webhooks.md) |
| Audit logs | [audit.md](./audit.md) |
| Billing/Planos | [billing.md](./billing.md) |
| Credenciais de API | [api-credentials.md](./api-credentials.md) |
| Rate limiting | [rate-limiting.md](./rate-limiting.md) |
| Criptografia | [encryption.md](./encryption.md) |
| Fila de jobs | [job-queue.md](./job-queue.md) |
| E-mail | [email.md](./email.md) |
| WhatsApp | [whatsapp.md](./whatsapp.md) |
| Google Calendar | [calendar.md](./calendar.md) |
| LLM providers | [llm.md](./llm.md) |
| Configurações | [settings.md](./settings.md) |

---

## Legenda

| Ícone | Status |
|-------|--------|
| ✅ | Estável — Produção, testado e documentado |
| ⚠️ | Beta — Funcional, sujeito a mudanças |
| 🔄 | Planejado — Previsto para desenvolvimento |

---

> **Regra:** Toda modificação em qualquer módulo do sistema DEVE ser refletida no arquivo MD correspondente em `docs/modules/`.
