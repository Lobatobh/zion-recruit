# Vagas (Jobs)

> **Categoria:** Recrutamento | **Status:** ✅ Estável
>
> Gestão completa de vagas de emprego com CRUD via API REST (`/api/vacancies`), KPIs em tempo real, paginação, ordenação, filtros avançados, ações em lote (bulk), análise DISC de perfil ideal e sistema de fila para processamento em background.

---

## Descrição

O módulo de **Vagas** oferece gerenciamento completo do ciclo de vida de uma vaga de emprego — desde a criação com detalhes da posição até a análise comportamental DISC que sugere o perfil ideal de candidato. A interface foi completamente reescrita e agora oferece:

- **API REST dedicada** (`/api/vacancies`) separada do sistema de fila (`/api/jobs`)
- **KPI Cards** com estatísticas em tempo real (total, publicadas, rascunho, candidatos, média)
- **Paginação e ordenação** com colunas clicáveis e navegação por páginas
- **Filtros avançados** com painel animado (status, departamento, tipo)
- **Seleção em lote** com barra de ações (publicar, fechar, arquivar, excluir)
- **Toggle rápido de status** (clique no badge para ciclar: DRAFT → PUBLISHED → PAUSED → CLOSED)
- **Dupla visualização**: tabela desktop com colunas detalhadas e cards responsivos para mobile

---

## Arquitetura

```
src/
├── types/job.ts                        # Tipos, schemas Zod, enums, helpers
├── stores/jobs-store.ts                # Store Zustand com estado expandido
├── components/jobs/
│   ├── jobs-list.tsx                   # Listagem principal (reescrita completa)
│   ├── job-detail-dialog.tsx           # Detalhes com 4 abas
│   ├── new-job-dialog.tsx              # Dialogs de criar/editar vaga
│   ├── job-form.tsx                    # Formulário reutilizável (create/edit)
│   ├── job-card.tsx                    # Cards para dashboard/widgets
│   └── disc-profile-suggestion.tsx     # Perfil DISC (discProfileRequired)
└── app/api/
    ├── vacancies/
    │   ├── route.ts                    # GET (list) + POST (create)
    │   ├── [id]/route.ts               # GET + PUT + DELETE + PATCH
    │   └── bulk/route.ts               # POST (ações em lote)
    └── jobs/                           # Sistema de fila (legado, ver job-queue.md)
        ├── route.ts                    # Queue jobs (background)
        └── [id]/
            ├── route.ts                # Queue job detail
            ├── cancel/route.ts         # Cancel queue job
            └── analyze-disc/route.ts   # Trigger DISC analysis
```

> **Nota:** O endpoint `/api/jobs` continua existindo para o sistema de fila (background jobs). O CRUD de vagas agora utiliza `/api/vacancies`. Consulte [job-queue.md](./job-queue.md) para detalhes sobre a fila.

---

## Tipos (`src/types/job.ts`)

### Enums

```typescript
// Tipos de vaga
enum JobType {
  FULL_TIME = "FULL_TIME",      // Tempo Integral
  PART_TIME = "PART_TIME",      // Meio Período
  CONTRACT = "CONTRACT",        // Contrato
  INTERNSHIP = "INTERNSHIP",    // Estágio
  FREELANCE = "FREELANCE",      // Freelance
}

// Status da vaga
enum JobStatus {
  DRAFT = "DRAFT",              // Rascunho
  PUBLISHED = "PUBLISHED",      // Publicada
  PAUSED = "PAUSED",            // Pausada
  CLOSED = "CLOSED",            // Fechada
  ARCHIVED = "ARCHIVED",        // Arquivada
}

// Tipo de contrato
enum ContractType {
  CLT = "CLT",
  PJ = "PJ",
  CONTRACTOR = "CONTRACTOR",    // Contratante
  INTERNSHIP = "INTERNSHIP",    // Estágio
}

// Modelo de trabalho
enum WorkModel {
  REMOTE = "REMOTE",            // Remoto
  HYBRID = "HYBRID",            // Híbrido
  ONSITE = "ONSITE",            // Presencial
}

// Tipo de salário
enum SalaryType {
  HOURLY = "HOURLY",            // Horário
  DAILY = "DAILY",              // Diário
  WEEKLY = "WEEKLY",            // Semanal
  MONTHLY = "MONTHLY",          // Mensal
  YEARLY = "YEARLY",            // Anual
}
```

### Interfaces Principais

