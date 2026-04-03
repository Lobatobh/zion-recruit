# Módulo: Sourcing de Candidatos

> **Versão:** 1.0 | **Última atualização:** 2025  
> **Status:** Estável | **Proprietário:** Equipe de Sourcing

---

## Sumário

1. [Visão Geral](#visao-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes de UI](#componentes-de-ui)
4. [Bibliotecas (src/lib/sourcing)](#bibliotecas-srclibsourcing)
5. [APIs REST](#apis-rest)
6. [Fontes de Sourcing](#fontes-de-sourcing)
7. [Cálculo de Relevância](#calculo-de-relevancia)
8. [Fluxo de Importação](#fluxo-de-importacao)
9. [Exemplos de Uso](#exemplos-de-uso)
10. [Considerações e Limitações](#consideracoes-e-limitacoes)

---

## Visão Geral

O módulo de **Sourcing** implementa a busca e importação de candidatos a partir de múltiplas fontes, centralizando o processo de aquisição de talentos em uma interface unificada.

O sistema oferece:

- **Busca multi-fonte** — Executa buscas em paralelo em LinkedIn, Indeed, GitHub e pool interno
- **Deduplicação automática** — Remove candidatos duplicados por e-mail, LinkedIn e nome
- **Score de relevância** — Classificação automática baseada em skills, localização e experiência
- **Importação em lote** — Importa múltiplos candidatos para uma vaga de uma vez
- **Geração de perfis realistas** — Scrapers em modo mock geram perfis brasileiros realistas
- **Rate limiting** — Controle de requisições por fonte para evitar bloqueios

### Principais Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Busca Multi-Fonte | Busca paralela em LinkedIn, Indeed, GitHub e pool interno |
| Seletor de Fontes | Interface para selecionar e configurar fontes de busca |
| Preview de Candidato | Visualização completa do perfil antes da importação |
| Importação Individual/Bulk | Importar um ou múltiplos candidatos para o pipeline |
| Score de Relevância | Classificação automática 0-100 baseada em match com requisitos |
| Configuração de Fontes | Habilitar/desabilitar fontes e ajustar limites de requisição |

---

## Arquitetura

```
src/lib/sourcing/
├── types.ts             # Tipos, interfaces e funções auxiliares
├── sourcing-service.ts  # Serviço unificado de sourcing
├── linkedin-scraper.ts  # Scraper mock do LinkedIn (20 req/min)
├── indeed-scraper.ts    # Scraper mock do Indeed (30 req/min)
├── github-scraper.ts    # Scraper mock do GitHub (30 req/min)
└── internal-search.ts   # Busca no pool interno de candidatos

src/components/sourcing/
├── sourcing-panel.tsx    # Painel principal com 2 abas
├── source-selector.tsx   # Grid de seleção de canais
├── candidate-preview.tsx # Modal de preview do perfil
├── import-dialog.tsx     # Diálogo de importação
├── sourcing-results.tsx  # Tabela de resultados com seleção
└── index.ts              # Exportações centralizadas

src/app/api/sourcing/
├── search/route.ts   # POST — busca multi-fonte
├── import/route.ts   # POST — importar candidato(s)
├── sources/route.ts  # GET — fontes disponíveis
└── config/route.ts   # GET/PUT — configuração de fontes
```

---

## Componentes de UI

### `sourcing-panel.tsx`

**Export:** `SourcingPanel`

Painel principal de sourcing com duas abas de navegação.

**Abas:**

| Aba | Descrição |
|---|---|
| **Search** | Formulário de busca com campos: query, skills, localização, nível de experiência, vaga associada. Inclui o `SourceSelector` para escolher fontes |
| **Results** | Exibe resultados da busca no componente `SourcingResults` com contagem total, filtros e ações em lote |

**Estado Interno:**
- `searchParams` — Parâmetros da busca atual
- `results` — Resultados da busca multi-fonte
- `loading` — Estado de carregamento durante busca paralela
- `selectedCandidates` — Candidatos selecionados para importação
- `searchHistory` — Histórico de buscas recentes

---

### `source-selector.tsx`

**Export:** `SourceSelector`

Grid de seleção de canais de sourcing com badges de rate limit.

**Layout:**
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   LinkedIn       │  │     Indeed       │  │     GitHub       │
│   ✓ Ativo        │  │   ✓ Ativo        │  │   ✓ Ativo        │
│   20 req/min     │  │   30 req/min     │  │   30 req/min     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
┌──────────────────┐  ┌──────────────────┐
│  Pool Interno    │  │  AI Generated    │
│   ✓ Ativo        │  │   ✗ Desativado   │
│   Sem limite     │  │   -              │
└──────────────────┘  └──────────────────┘
```

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `selectedSources` | `SourcingSource[]` | Fontes selecionadas |
| `onSelectionChange` | `(sources: SourcingSource[]) => void` | Callback ao alterar seleção |
| `rateLimitStatuses` | `Record<SourcingSource, RateLimitStatus>` | Status de rate limit por fonte |
| `disabled` | `boolean` | Desabilitar seleção (durante busca) |

---

### `candidate-preview.tsx`

**Export:** `CandidatePreview`

Modal de preview completo do perfil de um candidato sourcingado.

**Seções:**

| Seção | Conteúdo |
|---|---|
| **Header** | Nome, título, foto placeholder, source badge, score de relevância |
| **Contato** | E-mail, telefone, localização, links (LinkedIn, GitHub, portfolio) |
| **Resumo** | Summary profissional do candidato |
| **Skills** | Tags de skills com destaque para as que combinam com a vaga |
| **Experiência** | Lista de experiências profissionais com cargo, empresa e período |
| **Educação** | Formação acadêmica |
| **Match** | Detalhes do score de relevância e match reasons |
| **Ações** | Botões: Importar para Vaga, Adicionar Tags, Descartar |

---

### `import-dialog.tsx`

**Export:** `ImportDialog`

Diálogo para importação de candidatos com lista de checkboxes e tags.

**Funcionalidades:**
- Lista de candidatos selecionados com checkbox para confirmação
- Campo de tags (input multi-valor)
- Campo de notas opcionais
- Seleção da vaga de destino
- Checkbox "pular verificação de duplicatas"
- Exibição de resultados da importação (sucesso/duplicata/erro)

**Estado de Resultados:**

```typescript
interface ImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  failed: number;
  results: ImportCandidateResult[];
}
```

---

### `sourcing-results.tsx`

**Export:** `SourcingResults`

Tabela de resultados de sourcing com seleção em lote.

**Colunas:**

| Coluna | Descrição |
|---|---|
| ☐ | Checkbox para seleção em lote |
| Candidato | Nome e título profissional |
| Fonte | Badge com source (LinkedIn, Indeed, etc.) |
| Skills | Tags dos principais skills |
| Localização | Cidade/Estado |
| Score | Badge colorido com score de relevância (0-100) |
| Match | Skills match percentual |
| Ações | Preview, Importar |

**Ações em Lote:**
- Selecionar todos / Desmarcar todos
- Importar selecionados
- Exportar selecionados (CSV)
- Filtrar por score mínimo
- Ordenar por relevância/experiência/fonte

---

## Bibliotecas (src/lib/sourcing)

### `types.ts`

**Exportações:** Tipos, interfaces e funções auxiliares completas do módulo de sourcing.

**Tipos Principais:**

```typescript
// Fontes disponíveis
type SourcingSource = 'linkedin' | 'indeed' | 'github' | 'internal' | 'ai_generated';

// Níveis de experiência
type ExperienceLevel = 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'executive';

// Status de contato
type ContactStatus = 'not_contacted' | 'contacted' | 'responded' | 'not_interested' | 'hired';
```

**Interfaces Principais:**

```typescript
interface SourcingSearchParams {
  jobId?: string;
  query?: string;
  skills?: string[];
  location?: string;
  experienceLevel?: ExperienceLevel;
  keywords?: string[];
  remoteOnly?: boolean;
  minExperience?: number;
  maxExperience?: number;
  salary?: { min?: number; max?: number; currency?: string };
  sources?: SourcingSource[];
  limit?: number;
  offset?: number;
  deduplicate?: boolean;
  includeContactInfo?: boolean;
}

interface SourcedCandidate {
  id: string;
  externalId?: string;
  name: string;
  email?: string;
  phone?: string;
  title: string;
  company?: string;
  summary?: string;
  skills: string[];
  skillsMatch?: number;        // 0-100
  experienceYears?: number;
  experience?: WorkExperience[];
  education?: Education[];
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  remote?: boolean;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  sourceUrl?: string;
  source: SourcingSource;
  sourcedAt: string;
  relevanceScore?: number;     // 0-100
  matchReasons?: string[];
  contactStatus?: ContactStatus;
  raw?: Record<string, unknown>;
}

interface MultiSourceSearchResult {
  success: boolean;
  candidates: SourcedCandidate[];
  total: number;
  bySource: Record<SourcingSource, SourcingSearchResult>;
  deduplicated: number;
  durationMs: number;
  errors: string[];
}

interface ImportCandidateInput {
  candidate: SourcedCandidate;
  jobId: string;
  tags?: string[];
  notes?: string;
  skipDuplicateCheck?: boolean;
}

interface BulkImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  failed: number;
  results: ImportCandidateResult[];
}
```

**Funções Auxiliares:**

| Função | Descrição |
|---|---|
| `getSourceLabel(source)` | Retorna rótulo legível da fonte (ex: `linkedin` → `"LinkedIn"`) |
| `getSourceIcon(source)` | Retorna nome do ícone Lucide (ex: `linkedin` → `"Linkedin"`) |
| `getSourceColor(source)` | Retorna classes Tailwind de cor (ex: `linkedin` → `"bg-blue-100 text-blue-700"`) |
| `getExperienceLevelLabel(level)` | Retorna rótulo do nível (ex: `senior` → `"Senior (5-8 years)"`) |
| `calculateRelevanceScore(candidate, skills, location, expLevel)` | Calcula score de relevância 0-100 |

---

### `sourcing-service.ts`

**Exportações:** `SourcingService`, `createSourcingService`

Classe principal que coordena buscas multi-fonte e importação de candidatos.

**Métodos Principais:**

| Método | Descrição |
|---|---|
| `multiSourceSearch(params)` | Busca paralela em todas as fontes selecionadas |
| `searchByJob(jobId, options?)` | Busca baseada nos requisitos de uma vaga |
| `importCandidate(input)` | Importa candidato individual |
| `bulkImport(input)` | Importação em lote |
| `getRateLimitStatuses()` | Status de rate limit de todas as fontes |

**Método Estático:**

| Método | Descrição |
|---|---|
| `SourcingService.getAvailableSources()` | Lista configurações de todas as fontes |

**Detalhes da Busca Multi-Fonte:**

```
multiSourceSearch(params)
    │
    ├── 1. Determinar fontes ativas (padrão: todas)
    │
    ├── 2. Executar buscas em PARALELO (Promise.allSettled)
    │   ├── linkedInScraper.search(params)
    │   ├── indeedScraper.search(params)
    │   ├── githubScraper.search(params)
    │   └── internalSearch.search(params, tenantId)
    │
    ├── 3. Agregar resultados
    │   ├── Consolidar candidatos de todas as fontes
    │   └── Registrar erros por fonte
    │
    ├── 4. Deduplicar candidatos
    │   ├── Chaves: email, linkedin, github, nome+fonte
    │   └── Manter candidato com maior score
    │
    ├── 5. Calcular score de relevância
    │   └── Para candidatos sem score prévio
    │
    ├── 6. Ordenar por relevância (decrescente)
    │
    └── 7. Retornar MultiSourceSearchResult
```

**Deduplicação:**

O algoritmo de deduplicação usa múltiplas chaves para identificar duplicatas:

```
Chaves de deduplicação (por candidato):
  1. email (lowercase)
  2. linkedin (lowercase)
  3. github (lowercase)
  4. nome (lowercase) + source

Se qualquer chave conflitar → candidato é considerado duplicata
```

**Extração de Skills:**

```typescript
// Padrões de regex para extração de skills de textos
const skillPatterns = [
  /\b(react|vue|angular|next\.js|typescript|node\.js)\b/gi,
  /\b(python|django|flask|tensorflow|pytorch)\b/gi,
  /\b(java|spring|kotlin|scala)\b/gi,
  /\b(go|golang|rust|c\+\+|c#)\b/gi,
  /\b(aws|azure|gcp|docker|kubernetes|terraform)\b/gi,
  /\b(sql|mongodb|postgresql|redis|graphql)\b/gi,
  /\b(git|ci\/cd|jenkins|github actions)\b/gi,
  /\b(machine learning|data science|nlp|computer vision)\b/gi,
];
```

---

### `linkedin-scraper.ts`

**Export:** `linkedinScraper`

Scraper mock do LinkedIn que gera perfis profissionais brasileiros realistas.

**Configuração:**
- Rate limit: **20 requisições/minuto**
- Rate limit diário: **1000 requisições/dia**
- Modo: **Mock** (não requer credenciais reais)

**Perfis Gerados:**
- Nomes brasileiros realistas
- Títulos em português
- Empresas brasileiras e multinacionais
- Skills relevantes para o mercado brasileiro de TI
- Localizações: São Paulo, Rio de Janeiro, Belo Horizonte, Curitiba, etc.

---

### `indeed-scraper.ts`

**Export:** `indeedScraper`

Scraper mock do Indeed com perfis brasileiros.

**Configuração:**
- Rate limit: **30 requisições/minuto**
- Rate limit diário: **2000 requisições/dia**
- Modo: **Mock**

---

### `github-scraper.ts`

**Export:** `githubScraper`

Scraper mock do GitHub focado em desenvolvedores.

**Configuração:**
- Rate limit: **30 requisições/minuto**
- Rate limit diário: **2000 requisições/dia**
- Modo: **Mock**

**Dados Específicos:**
- Repositórios com linguagens de programação
- Commits, stars e forks
- Contribuições open source
- Bio e localização

---

### `internal-search.ts`

**Export:** `internalSearch`

Busca no pool interno de candidatos já cadastrados no banco de dados.

**Configuração:**
- Rate limit: **Sem limite** (busca local)
- Modo: **Real** (busca no Prisma DB)

**Critérios de Busca:**
- Skills (parsedSkills)
- Localização (city, state)
- Status do candidato
- Tags
- Notas textuais

---

## APIs REST

### `POST /api/sourcing/search`

Executa busca multi-fonte de candidatos.

**Request Body:**

```json
{
  "jobId": "job_456",
  "query": "Desenvolvedor Full Stack",
  "skills": ["React", "Node.js", "TypeScript"],
  "location": "São Paulo",
  "experienceLevel": "senior",
  "sources": ["linkedin", "github", "internal"],
  "limit": 50,
  "offset": 0
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `jobId` | `string` | Não | ID da vaga (busca baseada em requisitos) |
| `query` | `string` | Não | Termo de busca livre |
| `skills` | `string[]` | Não | Skills obrigatórias |
| `location` | `string` | Não | Localização desejada |
| `experienceLevel` | `string` | Não | Nível de experiência |
| `sources` | `string[]` | Não | Fontes para buscar (padrão: todas) |
| `limit` | `number` | Não | Máximo de resultados (padrão: 20) |
| `offset` | `number` | Não | Offset para paginação (padrão: 0) |

**Resposta (200):**

```json
{
  "success": true,
  "candidates": [ /* lista de SourcedCandidate */ ],
  "total": 47,
  "bySource": {
    "linkedin": { "success": true, "candidates": 15, "total": 15 },
    "indeed": { "success": true, "candidates": 12, "total": 12 },
    "github": { "success": true, "candidates": 10, "total": 10 },
    "internal": { "success": true, "candidates": 13, "total": 13 }
  },
  "deduplicated": 3,
  "durationMs": 2450,
  "errors": []
}
```

---

### `POST /api/sourcing/import`

Importa um ou múltiplos candidatos para o pipeline.

**Request Body (single):**

```json
{
  "candidate": {
    "name": "João Silva",
    "email": "joao@email.com",
    "title": "Desenvolvedor Senior",
    "skills": ["React", "Node.js"],
    "source": "linkedin"
  },
  "jobId": "job_456",
  "tags": ["referencia", "tech-lead"],
  "notes": "Candidato com forte experiência em React"
}
```

**Request Body (bulk):**

```json
{
  "candidates": [ /* array de SourcedCandidate */ ],
  "jobId": "job_456",
  "tags": ["sourcing-batch-01"],
  "skipDuplicateCheck": false
}
```

**Resposta (200):**

```json
{
  "success": true,
  "imported": 8,
  "duplicates": 2,
  "failed": 0,
  "results": [
    { "success": true, "candidateId": "new_cand_1" },
    { "success": false, "isDuplicate": true, "existingCandidateId": "cand_123" }
  ]
}
```

---

### `GET /api/sourcing/sources`

Retorna as fontes de sourcing disponíveis com status e limites.

**Resposta (200):**

```json
{
  "sources": [
    {
      "id": "linkedin",
      "name": "LinkedIn",
      "description": "Rede profissional",
      "icon": "Linkedin",
      "enabled": true,
      "requiresAuth": false,
      "rateLimit": {
        "requestsPerMinute": 20,
        "requestsPerDay": 1000
      },
      "features": {
        "skillSearch": true,
        "locationSearch": true,
        "experienceSearch": true,
        "profilePreview": true,
        "bulkImport": true
      }
    }
  ]
}
```

---

### `GET /api/sourcing/config`

Retorna a configuração atual das fontes de sourcing.

---

### `PUT /api/sourcing/config`

Atualiza a configuração de uma fonte.

**Request Body:**

```json
{
  "source": "linkedin",
  "enabled": true,
  "settings": {
    "maxResultsPerSearch": 50,
    "defaultExperienceLevel": "mid"
  }
}
```

---

## Fontes de Sourcing

| Fonte | Rate Limit | Requer Auth | Modo | Dados |
|---|---|---|---|---|
| **LinkedIn** | 20 req/min, 1000/dia | Não (mock) | Mock | Nome, título, empresa, skills, experiência, localização |
| **Indeed** | 30 req/min, 2000/dia | Não (mock) | Mock | Nome, título, empresa, skills, experiência, localização |
| **GitHub** | 30 req/min, 2000/dia | Não (mock) | Mock | Username, nome, repositórios, linguagens, bio, localização |
| **Pool Interno** | Sem limite | N/A | Real | Dados do banco de dados Prisma |
| **AI Generated** | N/A | Não | Mock | Perfis gerados por IA baseados em critérios |

---

## Cálculo de Relevância

O score de relevância é calculado pela função `calculateRelevanceScore()` com pesos distribuídos:

| Critério | Peso | Descrição |
|---|---|---|
| **Skills Match** | 40% | Proporção de skills obrigatórias presentes no candidato |
| **Location Match** | 20% | Localização do candidato contém a localização desejada |
| **Experience Match** | 20% | Anos de experiência dentro da faixa esperada |
| **Profile Completeness** | 20% | E-mail (+5), LinkedIn (+5), summary (+5), experiência (+5) |

**Faixas de Experiência:**

| Nível | Faixa |
|---|---|
| Entry | 0-1 anos |
| Junior | 1-3 anos |
| Mid | 3-5 anos |
| Senior | 5-8 anos |
| Lead | 8-10 anos |
| Principal | 10+ anos |
| Executive | 15+ anos |

---

## Fluxo de Importação

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Selecionar  │────▶│  Verificar   │────▶│   Importar   │────▶│  Confirmar   │
│  Candidatos  │     │  Duplicatas  │     │   para DB    │     │  Resultado   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │                     │
                       ┌────┴────┐          ┌────┴────┐
                       ▼         ▼          ▼         ▼
                     Duplicado  Único     Sucesso    Erro
                       │         │          │         │
                       ▼         ▼          ▼         ▼
                   Pular com   Continuar  Criar     Registrar
                   aviso       import.    registro  erro
```

**Verificação de Duplicatas:**
- Busca por `email`, `linkedin` e `github` na mesma vaga e tenant
- Se encontrado → retorna `isDuplicate: true` com `existingCandidateId`
- Opção `skipDuplicateCheck` para forçar importação

---

## Exemplos de Uso

### Buscar Candidatos via API

```bash
# Busca por skills e localização
curl -X POST /api/sourcing/search \
  -H "Content-Type: application/json" \
  -d '{
    "skills": ["React", "TypeScript", "Node.js"],
    "location": "São Paulo",
    "experienceLevel": "senior",
    "sources": ["linkedin", "github", "internal"],
    "limit": 30
  }'
```

### Busca Baseada em Vaga

```bash
# Busca automática baseada em requisitos da vaga
curl -X POST /api/sourcing/search \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "job_456"
  }'
```

### Importação em Lote

```bash
curl -X POST /api/sourcing/import \
  -H "Content-Type: application/json" \
  -d '{
    "candidates": [
      { "name": "João Silva", "email": "joao@email.com", "source": "linkedin" },
      { "name": "Maria Santos", "email": "maria@email.com", "source": "indeed" }
    ],
    "jobId": "job_456",
    "tags": ["sourcing-janeiro-2025"]
  }'
```

### Uso do Serviço no Backend

```typescript
import { createSourcingService } from '@/lib/sourcing/sourcing-service';

const sourcing = createSourcingService(tenantId);

// Busca multi-fonte
const results = await sourcing.multiSourceSearch({
  skills: ['React', 'Node.js'],
  location: 'São Paulo',
  experienceLevel: 'senior',
});

console.log(`${results.total} candidatos encontrados`);
console.log(`${results.deduplicated} duplicatas removidas`);

// Importação
const importResult = await sourcing.bulkImport({
  candidates: results.candidates.slice(0, 10),
  jobId: 'job_456',
  tags: ['top-10'],
});

console.log(`Importados: ${importResult.imported}`);
console.log(`Duplicatas: ${importResult.duplicates}`);
```

---

## Considerações e Limitações

| Aspecto | Detalhe |
|---|---|
| **Modo Mock** | Todos os scrapers (LinkedIn, Indeed, GitHub) operam em modo mock sem credenciais reais |
| **Perfis** | Perfis gerados são realistas com nomes, empresas e localizações brasileiras |
| **Rate Limit** | Limites são simulados no modo mock mas a estrutura suporta credenciais reais |
| **Deduplicação** | Baseada em heurísticas (email, LinkedIn, nome+fonte) — pode haver falsos positivos |
| **Caching** | Resultados de busca não são cacheados — cada busca é executada em tempo real |
| **Concorrência** | Buscas paralelas usam `Promise.allSettled` para tolerância a falhas parciais |

---

## v2.0 — i18n e Feedback de Erros

> **Versão:** 2.0 | **Atualizado em:** 2025

### Internacionalização (i18n)

- Todas as mensagens de erro retornadas pelas APIs de sourcing foram traduzidas para **pt-BR**, incluindo mensagens de validação, erros de busca e falhas de importação.

### Feedback de Erros

- Falhas na busca de candidatos agora exibem **notificações toast** ao usuário, indicando que a operação não pôde ser concluída.
- Detalhes da resposta de erro são exibidos diretamente na interface, permitindo que o usuário entenda o motivo da falha (ex.: fonte indisponível, rate limit atingido, parâmetros inválidos).

