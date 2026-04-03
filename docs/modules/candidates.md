# Candidatos

> **Categoria:** Recrutamento | **Status:** ✅ Estável
>
> Gestão completa de candidatos com parsing inteligente de currículos, scoring de compatibilidade, testes DISC e geração de relatórios por inteligência artificial.

---

## Descrição

O módulo de **Candidatos** é o coração operacional do Zion Recruit. Oferece um fluxo completo desde o cadastro do candidato — com upload e parsing automático de currículos via IA — até a geração de relatórios analíticos avançados. O sistema calcula automaticamente um **score de compatibilidade** entre candidato e vaga, aplica testes comportamentais DISC e produz relatórios detalhados com análise geográfica, comparação DISC e recomendações.

A interface é construída em torno de um **painel de perfil** com múltiplas abas (informações, experiência, skills, DISC, atividades) e um **card de relatório** com dados enriquecidos por IA.

---

## Componentes

### `CandidatesList`

**Arquivo:** `src/components/candidates/candidates-list.tsx`

Componente principal de listagem com busca, filtros, ordenação e paginação.

```typescript
export { CandidatesList };
```

#### Composição

```
CandidatesList
├── Barra de Busca + Filtros (Vaga, Status, Score mínimo)
├── Ordenação (Nome, Score, Data)
├── CandidateCard × N
│   └── MatchScoreDisplay
├── Paginação
└── EmptyState
```

#### Funcionalidades

- Busca por nome e e-mail
- Filtro por vaga (dropdown de vagas ativas)
- Filtro por status (Todos, Novo, Triagem, Entrevista, Aprovado, Rejeitado)
- Filtro por score mínimo (slider de 0-100)
- Ordenação por nome, score de compatibilidade ou data
- Paginação com contagem de resultados

---

### `CandidateCard` (interno)

Card de resumo do candidato na lista. Não exportado.

```typescript
// Uso interno — não exportado
interface CandidateCardProps {
  candidate: {
    id: string;
    name: string;
    email: string;
    currentStage: string;
    matchScore: number;
    avatar?: string;
    appliedAt: string;
  };
  onView: (id: string) => void;
}
```

---

### `CandidateDetailContent` (interno)

Conteúdo do detalhe do candidato. Não exportado.

---

### `CandidateDetailDialog`

**Arquivo:** `src/components/candidates/candidate-detail-dialog.tsx`

Diálogo modal de detalhes completos do candidato com abas.

```typescript
export { CandidateDetailDialog };

interface CandidateDetailDialogProps {
  candidateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

#### Abas do Diálogo

| Aba | Componente | Conteúdo |
|------|------------|----------|
| **Perfil** | `CandidateProfilePanel` | Informações pessoais, experiência, habilidades |
| **Relatório IA** | `CandidateReportCard` | Análise completa gerada por IA |
| **Match Score** | `MatchScoreDisplay` | Score detalhado de compatibilidade |
| **Notas** | `CandidateNotes` | Anotações da equipe |
| **Timeline** | `CandidateTimeline` | Histórico de atividades |

---

### `CandidateForm`

**Arquivo:** `src/components/candidates/candidate-form.tsx`

Formulário de cadastro/edição de candidato.

```typescript
export { CandidateForm };

interface CandidateFormProps {
  candidate?: Partial<CandidateProfile>;
  jobId?: string;                    // Vaga de origem (opcional)
  onSubmit: (data: CandidateFormProps) => Promise<void>;
  isLoading?: boolean;
}

interface ParsedData {
  skills: string[];
  experience: {
    company: string;
    role: string;
    duration: string;
    description: string;
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    year: string;
  }[];
  languages: {
    name: string;
    proficiency: string;
  }[];
  summary: string;
}
```

#### Campos do Formulário

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | Text | ✅ | Nome completo |
| `email` | Email | ✅ | E-mail |
| `phone` | Tel | ❌ | Telefone |
| `jobId` | Select | ❌ | Vaga de interesse |
| `resume` | File | ❌ | Upload de currículo (PDF, DOCX) |
| `linkedin` | URL | ❌ | Perfil do LinkedIn |

---

### `CandidateProfilePanel`

**Arquivo:** `src/components/candidates/candidate-profile-panel.tsx`

Painel completo de perfil do candidato com múltiplas abas internas.

```typescript
export { CandidateProfilePanel };

interface CandidateProfilePanelProps {
  candidateId: string;
}
```

#### Interfaces

```typescript
interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
}