```typescript
// Interface da vaga (alinhada com o schema Prisma)
interface Job {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  department: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  type: JobType;
  contractType: ContractType | null;
  workModel: WorkModel | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: SalaryType | null;
  currency: string;
  description: string;
  requirements: string;
  benefits: string | null;
  status: JobStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  isPublic: boolean;
  publicSlug: string | null;
  viewsCount: number;
  applicationsCount: number;
  aiSummary: string | null;
  aiParsedSkills: string | null;
  aiParsedKeywords: string | null;
  aiParsedSeniority: string | null;
  discProfileRequired: string | null;  // JSON string com perfil DISC
  createdAt: string;
  updatedAt: string;
  // Campos joined
  candidatesCount?: number;
  pipeline?: PipelineStageSummary[];
}

// Job com contagem de candidatos
interface JobWithCandidates extends Job {
  candidatesCount: number;
}

// KPI Stats retornado na listagem
interface JobKPIStats {
  totalJobs: number;
  publishedJobs: number;
  draftJobs: number;
  closedJobs: number;
  totalCandidates: number;
  avgCandidatesPerJob: number;
}

// Informações de paginação
interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Metadados de filtros disponíveis
interface FiltersMeta {
  departments: string[];
}

// Resumo de etapa do pipeline (inline)
interface PipelineStageSummary {
  name: string;
  color: string;
  count: number;
}

// Campos ordenáveis
type SortField = "title" | "createdAt" | "updatedAt" | "status" | "candidatesCount";

// Filtros da listagem
interface JobFilters {
  status?: JobStatus | "ALL";
  department?: string;
  type?: JobType | "ALL";
  search?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortDir?: "asc" | "desc";
}
```

### Schemas de Validação (Zod)

```typescript
const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  department: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  type: JobTypeSchema.default("FULL_TIME"),
  contractType: ContractTypeSchema.default("CLT"),
  workModel: WorkModelSchema.default("REMOTE"),
  remote: z.boolean().default(false),
  salaryMin: z.number().min(0).optional().nullable(),
  salaryMax: z.number().min(0).optional().nullable(),
  salaryType: SalaryTypeSchema.default("MONTHLY"),
  currency: z.string().default("BRL"),
  description: z.string().min(1),
  requirements: z.string().min(1),
  benefits: z.string().optional().nullable(),
  status: JobStatusSchema.default("DRAFT"),
});

const updateJobSchema = createJobSchema.partial();
```

### Helpers

```typescript
// Labels para exibição
getJobStatusLabel(status: JobStatus): string
getJobTypeLabel(type: JobType): string
getContractTypeLabel(type: ContractType): string
getWorkModelLabel(model: WorkModel): string

// Utilitários
generateSlug(title: string): string
formatSalary(min: number | null, max: number | null, currency?: string): string | null

// Ciclo rápido de status (para toggle no badge)
getNextStatus(current: JobStatus): JobStatus | null
// DRAFT → PUBLISHED → PAUSED → CLOSED → DRAFT ...
// Retorna null para ARCHIVED
```

### Opções de Select (Pré-definidas)

```typescript
jobTypeOptions: { value: JobType; label: string }[]
// [{ value: "FULL_TIME", label: "Tempo Integral" }, ...]

jobStatusOptions: { value: JobStatus | "ALL"; label: string }[]
// [{ value: "ALL", label: "Todos" }, { value: "DRAFT", label: "Rascunho" }, ...]

contractTypeOptions: { value: ContractType; label: string }[]
workModelOptions: { value: WorkModel; label: string }[]
```

---

## APIs — CRUD de Vagas (`/api/vacancies`)

As rotas de CRUD operam diretamente no banco de dados via Prisma, sem passar pela fila de background.

---

### `GET /api/vacancies`

Lista vagas com KPIs, paginação, ordenação e filtros. Os KPIs sempre retornam valores globais (não afetados pelos filtros).

#### Query Parameters

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `status` | string | — | Filtrar por status (`DRAFT`, `PUBLISHED`, `PAUSED`, `CLOSED`, `ARCHIVED`) |
| `search` | string | — | Busca textual em título, departamento, localização e descrição |
| `department` | string | — | Filtrar por departamento (exato) |
| `type` | string | — | Filtrar por tipo (`FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP`, `FREELANCE`) |
| `page` | number | `1` | Página atual |
| `pageSize` | number | `20` | Itens por página |
| `sortField` | string | `createdAt` | Campo de ordenação |
| `sortDir` | string | `desc` | Direção da ordenação (`asc` / `desc`) |

#### Response (`200 OK`)

