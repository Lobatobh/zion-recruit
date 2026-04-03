# Módulo: Matching Engine

> **Versão:** 1.0 | **Última atualização:** 2025  
> **Status:** Estável | **Proprietário:** Equipe de IA

---

## Sumário

1. [Visão Geral](#visao-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes de UI](#componentes-de-ui)
4. [Biblioteca (src/lib/matching-service.ts)](#biblioteca-srclibmatching-servicets)
5. [APIs REST](#apis-rest)
6. **Algoritmo de Scoring**](#algoritmo-de-scoring)
7. [Caching](#caching)
8. [Integração com Agentes](#integracao-com-agentes)
9. [Exemplos de Uso](#exemplos-de-uso)

---

## Visão Geral

O módulo **Matching Engine** calcula a compatibilidade entre candidatos e vagas, gerando um score quantitativo que auxilia recrutadores na tomada de decisão. O sistema combina inteligência artificial com regras baseadas para entregar resultados rápidos e confiáveis.

O engine oferece:

- **Score composto** — Pontuação ponderada baseada em skills (50%), experiência (30%) e educação (20%)
- **IA + Fallback** — Usa IA (via `z-ai-web-dev-sdk` ou `MultiProviderLLMService`) quando disponível, com fallback rule-based
- **Cache inteligente** — Resultados são cacheados para evitar recálculos desnecessários
- **Detecção automática** — Extração de skills via regex, cálculo de anos de experiência, normalização de educação
- **5 dimensões de score** — Skills, Experiência, DISC, Cultural e Geográfico (via diálogo de UI)

### Principais Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Score Individual | Calcula compatibilidade para um par candidato-vaga |
| Score em Lote | Calcula score para múltiplos candidatos de uma vez |
| Recálculo Forçado | Invalida cache e recalcula score |
| Detalhamento Visual | 5 cards de score com cores e labels semânticos |
| Detecção Automática | Extrai requisitos de vagas sem input manual |

---

## Arquitetura

```
src/lib/
├── matching-service.ts      # Motor de matching (cálculo + cache)
├── ai-service.ts            # Serviço de IA (chamadas ao LLM)
├── cache-service.ts         # Serviço de cache em memória
└── db.ts                    # Cliente Prisma

src/components/matching/
└── matching-dialog.tsx      # Diálogo com 5 cards de score

src/lib/agents/specialized/
└── MatchingAgent.ts         # Agente de matching (orchestration)

src/app/api/matching/
└── route.ts                # GET (obter) / POST (recalcular)
```

---

## Componentes de UI

### `matching-dialog.tsx`

**Export:** `MatchingDialog`

Diálogo modal que exibe o score de matching detalhado entre um candidato e uma vaga.

**5 Cards de Score:**

| # | Dimensão | Descrição | Cor |
|---|---|---|---|
| 1 | **Skills** | Compatibilidade de habilidades técnicas | 🔵 Azul |
| 2 | **Experience** | Alinhamento de experiência profissional | 🟢 Verde |
| 3 | **DISC** | Compatibilidade de perfil comportamental | 🟡 Amarelo |
| 4 | **Cultural** | Aderência cultural ao time/empresa | 🟣 Roxo |
| 5 | **Geographic** | Compatibilidade de localização/remoto | 🟠 Laranja |

**Cada card exibe:**
- Label semântico baseado no score (veja tabela abaixo)
- Barra de progresso com cor dinâmica
- Score numérico (0-100)
- Lista de strengths e gaps

**Labels Semânticos:**

| Score | Label | Cor do Card |
|---|---|---|
| 80-100 | Excelente Match | Verde (`text-green-600 bg-green-50`) |
| 60-79 | Bom Match | Azul (`text-blue-600 bg-blue-50`) |
| 40-59 | Match Parcial | Amarelo (`text-yellow-600 bg-yellow-50`) |
| 0-39 | Baixo Match | Vermelho (`text-red-600 bg-red-50`) |

**Funcionalidades:**
- **Recálculo** — Botão para forçar recálculo do score (invalida cache)
- **Carregamento** — Skeleton loading durante cálculo
- **Erro** — Estado de erro com opção de retentar
- **Responsivo** — Grid adaptável (1 coluna mobile, 2-3 desktop)

---

## Biblioteca (src/lib/matching-service.ts)

**Exportações:** `getJobRequirements`, `calculateMatchScore`, `batchCalculateMatchScores`, `getMatchScoreColor`, `getMatchScoreLabel`, `CandidateProfile`, `JobRequirements`, `MatchResult`

### Tipos

```typescript
interface CandidateProfile {
  skills: string[];
  experience: Array<{
    company?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    years?: number;
  }>;
  education: Array<{
    institution?: string;
    degree: string;
    year?: string;
  }>;
  languages?: string[];
  summary?: string;
}

interface JobRequirements {
  title: string;
  department?: string;
  skills: string[];
  experienceYears?: number;
  educationLevel?: string;
  description?: string;
  requirements?: string;
}

interface MatchResult extends MatchScoreResult {
  candidateId?: string;
  jobId?: string;
  cached?: boolean;
  calculatedAt: Date;
}
```

### Funções Principais

#### `getJobRequirements(jobId: string): Promise<JobRequirements | null>`

Extrai requisitos estruturados de uma vaga do banco de dados.

**Processo:**
1. Busca a vaga no banco via Prisma
2. Concatena `description` + `requirements`
3. Extrai skills via regex (`extractSkillsFromText`)
4. Extrai anos de experiência via regex (`extractExperienceFromText`)
5. Retorna `JobRequirements` estruturado

#### `calculateMatchScore(candidate, jobRequirements, tenantId, useCache?): Promise<MatchResult>`

Calcula o score de matching com IA e caching.

**Fluxo:**

```
calculateMatchScore()
    │
    ├── 1. Gerar chave de cache
    │   └── Baseada em: skills, expCount, education, jobSkills, jobExpYears
    │
    ├── 2. Verificar cache
    │   ├── Cache hit → retornar resultado (cached: true)
    │   └── Cache miss → continuar
    │
    ├── 3. Calcular com IA
    │   └── calculateMatchWithAI(candidate, job)
    │       ├── Sucesso → usar resultado IA
    │       └── Falha → fallback rule-based
    │
    ├── 4. Salvar no cache
    │
    └── 5. Retornar MatchResult
```

#### `batchCalculateMatchScores(candidates, jobRequirements, tenantId): Promise<Array<{ id; result }>>`

Calcula scores para múltiplos candidatos em sequência.

**Comportamento:**
- Executa cálculos sequencialmente (não paralelo) para respeitar rate limits
- Ordena resultados por `overallScore` decrescente
- Cada cálculo individual utiliza cache

#### `getMatchScoreColor(score: number): string`

Retorna classes Tailwind CSS baseadas no score.

```typescript
score >= 80 → 'text-green-600 bg-green-50'   // Excelente
score >= 60 → 'text-blue-600 bg-blue-50'     // Bom
score >= 40 → 'text-yellow-600 bg-yellow-50' // Parcial
score <  40 → 'text-red-600 bg-red-50'       // Baixo
```

#### `getMatchScoreLabel(score: number): string`

Retorna label semântico em português.

```typescript
score >= 80 → 'Excelente Match'
score >= 60 → 'Bom Match'
score >= 40 → 'Match Parcial'
score <  40 → 'Baixo Match'
```

---

## APIs REST

### `GET /api/matching`

Obtém dados de matching para um par candidato-vaga ou lote.

**Parâmetros de Query:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `candidateId` | `string` | Sim* | ID do candidato |
| `jobId` | `string` | Sim* | ID da vaga |
| `batch` | `boolean` | Não | Se true, retorna scores para todos os candidatos da vaga |
| `top` | `number` | Não | Com batch, limita ao top N candidatos |

\* Pelo menos `candidateId` ou `jobId` deve ser informado.

**Resposta (200) — Individual:**

```json
{
  "match": {
    "candidateId": "cand_123",
    "jobId": "job_456",
    "overallScore": 78,
    "skillsScore": 85,
    "experienceScore": 72,
    "educationScore": 68,
    "reasons": [
      "Skills match: 85%",
      "Experience: 6 years vs 5 required",
      "Education: Bachelor's in Computer Science"
    ],
    "strengths": ["Strong React and Node.js skills", "Exceeds experience requirement"],
    "gaps": ["No cloud certifications"],
    "cached": false,
    "calculatedAt": "2025-01-15T10:30:00Z"
  }
}
```

**Resposta (200) — Batch (top 10):**

```json
{
  "matches": [
    {
      "candidateId": "cand_001",
      "overallScore": 92,
      "skillsScore": 95,
      "experienceScore": 88,
      "educationScore": 85
    },
    {
      "candidateId": "cand_002",
      "overallScore": 85,
      "skillsScore": 90,
      "experienceScore": 78,
      "educationScore": 80
    }
  ],
  "total": 23,
  "jobId": "job_456"
}
```

---

### `POST /api/matching`

Força recálculo de score(s), invalidando o cache.

**Request Body:**

```json
{
  "candidateId": "cand_123",
  "jobId": "job_456",
  "all": false
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `candidateId` | `string` | ID do candidato |
| `jobId` | `string` | ID da vaga |
| `all` | `boolean` | Se true, recalcula para todos os candidatos da vaga |

**Resposta (200):**

```json
{
  "success": true,
  "recalculated": true,
  "message": "Score recalculado com sucesso"
}
```

---

## Algoritmo de Scoring

### Scoring por IA (Primário)

Quando a IA está disponível, o sistema utiliza `calculateMatchWithAI` do `ai-service.ts`:

1. Envia perfil do candidato e requisitos da vaga para o LLM
2. LLM analisa e retorna scores detalhados
3. Resultado inclui `overallScore`, `skillsScore`, `experienceScore`, `strengths`, `gaps`
4. Se IA falhar → fallback para regras

### Scoring Rule-Based (Fallback)

Quando a IA não está disponível ou falha, o sistema calcula via regras:

#### 1. Skills Score (Peso: **50%**)

```typescript
function calculateSkillMatch(candidateSkills: string[], requiredSkills: string[]): number {
  // Para cada skill requerida, verifica match exato ou parcial
  // Match parcial: candidateSkill.includes(required) || required.includes(candidateSkill)
  // Resultado: (matches / required.length) * 100
}
```

**Exemplo:**
- Requeridas: `["React", "Node.js", "TypeScript", "PostgreSQL"]`
- Candidato: `["React", "Node.js", "TypeScript", "MongoDB"]`
- Match: 3/4 = 75%

#### 2. Experience Score (Peso: **30%**)

```typescript
// Se candidato tem >= anos requeridos: min(100, 80 + diff * 2)
// Se candidato tem < anos requeridos: max(20, (candidato / requerido) * 80)
// Se não há requisito: 50 (neutro)
```

**Exemplo:**
- Requerido: 5 anos
- Candidato: 6 anos → Score: min(100, 80 + 2) = 82%
- Candidato: 3 anos → Score: max(20, (3/5) * 80) = 48%

#### 3. Education Score (Peso: **20%**)

```typescript
// PhD, Master's, MBA → 90%
// Bachelor's → 75%
// Associate, Technical → 60%
// Sem educação → base + 0
```

#### Score Composto

```typescript
overallScore = (skillsScore * 0.50) + (experienceScore * 0.30) + (educationScore * 0.20)
```

**Exemplo Completo:**
- Skills: 75% × 0.50 = 37.5
- Experience: 82% × 0.30 = 24.6
- Education: 75% × 0.20 = 15.0
- **Overall: 77.1 → 77%**

### Extração Automática

O serviço inclui funções de extração automática de requisitos de vagas:

**Extração de Skills (Regex):**

```typescript
const skillPatterns = [
  /\b(javascript|typescript|python|java|c\+\+|c#|ruby|go|rust|swift|kotlin|php|scala)\b/gi,
  /\b(react|angular|vue|node\.?js|express|django|flask|spring|rails|next\.?js|nestjs)\b/gi,
  /\b(aws|azure|gcp|docker|kubernetes|ci\/cd|jenkins|terraform|ansible)\b/gi,
  /\b(sql|mysql|postgresql|mongodb|redis|elasticsearch|graphql)\b/gi,
  /\b(agile|scrum|kanban|git|rest api|microservices|ml|ai|machine learning)\b/gi,
];
```

**Extração de Experiência (Regex):**

```typescript
const patterns = [
  /(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i,
  /minimum\s*(of\s*)?(\d+)\s*years?/i,
  /at least\s*(\d+)\s*years?/i,
];
```

**Normalização de Educação:**

```typescript
const levelMap = {
  'bs': "Bachelor's", 'bachelor': "Bachelor's", 'bachelors': "Bachelor's",
  'ms': "Master's", 'master': "Master's", 'masters': "Master's",
  'mba': 'MBA', 'phd': 'PhD', 'doctorate': 'PhD',
  'high school': 'High School', 'associate': 'Associate', 'technical': 'Technical',
};
```

---

## Caching

O módulo utiliza o `cache-service.ts` para armazenar resultados de matching:

**Chave de Cache:**

```typescript
const cacheInput = JSON.stringify({
  skills: candidate.skills.sort(),
  expCount: candidate.experience.length,
  edu: candidate.education.map(e => e.degree).sort(),
  jobSkills: jobRequirements.skills.sort(),
  jobExpYears: jobRequirements.experienceYears,
});
const cacheKey = generateCacheKey(cacheInput, 'match_score');
```

**Comportamento:**
- Cache é verificado antes de cada cálculo
- Resultados bem-sucedidos são salvos no cache
- Cache hit retorna resultado com `cached: true`
- Recálculo via `POST /api/matching` ignora o cache

---

## Integração com Agentes

O `MatchingAgent` (`src/lib/agents/specialized/MatchingAgent.ts`) fornece métodos de alto nível:

| Método | Descrição |
|---|---|
| `matchCandidate(candidateId, jobId)` | Score individual via agente |
| `matchAllCandidates(jobId)` | Score para todos candidatos de uma vaga |
| `getTopCandidates(jobId, limit)` | Top N candidatos por score |

Estes métodos podem ser invocados via:

1. **API de Agentes:** `POST /api/agents` com `type: "MATCHING"`
2. **Orquestrador:** Workflow que inclui etapa de matching
3. **Direct:** Importando `MatchingAgent` no backend

---

## Exemplos de Uso

### Obter Score Individual via API

```bash
curl "/api/matching?candidateId=cand_123&jobId=job_456"
```

### Obter Top 10 Candidatos

```bash
curl "/api/matching?jobId=job_456&batch=true&top=10"
```

### Forçar Recálculo

```bash
curl -X POST /api/matching \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": "cand_123",
    "jobId": "job_456"
  }'
```

### Recalcular Todos de uma Vaga

```bash
curl -X POST /api/matching \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "job_456",
    "all": true
  }'
```

### Uso no Backend

```typescript
import { calculateMatchScore, getJobRequirements, getMatchScoreColor } from '@/lib/matching-service';

// Obter requisitos da vaga
const job = await getJobRequirements('job_456');
if (!job) throw new Error('Vaga não encontrada');

// Calcular score
const result = await calculateMatchScore(
  {
    skills: ['React', 'Node.js', 'TypeScript'],
    experience: [
      { title: 'Senior Developer', company: 'TechCorp', years: 6 }
    ],
    education: [
      { degree: 'Bachelor of Science', institution: 'USP' }
    ],
  },
  job,
  tenantId
);

console.log(`Score: ${result.overallScore}% — ${getMatchScoreLabel(result.overallScore)}`);
console.log(`Skills: ${result.skillsScore}%`);
console.log(`Experiência: ${result.experienceScore}%`);
console.log(`Educação: ${result.educationScore}%`);
console.log(`Pontos fortes: ${result.strengths.join(', ')}`);
console.log(`Gaps: ${result.gaps.join(', ')}`);
console.log(`Cached: ${result.cached}`);
```

### Score em Lote

```typescript
import { batchCalculateMatchScores, getJobRequirements } from '@/lib/matching-service';

const job = await getJobRequirements('job_456');
const candidates = [
  { id: 'cand_1', profile: { skills: ['React'], experience: [], education: [] } },
  { id: 'cand_2', profile: { skills: ['Python'], experience: [], education: [] } },
];

const results = await batchCalculateMatchScores(candidates, job, tenantId);

// Já ordenado por overallScore decrescente
results.forEach(({ id, result }) => {
  console.log(`${id}: ${result.overallScore}% (${getMatchScoreLabel(result.overallScore)})`);
});
```