interface Experience {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;          // null = emprego atual
  description: string;
  technologies?: string[];
}

interface Education {
  institution: string;
  degree: string;            // Bacharelado, Mestrado, etc.
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: number;
}

interface Language {
  name: string;
  proficiency: 'basic' | 'intermediate' | 'advanced' | 'fluent' | 'native';
}

interface MatchDetails {
  overallScore: number;      // Score geral (0-100)
  skillsMatch: number;       // Compatibilidade de skills (0-100)
  experienceMatch: number;   // Compatibilidade de experiência (0-100)
  educationMatch: number;    // Compatibilidade de educação (0-100)
  discMatch: number;         // Compatibilidade DISC (0-100)
  breakdown: {
    matchedSkills: string[];
    missingSkills: string[];
    extraSkills: string[];
  };
}

interface DiscTest {
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
  profileType: string;       // "D", "I", "S", "C" ou combinação
  completedAt: string;
}

interface Activity {
  id: string;
  type: 'status_change' | 'note' | 'interview' | 'stage_move' | 'report_generated';
  description: string;
  createdAt: string;
  user?: {
    name: string;
  };
}

interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  location?: string;
  summary?: string;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  languages: Language[];
  matchDetails?: MatchDetails;
  discTest?: DiscTest;
  currentStage: string;
  jobId?: string;
  appliedAt: string;
  activities: Activity[];
  notes?: CandidateNote[];
}
```

---

### `CandidateReportCard`

**Arquivo:** `src/components/candidates/candidate-report-card.tsx`

Card de relatório IA com análise geográfica, comparação DISC e recomendações.

```typescript
export { CandidateReportCard };

interface CandidateReportCardProps {
  report: CandidateReport | null;
  isLoading?: boolean;
  onGenerateReport?: () => void;
}
```

#### Interfaces

```typescript
interface GeographicAnalysis {
  candidate: {
    city: string;
    state: string;
    country: string;
  };
  job: {
    location: string;
    isRemote: boolean;
  };
  distance?: number;         // Distância em km
  relocationScore: number;   // 0-100
  timezoneMatch: boolean;
  timezoneDifference?: number; // Diferença em horas
}

interface DISCComparison {
  candidate: {
    dominance: number;
    influence: number;
    steadiness: number;
    conscientiousness: number;
  };
  jobIdeal: {
    dominance: number;
    influence: number;
    steadiness: number;
    conscientiousness: number;
  };
  compatibility: number;     // Score de compatibilidade DISC (0-100)
  analysis: string;          // Análise textual da comparação
}

interface CandidateReport {
  id: string;
  candidateId: string;
  jobId?: string;
  summary: string;           // Resumo executivo
  strengths: string[];       // Pontos fortes
  weaknesses: string[];      // Pontos de melhoria
  recommendation: 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO_HIRE';
  overallScore: number;      // Score geral do relatório (0-100)
  geographicAnalysis?: GeographicAnalysis;
  discComparison?: DISCComparison;
  marketAnalysis?: {
    salaryRange: { min: number; max: number };
    marketDemand: 'high' | 'medium' | 'low';
    similarProfiles: number;
  };
  generatedAt: string;
  model: string;             // Modelo IA utilizado
}
```

---

### `MatchScoreDisplay`

**Arquivo:** `src/components/candidates/match-score-display.tsx`

Display visual do score de compatibilidade candidato-vaga.

```typescript
export { MatchScoreDisplay };