```json
{
  "jobs": [
    {
      "id": "clxxx...",
      "tenantId": "tenant_01",
      "title": "Desenvolvedor Full-Stack Senior",
      "slug": "desenvolvedor-full-stack-senior",
      "department": "Engenharia",
      "location": "São Paulo, SP",
      "city": "São Paulo",
      "state": "SP",
      "type": "FULL_TIME",
      "contractType": "CLT",
      "workModel": "REMOTE",
      "remote": false,
      "salaryMin": 8000,
      "salaryMax": 12000,
      "salaryType": "MONTHLY",
      "currency": "BRL",
      "description": "...",
      "requirements": "...",
      "benefits": "Plano de saúde, Home office",
      "status": "PUBLISHED",
      "publishedAt": "2025-07-10T14:30:00Z",
      "expiresAt": null,
      "isPublic": true,
      "publicSlug": "desenvolvedor-full-stack-senior-abc123",
      "viewsCount": 142,
      "applicationsCount": 38,
      "aiSummary": "Vaga para desenvolvedor sênior...",
      "aiParsedSkills": "[\"React\",\"Node.js\",\"TypeScript\"]",
      "aiParsedKeywords": "[\"full-stack\",\"senior\",\"remoto\"]",
      "aiParsedSeniority": "Sênior",
      "discProfileRequired": "{\"D\":70,\"I\":60,\"S\":40,\"C\":80}",
      "createdAt": "2025-07-10T14:30:00Z",
      "updatedAt": "2025-07-15T10:00:00Z",
      "candidatesCount": 38
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3
  },
  "stats": {
    "totalJobs": 45,
    "publishedJobs": 12,
    "draftJobs": 20,
    "closedJobs": 8,
    "totalCandidates": 320,
    "avgCandidatesPerJob": 7
  },
  "filters": {
    "departments": ["Engenharia", "Produto", "Design", "Marketing", "RH"]
  }
}
```

---

### `POST /api/vacancies`

Cria uma nova vaga diretamente no banco. Gera slug automaticamente a partir do título.

#### Request

```http
POST /api/vacancies HTTP/1.1
Content-Type: application/json
```

```json
{
  "title": "Desenvolvedor Full-Stack Senior",
  "department": "Engenharia",
  "location": "São Paulo, SP",
  "type": "FULL_TIME",
  "contractType": "CLT",
  "workModel": "REMOTE",
  "remote": false,
  "salaryMin": 8000,
  "salaryMax": 12000,
  "salaryType": "MONTHLY",
  "currency": "BRL",
  "description": "Vaga para desenvolvedor com experiência em React e Node.js...",
  "requirements": "5+ anos com TypeScript, React, Next.js...",
  "benefits": "Plano de saúde, Home office, VR",
  "status": "DRAFT"
}
```

> **Campos obrigatórios:** `title`, `description`, `requirements`
>
> **Campos com default automático:** `type` (FULL_TIME), `contractType` (CLT), `workModel` (REMOTE), `salaryType` (MONTHLY), `currency` (BRL), `status` (DRAFT)

#### Response (`201 Created`)

```json
{
  "job": {
    "id": "clxxx...",
    "title": "Desenvolvedor Full-Stack Senior",
    "slug": "desenvolvedor-full-stack-senior",
    "status": "DRAFT",
    "createdAt": "2025-07-10T14:30:00Z",
    "updatedAt": "2025-07-10T14:30:00Z"
  }
}
```

#### Response (`400 Bad Request`)

```json
{
  "error": "Título, descrição e requisitos são obrigatórios"
}
```

---

### `GET /api/vacancies/[id]`

Obtém uma vaga específica com dados de pipeline (candidatos agrupados por etapa).

#### Response (`200 OK`)

```json
{
  "job": {
    "id": "clxxx...",
    "title": "Desenvolvedor Full-Stack Senior",
    "slug": "desenvolvedor-full-stack-senior",
    "department": "Engenharia",
    "location": "São Paulo, SP",
    "city": "São Paulo",
    "state": "SP",
    "type": "FULL_TIME",
    "contractType": "CLT",
    "workModel": "REMOTE",
    "remote": false,
    "salaryMin": 8000,
    "salaryMax": 12000,
    "salaryType": "MONTHLY",
    "currency": "BRL",
    "description": "...",
    "requirements": "...",
    "benefits": "Plano de saúde, Home office",
    "status": "PUBLISHED",
    "publishedAt": "2025-07-10T14:30:00Z",
    "expiresAt": null,
    "isPublic": true,
    "publicSlug": "desenvolvedor-full-stack-senior-abc123",
    "viewsCount": 142,
    "applicationsCount": 38,
    "aiSummary": "Vaga para desenvolvedor sênior...",
    "aiParsedSkills": "[\"React\",\"Node.js\",\"TypeScript\"]",
    "aiParsedKeywords": "[\"full-stack\",\"senior\",\"remoto\"]",
    "aiParsedSeniority": "Sênior",
    "discProfileRequired": "{\"D\":70,\"I\":60,\"S\":40,\"C\":80}",
    "createdAt": "2025-07-10T14:30:00Z",
    "updatedAt": "2025-07-15T10:00:00Z",
    "candidatesCount": 38,
    "pipeline": [
      { "name": "Triagem", "color": "#6B7280", "count": 15 },
      { "name": "Entrevista", "color": "#3B82F6", "count": 12 },
      { "name": "Teste Técnico", "color": "#F59E0B", "count": 8 },
      { "name": "Final", "color": "#22C55E", "count": 3 }
    ]
  }
}
```

