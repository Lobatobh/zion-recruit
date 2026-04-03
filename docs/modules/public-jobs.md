# Módulo: Job Board Público

> **Versão:** 1.0 | **Status:** Produção | **Última atualização:** 2025

## Visão Geral

O módulo Job Board Público fornece uma vitrine de vagas acessível ao público sem autenticação, integrando otimização para mecanismos de busca (SEO), rastreamento UTM e formulário de candidatura com validação robusta. O sistema é acessível através da view pública `careers` e utiliza slugs públicos amigáveis para URLs compartilháveis.

O módulo suporta filtros via URL (URL-driven filters), paginação, contagem de visualizações, detecção de candidaturas duplicadas e geração automática de sitemap XML.

---

## Sumário

1. [Componentes](#componentes)
2. [APIs REST](#apis-rest)
3. [Views Públicas](#views-públicas)
4. [Campos do Prisma](#campos-do-prisma)
5. [Rastreamento UTM](#rastreamento-utm)
6. [SEO e Dados Estruturados](#seo-e-dados-estruturados)
7. [Rate Limiting](#rate-limiting)
8. [Fluxo de Candidatura](#fluxo-de-candidatura)
9. [Considerações Técnicas](#considerações-técnicas)

---

## Componentes

### `job-board.tsx`

**Exportação:** `JobBoard`

Componente principal do job board que orquestra filtros, paginação e listagem de vagas.

**Funcionalidades:**
- **Filtros via URL:** Parâmetros de busca mantidos na URL (ex: `/careers?department=Tecnologia&location=São%20Paulo`)
- **Rastreamento UTM:** Captura e armazena parâmetros UTM de campanhas de marketing
- **Paginação:** Navegação por páginas com query param `page`
- **Layout responsivo:** Grid adaptativo baseado no viewport
- **SEO:** Meta tags dinâmicas e dados estruturados JSON-LD

**Estrutura de URL:**
```
/careers
/careers?search=desenvolvedor
/careers?department=Tecnologia&location=São Paulo&type=CLT
/careers?search=frontend&page=2&limit=10
/careers?utm_source=linkedin&utm_medium=cpc&utm_campaign=vagas-dev
```

**Parâmetros de URL Suportados:**
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `search` | `string` | Busca textual no título e descrição |
| `department` | `string` | Filtrar por departamento |
| `location` | `string` | Filtrar por localização |
| `type` | `string` | Tipo de contratação (CLT, PJ, Freelance) |
| `page` | `number` | Página atual (padrão: 1) |
| `limit` | `number` | Itens por página (padrão: 12) |
| `utm_source` | `string` | Fonte da campanha |
| `utm_medium` | `string` | Meio da campanha |
| `utm_campaign` | `string` | Nome da campanha |
| `utm_content` | `string` | Conteúdo do anúncio |
| `utm_term` | `string` | Termo da campanha |

---

### `job-card.tsx`

**Exportação:** `JobCard`

Card de vaga para exibição na listagem do job board.

**Elementos Visuais:**

```
┌─────────────────────────────────────────────────────────────────┐
│  [🟢 Logo da Empresa]                                          │
│                                                                  │
│  Desenvolvedor Frontend Senior                                  │
│  TechCorp · São Paulo, SP                                       │
│                                                                  │
│  💰 R$ 8.000 — R$ 12.000 · CLT                                  │
│                                                                  │
│  ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐               │
│  │ React  │ │Next.js │ │TypeScript│ │Tailwind  │               │
│  └────────┘ └────────┘ └──────────┘ └──────────┘               │
│  (Badges de habilidades identificadas por IA)                   │
│                                                                  │
│  🕐 Há 2 dias · 👥 15 candidaturas                              │
└─────────────────────────────────────────────────────────────────┘
```

**Dados Exibidos:**
| Campo | Formato | Descrição |
|---|---|---|
| Logo da empresa | Imagem | `companyLogoUrl` ou fallback |
| Título da vaga | Texto | `title` |
| Empresa + Localização | Texto | `companyName · location` |
| Salário | Moeda BRL | Faixa formatada (R$ X — R$ Y) |
| Tipo | Badge | CLT / PJ / Freelance / Estágio |
| Skills IA | Badges | Habilidades-chave extraídas por IA |
| Data | Texto relativo | "Há X dias" |
| Candidaturas | Contagem | Número total de candidaturas |

**Skills IA:**
As badges de habilidades são geradas automaticamente pela IA durante a criação da vaga, identificando as tecnologias e competências mais relevantes. Até 5 badges são exibidos no card.

---

### `job-detail.tsx`

**Exportação:** `JobDetail`

Página de detalhes da vaga com layout de 3 colunas e informações completas.

**Layout de 3 Colunas (Desktop):**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Voltar às vagas                                        [Compartilhar]│
├──────────────────────┬───────────────────┬──────────────────────────────┤
│   Conteúdo Principal  │   Sidebar        │   Sidebar Direita             │
│   (2 colunas)         │   (1 coluna)     │   (1 coluna)                 │
├──────────────────────┼───────────────────┼──────────────────────────────┤
│  🟢 TechCorp          │ 📋 Resumo Rápido │ 📊 Resumo IA                 │
│                       │                   │                              │
│  Desenvolvedor        │ • São Paulo, SP   │ Match Score: 85%             │
│  Frontend Senior      │ • CLT             │                              │
│                       │ • R$ 8k-12k      │ Habilidades-chave:           │
│  📍 São Paulo, SP     │ • Home Office     │ ██████████ React 95%         │
│  💰 R$ 8k-12k · CLT   │ • 40h semanais   │ ████████░░ Next.js 82%      │
│  🕐 Publicada há 2d   │                   │ ████████░░ TypeScript 80%    │
│                       │ 📌 Requisitos     │                              │
│  ── Descrição ────── │ • 5+ anos exp.    │ 🤖 Sobre esta análise:       │
│                       │ • React/Next.js   │ Baseada no perfil da vaga   │
│  <HTML da descrição>  │ • TypeScript      │ e histórico de contratações  │
│  (renderizado como    │ • Inglês fluente  │                              │
│   HTML seguro)        │                   │                              │
│                       │ 🎁 Benefícios     │                              │
│                       │ • Plano de saúde  │                              │
│                       │ • VR              │                              │
│                       │ • GI              │                              │
├──────────────────────┴───────────────────┴──────────────────────────────┤
│                                                                  [ ▼ ] │
│                    ┌──────────────────────────────────────┐             │
│                    │    📩 Candidatar-se a esta vaga      │             │
│                    └──────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────────┘
```

**Seções:**

| Coluna | Conteúdo | Descrição |
|---|---|---|
| **Principal** | Descrição HTML | Descrição completa da vaga renderizada como HTML seguro |
| **Sidebar Esquerda** | Resumo Rápido | Localização, tipo, salário, modalidade, carga horária, requisitos, benefícios |
| **Sidebar Direita** | Resumo IA | Match score, habilidades-chave com barras de progresso, análise baseada em IA |

**Botão Compartilhar:**
- Copia URL da vaga para a área de transferência
- Opções de compartilhamento: LinkedIn, Twitter, WhatsApp, Email

---

### `job-filters.tsx`

**Exportação:** `JobFilters`

Componente de filtros com dropdowns e Sheet responsivo para mobile.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🔍 [Buscar por cargo ou palavra-chave...          ]                      │
│                                                                          │
│ Departamento: [Todos ▼]  Localização: [Todas ▼]  Tipo: [Todos ▼]        │
│                                                                          │
│ [Limpar Filtros]                              45 vagas encontradas      │
└──────────────────────────────────────────────────────────────────────────┘
```

**Mobile (Sheet):**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ═══════════  (drag indicator)                                          │
│                                                                          │
│  Filtros                                                        [✕]     │
│                                                                          │
│  Busca                                                                   │
│  [________________________________]                                     │
│                                                                          │
│  Departamento                                                            │
│  [Selecione o departamento ▼]                                            │
│                                                                          │
│  Localização                                                             │
│  [Selecione a localização ▼]                                             │
│                                                                          │
│  Tipo de Contratação                                                     │
│  [Selecione o tipo ▼]                                                    │
│                                                                          │
│  ─────────────────────────────                                           │
│  [     Limpar Filtros     ]  [     Aplicar     ]                         │
└──────────────────────────────────────────────────────────────────────────┘
```

**Filtros Disponíveis:**

| Filtro | Tipo | Valores |
|---|---|---|
| `search` | Text input | Busca livre |
| `department` | Dropdown | Dinâmico (do banco de dados) |
| `location` | Dropdown | Dinâmico (do banco de dados) |
| `type` | Dropdown | CLT, PJ, Freelance, Estágio, Trainee |

---

### `application-form.tsx`

**Exportação:** `ApplicationForm`

Formulário de candidatura com validação Zod, rastreamento UTM e detecção de duplicidade.

**Campos do Formulário:**

| Campo | Tipo | Validação Zod | Obrigatório |
|---|---|---|---|
| `fullName` | Texto | `z.string().min(3).max(100)` | Sim |
| `email` | Email | `z.string().email()` | Sim |
| `phone` | Telefone | `z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/)` | Sim |
| `resume` | File | PDF, DOC, DOCX — máx 10MB | Sim |
| `linkedin` | URL | `z.string().url().optional()` | Não |
| `portfolio` | URL | `z.string().url().optional()` | Não |
| `coverLetter` | Textarea | `z.string().max(2000).optional()` | Não |
| `source` | Hidden | Preenchido via UTM automaticamente | Não |

**Detecção de Duplicidade:**
- Verifica se o candidato já se candidatou à mesma vaga (mesmo email + mesmo jobId)
- Se duplicata encontrada, exibe aviso: "Você já se candidatou a esta vaga em {date}"
- Não impede nova candidatura, mas exige confirmação explícita

**Validação Visual:**
- Validação em tempo real (onChange)
- Mensagens de erro em português
- Indicador de upload de currículo com preview do nome do arquivo
- Loading state durante envio
- Feedback de sucesso/erro via toast

---

### `job-seo.tsx`

**Exportação:** `JobSEO`, `generateJobMetadata`

Componentes e utilitários para otimização de mecanismos de busca.

#### `JobSEO`

Componente React que injeta meta tags dinâmicas na página de detalhes da vaga:

```tsx
<JobSEO
  job={{
    title: "Desenvolvedor Frontend Senior",
    description: "Vaga para desenvolvedor...",
    location: "São Paulo, SP",
    department: "Tecnologia",
    companyName: "TechCorp",
    salaryMin: 8000,
    salaryMax: 12000,
    type: "CLT",
    publicSlug: "desenvolvedor-frontend-senior-techcorp",
  }}
/>
```

**Meta Tags Geradas:**
```html
<title>Desenvolvedor Frontend Senior — TechCorp | Zion Recruit</title>
<meta name="description" content="Vaga para desenvolvedor..." />
<meta property="og:title" content="Desenvolvedor Frontend Senior — TechCorp" />
<meta property="og:description" content="Vaga para desenvolvedor..." />
<meta property="og:type" content="jobposting" />
<meta property="og:url" content="https://careers.zionrecruit.com/vagas/desenvolvedor-frontend-senior-techcorp" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="https://careers.zionrecruit.com/vagas/desenvolvedor-frontend-senior-techcorp" />
```

#### `generateJobMetadata(job)`

Função utilitária que gera dados estruturados JSON-LD para Google Jobs:

```json
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "title": "Desenvolvedor Frontend Senior",
  "description": "Vaga para desenvolvedor...",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "TechCorp",
    "sameAs": "https://techcorp.com"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "São Paulo",
      "addressRegion": "SP",
      "addressCountry": "BR"
    }
  },
  "employmentType": "FULL_TIME",
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "BRL",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": 8000,
      "maxValue": 12000,
      "unitText": "MONTH"
    }
  },
  "datePosted": "2025-01-15",
  "validThrough": "2025-03-15",
  "identifier": {
    "@type": "PropertyValue",
    "name": "TechCorp",
    "value": "desenvolvedor-frontend-senior-techcorp"
  }
}
```

---

## APIs REST

### `GET /api/public/jobs`

Lista vagas públicas com filtros e paginação.

**Parâmetros de Query:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `department` | `string` | Não | Filtrar por departamento |
| `location` | `string` | Não | Filtrar por localização |
| `type` | `string` | Não | Tipo de contratação |
| `search` | `string` | Não | Busca textual |
| `page` | `number` | Não | Página (padrão: 1) |
| `limit` | `number` | Não | Limite (padrão: 12) |

**Resposta:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "publicSlug": "desenvolvedor-frontend-senior-techcorp",
      "title": "Desenvolvedor Frontend Senior",
      "companyName": "TechCorp",
      "companyLogoUrl": "/logos/techcorp.png",
      "department": "Tecnologia",
      "location": "São Paulo, SP",
      "type": "CLT",
      "salaryMin": 8000,
      "salaryMax": 12000,
      "currency": "BRL",
      "mode": "HYBRID",
      "description": "<p>Descrição da vaga...</p>",
      "aiSkills": ["React", "Next.js", "TypeScript", "Tailwind CSS"],
      "viewsCount": 245,
      "applicationsCount": 15,
      "publishedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 45,
    "totalPages": 4,
    "hasMore": true
  },
  "filters": {
    "departments": ["Tecnologia", "Design", "Marketing"],
    "locations": ["São Paulo, SP", "Remoto", "Rio de Janeiro, RJ"],
    "types": ["CLT", "PJ", "Freelance"]
  }
}
```

**Filtro Interno:** Apenas vagas com `isPublic: true` são retornadas.

---

### `GET /api/public/jobs/[id]`

Obtém detalhes de uma vaga pública por ID ou slug público.

**Comportamento:**
- Aceita tanto UUID (`id`) quanto slug público (`publicSlug`) como parâmetro
- **Auto-incrementa** `viewsCount` a cada acesso
- Retorna dados completos incluindo descrição HTML e resumo IA

**Resposta:** Objeto `Job` completo com todos os campos públicos

**Cabeçalhos de Cache:**
```
Cache-Control: public, max-age=300, stale-while-revalidate=600
```

---

### `POST /api/public/jobs/[id]/apply`

Submete candidatura a uma vaga pública.

**Content-Type:** `multipart/form-data`

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `fullName` | `string` | Sim | Nome completo |
| `email` | `string` | Sim | Email |
| `phone` | `string` | Sim | Telefone |
| `resume` | `file` | Sim | Currículo (PDF/DOC/DOCX, máx 10MB) |
| `linkedin` | `string` | Não | URL do LinkedIn |
| `portfolio` | `string` | Não | URL do portfolio |
| `coverLetter` | `string` | Não | Carta de apresentação |
| `utmSource` | `string` | Não | Fonte UTM |
| `utmMedium` | `string` | Não | Meio UTM |
| `utmCampaign` | `string` | Não | Campanha UTM |

**Validação Zod (server-side):**
```typescript
const applicationSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  email: z.string().email('Email inválido'),
  phone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido'),
  linkedin: z.string().url('URL inválida').optional().or(z.literal('')),
  portfolio: z.string().url('URL inválida').optional().or(z.literal('')),
  coverLetter: z.string().max(2000, 'Carta de apresentação muito longa').optional(),
});
```

**Detecção de Duplicata:**
- Verifica: `email + jobId + tenantId`
- Se duplicata: retorna `409 Conflict` com detalhes da candidatura anterior

**Respostas:**
| Status | Condição | Body |
|---|---|---|
| `201 Created` | Candidatura criada | `{ application: {...}, message: "Candidatura enviada com sucesso!" }` |
| `409 Conflict` | Candidatura duplicada | `{ error: "duplicate", existingApplication: {...} }` |
| `422 Unprocessable` | Validação falhou | `{ errors: [{ field, message }] }` |
| `429 Too Many Requests` | Rate limit | `{ error: "Muitas tentativas. Tente novamente em X segundos." }` |

---

### `GET /api/public/sitemap`

Gera sitemap XML para indexação por mecanismos de busca.

**Content-Type:** `application/xml`

**Cache:** 1 hora (para performance)

**Estrutura do Sitemap:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://careers.zionrecruit.com/careers</loc>
    <lastmod>2025-01-20</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://careers.zionrecruit.com/vagas/desenvolvedor-frontend-senior-techcorp</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- ... mais URLs de vagas públicas ... -->
</urlset>
```

**URLs Incluídas:**
1. Página principal do job board (`/careers`) — prioridade 1.0
2. Página de cada vaga pública (`/vagas/{publicSlug}`) — prioridade 0.8

---

## Views Públicas

| View | Rota | Autenticação | Descrição |
|---|---|---|---|
| `careers` | `/careers` | Não requerida | Job board público |
| `careers/[slug]` | `/careers/[slug]` | Não requerida | Detalhe da vaga |

**Configuração de Views Públicas:**
As views do job board estão registradas no array `PUBLIC_VIEWS` da aplicação, permitindo acesso sem autenticação NextAuth.

---

## Campos do Prisma

### Modelo `Job` — Campos Públicos

| Campo | Tipo | Descrição |
|---|---|---|
| `isPublic` | `Boolean` | Se a vaga é visível no job board público |
| `publicSlug` | `String` | Slug único amigável para URL (auto-gerado) |
| `viewsCount` | `Int` | Contador de visualizações (auto-incrementado) |
| `applicationsCount` | `Int` | Contador de candidaturas (atualizado via trigger) |

**Geração do Slug:**
```typescript
// Formato: {titulo-normalizado}-{nome-empresa-normalizado}
// Exemplo: "desenvolvedor-frontend-senior-techcorp"
function generatePublicSlug(title: string, companyName: string): string {
  return `${slugify(title)}-${slugify(companyName)}`.toLowerCase();
}
```

**Auto-incremento de Views:**
```typescript
// Incrementado a cada acesso ao GET /api/public/jobs/[id]
await db.job.update({
  where: { id: jobId },
  data: { viewsCount: { increment: 1 } }
});
```

---

## Rastreamento UTM

### Parâmetros Capturados

| Parâmetro | Fonte | Descrição |
|---|---|---|
| `utm_source` | URL | Plataforma de origem (Google, LinkedIn, etc.) |
| `utm_medium` | URL | Meio (cpc, organic, social, email) |
| `utm_campaign` | URL | Nome da campanha |
| `utm_content` | URL | Variante do anúncio |
| `utm_term` | URL | Termo de busca |

### Fluxo de Rastreamento

```
1. Candidato acessa /careers?utm_source=linkedin&utm_medium=cpc&utm_campaign=vagas-dev
                    │
2. Componente JobBoard captura UTM params do URL
                    │
3. UTM params armazenados em estado local (React state)
                    │
4. Candidato navega para detalhe da vaga → UTM params mantidos
                    │
5. Candidato clica em "Candidatar-se" → ApplicationForm recebe UTM params
                    │
6. Formulário envia UTM params junto com a candidatura
                    │
7. Candidatura salva no banco com metadata UTM
```

### Análise de Conversão

Os dados UTM permitem análise de:

- **Taxa de conversão por fonte:** Qual plataforma gera mais candidaturas
- **ROI de campanha:** Custo por candidatura por campanha
- **Funil de conversão:** Visualizações → Candidaturas por canal
- **A/B testing:** Comparação de variants de campanha

---

## SEO e Dados Estruturados

### Meta Tags Dinâmicas

Cada página de vaga possui meta tags otimizadas:

- `<title>` — `{Título} — {Empresa} | Zion Recruit`
- `<meta name="description">` — Resumo da vaga (max 160 caracteres)
- Open Graph tags para compartilhamento social
- Twitter Card tags
- Canonical URL

### JSON-LD (JobPosting Schema)

Dados estruturados no formato JSON-LD seguindo o schema `JobPosting` do Google:

- **Benefícios para SEO:** Indexação no Google Jobs
- **Rich snippets:** Exibição aprimorada nos resultados de busca
- **Compatibilidade:** Google, Bing, LinkedIn e outros agregadores

### Sitemap XML

- Disponível em `/api/public/sitemap`
- Cache de 1 hora para performance
- Inclui todas as vagas públicas
- Atualização automática quando vagas são publicadas/removidas

---

## Rate Limiting

### Tier: PUBLIC

O job board público utiliza o tier `PUBLIC` de rate limiting.

**Limites:**
| Endpoint | Limite | Janela |
|---|---|---|
| `GET /api/public/jobs` | 60 requests/min | Por IP |
| `GET /api/public/jobs/[id]` | 60 requests/min | Por IP |
| `POST /api/public/jobs/[id]/apply` | 5 requests/min | Por IP + email |
| `GET /api/public/sitemap` | 10 requests/min | Por IP |

**Resposta de Rate Limit:**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45,
  "message": "Muitas requisições. Tente novamente em 45 segundos."
}
```

**Headers Incluídos:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705795200
```

---

## Fluxo de Candidatura

```
┌──────────────────────────────────────────────────────────────────┐
│                    FLUXO DE CANDIDATURA                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Candidato visualiza vaga                                     │
│     └─→ viewsCount++ (auto-incremento)                           │
│                                                                  │
│  2. Clica em "Candidatar-se"                                     │
│     └─→ ApplicationForm abre com UTM params                      │
│                                                                  │
│  3. Preenche formulário                                          │
│     └─→ Validação em tempo real (Zod)                            │
│                                                                  │
│  4. Submete formulário                                           │
│     └─→ Validação server-side (Zod)                              │
│     └─→ Upload de currículo                                      │
│     └─→ Detecção de duplicata (email + jobId)                    │
│                                                                  │
│  5. Candidatura criada                                           │
│     └─→ applicationsCount++                                      │
│     └─→ Notificação ao recrutador (via notifyEvent)              │
│     └─→ Email de confirmação ao candidato                        │
│     └─→ Registro UTM no metadata da candidatura                  │
│                                                                  │
│  6. Feedback ao candidato                                        │
│     └─→ Toast de sucesso                                         │
│     └─→ Redirecionamento ou confirmação in-page                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Considerações Técnicas

### Segurança

| Aspecto | Implementação |
|---|---|
| **HTML sanitizado** | Descrição da vaga sanitizada contra XSS antes do rendering |
| **Upload seguro** | Validação de tipo MIME, tamanho e extensão do currículo |
| **Rate limiting** | Tier PUBLIC aplicado a todos os endpoints públicos |
| **Duplicatas** | Detecção server-side por email + jobId |
| **Isolamento de tenant** | Vagas filtradas por tenant mesmo em endpoints públicos |

### Performance

| Otimização | Descrição |
|---|---|
| **Cache de sitemap** | 1 hora de cache para `/api/public/sitemap` |
| **Cache de vagas** | Headers Cache-Control em endpoints de listagem |
| **Paginação** | Limita carga de dados por request |
| **Lazy loading** | Imagens de logos carregadas sob demanda |

### Extensibilidade

- Novos filtros podem ser adicionados ao esquema de URL
- Templates de email de confirmação customizáveis
- Webhooks para integração com ATS externos
- Suporte a multi-idioma planejado (atualmente pt-BR)