interface MatchScoreDisplayProps {
  score: number;             // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}
```

#### Componentes Internos

**`CircularProgress`** — Gráfico circular animado para score principal.

```typescript
// Uso interno — não exportado
interface CircularProgressProps {
  value: number;
  size: number;
  strokeWidth: number;
  color: string;
}
```

**`ScoreBar`** — Barra horizontal para score por categoria.

```typescript
// Uso interno — não exportado
interface ScoreBarProps {
  label: string;
  value: number;
  color: string;
}
```

#### Faixas de Score

| Faixa | Cor | Significado |
|-------|-----|-------------|
| 0-39 | Vermelho | Baixa compatibilidade |
| 40-59 | Laranja | Compatibilidade moderada |
| 60-79 | Amarelo | Boa compatibilidade |
| 80-100 | Verde | Alta compatibilidade |

---

### `ResumeUpload`

**Arquivo:** `src/components/candidates/resume-upload.tsx`

Componente de upload e parsing automático de currículos.

```typescript
export { ResumeUpload };

interface ResumeUploadProps {
  onParsed: (data: ParsedData) => void;
  onError?: (error: string) => void;
  isUploading?: boolean;
}

interface ParsedData {
  skills: string[];
  experience: {
    company: string;
    role: string;
    duration: string;
    description: string;
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    year: string;
  }[];
  languages: {
    name: string;
    proficiency: string;
  }[];
  summary: string;
}
```

#### Funcionalidades

- Upload via drag-and-drop ou clique
- Formatos aceitos: PDF, DOCX
- Tamanho máximo: 10MB
- Parsing automático via IA (`POST /api/candidates/parse-resume`)
- Extração de: skills, experiência, educação, idiomas, resumo
- Feedback visual de progresso durante upload e parsing
- Pré-preenchimento automático do formulário

---

### `CandidateNotes`

**Arquivo:** `src/components/candidates/candidate-notes.tsx`

Sistema de anotações da equipe sobre o candidato.

```typescript
export { CandidateNotes };
```

#### Funcionalidades

- Lista de notas com data e autor
- Criação de nova nota
- Edição e exclusão de notas
- Formatação de texto básica

---

### `CandidateTimeline`

**Arquivo:** `src/components/candidates/candidate-timeline.tsx`

Timeline visual de todas as atividades do candidato.

```typescript
export { CandidateTimeline };
```

#### Tipos de Atividade

| Tipo | Ícone | Descrição |
|------|-------|-----------|
| `status_change` | `ArrowRightLeft` | Mudança de status |
| `note` | `MessageSquare` | Nova anotação |
| `interview` | `Calendar` | Entrevista agendada/realizada |
| `stage_move` | `GitBranch` | Movimentação no pipeline |
| `report_generated` | `FileText` | Relatório IA gerado |

---

### `AddCandidateDialog`

**Arquivo:** `src/components/candidates/add-candidate-dialog.tsx`

Diálogo modal para adicionar novo candidato.

```typescript
export { AddCandidateDialog };

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId?: string;            // Vaga pré-selecionada
  onCandidateAdded?: (candidate: Candidate) => void;
}
```

---

## Store

### `useCandidatesStore`

**Arquivo:** `src/stores/candidates-store.ts`

Store global (Zustand) para gerenciamento de estado dos candidatos.

```typescript
interface CandidatesStore {
  // Estado
  candidates: Candidate[];
  currentCandidate: CandidateProfile | null;
  currentReport: CandidateReport | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  filters: {
    search: string;
    jobId?: string;
    status?: string;
    minScore?: number;
    sortBy: 'name' | 'score' | 'date';
    sortOrder: 'asc' | 'desc';
  };