#### Response (`404 Not Found`)

```json
{
  "error": "Vaga não encontrada"
}
```

---

### `PUT /api/vacancies/[id]`

Atualiza campos de uma vaga existente. Aceita atualização parcial (envie apenas os campos que deseja alterar).

> **Comportamento especial:** Ao definir `status: "PUBLISHED"`, o campo `publishedAt` é preenchido automaticamente se ainda estiver vazio. Ao definir `isPublic: true`, o `publicSlug` é gerado automaticamente.

#### Request

```http
PUT /api/vacancies/clxxx... HTTP/1.1
Content-Type: application/json
```

```json
{
  "title": "Desenvolvedor Full-Stack Senior - Atualizado",
  "salaryMin": 9000,
  "status": "PAUSED"
}
```

#### Response (`200 OK`)

```json
{
  "job": {
    "id": "clxxx...",
    "title": "Desenvolvedor Full-Stack Senior - Atualizado",
    "salaryMin": 9000,
    "status": "PAUSED",
    "updatedAt": "2025-07-15T10:00:00Z"
  }
}
```

---

### `DELETE /api/vacancies/[id]`

Exclui permanentemente uma vaga.

#### Response (`200 OK`)

```json
{
  "success": true
}
```

---

### `PATCH /api/vacancies/[id]`

Alias para `PUT` — utilizado para atualizações parciais (toggle de status).

---

### `POST /api/vacancies/bulk`

Executa ações em lote em múltiplas vagas. Máximo de 50 vagas por operação.

#### Request

```http
POST /api/vacancies/bulk HTTP/1.1
Content-Type: application/json
```

```json
{
  "action": "archive",
  "ids": ["clxxx1...", "clxxx2...", "clxxx3..."]
}
```

#### Ações Disponíveis

| Ação | Efeito |
|------|--------|
| `archive` | Define `status: "ARCHIVED"` |
| `delete` | Exclui permanentemente do banco |
| `publish` | Define `status: "PUBLISHED"` + preenche `publishedAt` |
| `close` | Define `status: "CLOSED"` |
| `restore` | Define `status: "DRAFT"` (somente vagas com `status: "ARCHIVED"`) |

#### Response (`200 OK`)

```json
{
  "success": true,
  "updatedCount": 3,
  "message": "3 vaga(s) atualizada(s) com sucesso"
}
```

#### Response (`400 Bad Request`)

```json
{ "error": "IDs são obrigatórios" }
{ "error": "Máximo de 50 vagas por operação" }
{ "error": "Ação inválida" }
```

---

## Store (`src/stores/jobs-store.ts`)

Store global (Zustand) para gerenciamento de estado das vagas. Aponta para `/api/vacancies`.

```typescript
interface JobsState {
  // === Dados ===
  jobs: JobWithCandidates[];
  selectedJob: (Job & { pipeline?: PipelineStageSummary[] }) | null;
  total: number;

  // === Stats & Meta ===
  stats: JobKPIStats | null;
  pagination: PaginationInfo;
  filtersMeta: FiltersMeta;

  // === Estado da UI ===
  isLoading: boolean;
  error: string | null;
  filters: JobFilters;
  sortField: SortField;
  sortDir: "asc" | "desc";

  // === Estado dos Dialogs ===
  isNewJobDialogOpen: boolean;
  editingJob: Job | null;
  isDeletingJob: Job | null;
  isArchivingJob: Job | null;
  isDetailOpen: boolean;

  // === Seleção em Lote ===
  selectedIds: Set<string>;
  isBulkAction: boolean;

  // === Ações CRUD ===
  fetchJobs: () => Promise<void>;
  fetchJob: (id: string) => Promise<void>;
  createJob: (data: CreateJobInput) => Promise<Job | null>;
  updateJob: (id: string, data: UpdateJobInput) => Promise<Job | null>;
  deleteJob: (id: string) => Promise<boolean>;
  duplicateJob: (id: string) => Promise<Job | null>;

  // === Ações de Status ===
  toggleJobStatus: (id: string) => Promise<void>;    // Cicla status via getNextStatus()
  bulkAction: (action: string, ids: string[]) => Promise<boolean>;

  // === Filtros & Ordenação ===
  setFilters: (filters: Partial<JobFilters>) => void; // Reseta page para 1
  resetFilters: () => void;
  setSorting: (field: SortField) => void;            // Alterna asc/desc
  setPage: (page: number) => void;

  // === Ações de Dialog ===
  openNewJobDialog: () => void;
  closeNewJobDialog: () => void;
  openEditJobDialog: (job: Job) => void;
  closeEditJobDialog: () => void;
  openDeleteJobDialog: (job: Job) => void;
  closeDeleteJobDialog: () => void;
  openArchiveJobDialog: (job: Job) => void;
  closeArchiveJobDialog: () => void;
  openDetailDialog: (job: JobWithCandidates) => void;
  closeDetailDialog: () => void;

  // === Seleção em Lote ===
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // === Utilitários ===
  setSelectedJob: (job: (Job & { pipeline?: PipelineStageSummary[] }) | null) => void;
  clearError: () => void;
  reset: () => void;
}
```

