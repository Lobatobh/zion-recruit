# Módulo: Testes DISC

> **Versão:** 1.0 | **Última atualização:** 2025  
> **Status:** Estável | **Proprietário:** Equipe de IA

---

## Sumário

1. [Visão Geral](#visao-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes de UI](#componentes-de-ui)
4. [Bibliotecas (src/lib/disc)](#bibliotecas-srclibdisc)
5. [APIs REST](#apis-rest)
6. [Gráficos de Cálculo](#graficos-de-calculo)
7. [Fluxo de Status](#fluxo-de-status)
8. [Perfis DISC](#perfis-disc)
9. [Teste Público](#teste-publico)
10. [Exemplos de Uso](#exemplos-de-uso)

---

## Visão Geral

O módulo de **Testes DISC** implementa a avaliação comportamental DISC (Dominância, Influência, Estabilidade, Conscientização) completa, desde a criação e envio de testes até a análise dos resultados por IA.

O sistema suporta:

- **28 questões** com seleção de "Mais como eu" e "Menos como eu" por questão
- **Cálculo de 3 gráficos** — Gráfico I (Mais), Gráfico II (Menos), Gráfico III (Combinado)
- **12 combinações de perfil** — DI, DS, DC, ID, IS, IC, SD, SI, SC, CD, CI, CS
- **Análise por IA** — Interpretação inteligente dos resultados com contexto da vaga
- **Teste público** — Candidatos podem realizar o teste sem autenticação via link
- **Integração com Matching** — Score de fit DISC por vaga

### Principais Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Gestão de Testes | CRUD completo de testes DISC por candidato |
| Realização do Teste | Interface interna para aplicar testes (3 estados: intro, questões, resultados) |
| Resultados Detalhados | Gráficos, barras D/I/S/C, 4 abas de análise |
| Análise por IA | Interpretação automática dos resultados pelo DISCAnalyzerAgent |
| Teste Público | Link público sem autenticação com QR Code |
| Envio ao Candidato | Enviar teste por e-mail com link personalizado |

---

## Arquitetura

```
src/lib/disc/
├── questions.ts     # Banco de 28 questões DISC com tipos
├── calculator.ts    # Motor de cálculo de scores e perfis
└── profiles.ts      # Descrições detalhadas dos 4 perfis + 12 combinações

src/components/disc/
├── disc-management-page.tsx      # Página de gestão de testes
├── disc-test-page.tsx            # Página de realização do teste (interno)
├── disc-test-detail-dialog.tsx   # Diálogo de detalhes do teste (3 abas)
├── disc-profile-card.tsx         # Card de perfil DISC
├── disc-question-card.tsx        # Card de questão individual
├── disc-results.tsx              # Componente de resultados completos
└── public-disc-test.tsx          # Componente de teste público (sem auth)

src/app/api/disc/
├── route.ts              # GET (listar) / POST (criar) / DELETE (deletar)
├── [id]/
│   ├── route.ts          # GET (detalhes) / PUT (atualizar)
│   └── submit/route.ts   # POST (submeter teste)
├── send/route.ts         # POST (enviar ao candidato)
└── generate-link/route.ts # POST (gerar link público)
```

---

## Componentes de UI

### `disc-management-page.tsx`

**Export:** `DiscManagementPage`

Página principal de gestão de testes DISC do tenant.

| Seção | Descrição |
|---|---|
| **Stats Cards** | 4 cards: Total de Testes, Completados, Pendentes, Taxa de Conclusão |
| **Busca** | Campo de busca por nome do candidato |
| **Filtro de Status** | Botões de filtro: Todos, Pendentes, Iniciados, Completados |
| **Lista de Testes** | Tabela paginada com ações (ver detalhes, enviar, deletar) |

**Colunas da Tabela:**

| Coluna | Descrição |
|---|---|
| Candidato | Nome e e-mail do candidato |
| Vaga | Vaga associada (opcional) |
| Perfil | Badge do perfil primário (D/I/S/C) |
| Status | Badge colorido do status |
| Score de Fit | Score de compatibilidade com a vaga |
| Ações | Ver, Enviar, Deletar |

---

### `disc-test-page.tsx`

**Export:** `DiscTestPage`

Página para realização do teste DISC internamente (pelo recrutador ou candidato autenticado).

**3 Estados Internos:**

| Estado | Descrição |
|---|---|
| `intro` | Tela de introdução com instruções, duração estimada (15-20 min) e botão "Iniciar" |
| `questions` | Exibição sequencial das 28 questões com barra de progresso |
| `results` | Exibição dos resultados após cálculo |

**Comportamento durante as Questões:**
- Exibe uma questão por vez
- Salva respostas automaticamente a cada resposta (auto-save)
- Barra de progresso: "Questão X de 28"
- Navegação: voltar para questão anterior, avançar
- Permite pausar e retomar depois

---

### `disc-test-detail-dialog.tsx`

**Export:** `DiscTestDetailDialog`

Diálogo modal com detalhes completos de um teste DISC.

**3 Abas:**

| Aba | Conteúdo |
|---|---|
| **Overview** | Informações gerais: candidato, vaga, status, datas (criação, início, conclusão), score de fit, duração do teste |
| **Profile** | Perfil DISC completo: barras D/I/S/C, perfil primário e secundário, intensidade, descrição detalhada |
| **AI Analysis** | Análise gerada por IA: strengths, weaknesses, comunicação, liderança, estilo de trabalho, recomendações para a vaga |

---

### `disc-profile-card.tsx`

**Export:** `DiscProfileCard`

Card visual compacto que exibe o perfil DISC de um candidato.

**Elementos Visuais:**
- **4 barras horizontais** coloridas para D (vermelho), I (amarelo), S (verde), C (azul)
- **Badge de perfil primário** — ex: "D — The Driver"
- **Badge de perfil secundário** — ex: "I — The Persuader" (quando aplicável)
- **Intensidade** — Low, Medium, High ou Very High
- **Score de fit** — quando há vaga associada

**Cores:**

| Fator | Cor | Nome |
|---|---|---|
| D | `#EF4444` (Vermelho) | The Driver |
| I | `#F59E0B` (Amarelo) | The Persuader |
| S | `#22C55E` (Verde) | The Supporter |
| C | `#3B82F6` (Azul) | The Analyst |

---

### `disc-question-card.tsx`

**Export:** `DiscQuestionCard`

Card que exibe uma única questão do teste DISC com as 4 opções.

**Estrutura:**

```
┌─────────────────────────────────────────┐
│ Questão 5 de 28                         │
│                                         │
│ MARQUE A OPÇÃO MAIS COMO VOCÊ:          │
│ ○ A) Tacklo desafios de frente          │
│ ○ B) Construo relacionamentos facil.    │
│ ○ C) Mantenho harmonia em grupos        │
│ ○ D) Garanto qualidade nas entregas     │
│                                         │
│ MARQUE A OPÇÃO MENOS COMO VOCÊ:         │
│ ○ A) Tacklo desafios de frente          │
│ ○ B) Construo relacionamentos facil.    │
│ ○ C) Mantenho harmonia em grupos        │
│ ○ D) Garanto qualidade nas entregas     │
└─────────────────────────────────────────┘
```

**Validações:**
- Não permite selecionar a mesma opção como "Mais" e "Menos"
- Validação visual quando uma opção em cada grupo está selecionada
- Transição animada entre questões

---

### `disc-results.tsx`

**Export:** `DiscResults`

Componente completo de exibição de resultados DISC.

**Elementos:**

| Elemento | Descrição |
|---|---|
| **Gráfico Radar** | Gráfico radar com os 4 fatores D/I/S/C |
| **Gráfico de Barras** | Barras horizontais com percentuais de cada fator |
| **4 Abas de Navegação** | Overview, Strengths, Work Style, Job Fit |

**Abas de Detalhes:**

| Aba | Conteúdo |
|---|---|
| **Overview** | Resumo geral, perfil primário/secundário, intensidade, perfil combinado (ex: DI — The Initiator) |
| **Strengths** | Pontos fortes e áreas de desenvolvimento baseados no perfil |
| **Work Style** | Estilo de trabalho, comunicação, liderança, tomada de decisão, motivadores, estressores |
| **Job Fit** | Score de compatibilidade com a vaga (quando disponível), gaps e strengths relativos à posição |

---

### `public-disc-test.tsx`

**Export:** `PublicDISCTest`

Componente para realização do teste DISC sem autenticação.

**Características:**
- Não requer login — acessível via URL pública
- Lê `testId` dos parâmetros da URL (`?testId=xxx`)
- Valida o `testId` no backend antes de exibir
- Mesma experiência do `DiscTestPage` mas sem dependência de auth
- Auto-submete ao finalizar todas as 28 questões
- Exibe tela de sucesso após conclusão

**URL de Acesso:**

```
/disc?testId={publicTestId}
```

---

## Bibliotecas (src/lib/disc)

### `questions.ts`

**Exportações:** `DISC_QUESTIONS`, `TOTAL_QUESTIONS`, `DISCFactor`, `DISCQuestionOption`, `DISCQuestion`, `getQuestionByNumber`, `getOptionFactor`

**Tipos:**

```typescript
type DISCFactor = 'D' | 'I' | 'S' | 'C';

interface DISCQuestionOption {
  id: string;       // ex: "1a", "1b", "1c", "1d"
  text: string;     // Texto descritivo do comportamento
  factor: DISCFactor; // Fator DISC associado
}

interface DISCQuestion {
  number: number;           // 1-28
  options: DISCQuestionOption[]; // 4 opções por questão
}
```

**Constantes:**
- `DISC_QUESTIONS` — Array com 28 questões, cada uma com 4 opções (uma por fator D/I/S/C)
- `TOTAL_QUESTIONS` — `28`

**Funções Auxiliares:**

| Função | Descrição |
|---|---|
| `getQuestionByNumber(number)` | Busca questão pelo número (1-28) |
| `getOptionFactor(questionNumber, optionId)` | Retorna o fator DISC de uma opção específica |

---

### `calculator.ts`

**Exportações:** `calculateRawScores`, `calculateGraphScores`, `convertToPercentage`, `getIntensityLevel`, `determineProfiles`, `calculateDISCResult`, `calculateJobFit`, `validateAnswers`, `DISCAnswer`, `DISCRawScores`, `DISCIntensityLevel`, `DISCResult`

**Tipos:**

```typescript
interface DISCAnswer {
  questionNumber: number; // 1-28
  mostOption: string;     // ID da opção "Mais como eu"
  leastOption: string;    // ID da opção "Menos como eu"
}

interface DISCRawScores {
  D: number;
  I: number;
  S: number;
  C: number;
}

interface DISCIntensityLevel {
  level: 'Low' | 'Medium' | 'High' | 'Very High';
  range: string;
  description: string;
}

interface DISCResult {
  rawScores: DISCRawScores;
  percentageScores: DISCRawScores;       // 0-100
  primaryProfile: DISCFactor;
  secondaryProfile: DISCFactor | null;
  profileCombo: string;                   // ex: "DI", "S"
  intensityLevels: Record<DISCFactor, DISCIntensityLevel>;
  graphI: DISCRawScores;   // Pontuações "Mais"
  graphII: DISCRawScores;  // Pontuações "Menos"
  graphIII: DISCRawScores; // Combinado (Mais - Menos)
}
```

**Funções Principais:**

| Função | Descrição | Retorno |
|---|---|---|
| `validateAnswers(answers)` | Verifica se todas as 28 questões foram respondidas | `{ valid: boolean; missing: number[] }` |
| `calculateRawScores(answers)` | Calcula scores brutos (Mais - Menos por fator) | `DISCRawScores` |
| `calculateGraphScores(answers)` | Calcula os 3 gráficos separadamente | `{ graphI, graphII, graphIII }` |
| `convertToPercentage(rawScores)` | Converte scores brutos (-28 a +28) para 0-100% | `DISCRawScores` |
| `getIntensityLevel(score)` | Determina nível de intensidade (0-100) | `DISCIntensityLevel` |
| `determineProfiles(scores)` | Determina perfil primário, secundário e combinação | `{ primary, secondary, combo }` |
| `calculateDISCResult(answers)` | **Função principal** — calcula resultado DISC completo | `DISCResult` |
| `calculateJobFit(candidateScores, jobProfileRequirements)` | Calcula score de fit entre perfil DISC e vaga | `{ score: number; details: string }` |

**Níveis de Intensidade:**

| Nível | Faixa | Descrição |
|---|---|---|
| Low | 0-25 | Abaixo da intensidade média |
| Medium | 26-50 | Intensidade moderada |
| High | 51-75 | Acima da intensidade média |
| Very High | 76-100 | Intensidade excepcionalmente alta |

---

### `profiles.ts`

**Exportações:** `DISC_PROFILES`, `DISC_COMBOS`, `getProfileDescription`, `getComboProfile`, `getFactorColor`, `getFactorColors`, `DISCProfileDescription`, `DISCComboProfile`

**Tipos:**

```typescript
interface DISCProfileDescription {
  factor: DISCFactor;
  name: string;              // "Dominance", "Influence", "Steadiness", "Conscientiousness"
  title: string;             // "The Driver", "The Persuader", "The Supporter", "The Analyst"
  color: string;
  description: string;
  strengths: string[];       // 8 pontos fortes
  weaknesses: string[];      // 8 pontos fracos
  workPreferences: string[]; // 8 preferências de trabalho
  communicationStyle: string;
  idealEnvironment: string[];  // 6 ambientes ideais
  leadershipStyle: string;
  decisionMaking: string;
  stressors: string[];       // 5 estressores
  motivators: string[];      // 5 motivadores
  teamContribution: string;
}

interface DISCComboProfile {
  code: string;              // "DI", "DS", etc.
  name: string;              // "The Initiator", "The Achiever", etc.
  description: string;
  characteristics: string[]; // 4 características principais
  idealRoles: string[];      // 4 cargos ideais
}
```

**4 Perfis Individuais:**

| Fator | Nome | Título | Cor |
|---|---|---|---|
| D | Dominance | The Driver | `#EF4444` (Vermelho) |
| I | Influence | The Persuader | `#F59E0B` (Amarelo) |
| S | Steadiness | The Supporter | `#22C55E` (Verde) |
| C | Conscientiousness | The Analyst | `#3B82F6` (Azul) |

**12 Combinações de Perfil:**

| Código | Nome | Descrição Curta | Cargos Ideais |
|---|---|---|---|
| DI | The Initiator | Drive + Entusiasmo | Sales Director, Entrepreneur, Marketing Executive |
| DS | The Achiever | Drive + Confiabilidade | Operations Manager, Program Manager, Team Lead |
| DC | The Challenger | Drive + Precisão | Strategic Director, Consultant, Engineering Manager |
| ID | The Promoter | Entusiasmo + Resultados | Sales Executive, Business Developer, PR |
| IS | The Counselor | Calor + Estabilidade | HR Manager, Customer Success, Trainer |
| IC | The Assessor | Entusiasmo + Análise | UX Designer, Product Manager, Marketing Analyst |
| SD | The Coordinator | Estabilidade + Drive | Project Manager, Team Coordinator, Operations |
| SI | The Harmonizer | Suporte + Sociabilidade | Team Lead, Customer Service Manager, Community |
| SC | The Specialist | Estabilidade + Precisão | QA, Compliance Officer, Data Analyst |
| CD | The Perfectionist | Precisão + Drive | Quality Manager, Systems Analyst, Technical Lead |
| CI | The Practitioner | Precisão + Influência | Technical Consultant, Systems Architect, Educator |
| CS | The Perfectionist | Precisão + Estabilidade | Financial Analyst, Accountant, Librarian |

**Funções Auxiliares:**

| Função | Descrição |
|---|---|
| `getProfileDescription(factor)` | Retorna descrição completa do perfil |
| `getComboProfile(code)` | Retorna dados da combinação |
| `getFactorColor(factor)` | Retorna cor hex do fator |
| `getFactorColors()` | Retorna objeto com cores de todos os fatores |

---

## APIs REST

### `GET /api/disc`

Lista testes DISC do tenant.

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `candidateId` | `string` | Filtrar por candidato |
| `tenantId` | `string` | Filtrar por tenant |
| `status` | `string` | Filtrar por status (`PENDING`, `SENT`, `STARTED`, `COMPLETED`) |
| `page` | `number` | Página (padrão: 1) |
| `limit` | `number` | Itens por página (padrão: 20) |

---

### `POST /api/disc`

Cria um novo teste DISC.

**Request Body:**

```json
{
  "candidateId": "cand_123",
  "jobId": "job_456",
  "tenantId": "tenant_789"
}
```

**Resposta (201):**

```json
{
  "test": {
    "id": "disc_test_01",
    "candidateId": "cand_123",
    "jobId": "job_456",
    "status": "PENDING",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

---

### `GET /api/disc/[id]`

Retorna detalhes do teste incluindo respostas e questões.

**Resposta (200):**

```json
{
  "test": {
    "id": "disc_test_01",
    "candidateId": "cand_123",
    "jobId": "job_456",
    "status": "COMPLETED",
    "primaryProfile": "D",
    "profileCombo": "DI",
    "percentageScores": { "D": 72, "I": 65, "S": 40, "C": 35 },
    "jobFitScore": 78,
    "aiAnalysis": "...",
    "createdAt": "2025-01-15T10:00:00Z",
    "completedAt": "2025-01-15T10:25:00Z"
  },
  "answers": [
    { "questionNumber": 1, "mostOption": "1a", "leastOption": "1c" },
    "..."
  ],
  "questions": [ /* 28 questões completas */ ]
}
```

---

### `PUT /api/disc/[id]`

Atualiza o teste — salva respostas ou altera status.

**Request Body (salvar respostas):**

```json
{
  "answers": [
    { "questionNumber": 1, "mostOption": "1a", "leastOption": "1c" },
    { "questionNumber": 2, "mostOption": "2b", "leastOption": "2d" }
  ],
  "status": "STARTED"
}
```

**Request Body (alterar status):**

```json
{
  "status": "SENT"
}
```

---

### `DELETE /api/disc/[id]`

Deleta um teste DISC e todas as suas respostas associadas.

**Resposta (200):**

```json
{
  "success": true,
  "message": "Teste DISC removido com sucesso"
}
```

---

### `POST /api/disc/[id]/submit`

Submete o teste concluído. Valida respostas, calcula scores e dispara análise por IA.

**Comportamento:**
1. Valida que todas as 28 questões foram respondidas (`validateAnswers`)
2. Calcula resultado DISC completo (`calculateDISCResult`)
3. Calcula score de fit se houver vaga associada (`calculateJobFit`)
4. Dispara análise por IA de forma assíncrona (`DISCAnalyzerAgent`)
5. Atualiza status para `COMPLETED`

**Resposta (200):**

```json
{
  "testId": "disc_test_01",
  "status": "COMPLETED",
  "result": {
    "primaryProfile": "D",
    "secondaryProfile": "I",
    "profileCombo": "DI",
    "percentageScores": { "D": 72, "I": 65, "S": 40, "C": 35 },
    "intensityLevels": {
      "D": { "level": "High", "range": "51-75" },
      "I": { "level": "High", "range": "51-75" },
      "S": { "level": "Medium", "range": "26-50" },
      "C": { "level": "Medium", "range": "26-50" }
    }
  },
  "jobFitScore": 78,
  "aiAnalysisPending": true
}
```

**Resposta (400 — respostas incompletas):**

```json
{
  "error": "Respostas incompletas",
  "missing": [5, 12, 23],
  "message": "Faltam 3 questões para completar o teste"
}
```

---

### `POST /api/disc/send`

Envia o teste DISC para um candidato por e-mail.

**Request Body:**

```json
{
  "candidateId": "cand_123",
  "jobId": "job_456",
  "email": "candidato@email.com"
}
```

**Comportamento:**
1. Cria teste DISC se não existir
2. Gera `publicTestId` único
3. Monta URL pública: `{baseUrl}/disc?testId={publicTestId}`
4. Envia e-mail com link e instruções

---

### `POST /api/disc/generate-link`

Gera link público para o teste (sem envio de e-mail).

**Request Body:**

```json
{
  "candidateId": "cand_123",
  "jobId": "job_456"
}
```

**Resposta (200):**

```json
{
  "publicLink": "https://app.zionrecruit.com/disc?testId=abc123def456",
  "qrCodeData": "data:image/svg+xml;base64,...",
  "testId": "disc_test_01",
  "expiresAt": "2025-02-15T10:00:00Z"
}
```

---

## Gráficos de Cálculo

O sistema calcula 3 gráficos DISC distintos:

### Gráfico I — Respostas "Mais como eu"

- Conta quantas vezes cada fator foi selecionado como "Mais"
- Faixa: 0 a 7 por fator (28 questões / 4 fatores)
- Representa o comportamento **percebido** pelo indivíduo

### Gráfico II — Respostas "Menos como eu"

- Conta quantas vezes cada fator foi selecionado como "Menos"
- Faixa: 0 a 7 por fator
- Representa comportamentos **rejeitados** pelo indivíduo

### Gráfico III — Gráfico Combinado (Mais - Menos)

- Calculado como: `Graph III = Graph I - Graph II`
- Faixa: -7 a +7 por fator
- **Representa o perfil DISC real** utilizado para classificação
- Convertido para percentual (0-100) para visualização

```
Exemplo:
D: Mais=5, Menos=2 → Combinado=3 → Percentual=73 (High)
I: Mais=4, Menos=1 → Combinado=3 → Percentual=73 (High)
S: Mais=2, Menos=3 → Combinado=-1 → Percentual=48 (Medium)
C: Mais=1, Menos=4 → Combinado=-3 → Percentual=23 (Low)

Resultado: Perfil DI — The Initiator
```

---

## Fluxo de Status

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ PENDING  │────▶│  SENT    │────▶│ STARTED  │────▶│COMPLETED │
│          │     │          │     │          │     │          │
│ Criado   │     │ Enviado  │     │ Respond. │     │ Calculado│
│ no DB    │     │ p/ cand. │     │ parcial  │     │ e analis.│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                         │
                                    (auto-save
                                     de respostas)
```

| Status | Descrição | Trigger |
|---|---|---|
| `PENDING` | Teste criado, não enviado | Ao criar via `POST /api/disc` |
| `SENT` | Teste enviado ao candidato | Ao enviar via `POST /api/disc/send` |
| `STARTED` | Candidato começou a responder | Ao salvar primeira resposta |
| `COMPLETED` | Teste finalizado com cálculo | Ao submeter via `POST /api/disc/[id]/submit` |

---

## Perfis DISC

### D — Dominance (The Driver)

- **Comunicação:** Direta, concisa, focada em resultados
- **Liderança:** Autoritária, define expectativas claras
- **Decisão:** Rápida, baseada em intuição e experiência
- **Motivadores:** Poder, autoridade, desafios, reconhecimento
- **Estressores:** Lentidão, burocracia, falta de controle

### I — Influence (The Persuader)

- **Comunicação:** Entusiasmada, expressiva, narrativa
- **Liderança:** Inspiradora, carismática
- **Decisão:** Intuitiva, colaborativa
- **Motivadores:** Reconhecimento, interação social, criatividade
- **Estressores:** Isolamento, trabalho detalhado, rejeição

### S — Steadiness (The Supporter)

- **Comunicação:** Quente, paciente, suportiva
- **Liderança:** Inclusiva, valoriza consenso
- **Decisão:** Cuidadosa, consultiva
- **Motivadores:** Segurança, estabilidade, apreciação
- **Estressores:** Mudanças repentinas, conflito, pressão

### C — Conscientiousness (The Analyst)

- **Comunicação:** Precisa, factual, analítica
- **Liderança:** Sistemática, foca em padrões de qualidade
- **Decisão:** Analítica, baseada em dados
- **Motivadores:** Precisão, qualidade, expertise
- **Estressores:** Informação vaga, prazos apertados, erros

---

## Teste Público

O teste público permite que candidatos realizem a avaliação DISC sem autenticação:

**Fluxo:**

```
1. Recrutador gera link → POST /api/disc/generate-link
2. Link é enviado ao candidato (e-mail ou QR Code)
3. Candidato acessa → /disc?testId={id}
4. PublicDISCTest valida testId no backend
5. Candidato responde 28 questões (auto-save a cada resposta)
6. Ao completar, respostas são submetidas automaticamente
7. Tela de sucesso é exibida
8. Resultados ficam disponíveis no painel do recrutador
```

**Segurança:**
- `testId` é um UUID v4 aleatório
- Link expira após 30 dias (configurável)
- Não expõe dados de outros candidatos
- Validação server-side antes de exibir questões

---

## Exemplos de Uso

### Criar e Enviar Teste via API

```bash
# 1. Criar teste
curl -X POST /api/disc \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": "cand_123",
    "jobId": "job_456"
  }'

# 2. Enviar ao candidato
curl -X POST /api/disc/send \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": "cand_123",
    "jobId": "job_456",
    "email": "candidato@email.com"
  }'
```

### Gerar Link Público

```bash
curl -X POST /api/disc/generate-link \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": "cand_123",
    "jobId": "job_456"
  }'
```

### Calcular Resultado via Código

```typescript
import { calculateDISCResult, validateAnswers } from '@/lib/disc/calculator';

const answers = [
  { questionNumber: 1, mostOption: '1a', leastOption: '1c' },
  { questionNumber: 2, mostOption: '2b', leastOption: '2d' },
  // ... 26 respostas restantes
];

// Validar
const validation = validateAnswers(answers);
if (!validation.valid) {
  console.log('Questões pendentes:', validation.missing);
}

// Calcular resultado
const result = calculateDISCResult(answers);
console.log(`Perfil: ${result.profileCombo}`);
console.log(`D: ${result.percentageScores.D}%`);
console.log(`I: ${result.percentageScores.I}%`);
console.log(`S: ${result.percentageScores.S}%`);
console.log(`C: ${result.percentageScores.C}%`);
```

### Obter Descrição do Perfil

```typescript
import { getProfileDescription, getComboProfile } from '@/lib/disc/profiles';

const profile = getProfileDescription('D');
console.log(profile.title);           // "The Driver"
console.log(profile.strengths);       // ["Decisive and action-oriented", ...]

const combo = getComboProfile('DI');
console.log(combo?.name);             // "The Initiator"
console.log(combo?.idealRoles);       // ["Sales Director", "Entrepreneur", ...]
```