  // Ações
  fetchCandidates: () => Promise<void>;
  fetchCandidateProfile: (id: string) => Promise<void>;
  fetchCandidateReport: (id: string) => Promise<void>;
  generateCandidateReport: (id: string) => Promise<void>;
  createCandidate: (input: CreateCandidateInput) => Promise<Candidate>;
  recalculateMatch: (id: string) => Promise<MatchDetails>;
  setFilters: (filters: Partial<CandidatesStore['filters']>) => void;
  setPage: (page: number) => void;
  clearCurrentCandidate: () => void;
}
```

---

## Types

**Arquivo:** `src/types/candidate.ts`

```typescript
enum CandidateStatus {
  NEW = 'NEW',
  SCREENING = 'SCREENING',
  INTERVIEW = 'INTERVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

interface Candidate {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: CandidateStatus;
  jobId?: string;
  matchScore?: number;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateCandidateInput {
  name: string;
  email: string;
  phone?: string;
  jobId?: string;
  resumeFile?: File;
  linkedin?: string;
}
```

---

## APIs

### `GET /api/candidates`

Lista candidatos com filtros avançados e paginação.

#### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `jobId` | string | Filtrar por vaga |
| `status` | string | Filtrar por status |
| `search` | string | Busca por nome ou e-mail |
| `minScore` | number | Score mínimo de compatibilidade |
| `sortBy` | string | Ordenação: `name`, `score`, `date` |
| `sortOrder` | string | Ordem: `asc`, `desc` |
| `page` | number | Página atual (default: 1) |
| `limit` | number | Itens por página (default: 20) |

#### Response (`200 OK`)

```json
{
  "candidates": [
    {
      "id": "cand_abc123",
      "name": "Maria Silva",
      "email": "maria@email.com",
      "status": "INTERVIEW",
      "matchScore": 87,
      "jobId": "job_xyz789",
      "appliedAt": "2025-07-10T09:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### `POST /api/candidates`

Cria um novo candidato com processamento automático.

#### Comportamento Automático

1. **Verificação de duplicidade** — Verifica se já existe candidato com mesmo e-mail
2. **Parsing de currículo** — Se arquivo enviado, extrai dados via IA
3. **Cálculo de match score** — Calcula compatibilidade com a vaga (se informada)

#### Request

```http
POST /api/candidates HTTP/1.1
Content-Type: multipart/form-data
```

```
------WebKitFormBoundary
Content-Disposition: form-data; name="name"

Maria Silva
------WebKitFormBoundary
Content-Disposition: form-data; name="email"

maria@email.com
------WebKitFormBoundary
Content-Disposition: form-data; name="jobId"

job_xyz789
------WebKitFormBoundary
Content-Disposition: form-data; name="resume"; filename="curriculo.pdf"
Content-Type: application/pdf

(binary)
------WebKitFormBoundary--
```

#### Response (`201 Created`)

```json
{
  "id": "cand_abc123",
  "name": "Maria Silva",
  "email": "maria@email.com",
  "status": "NEW",
  "matchScore": 87,
  "parsedData": {
    "skills": ["React", "Node.js", "TypeScript"],
    "experience": [
      {
        "company": "TechCorp",
        "role": "Desenvolvedor Full-Stack",
        "duration": "3 anos",
        "description": "Desenvolvimento de aplicações web..."
      }
    ],
    "education": [
      {
        "institution": "USP",
        "degree": "Bacharelado",
        "field": "Ciência da Computação",
        "year": "2020"
      }
    ],
    "languages": [
      { "name": "Inglês", "proficiency": "advanced" }
    ],
    "summary": "Desenvolvedor full-stack com 3 anos de experiência..."
  },
  "duplicateChecked": false
}
```

#### Response (`409 Conflict` — Candidato duplicado)

```json
{
  "error": "Candidato duplicado",
  "existingCandidateId": "cand_existing_001",
  "message": "Já existe um candidato com este e-mail para a vaga selecionada"
}
```

---

### `GET /api/candidates/[id]/match`

Obtém o score de compatibilidade atual do candidato.

#### Response (`200 OK`)

```json
{
  "overallScore": 87,
  "skillsMatch": 92,
  "experienceMatch": 85,
  "educationMatch": 90,
  "discMatch": 78,
  "breakdown": {
    "matchedSkills": ["React", "Node.js", "TypeScript", "PostgreSQL"],
    "missingSkills": ["AWS", "Docker"],
    "extraSkills": ["Python", "GraphQL"]
  }
}
```

---

### `POST /api/candidates/[id]/match`

Solicita recálculo do score de compatibilidade.

#### Response (`200 OK`)

```json
{
  "overallScore": 89,
  "skillsMatch": 94,
  "experienceMatch": 87,
  "educationMatch": 90,
  "discMatch": 82,
  "breakdown": {
    "matchedSkills": ["React", "Node.js", "TypeScript", "PostgreSQL"],
    "missingSkills": ["Docker"],
    "extraSkills": ["Python", "GraphQL", "AWS"]
  },
  "recalculatedAt": "2025-07-10T16:00:00Z"
}
```

---

### `GET /api/candidates/[id]/profile`

Obtém o perfil completo do candidato.

#### Response (`200 OK`)

```json
{
  "id": "cand_abc123",
  "name": "Maria Silva",
  "email": "maria@email.com",
  "phone": "+55 11 99999-9999",
  "location": "São Paulo, SP",
  "summary": "Desenvolvedora full-stack com 3 anos de experiência...",
  "skills": [
    { "name": "React", "level": "expert", "yearsOfExperience": 3 },
    { "name": "Node.js", "level": "advanced", "yearsOfExperience": 3 }
  ],
  "experience": [
    {
      "company": "TechCorp",
      "role": "Desenvolvedora Full-Stack",
      "startDate": "2022-03",
      "description": "Desenvolvimento de aplicações web...",
      "technologies": ["React", "Node.js", "PostgreSQL"]
    }
  ],
  "education": [
    {
      "institution": "Universidade de São Paulo",
      "degree": "Bacharelado",
      "field": "Ciência da Computação",
      "startDate": "2017",
      "endDate": "2020",
      "gpa": 8.5
    }
  ],
  "languages": [
    { "name": "Português", "proficiency": "native" },
    { "name": "Inglês", "proficiency": "advanced" }
  ],
  "matchDetails": { },
  "discTest": {
    "dominance": 65,
    "influence": 72,
    "steadiness": 58,
    "conscientiousness": 80,
    "profileType": "IC",
    "completedAt": "2025-07-10T10:00:00Z"
  },
  "currentStage": "Entrevista Técnica",
  "activities": [ ]
}
```

---

### `GET /api/candidates/[id]/report`

Obtém o relatório IA existente do candidato.

#### Response (`200 OK`)

```json
{
  "id": "report_001",
  "candidateId": "cand_abc123",
  "summary": "Candidata com perfil técnico sólido...",
  "strengths": [
    "Experiência relevante em React e Node.js",
    "Boa formação acadêmica",
    "Alta compatibilidade DISC com a vaga"
  ],
  "weaknesses": [
    "Sem experiência com AWS",
    "Sem certificações complementares"
  ],
  "recommendation": "HIRE",
  "overallScore": 85,
  "geographicAnalysis": {
    "candidate": { "city": "São Paulo", "state": "SP", "country": "Brasil" },
    "job": { "location": "São Paulo, SP", "isRemote": false },
    "relocationScore": 100,
    "timezoneMatch": true
  },
  "discComparison": {
    "candidate": { "dominance": 65, "influence": 72, "steadiness": 58, "conscientiousness": 80 },
    "jobIdeal": { "dominance": 60, "influence": 70, "steadiness": 55, "conscientiousness": 85 },
    "compatibility": 82,
    "analysis": "O perfil do candidato apresenta boa compatibilidade..."
  },
  "generatedAt": "2025-07-10T11:00:00Z",
  "model": "gpt-4o"
}
```

#### Response (`404 Not Found`)

```json
{
  "error": "Relatório não encontrado",
  "message": "Nenhum relatório IA foi gerado para este candidato"
}
```

---

### `POST /api/candidates/[id]/report`

Solicita geração de relatório IA para o candidato.

#### Response (`202 Accepted`)

```json
{
  "message": "Relatório sendo gerado",
  "reportId": "report_002",
  "status": "PROCESSING"
}
```

---

### `PUT /api/candidates/[id]/stage`

Move o candidato para uma etapa do pipeline.

#### Request

```http
PUT /api/candidates/cand_abc123/stage HTTP/1.1
Content-Type: application/json
```

```json
{
  "stageId": "stage_3"
}
```

#### Response (`200 OK`)

```json
{
  "id": "cand_abc123",
  "currentStageId": "stage_3",
  "currentStage": "Entrevista Técnica",
  "previousStage": "Triagem",
  "movedAt": "2025-07-10T15:30:00Z"
}
```

---

### `POST /api/candidates/parse-resume`

Faz parsing do texto de um currículo via IA.

#### Request

```http
POST /api/candidates/parse-resume HTTP/1.1
Content-Type: application/json
```

```json
{
  "text": "Maria Silva\nDesenvolvedora Full-Stack com 3 anos de experiência em React e Node.js..."
}
```

#### Response (`200 OK`)

```json
{
  "skills": ["React", "Node.js", "TypeScript", "PostgreSQL"],
  "experience": [
    {
      "company": "TechCorp",
      "role": "Desenvolvedora Full-Stack",
      "duration": "3 anos",
      "description": "Desenvolvimento de aplicações web usando React e Node.js"
    }
  ],
  "education": [
    {
      "institution": "USP",
      "degree": "Bacharelado",
      "field": "Ciência da Computação",
      "year": "2020"
    }
  ],
  "languages": [
    { "name": "Inglês", "proficiency": "advanced" }
  ],
  "summary": "Desenvolvedora full-stack com 3 anos de experiência em React e Node.js..."
}
```

---

## Bibliotecas Utilitárias

### `resume-parser.ts`

**Arquivo:** `src/lib/resume-parser.ts`

Serviço de parsing e extração de dados de currículos.

```typescript
// Principais funções
function parseResume(file: File): Promise<ParsedData>;
function parseResumeText(text: string): Promise<ParsedData>;
function extractSkills(text: string): Promise<string[]>;
function extractExperience(text: string): Promise<Experience[]>;
function extractEducation(text: string): Promise<Education[]>;
```

### `matching-service.ts`

**Arquivo:** `src/lib/matching-service.ts`

Serviço de cálculo de compatibilidade candidato-vaga.

```typescript
// Principais funções
function calculateMatchScore(candidate: CandidateProfile, job: Job): Promise<MatchDetails>;
function compareSkills(candidateSkills: Skill[], jobRequirements: string[]): SkillsBreakdown;
function compareDISC(candidateDISC: DiscTest, jobIdealDISC: DISCProfile): number;
```

### `ReportAgent.ts`

**Arquivo:** `src/lib/agents/specialized/ReportAgent.ts`

Agente IA especializado em geração de relatórios de candidatos.

```typescript
// Principais funções
class ReportAgent {
  generateReport(candidateId: string, jobId?: string): Promise<CandidateReport>;
  analyzeGeographic(candidate: Candidate, job: Job): Promise<GeographicAnalysis>;
  compareDISCProfiles(candidate: DiscTest, jobIdeal: DISCProfile): Promise<DISCComparison>;
}
```

---

## Funcionalidades

### Busca e Filtros Avançados

| Filtro | Tipo | Descrição |
|--------|------|-----------|
| **Busca textual** | Input | Nome ou e-mail do candidato |
| **Vaga** | Dropdown | Filtrar por vaga específica |
| **Status** | Dropdown | Novo, Triagem, Entrevista, Aprovado, Rejeitado |
| **Score mínimo** | Slider | Apenas candidatos com score ≥ X |
| **Ordenação** | Select | Nome, Score ou Data (asc/desc) |
| **Paginação** | Controles | Navegação entre páginas |

### Parsing de Currículo

Fluxo de extração automática de dados:

```
Upload (PDF/DOCX)
    ↓
Extração de texto
    ↓
IA (z-ai-web-dev-sdk) — parseResume()
    ↓
ParsedData {
    skills, experience, education, languages, summary
}
    ↓
Pré-preenchimento automático do formulário
```

### Scoring de Pareamento

Algoritmo de compatibilidade multi-dimensional:

| Dimensão | Peso | Descrição |
|----------|------|-----------|
| **Skills** | 35% | Sobreposição de habilidades |
| **Experiência** | 25% | Alinhamento de experiência |
| **Educação** | 20% | Formação acadêmica |
| **DISC** | 20% | Compatibilidade comportamental |

### Teste DISC

Avaliação comportamental integrada ao fluxo do candidato:

- 4 dimensões: Dominância (D), Influência (I), Estabilidade (S), Conformidade (C)
- Resultado com tipo de perfil (ex: "IC", "DC")
- Visualização radar no painel de perfil

### Relatório IA

Relatório analítico gerado por inteligência artificial:

- **Resumo executivo** — Visão geral do candidato
- **Pontos fortes** — Lista de strengths identificados
- **Pontos de melhoria** — Áreas de desenvolvimento
- **Recomendação** — STRONG_HIRE, HIRE, MAYBE ou NO_HIRE
- **Análise geográfica** — Distância, timezone, remoto/presencial
- **Comparação DISC** — Candidato vs. perfil ideal da vaga
- **Análise de mercado** — Faixa salarial, demanda, perfis similares

---

## Considerações Técnicas

| Aspecto | Detalhe |
|---------|---------|
| **Renderização** | Client-side (`'use client'`) |
| **Estado global** | Zustand (`useCandidatesStore`) |
| **Upload** | FormData com limite de 10MB |
| **IA** | z-ai-web-dev-sdk (parsing + relatórios) |
| **Responsividade** | Lista adaptável com cards em mobile |
| **Performance** | Paginação + lazy loading de detalhes |
| **Dedupe** | Verificação automática de candidatos duplicados |

---

> **←** [Voltar ao Índice](./INDEX.md)

---

## v2.0 — Limpeza e Funcionalidade

> **Versão:** 2.0 | **Atualizado em:** 2025

### Remoção de Código Morto

- Removidas aproximadamente **420 linhas** de código morto/mock, incluindo dados fictícios, funções não utilizadas e componentes de exemplo que não eram referenciados em nenhum fluxo ativo.

### Filtro de Vagas

- O filtro de vagas na `CandidatesList` agora busca as opções **dinamicamente via API `/api/vacancies`**, substituindo o dropdown estático anterior.

### Botão de Edição

- O botão de edição na lista de candidatos agora está **funcional**: ao ser clicado, abre o componente `CandidateForm` no modo de edição, permitindo alterar os dados do candidato diretamente.

### Resposta da API

- O campo `_count.notes` foi incluído na resposta da API de listagem, permitindo exibir a contagem de notas por candidato sem uma consulta adicional.

### Dados Reais

- Todo e qualquer **mock data foi removido**. O módulo agora utiliza exclusivamente chamadas à API real, com **notificações toast** para tratamento de erros em todas as operações (criação, edição, busca e exclusão).