### Comportamento de `setSorting`

Quando o campo de ordenação já é o atual, inverte a direção (`asc ↔ desc`). Quando é um novo campo, aplica `desc` como padrão.

### Comportamento de `setFilters`

Sempre reseta a página para `1` para evitar resultados vazios.

### Comportamento de `toggleJobStatus`

Utiliza o ciclo `DRAFT → PUBLISHED → PAUSED → CLOSED → DRAFT`. Não afeta vagas `ARCHIVED`.

---

## Componentes

### `JobsList`

**Arquivo:** `src/components/jobs/jobs-list.tsx`

Componente principal de listagem — **reescrita completa** com KPIs, paginação, ordenação, filtros avançados, seleção em lote e toggle de status.

```typescript
export { JobsList };
```

#### Composição

```
JobsList
├── Header (título + botão Nova Vaga + Atualizar)
├── KPICards (5 cards: Total, Publicadas, Rascunho, Total Candidatos, Média)
├── Search Bar + Filtros Toggle
│   └── [expandido] Painel de Filtros (Status, Departamento, Tipo)
├── BulkActionBar (seleção: Publicar, Fechar, Arquivar, Excluir)
├── [Desktop ≥768px] Tabela
│   └── JobTableRow × N
│       ├── Checkbox
│       ├── Título + Departamento + Salário
│       ├── Localização + Badge Work Model
│       ├── Status Badge (clicável → toggle)
│       ├── Tipo
│       ├── Candidatos (ordenável)
│       ├── Criado em (ordenável)
│       └── Dropdown (Ver, Editar, Duplicar, Copiar Link, Arquivar/Restaurar, Excluir)
├── [Mobile <768px] Cards empilhados
│   └── JobCard × N
├── Pagination (navegação por páginas)
├── Delete AlertDialog (com ícone de alerta)
├── Archive AlertDialog
├── JobDetailDialogWrapper (conectado ao store)
├── NewJobDialog
├── EditJobDialog
├── JobsListSkeleton (loading)
└── EmptyState (diferente para filtros vs sem vagas)
```

#### KPI Cards

| Card | Campo (stats) | Ação ao clicar |
|------|---------------|----------------|
| Total Vagas | `totalJobs` | — |
| Publicadas | `publishedJobs` | Filtra por `PUBLISHED` (toggle) |
| Rascunho | `draftJobs` | Filtra por `DRAFT` (toggle) |
| Total Candidatos | `totalCandidates` | — |
| Média por Vaga | `avgCandidatesPerJob` | — |

> KPIs clicáveis com filtro possuem highlight visual (`ring-2 ring-primary`) quando ativos.

#### Funcionalidades da Tabela

- **Colunas ordenáveis** (clique no header): `title`, `candidatesCount`, `createdAt`
- **Toggle rápido de status**: clique no badge para ciclar `DRAFT → PUBLISHED → PAUSED → CLOSED`
- **Badge de Work Model**: Remoto / Híbrido / Presencial
- **Salário inline**: exibido abaixo do departamento na coluna título
- **Tipo de vaga**: coluna separada no desktop (badge outline)
- **Dropdown de ações**: Ver Detalhes, Editar, Duplicar, Copiar Link, Arquivar/Restaurar, Excluir

#### Bulk Action Bar

Aparece quando `selectedIds.size > 0`. Ações:

