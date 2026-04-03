/**
 * Documentation Data - Zion Recruit
 * All documentation articles organized by sections
 */

export interface DocArticle {
  id: string;
  title: string;
  description: string;
  badge?: string;
  updatedAt?: string;
  prevArticle?: string;
  prevTitle?: string;
  nextArticle?: string;
  nextTitle?: string;
  content: string;
}

export interface DocSection {
  id: string;
  title: string;
  icon: string;
  articles: DocArticle[];
}

export const docsSections: DocSection[] = [
  // ========================================
  // VISÃO GERAL
  // ========================================
  {
    id: "overview",
    title: "Visão Geral",
    icon: "book",
    articles: [
      {
        id: "overview",
        title: "Bem-vindo ao Zion Recruit",
        description: "Conheça a plataforma de recrutamento inteligente mais completa do mercado.",
        updatedAt: "Jan 2025",
        nextArticle: "architecture",
        nextTitle: "Arquitetura da Plataforma",
        content: `
# Bem-vindo ao Zion Recruit

O **Zion Recruit** é uma plataforma SaaS de recrutamento inteligente, alimentada por Inteligência Artificial, projetada para automatizar e otimizar todo o ciclo de recrutamento e seleção de talentos.

## O que torna o Zion Recruit diferente?

### 1. Inteligência Artificial Integrada

Nossa plataforma utiliza IA de forma ética e transparente para:

- **Parsing de Currículos**: Extração automática de skills, experiência e educação
- **Match Scoring**: Cálculo inteligente de compatibilidade candidato-vaga
- **Análise DISC**: Interpretação comportamental profunda
- **Geração de Relatórios**: Sínteses automatizadas e insights

### 2. Experiência Completa

| Feature | Descrição |
|---------|-----------|
| **Pipeline Kanban** | Visualização intuitiva com drag-and-drop |
| **Comunicação Omnichannel** | Email, WhatsApp, Chat unificado |
| **Portal do Candidato** | Self-service com magic link |
| **Job Board Público** | SEO otimizado para atrair talentos |
| **Analytics** | Métricas em tempo real |

### 3. Enterprise Ready

- Conformidade LGPD/GDPR
- Criptografia AES-256
- Audit logs completos
- Webhooks para integrações
- 99.9% de disponibilidade

## Primeiros Passos

### Para Recrutadores

1. Acesse o Dashboard principal
2. Crie sua primeira vaga em **Vagas → Nova Vaga**
3. Configure o pipeline de recrutamento
4. Comece a receber candidatos

### Para Administradores

1. Configure as integrações em **Configurações → APIs**
2. Adicione membros da equipe
3. Configure webhooks para integrações externas
4. Defina políticas de segurança

### Para Desenvolvedores

1. Consulte a [Referência da API](#api-reference)
2. Obtenha suas credenciais de API
3. Configure webhooks para eventos
4. Integre com seus sistemas existentes

## Precisa de Ajuda?

- **Base de Conhecimento**: Acesse via menu de ajuda
- **Suporte**: suporte@zionrecruit.com
- **Documentação API**: api@zionrecruit.com
`,
      },
      {
        id: "architecture",
        title: "Arquitetura da Plataforma",
        description: "Entenda como o Zion Recruit foi construído para escalar.",
        prevArticle: "overview",
        prevTitle: "Bem-vindo ao Zion Recruit",
        nextArticle: "modules",
        nextTitle: "Módulos da Plataforma",
        content: `
# Arquitetura da Plataforma

O Zion Recruit foi construído com uma arquitetura moderna, escalável e segura.

## Stack Tecnológica

### Frontend

| Tecnologia | Uso |
|------------|-----|
| **Next.js 16** | Framework React com App Router |
| **TypeScript** | Tipagem estática |
| **Tailwind CSS 4** | Estilização |
| **Shadcn/ui** | Componentes UI |
| **Framer Motion** | Animações |
| **Recharts** | Gráficos |

### Backend

| Tecnologia | Uso |
|------------|-----|
| **Next.js API Routes** | APIs REST |
| **Prisma ORM** | Banco de dados |
| **NextAuth.js** | Autenticação |
| **Stripe** | Pagamentos |

### Infraestrutura

| Tecnologia | Uso |
|------------|-----|
| **PostgreSQL** | Banco de dados (produção) |
| **SQLite** | Banco de dados (dev) |
| **Redis** | Cache e filas (planejado) |
| **AWS/GCP** | Cloud (planejado) |

## Padrões de Arquitetura

### 1. Multi-Tenancy

\`\`\`
┌─────────────────────────────────────┐
│           Zion Recruit              │
├─────────────────────────────────────┤
│  Tenant A  │  Tenant B  │  Tenant C │
│  ────────  │  ────────  │  ──────── │
│  Dados     │  Dados     │  Dados    │
│  isolados  │  isolados  │  isolados │
└─────────────────────────────────────┘
\`\`\`

Cada tenant possui:
- Isolamento total de dados
- Configurações independentes
- Membros e permissões próprios
- Limite de recursos por plano

### 2. Sistema de Agentes IA

\`\`\`
┌─────────────────────────────────────────┐
│           OrchestratorAgent             │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐      │
│  │ JobParser   │  │ Screening   │      │
│  │ Agent       │  │ Agent       │      │
│  └─────────────┘  └─────────────┘      │
│  ┌─────────────┐  ┌─────────────┐      │
│  │ Matching    │  │ Sourcing    │      │
│  │ Agent       │  │ Agent       │      │
│  └─────────────┘  └─────────────┘      │
│  ┌─────────────┐  ┌─────────────┐      │
│  │ DISC        │  │ Report      │      │
│  │ Analyzer    │  │ Agent       │      │
│  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────┘
\`\`\`

### 3. Background Jobs

\`\`\`
┌─────────┐    ┌─────────┐    ┌─────────────┐
│  API    │───▶│  Queue  │───▶│  Processor  │
│ Request │    │  Job    │    │  Service    │
└─────────┘    └─────────┘    └─────────────┘
                    │
                    ▼
              ┌─────────────┐
              │  Database   │
              │  (Prisma)   │
              └─────────────┘
\`\`\`

Tipos de jobs:
- RESUME_PARSE
- CANDIDATE_MATCH
- BATCH_SCREENING
- SEND_EMAIL
- DISC_ANALYSIS
- WEBHOOK_DISPATCH

## Fluxo de Dados

### Candidatura

\`\`\`
1. Candidato acessa Job Board
2. Preenche formulário + currículo
3. Sistema cria registro de candidato
4. Job de parsing é enfileirado
5. IA extrai skills e experiência
6. Match score é calculado
7. Notificações são enviadas
\`\`\`

### Match Score

\`\`\`
┌─────────────────────────────────────────┐
│           Match Score Pipeline          │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐                        │
│  │ Skills      │  ───▶ 40% do score    │
│  │ Matching    │                        │
│  └─────────────┘                        │
│                                         │
│  ┌─────────────┐                        │
│  │ Experience  │  ───▶ 30% do score    │
│  │ Level       │                        │
│  └─────────────┘                        │
│                                         │
│  ┌─────────────┐                        │
│  │ Education   │  ───▶ 15% do score    │
│  │ Fit         │                        │
│  └─────────────┘                        │
│                                         │
│  ┌─────────────┐                        │
│  │ DISC        │  ───▶ 15% do score    │
│  │ Alignment   │                        │
│  └─────────────┘                        │
│                                         │
│         Total: 0-100 Score              │
└─────────────────────────────────────────┘
\`\`\`

## Segurança

### Criptografia

| Contexto | Algoritmo |
|----------|-----------|
| Dados em trânsito | TLS 1.3 |
| Dados em repouso | AES-256-GCM |
| Senhas | bcrypt (cost 12) |
| Webhooks | HMAC-SHA256 |

### Rate Limiting

| Tipo | Limite |
|------|--------|
| AUTH | 5/min |
| API | 100/min |
| AI | 20/min |
| WEBHOOK | 1000/min |

## Próximos Passos

- Conheça os [Módulos da Plataforma](#modulos)
- Explore a [Referência da API](#api-reference)
- Configure [Integrações](#integracoes)
`,
      },
      {
        id: "modules",
        title: "Módulos da Plataforma",
        description: "Conheça todos os módulos disponíveis no Zion Recruit.",
        prevArticle: "architecture",
        prevTitle: "Arquitetura da Plataforma",
        nextArticle: "quick-start",
        nextTitle: "Guia de Início Rápido",
        content: `
# Módulos da Plataforma

O Zion Recruit é organizado em módulos especializados para cada etapa do processo de recrutamento.

## Visão Geral dos Módulos

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Visão Geral | /?view=overview | Métricas e resumo do recrutamento |
| Vagas | /?view=jobs | Gestão de posições abertas |
| Candidatos | /?view=candidates | Banco de talentos |
| Pipeline | /?view=pipeline | Kanban de recrutamento |
| Analytics | /?view=analytics | Métricas e relatórios |
| Agentes IA | /?view=agents | Automações inteligentes |
| Sourcing | /?view=sourcing | Busca de candidatos |
| Webhooks | /?view=webhooks | Integrações externas |
| Audit Logs | /?view=audit | Rastreamento de ações |
| Job Board | /?view=careers | Portal público |
| Portal Candidato | /?view=portal | Área do candidato |
| DISC | /?view=disc | Avaliação comportamental |
| APIs | /?view=apis | Credenciais de integração |
| Configurações | /?view=settings | Preferências da conta |

---

## 1. Dashboard

O Dashboard oferece uma visão consolidada do seu processo de recrutamento.

### Métricas Disponíveis

- **Vagas Ativas**: Total de posições em aberto
- **Total de Candidatos**: Banco de talentos
- **Em Processo**: Candidatos nas etapas intermediárias
- **Contratados**: Contratações do período

### Funcionalidades

- Gráficos de tendência
- Alertas de agentes IA
- Tarefas recentes
- Acesso rápido a ações

---

## 2. Gestão de Vagas

Módulo completo para criar e gerenciar posições.

### Criação de Vaga

1. Título e descrição
2. Requisitos e qualificações
3. Salário e benefícios
4. Localização e modalidade
5. Skills necessárias (extraídas automaticamente)

### Status de Vaga

| Status | Descrição |
|--------|-----------|
| DRAFT | Rascunho, não visível |
| ACTIVE | Publicada e recebendo candidaturas |
| PAUSED | Pausada temporariamente |
| CLOSED | Posição preenchida ou cancelada |

### Parsing Automático

Ao criar uma vaga, a IA extrai automaticamente:
- Skills técnicas
- Nível de senioridade
- Anos de experiência
- Palavras-chave relevantes

---

## 3. Candidatos

Gerencie todo o banco de talentos.

### Visualizações

- **Lista**: Visão tabular com filtros
- **Cards**: Visualização rápida
- **Detalhes**: Perfil completo

### Funcionalidades

- Upload de currículo
- Parsing automático de dados
- Score de compatibilidade
- Tags e avaliações
- Histórico de comunicações
- Exportação de dados

---

## 4. Pipeline Kanban

Visualize e gerencie o funil de recrutamento.

### Estágios Padrão

\`\`\`
Novo → Triagem → Entrevista → Teste Técnico → DISC → Final → Contratado
                                                         ↘ Rejeitado
\`\`\`

### Ações Disponíveis

- Drag and drop entre colunas
- Filtros por vaga
- Visualização de detalhes
- Ações em massa
- Métricas por estágio

---

## 5. Analytics

Métricas detalhadas para tomada de decisão.

### Dashboards Disponíveis

#### Overview
- Time-to-hire
- Taxa de conversão
- Candidatos por estágio

#### Pipeline
- Funil de conversão
- Bottlenecks identificados
- Tempo médio por estágio

#### Fontes
- Efetividade por canal
- Custo por contratação
- ROI de sourcing

#### Agentes IA
- Performance dos agentes
- Tokens consumidos
- Taxa de sucesso

### Exportação

- CSV para Excel
- JSON para integrações
- PDF para relatórios

---

## 6. Agentes IA

Configure e monitore as automações inteligentes.

### Agentes Disponíveis

| Agente | Função |
|--------|--------|
| Job Parser | Extrai requisitos de vagas |
| Screening | Avalia candidatos |
| Matching | Calcula compatibilidade |
| Contact | Gera mensagens |
| Scheduler | Agenda entrevistas |
| Sourcing | Busca candidatos |
| DISC Analyzer | Interpreta resultados DISC |
| Report | Gera relatórios |

### Configurações

- Prompts customizados
- Agendamento de execuções
- Limites de uso
- Alertas de erro

---

## 7. Sourcing

Busque candidatos de múltiplas fontes.

### Fontes Suportadas

- LinkedIn
- GitHub
- Indeed
- Pool Interno

### Funcionalidades

- Busca por skills
- Filtros avançados
- Preview de perfis
- Importação em massa
- Deduplicação automática

---

## 8. Webhooks

Integre com sistemas externos.

### Eventos Disponíveis

| Categoria | Eventos |
|-----------|---------|
| Candidatos | created, updated, hired, rejected |
| Vagas | created, updated, closed |
| Entrevistas | scheduled, completed, cancelled |
| DISC | completed |
| Sistema | task.completed, task.failed |

### Configuração

- URL de destino
- Eventos assinados
- Retry automático
- Histórico de entregas

---

## 9. Audit Logs

Rastreie todas as ações do sistema.

### Informações Registradas

- Quem executou
- O que foi feito
- Quando ocorreu
- De onde (IP)
- Mudanças realizadas

### Filtros

- Por usuário
- Por ação
- Por entidade
- Por período

---

## 10. Job Board Público

Portal de carreiras público.

### Funcionalidades

- Listagem de vagas
- Filtros por departamento/local
- Formulário de candidatura
- SEO otimizado
- Tracking de fonte (UTM)

---

## 11. Portal do Candidato

Área de autoatendimento para candidatos.

### Acesso via Magic Link

- Seguro e sem senha
- Válido por 7 dias
- Revogável a qualquer momento

### Funcionalidades

- Status da candidatura
- Agendamento de entrevistas
- Teste DISC
- Mensagens com recrutadores
- Upload de documentos

---

## 12. DISC

Avaliação comportamental completa.

### Características

- 28 questões
- 4 dimensões (D, I, S, C)
- 3 gráficos (Most, Least, Combined)
- Análise de fit com a vaga
- Relatório detalhado

---

## 13. APIs e Credenciais

Gerencie integrações e credenciais.

### Provedores Suportados

| Categoria | Provedores |
|-----------|------------|
| IA | OpenAI, Google Gemini, Anthropic, OpenRouter |
| Email | Resend, SendGrid |
| WhatsApp | Evolution API, Twilio |
| Cloud | AWS, Google Cloud, Azure |
| Banco de Dados | Supabase |
| CRM | LinkedIn, Stripe |

### Funcionalidades

- Armazenamento seguro
- Criptografia AES-256
- Alertas de uso
- Rotação de chaves

---

## 14. Configurações

Preferências da conta e empresa.

### Seções

- Perfil da empresa
- Membros da equipe
- Permissões
- Notificações
- Integrações
- Assinatura
`,
      },
    ],
  },

  // ========================================
  // GUIA DE USO
  // ========================================
  {
    id: "guide",
    title: "Guia de Uso",
    icon: "file",
    articles: [
      {
        id: "quick-start",
        title: "Guia de Início Rápido",
        description: "Comece a usar o Zion Recruit em minutos.",
        badge: "Essencial",
        updatedAt: "Jan 2025",
        prevArticle: "modules",
        prevTitle: "Módulos da Plataforma",
        nextArticle: "candidates-guide",
        nextTitle: "Gerenciando Candidatos",
        content: `
# Guia de Início Rápido

Bem-vindo! Este guia vai ajudá-lo a começar a usar o Zion Recruit em poucos minutos.

## Passo 1: Acesse o Dashboard

Após fazer login, você verá o Dashboard principal com:

- Resumo de vagas ativas
- Candidatos recentes
- Métricas do período
- Alertas do sistema

## Passo 2: Crie sua Primeira Vaga

1. Clique em **"Nova Vaga"** no Dashboard ou acesse **Vagas → Nova Vaga**
2. Preencha as informações básicas:

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Título | ✅ | Nome da posição |
| Departamento | ✅ | Área da empresa |
| Descrição | ✅ | Detalhes da vaga |
| Requisitos | ✅ | Qualificações necessárias |
| Localização | ❌ | Cidade/Estado/Remoto |
| Salário | ❌ | Faixa salarial |
| Skills | ❌ | Extraídas automaticamente |

3. Clique em **"Salvar como Rascunho"** ou **"Publicar"**

### Dica Pro

A IA vai extrair automaticamente as skills necessárias da descrição que você escrever!

## Passo 3: Configure o Pipeline

O pipeline padrão já vem configurado:

\`\`\`
Novo → Triagem → Entrevista → Teste Técnico → DISC → Final → Contratado
\`\`\`

Para personalizar:

1. Acesse **Configurações → Pipeline**
2. Adicione, remova ou reordene estágios
3. Defina cores e nomes
4. Configure automações

## Passo 4: Adicione Candidatos

### Via Upload

1. Acesse **Candidatos → Adicionar**
2. Preencha os dados ou faça upload do currículo
3. A IA vai extrair as informações automaticamente

### Via Job Board

Candidatos podem se candidatar pelo Job Board público:

1. Acesse **Vagas** e publique sua vaga
2. Compartilhe o link: \`zionrecruit.com/careers/job/slug-da-vaga\`
3. Candidaturas aparecem automaticamente no Pipeline

## Passo 5: Avalie Candidatos

### Match Score

Cada candidato recebe um score de 0-100 baseado em:

- Skills compatíveis (40%)
- Experiência (30%)
- Educação (15%)
- Fit DISC (15%)

### Análise DISC

Envie o teste DISC para candidatos:

1. Abra o perfil do candidato
2. Clique em **"Enviar Teste DISC"**
3. O candidato recebe um link por email
4. Resultado aparece automaticamente

## Passo 6: Prossiga com o Processo

### Agende Entrevistas

1. No perfil do candidato, clique em **"Agendar Entrevista"**
2. Selecione data e horário
3. Confirme para enviar convite automático

### Mova pelo Pipeline

Use drag-and-drop no Kanban para mover candidatos entre estágios.

### Comunique-se

Use o módulo de **Mensagens** para:
- Enviar emails
- Conversar via WhatsApp
- Registrar interações

## Passo 7: Contrate!

Quando encontrar o candidato ideal:

1. Mova para o estágio **"Final"**
2. Clique em **"Contratar"**
3. O status muda para **"Contratado"**
4. Métricas são atualizadas

## Próximos Passos

- Configure [Webhooks](#webhooks) para integrações
- Explore [Analytics](#analytics) para métricas
- Convide sua equipe em **Configurações → Membros**
`,
      },
      {
        id: "candidates-guide",
        title: "Gerenciando Candidatos",
        description: "Aprenda a gerenciar todo o ciclo de vida dos candidatos.",
        prevArticle: "quick-start",
        prevTitle: "Guia de Início Rápido",
        nextArticle: "jobs-guide",
        nextTitle: "Criando e Gerenciando Vagas",
        content: `
# Gerenciando Candidatos

Este guia detalha como gerenciar candidatos ao longo de todo o processo seletivo.

## Adicionando Candidatos

### Manualmente

1. **Candidatos → Adicionar Candidato**
2. Preencha os campos:
   - Nome completo
   - Email
   - Telefone
   - Vaga de interesse
   - Links (LinkedIn, GitHub, Portfolio)
3. Anexe o currículo (PDF, DOC, DOCX)
4. Salve

### Importação em Massa

Para importar múltiplos candidatos:

1. Prepare um arquivo CSV ou Excel
2. **Candidatos → Importar**
3. Mapeie as colunas
4. Processe a importação

### Via Job Board

Candidatos que se candidatam pelo portal público aparecem automaticamente:

1. Verifique a vaga no Pipeline
2. Candidatos aparecem no estágio "Novo"
3. Dados extraídos automaticamente

---

## Parsing de Currículo

Quando você faz upload de um currículo, a IA extrai:

| Campo | Extraído Automaticamente |
|-------|-------------------------|
| Skills | ✅ Lista de competências |
| Experiência | ✅ Histórico profissional |
| Educação | ✅ Formação acadêmica |
| Idiomas | ✅ Níveis de fluidez |
| Resumo | ✅ Síntese do perfil |

### Visualizando Dados Extraídos

No perfil do candidato, veja:

- **Skills Extraídas**: Tags coloridas
- **Experiência**: Timeline visual
- **Educação**: Cards formatados
- **Resumo IA**: Parágrafo descritivo

---

## Score de Compatibilidade

### Como é Calculado

\`\`\`
Match Score = (Skills × 0.40) + (Experiência × 0.30) + (Educação × 0.15) + (DISC × 0.15)
\`\`\`

### Interpretação

| Score | Classificação |
|-------|---------------|
| 90-100 | Excelente match |
| 70-89 | Bom match |
| 50-69 | Match parcial |
| 0-49 | Match baixo |

### Detalhes do Score

Clique no score para ver:
- Skills correspondentes
- Skills faltantes
- Análise de experiência
- Recomendação de entrevista

---

## Teste DISC

### Enviando o Teste

1. Abra o perfil do candidato
2. Clique em **"Enviar Teste DISC"**
3. Confirme o envio
4. Link é enviado automaticamente por email

### Acompanhando

- Status de envio
- Data de conclusão
- Lembretes automáticos

### Resultados

Após conclusão, você vê:

- Gráfico de perfil (D, I, S, C)
- Perfil primário e secundário
- Pontos fortes
- Áreas de atenção
- Fit com a vaga

---

## Pipeline e Estágios

### Movimentação

Mova candidatos entre estágios:

- **Kanban**: Drag and drop
- **Perfil do Candidato**: Dropdown de estágio
- **Ações em Massa**: Selecione múltiplos

### Status de Candidato

| Status | Descrição |
|--------|-----------|
| SOURCED | Identificado ativamente |
| APPLIED | Candidatou-se |
| SCREENING | Em triagem |
| INTERVIEWING | Em entrevistas |
| DISC_TEST | Fazer teste DISC |
| OFFERED | Proposta enviada |
| HIRED | Contratado |
| REJECTED | Não selecionado |
| WITHDRAWN | Desistiu |

---

## Comunicação

### Canais

| Canal | Como Usar |
|-------|-----------|
| Email | Enviar mensagens e templates |
| WhatsApp | Chat direto (via Evolution API) |
| Chat Interno | Anotações da equipe |

### Templates

Use templates pré-configurados:

- Convite para entrevista
- Lembrete de teste DISC
- Feedback de processo
- Proposta de contratação

---

## Tags e Organização

### Usando Tags

Adicione tags para organizar:

- \`frontend\`
- \`react\`
- \`senior\`
- \`remoto\`

### Filtros

Filtre candidatos por:

- Tags
- Status
- Score
- Vaga
- Data de criação
- Fonte

---

## Relatórios

### Relatório Individual

Gere um relatório completo do candidato:

1. Abra o perfil
2. Clique em **"Gerar Relatório"**
3. Aguarde processamento
4. Baixe o PDF

### Conteúdo do Relatório

- Resumo executivo
- Análise de skills
- Histórico profissional
- Resultados DISC
- Match com a vaga
- Recomendação

---

## Ações em Massa

Selecione múltiplos candidatos para:

- Mover de estágio
- Enviar comunicação
- Adicionar tags
- Exportar dados
- Arquivar

---

## Exportação

Exporte dados de candidatos:

1. **Candidatos → Exportar**
2. Escolha o formato:
   - CSV
   - Excel
   - JSON
3. Selecione campos
4. Download automático

---

## Retenção de Dados

- Dados mantidos por 24 meses após último contato
- Exclusão sob solicitação
- Anonimização automática após prazo
`,
      },
      {
        id: "jobs-guide",
        title: "Criando e Gerenciando Vagas",
        description: "Tudo sobre gestão de vagas no Zion Recruit.",
        prevArticle: "candidates-guide",
        prevTitle: "Gerenciando Candidatos",
        nextArticle: "pipeline-guide",
        nextTitle: "Gerenciando o Pipeline",
        content: `
# Criando e Gerenciando Vagas

Aprenda a criar, publicar e gerenciar vagas de forma eficiente.

## Criando uma Vaga

### Passo a Passo

1. **Vagas → Nova Vaga**
2. Preencha as seções:

#### Informações Básicas

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Título | ✅ | Nome da posição |
| Departamento | ✅ | Área da empresa |
| Descrição | ✅ | Detalhes completos |
| Requisitos | ✅ | Qualificações necessárias |

#### Detalhes

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Tipo de contrato | ❌ | CLT, PJ, Estágio, etc. |
| Modalidade | ❌ | Presencial, Remoto, Híbrido |
| Localização | ❌ | Cidade/Estado |
| Salário | ❌ | Faixa salarial |

#### Skills

- Adicione manualmente, OU
- Deixe a IA extrair automaticamente

### Parsing Automático

Ao salvar, a IA analisa a descrição e extrai:

- Skills técnicas
- Nível de senioridade
- Anos de experiência
- Palavras-chave

---

## Status de Vaga

| Status | Visibilidade | Ações |
|--------|--------------|-------|
| DRAFT | Apenas equipe | Editar, Publicar |
| ACTIVE | Job Board + Equipe | Editar, Pausar, Fechar |
| PAUSED | Apenas equipe | Reativar, Fechar |
| CLOSED | Não visível | Reabrir |

---

## Publicando no Job Board

### Como Publicar

1. Abra a vaga
2. Clique em **"Publicar"**
3. Confirme a ação

### URL Pública

Após publicar, a vaga recebe uma URL:

\`\`\`
https://zionrecruit.com/careers/job/desenvolvedor-full-stack-sao-paulo
\`\`\`

### SEO

O Job Board é otimizado para:

- Meta tags automáticas
- Open Graph
- Twitter Cards
- JSON-LD (Structured Data)
- Sitemap automático

---

## Recebendo Candidaturas

### Via Job Board

1. Candidato acessa o link
2. Preenche formulário
3. Anexa currículo
4. Confirma candidatura

### Tracking de Fonte

Use parâmetros UTM:

\`\`\`
?utm_source=linkedin&utm_medium=job_post&utm_campaign=janeiro2025
\`\`\`

---

## Métricas por Vaga

### Dashboard da Vaga

- Total de candidatos
- Taxa de conversão
- Tempo médio no pipeline
- Score médio

### Gráficos

- Funil de candidatos
- Evolução temporal
- Fontes de candidatos

---

## Gerenciando Múltiplas Vagas

### Filtros

- Por status
- Por departamento
- Por localização
- Por tipo

### Ordenação

- Data de criação
- Data de publicação
- Número de candidatos
- Título

### Ações em Massa

- Pausar vagas
- Fechar vagas
- Arquivar
- Exportar dados

---

## Fechando uma Vaga

### Quando Fechar

- Posição preenchida
- Cancelamento da contratação
- Mudança de estratégia

### Como Fechar

1. Abra a vaga
2. Clique em **"Fechar Vaga"**
3. Selecione o motivo
4. Confirme

### Efeitos

- Vaga removida do Job Board
- Candidatos notificados
- Métricas atualizadas

---

## Reabrindo uma Vaga

Vagas fechadas podem ser reabertas:

1. **Vagas → Fechadas**
2. Encontre a vaga
3. Clique em **"Reabrir"**

---

## Templates de Vaga

### Criando Templates

1. Crie uma vaga completa
2. Salve como template
3. Reutilize futuramente

### Usando Templates

1. **Vagas → Nova Vaga**
2. Selecione "Usar Template"
3. Escolha o template
4. Personalize conforme necessário
`,
      },
      {
        id: "pipeline-guide",
        title: "Gerenciando o Pipeline",
        description: "Domine o uso do Pipeline Kanban.",
        prevArticle: "jobs-guide",
        prevTitle: "Criando e Gerenciando Vagas",
        nextArticle: "analytics-guide",
        nextTitle: "Analytics e Relatórios",
        content: `
# Gerenciando o Pipeline

O Pipeline Kanban é o coração visual do Zion Recruit.

## Visão Geral

O Pipeline oferece uma visualização intuitiva do funil de recrutamento:

\`\`\`
┌─────────┬──────────┬───────────┬──────────────┬──────┬───────┬──────────┐
│  Novo   │ Triagem  │ Entrevista│ Teste Técnico│ DISC │ Final │ Contrat. │
│  (15)   │   (8)    │    (5)    │     (3)      │ (2)  │  (1)  │   (12)   │
└─────────┴──────────┴───────────┴──────────────┴──────┴───────┴──────────┘
\`\`\`

---

## Navegação

### Acessando o Pipeline

- **Menu → Pipeline** ou
- **Atalho: ?view=pipeline**

### Filtros

Filtre a visualização por:

- **Vaga**: Mostrar candidatos de uma vaga específica
- **Status**: Filtrar por status de candidato

---

## Cards de Candidato

Cada card mostra:

- Foto/Avatar
- Nome
- Score de match
- Vaga
- Tags
- Data de entrada

### Hover

Ao passar o mouse, veja:

- Resumo rápido
- Última atualização
- Ações disponíveis

### Clique

Clique no card para:

- Ver perfil completo
- Histórico de comunicações
- Resultados DISC
- Notas da equipe

---

## Movimentação

### Drag and Drop

1. Clique e segure o card
2. Arraste para a nova coluna
3. Solte para confirmar

### Via Perfil

1. Abra o perfil do candidato
2. Use o dropdown de estágio
3. Selecione o novo estágio

### Confirmação

Alguns estágios podem requerer confirmação:

- Nota mínima
- Teste DISC completo
- Aprovação do gestor

---

## Ações Rápidas

### No Card

- Enviar mensagem
- Agendar entrevista
- Enviar teste DISC
- Ver perfil

### Ações em Massa

1. Selecione múltiplos cards (checkbox)
2. Escolha a ação:
   - Mover de estágio
   - Enviar comunicação
   - Adicionar tags
   - Arquivar

---

## Estágios Personalizados

### Configurando

1. **Configurações → Pipeline**
2. Adicione/remova estágios
3. Reordene conforme necessário
4. Defina cores e ícones

### Automações por Estágio

Configure ações automáticas:

| Ao mover para | Ação automática |
|---------------|-----------------|
| Triagem | Enviar email de confirmação |
| Entrevista | Criar slot no calendário |
| DISC | Enviar link do teste |
| Contratado | Notificar equipe |

---

## Métricas do Pipeline

### Taxa de Conversão

Veja a conversão entre estágios:

\`\`\`
Novo: 100% → Triagem: 45% → Entrevista: 25% → Contratado: 8%
\`\`\`

### Tempo Médio

- Dias em cada estágio
- Tempo total no pipeline
- Comparação com média histórica

### Bottlenecks

O sistema identifica:

- Estágios com candidatos parados
- Tempo acima da média
- Necessidade de ação

---

## Visualizações

### Kanban (Padrão)

Visualização em colunas.

### Lista

Visualização tabular com mais detalhes.

### Calendário

Candidatos organizados por data de entrevista.

---

## Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| → | Mover para próximo estágio |
| ← | Mover para estágio anterior |
| Enter | Abrir perfil |
| Delete | Arquivar candidato |
| Ctrl+F | Buscar candidato |
`,
      },
      {
        id: "analytics-guide",
        title: "Analytics e Relatórios",
        description: "Extraia insights valiosos dos dados de recrutamento.",
        prevArticle: "pipeline-guide",
        prevTitle: "Gerenciando o Pipeline",
        content: `
# Analytics e Relatórios

Utilize dados para tomar decisões mais assertivas no recrutamento.

## Acessando Analytics

**Menu → Analytics** ou **?view=analytics**

---

## Dashboard Overview

### Métricas Principais

| Métrica | Descrição |
|---------|-----------|
| **Vagas Ativas** | Posições em aberto |
| **Total Candidatos** | Banco de talentos |
| **Em Processo** | Candidatos no pipeline |
| **Contratados** | Contratações do período |
| **Time-to-Hire** | Dias até contratação |
| **Taxa de Conversão** | % de candidatos contratados |

### Período de Análise

Selecione o período:

- Últimos 7 dias
- Últimos 30 dias
- Últimos 90 dias
- Último ano
- Personalizado

---

## Aba Pipeline

### Funil de Conversão

Visualize a jornada dos candidatos:

\`\`\`
┌─────────────────────────────────────────────────────┐
│                    FUNIL                             │
├─────────────────────────────────────────────────────┤
│ Novo       ████████████████████████████  150        │
│ Triagem    ██████████████████           67          │
│ Entrevista █████████                    28          │
│ Técnico    █████                         15         │
│ DISC       ████                          12         │
│ Final      ███                            8         │
│ Contratado ██                             5         │
└─────────────────────────────────────────────────────┘
\`\`\`

### Métricas por Estágio

- Taxa de passagem
- Tempo médio
- Candidatos atuais
- Tendência

---

## Aba Fontes

### Efetividade por Fonte

| Fonte | Candidatos | Contratados | Taxa |
|-------|------------|-------------|------|
| LinkedIn | 180 | 8 | 4.4% |
| Indeed | 120 | 4 | 3.3% |
| Indicação | 50 | 2 | 4.0% |
| Job Board | 100 | 1 | 1.0% |

### ROI por Fonte

Calcule o retorno de cada canal:

- Custo por candidatura
- Custo por contratação
- Qualidade média dos candidatos

---

## Aba Time-to-Hire

### Métricas

| Métrica | Valor |
|---------|-------|
| Média | 28 dias |
| Mediana | 22 dias |
| Mínimo | 12 dias |
| Máximo | 65 dias |

### Evolução Temporal

Gráfico de linhas mostrando:

- Tendência mensal
- Comparação com período anterior
- Projeção futura

### Por Departamento

Compare velocidade por área:

\`\`\`
Engenharia:  32 dias
Marketing:   21 dias
Vendas:      18 dias
RH:          15 dias
\`\`\`

---

## Aba Agentes IA

### Performance dos Agentes

| Agente | Execuções | Sucesso | Tempo Médio |
|--------|-----------|---------|-------------|
| Job Parser | 150 | 98.5% | 1.2s |
| Matching | 1200 | 99.2% | 0.8s |
| Screening | 450 | 97.8% | 2.1s |
| DISC | 200 | 100% | 1.5s |

### Consumo de Tokens

- Tokens usados no período
- Custo estimado
- Comparação com período anterior

---

## Exportação de Dados

### Formatos

- **CSV**: Para Excel e análises
- **JSON**: Para integrações
- **PDF**: Para relatórios executivos

### Como Exportar

1. Acesse a aba desejada
2. Clique em **"Exportar"**
3. Selecione o formato
4. Download automático

---

## Relatórios Agendados

### Configurando

1. **Analytics → Relatórios**
2. Clique em **"Novo Agendamento"**
3. Configure:

| Campo | Opções |
|-------|--------|
| Frequência | Diário, Semanal, Mensal |
| Destinatários | Emails da equipe |
| Formato | PDF, CSV |
| Conteúdo | Overview, Pipeline, Fontes |

### Relatórios Disponíveis

- **Resumo Executivo**: Visão geral
- **Pipeline**: Funil detalhado
- **Fontes**: Análise de canais
- **Performance**: Métricas de equipe

---

## Dashboards Personalizados

### Criando Dashboard

1. **Analytics → Dashboards**
2. **"Novo Dashboard"**
3. Adicione widgets:
   - Gráficos
   - Métricas
   - Tabelas
4. Salve e compartilhe

### Widgets Disponíveis

- Counter (métrica única)
- Line chart (tendência)
- Bar chart (comparação)
- Pie chart (distribuição)
- Table (dados tabulares)
- Funnel (conversão)
`,
      },
    ],
  },

  // ========================================
  // API
  // ========================================
  {
    id: "api",
    title: "API Reference",
    icon: "code",
    articles: [
      {
        id: "api-intro",
        title: "Introdução à API",
        description: "Comece a integrar com a API do Zion Recruit.",
        badge: "Dev",
        updatedAt: "Jan 2025",
        nextArticle: "api-auth",
        nextTitle: "Autenticação",
        content: `
# Introdução à API

A API REST do Zion Recruit permite integrar a plataforma com seus sistemas existentes.

## Base URL

\`\`\`
https://api.zionrecruit.com
\`\`\`

Ambiente de desenvolvimento:

\`\`\`
http://localhost:3000/api
\`\`\`

## Formato

- **Content-Type**: \`application/json\`
- **Codificação**: UTF-8
- **Datas**: ISO 8601 (\`2025-01-20T14:30:00Z\`)

## Versionamento

A API é versionada via URL:

\`\`\`
/api/v1/candidates
/api/v2/candidates
\`\`\`

A versão atual é **v2**.

---

## Rate Limiting

### Headers de Resposta

\`\`\`
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699887600000
Retry-After: 60  // quando excedido
\`\`\`

### Limites

| Tipo | Limite | Rotas |
|------|--------|-------|
| AUTH | 5/min | /api/auth/* |
| API | 100/min | /api/* |
| AI | 20/min | /api/agents/* |
| WEBHOOK | 1000/min | /webhook/* |
| PUBLIC | 60/min | /api/public/* |

### Bypass Interno

Para serviços internos, use o header:

\`\`\`
x-internal-service-token: <seu-token>
\`\`\`

---

## Paginação

### Parâmetros

| Parâmetro | Default | Máximo |
|-----------|---------|--------|
| page | 1 | - |
| limit | 20 | 100 |

### Exemplo

\`\`\`
GET /api/candidates?page=2&limit=50
\`\`\`

### Resposta

\`\`\`json
{
  "candidates": [...],
  "total": 150,
  "page": 2,
  "limit": 50,
  "totalPages": 3
}
\`\`\`

---

## Ordenação

Use o parâmetro \`sort\`:

\`\`\`
GET /api/candidates?sort=createdAt:desc
\`\`\`

Campos disponíveis variam por endpoint.

---

## Filtros

### Exemplos

\`\`\`
# Filtrar por status
GET /api/candidates?status=SCREENING

# Filtrar por vaga
GET /api/candidates?jobId=clx123

# Múltiplos filtros
GET /api/candidates?status=SCREENING&minScore=70
\`\`\`

---

## Tratamento de Erros

### Formato de Erro

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": [
      { "field": "email", "message": "E-mail inválido" }
    ]
  },
  "requestId": "req_123..."
}
\`\`\`

### Códigos de Erro

| Código | HTTP | Descrição |
|--------|------|-----------|
| UNAUTHORIZED | 401 | Não autenticado |
| FORBIDDEN | 403 | Sem permissão |
| NOT_FOUND | 404 | Recurso não encontrado |
| VALIDATION_ERROR | 400 | Dados inválidos |
| RATE_LIMIT_EXCEEDED | 429 | Limite excedido |
| INTERNAL_ERROR | 500 | Erro interno |

---

## SDKs Oficiais

### JavaScript/TypeScript

\`\`\`bash
npm install @zion-recruit/sdk
\`\`\`

\`\`\`typescript
import { ZionRecruit } from '@zion-recruit/sdk';

const client = new ZionRecruit({
  apiKey: 'your-api-key'
});

const candidates = await client.candidates.list();
\`\`\`

---

## Próximos Passos

- [Autenticação](#api-auth)
- [Endpoints de Candidatos](#api-candidates)
- [Endpoints de Vagas](#api-jobs)
- [Webhooks](#api-webhooks)
`,
      },
      {
        id: "api-auth",
        title: "Autenticação",
        description: "Como autenticar suas requisições à API.",
        prevArticle: "api-intro",
        prevTitle: "Introdução à API",
        nextArticle: "api-candidates",
        nextTitle: "API de Candidatos",
        content: `
# Autenticação

## Métodos de Autenticação

### 1. Sessão NextAuth

Para aplicações web usando a interface:

\`\`\`http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "senha"
}
\`\`\`

Resposta:

\`\`\`json
{
  "user": {
    "id": "user_123",
    "name": "Nome do Usuário",
    "email": "usuario@email.com",
    "tenantId": "tenant_123"
  },
  "expires": "2025-02-20T00:00:00Z"
}
\`\`\`

### 2. API Key

Para integrações server-to-server:

\`\`\`http
GET /api/candidates
Authorization: Bearer sk_live_xxxxxxxxxxxx
\`\`\`

### 3. Token Interno

Para serviços internos:

\`\`\`http
GET /api/candidates
x-internal-service-token: zion_internal_xxx
\`\`\`

---

## Obtendo API Key

1. Acesse **Configurações → APIs**
2. Clique em **"Gerar Nova Key"**
3. Selecione as permissões
4. Copie a key (exibida apenas uma vez!)

### Permissões

| Permissão | Descrição |
|-----------|-----------|
| candidates:read | Ler candidatos |
| candidates:write | Criar/editar candidatos |
| jobs:read | Ler vagas |
| jobs:write | Criar/editar vagas |
| webhooks:manage | Gerenciar webhooks |

---

## Refresh Token

APIs Keys não expiram, mas você pode rotacionar:

\`\`\`http
POST /api/auth/rotate-key
Authorization: Bearer sk_live_xxx
\`\`\`

---

## Escopos Multi-Tenant

APIs Keys são vinculadas ao tenant:

- Dados isolados por empresa
- Permissões específicas
- Rate limit independente

---

## Boas Práticas

:::warning
Nunca exponha API Keys no frontend ou código público!
:::

### Armazenamento Seguro

\`\`\`bash
# Variável de ambiente
export ZION_API_KEY=sk_live_xxx

# .env (não commitar!)
ZION_API_KEY=sk_live_xxx
\`\`\`

### Rotação Regular

Recomendamos rotacionar keys a cada 90 dias.

### Monitoramento

Configure alertas para:

- Uso anormal
- Tentativas de acesso negado
- Aproximação do rate limit
`,
      },
      {
        id: "api-candidates",
        title: "API de Candidatos",
        description: "Endpoints para gerenciar candidatos.",
        prevArticle: "api-auth",
        prevTitle: "Autenticação",
        nextArticle: "api-jobs",
        nextTitle: "API de Vagas",
        content: `
# API de Candidatos

Complete reference para gerenciamento de candidatos.

## Listar Candidatos

\`\`\`http
GET /api/candidates
Authorization: Bearer sk_live_xxx
\`\`\`

### Parâmetros

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| jobId | string | Filtrar por vaga |
| status | string | Filtrar por status |
| search | string | Buscar por nome/email |
| minScore | number | Score mínimo |
| page | number | Página (default: 1) |
| limit | number | Por página (default: 20, max: 100) |

### Resposta

\`\`\`json
{
  "candidates": [
    {
      "id": "clx123",
      "name": "João Silva",
      "email": "joao@email.com",
      "status": "SCREENING",
      "matchScore": 85,
      "job": {
        "id": "job_123",
        "title": "Desenvolvedor"
      }
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
\`\`\`

---

## Criar Candidato

\`\`\`http
POST /api/candidates
Authorization: Bearer sk_live_xxx
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "+55 11 99999-9999",
  "jobId": "job_123",
  "resumeUrl": "https://...",
  "source": "LinkedIn"
}
\`\`\`

### Resposta

\`\`\`json
{
  "id": "clx456",
  "name": "João Silva",
  "email": "joao@email.com",
  "status": "APPLIED",
  "createdAt": "2025-01-20T14:30:00Z"
}
\`\`\`

---

## Obter Candidato

\`\`\`http
GET /api/candidates/:id
Authorization: Bearer sk_live_xxx
\`\`\`

### Resposta

\`\`\`json
{
  "id": "clx456",
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "+55 11 99999-9999",
  "resumeUrl": "https://...",
  "parsedSkills": ["JavaScript", "React", "Node.js"],
  "matchScore": 85,
  "matchDetails": {
    "skillsScore": 90,
    "experienceScore": 80,
    "strengths": ["Domínio em React"],
    "gaps": ["Experiência com TypeScript"]
  },
  "discTest": {
    "completed": true,
    "profile": "DI",
    "scores": { "D": 85, "I": 75, "S": 30, "C": 45 }
  },
  "job": {
    "id": "job_123",
    "title": "Desenvolvedor Full Stack"
  }
}
\`\`\`

---

## Atualizar Candidato

\`\`\`http
PATCH /api/candidates/:id
Authorization: Bearer sk_live_xxx
Content-Type: application/json

{
  "status": "INTERVIEWING",
  "tags": ["frontend", "react"]
}
\`\`\`

---

## Calcular Match

\`\`\`http
POST /api/candidates/:id/match
Authorization: Bearer sk_live_xxx
\`\`\`

### Resposta

\`\`\`json
{
  "matchScore": 85,
  "skillsScore": 90,
  "experienceScore": 80,
  "matchDetails": {
    "matchedSkills": ["JavaScript", "React", "Node.js"],
    "missingSkills": ["TypeScript"]
  },
  "recommendation": "GOOD_MATCH"
}
\`\`\`

---

## Deletar Candidato

\`\`\`http
DELETE /api/candidates/:id
Authorization: Bearer sk_live_xxx
\`\`\`

### Resposta

\`\`\`json
{
  "success": true,
  "message": "Candidato removido com sucesso"
}
\`\`\`
`,
      },
      {
        id: "api-jobs",
        title: "API de Vagas",
        description: "Endpoints para gerenciar vagas.",
        prevArticle: "api-candidates",
        prevTitle: "API de Candidatos",
        nextArticle: "api-webhooks",
        nextTitle: "API de Webhooks",
        content: `
# API de Vagas

Complete reference para gerenciamento de vagas.

## Listar Vagas

\`\`\`http
GET /api/jobs
Authorization: Bearer sk_live_xxx
\`\`\`

### Parâmetros

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| status | string | Filtrar por status |
| department | string | Filtrar por departamento |
| search | string | Buscar por título |
| page | number | Página |
| limit | number | Por página |

### Resposta

\`\`\`json
{
  "jobs": [
    {
      "id": "job_123",
      "title": "Desenvolvedor Full Stack",
      "department": "Engenharia",
      "status": "ACTIVE",
      "location": "São Paulo, SP",
      "type": "CLT",
      "candidatesCount": 45
    }
  ],
  "total": 25
}
\`\`\`

---

## Criar Vaga

\`\`\`http
POST /api/jobs
Authorization: Bearer sk_live_xxx
Content-Type: application/json

{
  "title": "Desenvolvedor Full Stack",
  "department": "Engenharia",
  "description": "Buscamos profissional...",
  "requirements": "Experiência com React...",
  "location": "São Paulo, SP",
  "type": "CLT",
  "salary": {
    "min": 8000,
    "max": 12000,
    "currency": "BRL"
  }
}
\`\`\`

### Resposta

\`\`\`json
{
  "id": "job_789",
  "title": "Desenvolvedor Full Stack",
  "status": "DRAFT",
  "parsedRequirements": {
    "skills": ["React", "Node.js", "TypeScript"],
    "seniority": "SENIOR"
  }
}
\`\`\`

---

## Obter Vaga

\`\`\`http
GET /api/jobs/:id
Authorization: Bearer sk_live_xxx
\`\`\`

---

## Atualizar Vaga

\`\`\`http
PUT /api/jobs/:id
Authorization: Bearer sk_live_xxx
Content-Type: application/json

{
  "status": "ACTIVE",
  "description": "Nova descrição..."
}
\`\`\`

---

## Publicar Vaga

\`\`\`http
POST /api/jobs/:id/publish
Authorization: Bearer sk_live_xxx
\`\`\`

### Resposta

\`\`\`json
{
  "id": "job_789",
  "status": "ACTIVE",
  "publicSlug": "desenvolvedor-full-stack",
  "publicUrl": "https://zionrecruit.com/careers/job/desenvolvedor-full-stack"
}
\`\`\`

---

## Fechar Vaga

\`\`\`http
POST /api/jobs/:id/close
Authorization: Bearer sk_live_xxx
Content-Type: application/json

{
  "reason": "Position filled"
}
\`\`\`

---

## Deletar Vaga

\`\`\`http
DELETE /api/jobs/:id
Authorization: Bearer sk_live_xxx
\`\`\`
`,
      },
      {
        id: "api-webhooks",
        title: "API de Webhooks",
        description: "Configure webhooks para eventos em tempo real.",
        prevArticle: "api-jobs",
        prevTitle: "API de Vagas",
        content: `
# API de Webhooks

Receba notificações em tempo real sobre eventos da plataforma.

## Listar Webhooks

\`\`\`http
GET /api/webhooks
Authorization: Bearer sk_live_xxx
\`\`\`

### Resposta

\`\`\`json
{
  "webhooks": [
    {
      "id": "wh_123",
      "name": "Slack Notification",
      "url": "https://hooks.slack.com/...",
      "events": ["candidate.created", "candidate.hired"],
      "isActive": true,
      "lastStatus": "success"
    }
  ]
}
\`\`\`

---

## Criar Webhook

\`\`\`http
POST /api/webhooks
Authorization: Bearer sk_live_xxx
Content-Type: application/json

{
  "name": "Slack Notification",
  "url": "https://hooks.slack.com/...",
  "events": ["candidate.created", "candidate.hired"]
}
\`\`\`

### Resposta

\`\`\`json
{
  "id": "wh_456",
  "name": "Slack Notification",
  "secret": "whsec_xxxx",  // Guarde este secret!
  "isActive": true
}
\`\`\`

---

## Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| candidate.created | Novo candidato |
| candidate.updated | Candidato atualizado |
| candidate.hired | Candidato contratado |
| candidate.rejected | Candidato rejeitado |
| job.created | Nova vaga |
| job.updated | Vaga atualizada |
| job.closed | Vaga fechada |
| interview.scheduled | Entrevista agendada |
| interview.completed | Entrevista realizada |
| disc.completed | Teste DISC concluído |
| message.received | Mensagem recebida |

---

## Payload de Webhook

\`\`\`json
{
  "id": "evt_123",
  "type": "candidate.hired",
  "timestamp": "2025-01-20T14:30:00Z",
  "tenantId": "tenant_123",
  "data": {
    "candidate": {
      "id": "cand_456",
      "name": "João Silva",
      "email": "joao@email.com"
    },
    "job": {
      "id": "job_789",
      "title": "Desenvolvedor Full Stack"
    }
  }
}
\`\`\`

---

## Verificar Assinatura

### Node.js

\`\`\`javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
\`\`\`

### Headers do Webhook

\`\`\`
X-Zion-Signature: sha256=xxxx
X-Zion-Timestamp: 1699887600
X-Zion-Event: candidate.hired
\`\`\`

---

## Retry Automático

Se seu endpoint falhar, tentamos novamente:

| Tentativa | Delay |
|-----------|-------|
| 1 | 1 minuto |
| 2 | 5 minutos |
| 3 | 15 minutos |
| 4 | 1 hora |
| 5 | 4 horas |

Após 5 falhas, o webhook é desativado.

---

## Testar Webhook

\`\`\`http
POST /api/webhooks/:id/test
Authorization: Bearer sk_live_xxx
\`\`\`

### Resposta

\`\`\`json
{
  "success": true,
  "statusCode": 200,
  "responseTime": 150
}
\`\`\`

---

## Histórico de Entregas

\`\`\`http
GET /api/webhooks/:id/deliveries
Authorization: Bearer sk_live_xxx
\`\`\`

### Resposta

\`\`\`json
{
  "deliveries": [
    {
      "id": "del_123",
      "event": "candidate.hired",
      "statusCode": 200,
      "deliveredAt": "2025-01-20T14:30:00Z",
      "attempts": 1
    }
  ]
}
\`\`\`
`,
      },
    ],
  },

  // ========================================
  // COMPLIANCE
  // ========================================
  {
    id: "compliance",
    title: "Compliance",
    icon: "shield",
    articles: [
      {
        id: "lgpd-compliance",
        title: "Conformidade LGPD",
        description: "Como o Zion Recruit atende à LGPD.",
        badge: "Legal",
        updatedAt: "Jan 2025",
        nextArticle: "gdpr-compliance",
        nextTitle: "Conformidade GDPR",
        content: `
# Conformidade LGPD

O Zion Recruit foi projetado para atender integralmente à Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

## Nossa Posição na LGPD

### Como Controlador

Para dados de usuários da plataforma:

- Dados de cadastro
- Preferências e configurações
- Logs de acesso

### Como Operador

Para dados de candidatos:

- Controlador: Empresa cliente
- Operador: Zion Recruit

---

## Bases Legais Utilizadas

| Base Legal | Aplicação |
|------------|-----------|
| **Execução de Contrato** | Prestação dos serviços |
| **Consentimento** | DISC, marketing |
| **Interesse Legítimo** | Segurança, logs |
| **Obrigação Legal** | Retenção fiscal |

---

## Direitos dos Titulares

### Implementação na Plataforma

| Direito | Onde Exercer |
|---------|--------------|
| Confirmação | Portal/API |
| Acesso | Portal do Candidato |
| Correção | Interface de edição |
| Eliminação | Solicitação via DPO |
| Portabilidade | Exportação automática |
| Revogação | Configurações de conta |

### Prazos de Resposta

- **Confirmação**: 2 dias úteis
- **Resposta completa**: 15 dias

---

## Registro de Operações (ROP)

Mantemos registro completo conforme Art. 37:

- Finalidades documentadas
- Bases legais identificadas
- Prazos de retenção
- Medidas de segurança

---

## DPO (Encarregado de Dados)

**E-mail**: dpo@zionrecruit.com  
**Telefone**: +55 (XX) XXXX-XXXX

---

## Medidas de Segurança

| Medida | Implementação |
|--------|---------------|
| Criptografia | AES-256-GCM |
| Controle de Acesso | RBAC |
| Logs | Auditoria completa |
| Treinamento | Anual para equipe |

---

## Contratos

### DPA (Data Processing Agreement)

Disponível para todos os clientes:

- Responsabilidades definidas
- Subprocessadores autorizados
- Notificação de incidentes

---

## Transferência Internacional

Quando aplicável:

- Cláusulas Contratuais Padrão
- Garantias adequadas
- Notificação prévia

---

## Auditoria

- Relatórios de compliance
- Logs de acesso
- Certificações planejadas

---

## Contato

Para questões de LGPD:

- **DPO**: dpo@zionrecruit.com
- **ANPD**: www.gov.br/anpd
`,
      },
      {
        id: "gdpr-compliance",
        title: "Conformidade GDPR",
        description: "Como atendemos ao regulamento europeu.",
        prevArticle: "lgpd-compliance",
        prevTitle: "Conformidade LGPD",
        nextArticle: "security",
        nextTitle: "Segurança da Informação",
        content: `
# Conformidade GDPR

Para clientes e candidatos na União Europeia, garantimos conformidade com o GDPR (Regulamento UE 2016/679).

## Aplicabilidade

O GDPR se aplica quando:

- Candidatos são residentes na UE
- Empresas clientes estão na UE
- Oferecemos serviços a residentes na UE

---

## Diferenças: LGPD vs GDPR

| Aspecto | LGPD | GDPR |
|---------|------|------|
| Prazo resposta | 15 dias | 30 dias |
| Notificação incidente | "Prazo razoável" | 72 horas |
| Multa máxima | 2% fat. (R$ 50M) | 4% fat. (€20M) |

---

## Representante na UE

Para empresas europeias:

**Representante**: [Nome empresa]  
**Endereço**: [Endereço na UE]  
**E-mail**: eu-representative@zionrecruit.com

---

## Transferências Internacionais

### Do Brasil para UE

- Dados podem fluir livremente
- Cláusulas contratuais aplicáveis

### Da UE para Brasil

- Cláusulas Contratuais Padrão (SCC)
- Garantias contratuais
- Direitos de auditoria

---

## Direitos dos Titulares (UE)

Além dos direitos da LGPD:

- **Direito à portabilidade**: Formato estruturado
- **Direito ao esquecimento**: Eliminação mais ampla
- **Direito de oposição**: A decisões automatizadas

---

## Notificação de Incidentes

### Prazo: 72 horas

Em caso de violação:

1. Notificação à autoridade supervisora
2. Comunicação aos titulares afetados
3. Documentação do incidente

---

## Autoridades Supervisoras

Dependendo do país:

- **Irlanda**: Data Protection Commission
- **Alemanha**: BfDI
- **França**: CNIL
- **Outros**: Autoridades locais

---

## Documentação

Disponibilizamos:

- Records of Processing Activities (ROPA)
- Data Protection Impact Assessment (DPIA)
- Data Processing Agreements (DPA)
`,
      },
      {
        id: "security",
        title: "Segurança da Informação",
        description: "Conheça nossas medidas de segurança.",
        prevArticle: "gdpr-compliance",
        prevTitle: "Conformidade GDPR",
        content: `
# Segurança da Informação

A segurança é um pilar fundamental do Zion Recruit.

## Criptografia

### Em Trânsito

- **Protocolo**: TLS 1.3
- **Certificados**: Let's Encrypt / DigiCert
- **HSTS**: Habilitado

### Em Repouso

| Dado | Algoritmo |
|------|-----------|
| Credenciais API | AES-256-GCM |
| Senhas | bcrypt (cost 12) |
| Webhooks secrets | AES-256-GCM |
| Backups | AES-256 |

---

## Controle de Acesso

### RBAC (Role-Based Access Control)

| Role | Permissões |
|------|------------|
| OWNER | Total |
| ADMIN | Gerenciamento |
| RECRUITER | Candidatos/Vagas |
| VIEWER | Apenas visualização |

### Autenticação

- NextAuth.js com JWT
- Sessões seguras
- Timeout automático
- MFA (planejado)

---

## Rate Limiting

Proteção contra abuso:

| Tipo | Limite | Proteção |
|------|--------|----------|
| AUTH | 5/min | Brute force |
| API | 100/min | DDoS |
| AI | 20/min | Custo |

---

## Auditoria e Logs

### O que Registramos

- Acessos (login/logout)
- Visualizações de dados sensíveis
- Alterações de configurações
- Exportações de dados
- Ações administrativas

### Retenção

- Logs de acesso: 90 dias
- Logs de auditoria: 5 anos
- Logs de segurança: 2 anos

---

## Infraestrutura

### Data Centers

- Região primária: Brasil (planejado)
- Região secundária: EUA (backup)
- CDN global

### Backup

- Frequência: Diário
- Retenção: 90 dias
- Criptografia: AES-256
- Testes: Mensais

---

## Certificações (Planejadas)

| Certificação | Previsão |
|--------------|----------|
| ISO 27001 | Q2 2025 |
| SOC 2 Type II | Q3 2025 |
| PCI-DSS (via Stripe) | Já ativo |

---

## Vulnerabilidades

### Bug Bounty

Programa de recompensas para researchers:

- scope: *.zionrecruit.com
- Rewords: Até R$ 10.000
- Contato: security@zionrecruit.com

### Reportar Vulnerabilidade

E-mail: security@zionrecruit.com  
PGP Key: [Link]

---

## Incidentes de Segurança

### Plano de Resposta

1. **Detecção**: Monitoramento 24/7
2. **Contenção**: Isolamento imediato
3. **Análise**: Investigação completa
4. **Notificação**: Conforme LGPD/GDPR
5. **Melhoria**: Implementação de correções

### Contato 24/7

- **Telefone**: +55 (XX) XXXX-XXXX
- **E-mail**: incidentes@zionrecruit.com
`,
      },
    ],
  },

  // ========================================
  // POLÍTICAS
  // ========================================
  {
    id: "policies",
    title: "Políticas",
    icon: "scale",
    articles: [
      {
        id: "terms",
        title: "Termos de Uso",
        description: "Termos e condições para uso da plataforma.",
        badge: "Legal",
        updatedAt: "Jan 2025",
        nextArticle: "privacy",
        nextTitle: "Política de Privacidade",
        content: `
# Termos de Uso

**Última atualização**: Janeiro 2025

## 1. Aceitação

Ao acessar o Zion Recruit, você concorda com estes Termos.

## 2. Elegibilidade

- Ter capacidade jurídica plena
- Ser maior de 18 anos
- Fornecer informações verdadeiras

## 3. Cadastro

- Responsabilidade pelas credenciais
- Atualização de dados
- Notificação de uso não autorizado

## 4. Planos e Pagamentos

| Plano | Valor | Limite |
|-------|-------|--------|
| FREE | $0 | 1 vaga |
| STARTER | R$ 249/mês | 5 vagas |
| PROFESSIONAL | R$ 749/mês | 25 vagas |
| ENTERPRISE | Sob consulta | Ilimitado |

## 5. Uso Aceitável

É proibido:
- Discriminar candidatos
- Violar direitos de terceiros
- Utilizar para fins ilegais

## 6. Propriedade Intelectual

- Plataforma: Propriedade da Zion
- Seus dados: Sua propriedade

## 7. Privacidade

Consulte nossa [Política de Privacidade](#privacy).

## 8. Limitação de Responsabilidade

Responsabilidade limitada ao valor pago nos últimos 12 meses.

## 9. Rescisão

- Pelo usuário: A qualquer momento
- Pela Zion: Por justa causa com aviso

## 10. Foro

Comarca de [São Paulo], Brasil.

---

**Contato**: juridico@zionrecruit.com
`,
      },
      {
        id: "privacy",
        title: "Política de Privacidade",
        description: "Como tratamos seus dados pessoais.",
        prevArticle: "terms",
        prevTitle: "Termos de Uso",
        nextArticle: "data-protection",
        nextTitle: "Política de Proteção de Dados",
        content: `
# Política de Privacidade

**Última atualização**: Janeiro 2025

## 1. Dados Coletados

### Usuários

- Nome, e-mail, telefone
- Cargo, departamento
- Foto de perfil

### Candidatos

- Dados de identificação
- Currículo
- Resultados DISC
- Comunicações

## 2. Finalidades

| Finalidade | Base Legal |
|------------|------------|
| Execução do contrato | Contrato |
| Processo seletivo | Contrato/Consentimento |
| Segurança | Interesse legítimo |
| Marketing | Consentimento |

## 3. Compartilhamento

Compartilhamos com:

- Empresas contratantes (dados de candidatos)
- Stripe (pagamentos)
- Provedores de IA (dados anonimizados)

## 4. Seus Direitos

- Acesso
- Correção
- Eliminação
- Portabilidade
- Revogação

## 5. Cookies

| Tipo | Duração |
|------|---------|
| Essenciais | Sessão |
| Funcionais | 1 ano |
| Analíticos | 2 anos |

## 6. Segurança

- Criptografia TLS 1.3
- AES-256 para dados sensíveis
- Backups criptografados

## 7. Retenção

| Dado | Prazo |
|------|-------|
| Conta | Duração + 30 dias |
| Candidatos | 24 meses |
| Logs | 5 anos |

## 8. Contato

**DPO**: dpo@zionrecruit.com

---

**Versão**: 2.0
`,
      },
      {
        id: "data-protection",
        title: "Política de Proteção de Dados",
        description: "Política completa de proteção de dados pessoais.",
        prevArticle: "privacy",
        prevTitle: "Política de Privacidade",
        content: `
# Política de Proteção de Dados

**Versão**: 2.0 | **Data**: Janeiro 2025

## Controlador de Dados

**Zion Assessment Technologies Ltda.**  
CNPJ: XX.XXX.XXX/0001-XX  
DPO: dpo@zionrecruit.com

---

## 1. Princípios

- **Finalidade**: Uso específico e legítimo
- **Adequação**: Compatível com finalidades
- **Necessidade**: Coleta mínima necessária
- **Transparência**: Informações claras
- **Segurança**: Medidas técnicas e organizacionais

## 2. Dados Tratados

### Por Categoria

| Categoria | Exemplos |
|-----------|----------|
| Identificação | Nome, e-mail, telefone |
| Profissionais | Cargo, currículo, skills |
| Técnicos | IP, user agent, logs |

### Por Titular

| Titular | Dados |
|---------|-------|
| Usuários | Cadastro, preferências |
| Candidatos | Currículo, DISC, comunicações |

## 3. Bases Legais

| Base | Uso |
|------|-----|
| Contrato | Prestação de serviços |
| Consentimento | DISC, marketing |
| Interesse legítimo | Segurança |
| Obrigação legal | Retenção fiscal |

## 4. Direitos dos Titulares

Implementados via:

- Portal do Candidato
- API de dados
- Solicitação ao DPO

Prazo: 15 dias (LGPD) / 30 dias (GDPR)

## 5. Segurança

| Medida | Especificação |
|--------|---------------|
| Criptografia | AES-256-GCM |
| Controle acesso | RBAC |
| Logs | Auditoria completa |
| Backups | Diários, criptografados |

## 6. Compartilhamento

Apenas com:

- Empresas clientes (para candidatos)
- Processadores autorizados
- Autoridades (quando obrigatório)

## 7. Transferência Internacional

Com salvaguardas adequadas:

- Cláusulas contratuais padrão
- Certificações
- Garantias contratuais

## 8. Incidentes

Notificação em:

- 72 horas (GDPR)
- Prazo razoável (LGPD)

Contato: incidentes@zionrecruit.com

---

**Contato DPO**: dpo@zionrecruit.com
`,
      },
    ],
  },
];

// Helper to find article by ID
export function findArticleById(id: string): { section: DocSection; article: DocArticle } | null {
  for (const section of docsSections) {
    const article = section.articles.find((a) => a.id === id);
    if (article) {
      return { section, article };
    }
  }
  return null;
}

// Helper to get all articles as flat array
export function getAllArticles(): DocArticle[] {
  return docsSections.flatMap((section) => section.articles);
}