| Botão | Ação (bulk) | Cor |
|-------|-------------|-----|
| Publicar | `publish` | ghost |
| Fechar | `close` | ghost |
| Arquivar | `archive` | ghost |
| Excluir | `delete` | vermelho |

Controles: "Selecionar todas (N)", "Limpar"

#### Filtros Avançados

Painel animado (Framer Motion `AnimatePresence`) com toggle via botão de filtro:

- **Status**: Todos / Rascunho / Publicada / Pausada / Fechada / Arquivada
- **Departamento**: Todos / (departamentos dinâmicos do `filtersMeta.departments`)
- **Tipo**: Todos / Tempo Integral / Meio Período / Contrato / Estágio / Freelance

Botão "X" aparece quando há filtros ativos para reset rápido.

#### Estados Especiais

- **Empty State (sem filtros)**: Ícone `Inbox` + "Nenhuma vaga criada" + botão "Criar Primeira Vaga"
- **Empty State (com filtros)**: Ícone `Filter` + "Nenhuma vaga encontrada" + sugestão para ajustar filtros
- **Delete Dialog**: Ícone `AlertTriangle` + aviso de ação irreversível
- **Archive Dialog**: Confirmação de arquivamento

---

### `JobStatusBadge` (interno)

Badge visual de status — **clicável** para toggle rápido.

```typescript
// Uso interno — não exportado
interface JobStatusBadgeProps {
  status: JobStatus;
  onClick?: () => void;  // Toggle de status
}
```

#### Mapeamento de Status

| Status | Label | Cor (bg) |
|--------|-------|----------|
| `DRAFT` | Rascunho | Cinza (`bg-gray-100`) |
| `PUBLISHED` | Publicada | Verde (`bg-emerald-100`) |
| `PAUSED` | Pausada | Amarelo (`bg-amber-100`) |
| `CLOSED` | Fechada | Laranja (`bg-orange-100`) |
| `ARCHIVED` | Arquivada | Vermelho (`bg-red-100`) |

> Todos os status possuem variantes `dark:`.

---

### `JobDetailDialog`

**Arquivo:** `src/components/jobs/job-detail-dialog.tsx`

Diálogo de detalhes completos da vaga com 4 abas. Recebe dados do store (`selectedJob` com pipeline).

```typescript
export { JobDetailDialog };

interface JobDetailDialogProps {
  job: (Job & { pipeline?: PipelineStageSummary[] }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (job: Job) => void;
  onDelete?: (job: Job) => void;
}
```

#### Abas

| Aba | Conteúdo |
|------|----------|
| **Detalhes** | Grid de 4 cards (Candidatos, Salário, Tipo, Criado) + Stats (Visualizações, Aplicações, Pública/Privada) + Badge DISC + Datas (Publicado/Expira) + Descrição + Requisitos + Benefícios |
| **Pipeline** | Candidatos agrupados por etapa do pipeline com cards coloridos e barras de progresso. Exibe total de candidatos e etapas. |
| **DISC** | `DISCProfileSuggestionCard` quando `discProfileRequired` está preenchido. Botão "Analisar Perfil DISC" quando vazio. Botão "Reanalisar" quando já existe. |
| **IA** | Resumo IA (`aiSummary`), senioridade sugerida, habilidades extraídas (`aiParsedSkills`), palavras-chave (`aiParsedKeywords`). |

#### Ações no Rodapé

- **Esquerda**: Botão "Excluir" (destructive)
- **Direita**: "Copiar Link" (público via `publicSlug`), "Fechar", "Editar"

#### Detalhes da Aba Pipeline

A pipeline é populada pelo endpoint `GET /api/vacancies/[id]`, que agrupa candidatos por `pipelineStage`:

```typescript
// Cada etapa exibida como card:
{
  name: "Entrevista",    // Nome da etapa
  color: "#3B82F6",      // Cor definida no pipeline stage
  count: 12              // Número de candidatos nesta etapa
}
```

A barra de progresso é calculada como `(count / totalCandidates) * 100`.

---

### `NewJobDialog` / `EditJobDialog`

**Arquivo:** `src/components/jobs/new-job-dialog.tsx`

Diálogos modais para criação e edição de vaga. Utilizam `Dialog` no desktop e `Sheet` (bottom) no mobile.

```typescript
export { NewJobDialog, EditJobDialog };
```

#### Funcionalidades

- **NewJobDialog**: Formulário vazio, submissão via `POST /api/vacancies`
- **EditJobDialog**: Pré-preenchido com dados de `editingJob` do store, submissão via `PUT /api/vacancies/[id]`
- **Responsividade**: `Dialog` em desktop, `Sheet` (bottom) em mobile (detectado via `useIsMobile()`)
- **Scroll**: `ScrollArea` com altura limitada a 90vh
- **Sucesso**: Fecha o dialog automaticamente via `onSuccess`

---

### `JobForm`

**Arquivo:** `src/components/jobs/job-form.tsx`

Formulário reutilizável para criação e edição de vagas. Utiliza `react-hook-form` + `zod` validation.

```typescript
export { JobForm };

interface JobFormProps {
  job?: Job | null;           // Vaga existente (modo edição)
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

#### Campos do Formulário

| Seção | Campo | Tipo | Obrigatório | Default |
|-------|-------|------|-------------|---------|
| **Informações Básicas** | `title` | Text | ✅ | — |
| | `department` | Text | ❌ | — |
| | `location` | Text | ❌ | — |
| | `type` | Select | ❌ | `FULL_TIME` |
| | `remote` | Checkbox | ❌ | `false` |
| **Salário** | `salaryMin` | Number | ❌ | — |
| | `salaryMax` | Number | ❌ | — |
| | `currency` | Select | ❌ | `BRL` |
| **Descrição** | `description` | Textarea | ✅ | — |
| | `requirements` | Textarea | ✅ | — |
| | `benefits` | Textarea | ❌ | — |
| **Status** | `status` | Select | ❌ | `DRAFT` |

> Os campos de descrição suportam **Markdown** para formatação.

---

### `JobCard` / `JobMiniCard`

**Arquivo:** `src/components/jobs/job-card.tsx`

Cards de resumo de vaga para uso em listas, dashboards e widgets.

```typescript
export { JobCard, JobMiniCard };
```

#### `JobCard`

```typescript
interface JobCardProps {
  job: JobWithCandidates;
  onClick?: () => void;
  compact?: boolean;    // Modo compacto (inline)
}
```

- **Modo normal**: Card com título, departamento, localização, status badge, tipo, remote badge, candidatos e salário
- **Modo compacto**: Layout inline horizontal com título, status, departamento e contagem de candidatos

#### `JobMiniCard`

Versão compacta para sidebars e widgets rápidos.

```typescript
interface JobMiniCardProps {
  job: JobWithCandidates;
  onClick?: () => void;
}
```

---

### `DISCProfileSuggestionCard` / `DISCBadge`

**Arquivo:** `src/components/jobs/disc-profile-suggestion.tsx`

Card de sugestão de perfil DISC ideal e badge compacto. Utiliza **apenas** o campo `discProfileRequired` (JSON string do Prisma).

> **Alteração importante:** Foram removidas referências a campos fantasmas (`discProfileReason`, `discIdealCombo`, `discIdealRoles`, `discWorkEnvironment`) que não existem no modelo de dados.

```typescript
export { DISCProfileSuggestionCard, DISCBadge };
```

#### `DISCProfileSuggestionCard`

```typescript
interface DISCProfileSuggestionCardProps {
  job: { discProfileRequired: string | null };  // JSON com { D, I, S, C }
  isLoading?: boolean;
  compact?: boolean;
}
```

- **Dados de entrada**: JSON string parseado de `discProfileRequired` — formato `{ "D": 70, "I": 60, "S": 40, "C": 80 }`
- **Gráfico Radar SVG**: Visualização animada em 4 eixos com gradiente
- **Barras de progresso**: Cada fator D/I/S/C com cor, porcentagem e intensidade (Muito Alto/Alto/Médio/Baixo)
- **Combo Badge**: Exibe combinação dos 2 fatores mais altos (ex: `DC - Desafiador`) com cor gradiente
- **Modo compacto**: Grid 2×2 com tooltips, sem gráfico radar

#### `DISCBadge`

```typescript
interface DISCBadgeProps {
  profile: string | null;  // JSON string de discProfileRequired
}
```

Badge compacto com tooltip mostrando os 4 valores DISC. Cor gradiente baseada nos 2 fatores mais altos.

#### Cores DISC

| Fator | Cor | Nome |
|-------|-----|------|
| D | `#EF4444` (Vermelho) | Dominância |
| I | `#F59E0B` (Amarelo) | Influência |
| S | `#22C55E` (Verde) | Estabilidade |
| C | `#3B82F6` (Azul) | Conformidade |

---

## Funcionalidades

### KPIs em Tempo Real

Estatísticas calculadas no backend a cada requisição (globais, independentes dos filtros):

- **Total de vagas** — Todas as vagas do tenant
- **Publicadas** — Vagas com status `PUBLISHED`
- **Rascunho** — Vagas com status `DRAFT`
- **Total de Candidatos** — Soma de todos os candidatos
- **Média por Vaga** — Média arredondada de candidatos por vaga

### Toggle Rápido de Status

Clique no badge de status na tabela para ciclar rapidamente:

```
DRAFT → PUBLISHED → PAUSED → CLOSED → DRAFT ...
```

Implementado via `getNextStatus()` no types e `toggleJobStatus()` no store. Vagas `ARCHIVED` não participam do ciclo.

### Ações em Lote (Bulk)

1. Selecione vagas individuais via checkbox ou "Selecionar todas"
2. Barra de ações aparece com: Publicar, Fechar, Arquivar, Excluir
3. Executa via `POST /api/vacancies/bulk` com limite de 50 itens

### Paginação

- Navegação por páginas com botões anterior/próximo e numeração inteligente (com `...`)
- Exibe "Mostrando X-Y de Z vagas"
- Controlada por `setPage()` no store e `page` query param

### Ordenação

Clique nos headers das colunas para ordenar. Indicadores visuais (▲/▼) mostram a direção atual:

- **Vaga** (`title`)
- **Candidatos** (`candidatesCount`)
- **Criado** (`createdAt`)

### Copiar Link Público

Disponível no dropdown de ações e no rodapé do diálogo de detalhes. Copia a URL `/careers/{publicSlug}` para a área de transferência.

### Análise DISC de Vaga

Sistema de análise comportamental integrado:

1. **Trigger manual** — Botão "Analisar Perfil DISC" na aba DISC do diálogo de detalhes
2. **Processamento assíncrono** — Análise enfileirada via `POST /api/jobs/[id]/analyze-disc`
3. **Armazenamento** — Resultado salvo em `discProfileRequired` como JSON string
4. **Visualização** — Gráfico radar SVG + barras de progresso + combo badge
5. **Reanálise** — Botão "Reanalisar" quando perfil já existe

### Dupla Visualização

| Viewport | Componente | Características |
|----------|------------|-----------------|
| **Desktop** (≥768px) | `JobTableRow` | Tabela com colunas: Vaga, Localização, Status, Tipo, Candidatos, Criado, Ações |
| **Mobile** (<768px) | `JobCard` | Cards empilhados com informações resumidas e dropdown de ações |

---

## Mapeamento de Status

| Status | Label | Badge Color | Toggle Cycle |
|--------|-------|-------------|-------------|
| `DRAFT` | Rascunho | Cinza | ← CLOSED (anterior) / PUBLISHED (próximo) |
| `PUBLISHED` | Publicada | Verde | ← DRAFT (anterior) / PAUSED (próximo) |
| `PAUSED` | Pausada | Amarelo | ← PUBLISHED (anterior) / CLOSED (próximo) |
| `CLOSED` | Fechada | Laranja | ← PAUSED (anterior) / DRAFT (próximo) |
| `ARCHIVED` | Arquivada | Vermelho | Fora do ciclo — usar "Restaurar" |

---

## Considerações Técnicas

| Aspecto | Detalhe |
|---------|---------|
| **Renderização** | Client-side (`'use client'`) |
| **Autenticação API** | Todas as rotas requerem `getServerSession(authOptions)` — retorna `401` se não autenticado |
| **Isolamento Tenant** | Todos os dados filtrados por `session.user.tenantId` — KPIs, contagem, filtros, etc. |
| **Estado global** | Zustand (`useJobsStore` em `src/stores/jobs-store.ts`) |
| **Validação** | Zod schemas (`createJobSchema`, `updateJobSchema`) |
| **Formulários** | `react-hook-form` + `@hookform/resolvers/zod` |
| **Animações** | Framer Motion (linhas da tabela, filtros, bulk bar) |
| **Paginação** | Server-side (Prisma `skip`/`take`) |
| **Ordenação** | Server-side (Prisma `orderBy`) com indicação visual |
| **Busca** | Server-side (Prisma `contains` em título, depto, local, descrição) com debounce de 300ms |
| **Responsividade** | Breakpoint em 768px (tabela ↔ cards) |
| **Dialogs** | `Dialog` (desktop) / `Sheet` (mobile) via `useIsMobile()` |
| **Toasts** | Sonner para feedback de ações |
| **Ícones** | Lucide React |
| **Datas** | `date-fns` com locale `pt-BR` |
| **Salário** | Formatado via `Intl.NumberFormat("pt-BR")` |
| **CRUD API** | `/api/vacancies` (Prisma direto, sem fila) |
| **Autenticação** | `getServerSession(authOptions)` + `tenantId` isolado por sessão |
| **Queue API** | `/api/jobs` (sistema de fila, ver [job-queue.md](./job-queue.md)) |

---

> **←** [Voltar ao Índice](./INDEX.md)
