# Módulo: Analytics Dashboard

> **Versão:** 1.0 | **Última atualização:** 2025  
> **Status:** Estável | **Proprietário:** Equipe de Analytics

---

## Sumário

1. [Visão Geral](#visao-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes de UI](#componentes-de-ui)
4. [Bibliotecas (src/lib/analytics)](#bibliotecas-srclibanalytics)
5. [APIs REST](#apis-rest)
6. [KPIs e Métricas](#kpis-e-metricas)
7. [Visualizações](#visualizacoes)
8. [Exportação de Dados](#exportacao-de-dados)
9. [Exemplos de Uso](#exemplos-de-uso)

---

## Visão Geral

O módulo de **Analytics Dashboard** fornece uma visão completa e em tempo real das métricas de recrutamento da plataforma, permitindo que gestores e recrutadores tomem decisões baseadas em dados.

O sistema oferece:

- **6 KPIs principais** — Candidatos, Vagas, Contratações, Entrevistas, Tarefas IA, Agentes Ativos
- **Gráficos interativos** — Funil de pipeline, fontes, tempo de contratação, performance de agentes
- **Seletor de período** — Presets rápidos (7d, 30d, 90d, 6m, 1y) e intervalo personalizado
- **Exportação** — Download de dados em CSV ou JSON
- **Comparações de período** — Trend percentual comparando período atual com anterior

### Principais Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| KPIs em Tempo Real | 6 cards com métricas principais e tendências |
| Funil de Pipeline | Visualização de conversão por etapa com taxas |
| Análise de Fontes | Efetividade por canal de aquisição de candidatos |
| Tempo de Contratação | Tendências e médias de time-to-hire |
| Performance de Agentes IA | Uso, sucesso e custo dos agentes de IA |
| Exportação | Download de dados em CSV ou JSON formatado |

---

## Arquitetura

```
src/lib/analytics/
├── metrics.ts    # Funções de cálculo de métricas
├── export.ts     # Helpers de exportação CSV/JSON
└── charts.tsx    # Componentes de gráficos compartilhados

src/components/analytics/
├── analytics-dashboard.tsx     # Dashboard principal
├── overview-cards.tsx          # Cards de KPIs
├── pipeline-funnel.tsx         # Gráfico de funil de pipeline
├── source-chart.tsx            # Gráfico de fontes de candidatos
├── time-to-hire-chart.tsx      # Gráfico de tempo de contratação
├── agent-performance-chart.tsx # Gráfico de performance de agentes
├── date-range-picker.tsx       # Seletor de intervalo de datas
└── export-button.tsx           # Botão de exportação

src/app/api/analytics/
├── overview/route.ts            # GET — métricas gerais
├── pipeline/route.ts            # GET — dados do funil
├── sources/route.ts             # GET — efetividade de fontes
├── time-to-hire/route.ts        # GET — tendências de tempo
├── agent-performance/route.ts   # GET — estatísticas de agentes
└── export/route.ts              # GET — download de dados
```

---

## Componentes de UI

### `analytics-dashboard.tsx`

**Export:** `AnalyticsDashboard`

Dashboard principal de analytics com seletor de período, botão de exportação, KPIs e 3 abas de visualização.

**Estrutura:**

```
┌─────────────────────────────────────────────────────┐
│  Analytics Dashboard                                │
│  [7d] [30d] [90d] [6m] [1y] [Custom]    [Exportar] │
├─────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │Candid.│ │Vagas │ │Contr.│ │Entre.│ │Taref.│ │Agent.│ │
│  │  234  │ │  12  │ │  8   │ │  15  │ │  156  │ │  5   │ │
│  │ +12%  │ │  0%  │ │ +25% │ │ -5%  │ │ +30%  │ │  0%  │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │
├─────────────────────────────────────────────────────┤
│  [Pipeline] [Fontes] [Performance]                   │
│  ┌─────────────────────────────────────────────────┐ │
│  │                                                 │ │
│  │         Conteúdo da aba selecionada              │ │
│  │                                                 │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**3 Abas:**

| Aba | Componente | Descrição |
|---|---|---|
| **Pipeline** | `PipelineFunnel` | Funil de pipeline com taxas de conversão |
| **Fontes** | `SourceChart` | Efetividade por fonte de candidatos |
| **Performance** | `AgentPerformanceChart` | Performance e uso de tokens dos agentes IA |

---

### `overview-cards.tsx`

**Export:** `OverviewCards`

Grid de 6 cards de KPIs com indicadores de tendência.

**KPIs:**

| # | KPI | Descrição | Ícone | Trend |
|---|---|---|---|---|
| 1 | Total de Candidatos | Candidatos no período | Users | Comparação com período anterior |
| 2 | Vagas Ativas | Vagas publicadas | Briefcase | Contagem estática |
| 3 | Contratações | Candidatos contratados | UserCheck | Comparação com período anterior |
| 4 | Entrevistas | Entrevistas realizadas/agendadas | Calendar | Comparação com período anterior |
| 5 | Tarefas IA | Tarefas de agentes executadas | Bot | Comparação com período anterior |
| 6 | Agentes Ativos | Agentes IA habilitados | Cpu | Contagem estática |

**Indicadores de Trend:**
- 🟢 Verde: Trend positivo (acréscimo percentual)
- 🔴 Vermelho: Trend negativo (decréscimo percentual)
- ⚪ Cinza: Sem variação ou sem dados de comparação

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `data` | `OverviewMetrics` | Dados das métricas |
| `loading` | `boolean` | Estado de carregamento |

---

### `pipeline-funnel.tsx`

**Export:** `PipelineFunnel`

Gráfico de funil de pipeline com toggle entre visualização de funil e barras.

**Funcionalidades:**
- **Toggle** Funil/Barras — alterna entre layout de funil e gráfico de barras
- **Taxas de conversão** — exibe a taxa entre cada etapa
- **Contagem por etapa** — número de candidatos em cada estágio
- **Taxa de abandono** — percentual que saiu em cada etapa
- **Tooltip** — detalhes ao passar o mouse

**Dados Exibidos:**

```typescript
interface PipelineConversionMetrics {
  stageName: string;
  stageOrder: number;
  candidatesCount: number;
  conversionRate: number;    // %
  avgTimeInStage: number;    // dias
  dropOffRate: number;       // %
}
```

---

### `source-chart.tsx`

**Export:** `SourceChart`

Gráfico de efetividade de fontes de candidatos com toggle entre pizza e barras.

**Funcionalidades:**
- **Toggle** Pizza/Barras — alterna entre `PieChart` e `BarChart`
- **Taxas de conversão** — contratações por fonte
- **Tempo médio de contratação** — por fonte
- **Custo por contratação** — quando disponível

**Dados Exibidos:**

```typescript
interface SourceEffectivenessMetrics {
  source: string;
  applications: number;
  hires: number;
  conversionRate: number;   // %
  avgTimeToHire: number;    // dias
  costPerHire: number;      // R$
}
```

---

### `time-to-hire-chart.tsx`

**Export:** `TimeToHireChart`

Gráfico de linha com eixo Y duplo mostrando tendências de tempo de contratação.

**Eixos:**
- **Eixo Y esquerdo:** Tempo médio em dias
- **Eixo Y direito:** Número de contratações
- **Eixo X:** Mês/período

**Dados Exibidos:**

```typescript
interface TimeToHireMetrics {
  averageDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
  trend: number;              // % de variação
  byDepartment: { department: string; averageDays: number; count: number }[];
  byMonth: { month: string; averageDays: number; hires: number }[];
}
```

---

### `agent-performance-chart.tsx`

**Export:** `AgentPerformanceChart`

Gráfico de performance dos agentes de IA com 2 sub-abas.

**Sub-abas:**

| Aba | Descrição |
|---|---|
| **Performance** | Taxa de sucesso, número de execuções, duração média por agente |
| **Uso de Tokens** | Tokens consumidos e custo estimado por agente |

**Dados Exibidos:**

```typescript
interface AgentPerformanceMetrics {
  agentId: string;
  agentType: string;
  agentName: string;
  totalRuns: number;
  successRate: number;       // %
  avgDuration: number;       // ms
  totalTokensUsed: number;
  lastRunAt: Date | null;
  errorRate: number;         // %
}
```

---

### `date-range-picker.tsx`

**Export:** `DateRangePicker`

Seletor de intervalo de datas com presets rápidos e customização.

**Presets Disponíveis:**

| Preset | Período |
|---|---|
| `7d` | Últimos 7 dias |
| `30d` | Últimos 30 dias (padrão) |
| `90d` | Últimos 90 dias |
| `6m` | Últimos 6 meses |
| `1y` | Último ano |
| `custom` | Intervalo personalizado |

**Funcionalidades:**
- Botões de preset com destaque no ativo
- Calendário duplo para seleção customizada
- Atualização imediata dos dados ao alterar período
- Formato de exibição: `DD/MM/YYYY — DD/MM/YYYY`

---

### `export-button.tsx`

**Export:** `ExportButton`

Botão dropdown para exportação de dados do dashboard.

**Formatos:**
- **CSV** — Valores separados por vírgula com cabeçalho
- **JSON** — Array de objetos JSON formatado

**Funcionalidades:**
- Dropdown com opções de formato
- Ícone de download
- Feedback visual durante exportação
- Nome de arquivo automático: `analytics-export-{timestamp}.{ext}`

---

## Bibliotecas (src/lib/analytics)

### `metrics.ts`

**Exportações:** Todas as funções de cálculo de métricas e tipos associados.

**Funções Principais:**

| Função | Descrição | Retorno |
|---|---|---|
| `getOverviewMetrics(tenantId, dateRange?)` | Métricas gerais do dashboard (6 KPIs + trends) | `OverviewMetrics` |
| `calculateTimeToHire(tenantId, dateRange?)` | Tempo médio de contratação com tendências e break down | `TimeToHireMetrics` |
| `calculatePipelineConversion(tenantId, dateRange?)` | Taxas de conversão por etapa do pipeline | `PipelineConversionMetrics[]` |
| `calculateSourceEffectiveness(tenantId, dateRange?)` | Efetividade por fonte de candidatos | `SourceEffectivenessMetrics[]` |
| `calculateCostPerHire(tenantId, dateRange?)` | Custo por contratação (tokens + job boards) | `CostPerHireMetrics` |
| `calculateCandidatesPerJob(tenantId, dateRange?)` | Média de candidatos por vaga | `CandidatesPerJobMetrics` |
| `calculateInterviewSuccess(tenantId, dateRange?)` | Taxa de sucesso de entrevistas | `InterviewSuccessMetrics` |
| `calculateDISCDistribution(tenantId, dateRange?)` | Distribuição de perfis DISC | `DISCProfileDistribution[]` |
| `calculateAgentPerformance(tenantId, dateRange?)` | Performance dos agentes de IA | `AgentPerformanceMetrics[]` |

**Função Auxiliar:**

```typescript
function getDefaultDateRange(days: number = 30): DateRange {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return { startDate, endDate };
}
```

**Tipos Exportados:**

```typescript
interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface TimeToHireMetrics {
  averageDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
  trend: number;
  byDepartment: { department: string; averageDays: number; count: number }[];
  byMonth: { month: string; averageDays: number; hires: number }[];
}

interface PipelineConversionMetrics {
  stageName: string;
  stageOrder: number;
  candidatesCount: number;
  conversionRate: number;
  avgTimeInStage: number;
  dropOffRate: number;
}

interface SourceEffectivenessMetrics {
  source: string;
  applications: number;
  hires: number;
  conversionRate: number;
  avgTimeToHire: number;
  costPerHire: number;
}

interface AgentPerformanceMetrics {
  agentId: string;
  agentType: string;
  agentName: string;
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  totalTokensUsed: number;
  lastRunAt: Date | null;
  errorRate: number;
}
```

**Detalhes de Cálculo — `getOverviewMetrics`:**

A função executa 11 queries em paralelo via `Promise.all` para maximizar performance:

```
1. totalCandidates      — candidatos criados no período
2. previousCandidates   — candidatos no período anterior (para trend)
3. totalJobs           — total de vagas do tenant
4. activeJobs          — vagas com status PUBLISHED
5. totalHired          — candidatos contratados no período
6. previousHired       — contratados no período anterior
7. totalInterviews     — entrevistas no período
8. pendingInterviews   — entrevistas agendadas no futuro
9. activeAgents        — agentes IA habilitados
10. totalTasks         — tarefas IA no período
11. completedTasks     — tarefas IA completadas no período
```

---

### `export.ts`

**Exportações:** Funções auxiliares para exportação de dados.

**Funções:**

| Função | Descrição |
|---|---|
| `exportToCSV(data, filename?)` | Converte array de objetos em CSV e inicia download |
| `exportToJSON(data, filename?)` | Converte dados em JSON formatado e inicia download |
| `formatDate(date)` | Formata data para formato brasileiro (DD/MM/YYYY) |
| `formatCurrency(value)` | Formata valor monetário (R$ X.XXX,XX) |
| `formatPercent(value)` | Formata percentual (XX,X%) |

---

## APIs REST

### `GET /api/analytics/overview`

Retorna métricas gerais de alto nível.

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `tenantId` | `string` | ID do tenant |
| `startDate` | `string` | Data inicial (ISO 8601) |
| `endDate` | `string` | Data final (ISO 8601) |

**Resposta (200):**

```json
{
  "totalCandidates": 234,
  "candidateTrend": 12.5,
  "totalJobs": 12,
  "activeJobs": 8,
  "totalHired": 15,
  "hireTrend": 25.0,
  "totalInterviews": 42,
  "pendingInterviews": 5,
  "activeAgents": 5,
  "totalTasks": 156,
  "completedTasks": 138,
  "taskSuccessRate": 88.5
}
```

---

### `GET /api/analytics/pipeline`

Retorna dados do funil de pipeline com taxas de conversão.

**Parâmetros de Query:** Mesmos de `GET /api/analytics/overview`

**Resposta (200):**

```json
{
  "stages": [
    {
      "stageName": "Aplicação",
      "stageOrder": 1,
      "candidatesCount": 234,
      "conversionRate": 68.4,
      "avgTimeInStage": 2,
      "dropOffRate": 31.6
    },
    {
      "stageName": "Triagem",
      "stageOrder": 2,
      "candidatesCount": 160,
      "conversionRate": 52.5,
      "avgTimeInStage": 3,
      "dropOffRate": 47.5
    }
  ]
}
```

---

### `GET /api/analytics/sources`

Retorna dados de efetividade por fonte de candidatos.

**Parâmetros de Query:** Mesmos de `GET /api/analytics/overview`

**Resposta (200):**

```json
{
  "sources": [
    {
      "source": "linkedin",
      "applications": 85,
      "hires": 6,
      "conversionRate": 7.1,
      "avgTimeToHire": 18,
      "costPerHire": 0
    },
    {
      "source": "indeed",
      "applications": 52,
      "hires": 3,
      "conversionRate": 5.8,
      "avgTimeToHire": 22,
      "costPerHire": 0
    }
  ]
}
```

---

### `GET /api/analytics/time-to-hire`

Retorna dados de tendência de tempo de contratação.

**Parâmetros de Query:** Mesmos de `GET /api/analytics/overview`

**Resposta (200):**

```json
{
  "averageDays": 15.3,
  "medianDays": 14,
  "minDays": 5,
  "maxDays": 32,
  "trend": -8.2,
  "byDepartment": [
    { "department": "Engineering", "averageDays": 12, "count": 8 },
    { "department": "Marketing", "averageDays": 20, "count": 4 }
  ],
  "byMonth": [
    { "month": "2025-01", "averageDays": 15, "hires": 5 },
    { "month": "2025-02", "averageDays": 13, "hires": 8 }
  ]
}
```

---

### `GET /api/analytics/agent-performance`

Retorna estatísticas de performance dos agentes de IA.

**Parâmetros de Query:** Mesmos de `GET /api/analytics/overview`

**Resposta (200):**

```json
{
  "agents": [
    {
      "agentId": "agent_01",
      "agentType": "SCREENING",
      "agentName": "Agente de Triagem",
      "totalRuns": 89,
      "successRate": 95.5,
      "avgDuration": 3200,
      "totalTokensUsed": 145000,
      "lastRunAt": "2025-01-15T10:30:00Z",
      "errorRate": 4.5
    }
  ]
}
```

---

### `GET /api/analytics/export`

Download de dados de analytics no formato especificado.

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `format` | `string` | Formato: `csv` ou `json` |
| `tenantId` | `string` | ID do tenant |
| `startDate` | `string` | Data inicial |
| `endDate` | `string` | Data final |
| `metric` | `string` | Métrica específica (opcional) |

**Resposta:**
- Content-Type: `text/csv` ou `application/json`
- Content-Disposition: `attachment; filename="analytics-export-{timestamp}.{ext}"`

---

## KPIs e Métricas

### Visão Geral (Overview)

| KPI | Fonte de Dados | Cálculo |
|---|---|---|
| Total de Candidatos | `Candidate.count` | Criados no intervalo de datas |
| Vagas Ativas | `Job.count(status: PUBLISHED)` | Contagem estática |
| Contratações | `Candidate.count(status: HIRED)` | Contratados no intervalo |
| Entrevistas | `Interview.count` | Agendadas no intervalo |
| Tarefas IA | `AITask.count` | Criadas no intervalo |
| Agentes Ativos | `AIAgent.count(enabled: true)` | Contagem estática |

### Métricas Derivadas

| Métrica | Cálculo | Importância |
|---|---|---|
| Trend de Candidatos | `(atual - anterior) / anterior * 100` | Crescimento do funil |
| Trend de Contratações | `(atual - anterior) / anterior * 100` | Efetividade |
| Taxa de Sucesso IA | `completadas / total * 100` | Confiabilidade dos agentes |
| Taxa de Conversão Pipeline | `passou / entrou na etapa * 100` | Eficiência do processo |
| Custo por Contratação | `custo total AI / contratações` | Eficiência de custo |

---

## Visualizações

### Biblioteca Utilizada

Todas as visualizações utilizam a biblioteca **Recharts** com os seguintes componentes:

| Tipo de Gráfico | Componente Recharts | Uso |
|---|---|---|
| Funil | `FunnelChart` + `Funnel` | PipelineFunnel |
| Barras | `BarChart` + `Bar` | PipelineFunnel (toggle), SourceChart (toggle) |
| Pizza | `PieChart` + `Pie` + `Cell` | SourceChart (toggle) |
| Linha | `LineChart` + `Line` + `YAxis` (duplo) | TimeToHireChart |
| Composto | `ComposedChart` + `Bar` + `Line` | AgentPerformanceChart |

### Paleta de Cores

Os gráficos utilizam uma paleta consistente e acessível:

```typescript
const CHART_COLORS = [
  '#6366F1', // Indigo
  '#22C55E', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
];
```

---

## Exportação de Dados

### Formato CSV

```csv
metric,value,period,unit
total_candidates,234,2025-01-01 to 2025-01-31,count
total_hired,15,2025-01-01 to 2025-01-31,count
avg_time_to_hire,15.3,2025-01-01 to 2025-01-31,days
```

### Formato JSON

```json
{
  "exportDate": "2025-01-31T12:00:00Z",
  "period": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  },
  "metrics": {
    "totalCandidates": 234,
    "totalHired": 15,
    "averageTimeToHire": 15.3
  }
}
```

---

## Exemplos de Uso

### Buscar Métricas via API

```bash
# Visão geral dos últimos 30 dias
curl "/api/analytics/overview?startDate=2025-01-01&endDate=2025-01-31"

# Funil de pipeline
curl "/api/analytics/pipeline?startDate=2025-01-01&endDate=2025-01-31"

# Performance de agentes
curl "/api/analytics/agent-performance?startDate=2025-01-01&endDate=2025-01-31"

# Exportar dados em CSV
curl "/api/analytics/export?format=csv&startDate=2025-01-01&endDate=2025-01-31" -o analytics.csv
```

### Calcular Métricas no Backend

```typescript
import { getOverviewMetrics, calculatePipelineConversion } from '@/lib/analytics/metrics';

const overview = await getOverviewMetrics(tenantId, {
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
});

console.log(`Candidatos: ${overview.totalCandidates} (${overview.candidateTrend}%)`);
console.log(`Contratações: ${overview.totalHired} (${overview.hireTrend}%)`);
console.log(`Taxa de sucesso IA: ${overview.taskSuccessRate}%`);

const pipeline = await calculatePipelineConversion(tenantId);
pipeline.forEach(stage => {
  console.log(`${stage.stageName}: ${stage.candidatesCount} candidatos (${stage.conversionRate}% conv.)`);
});
```

### Exportar Dados

```typescript
import { exportToCSV } from '@/lib/analytics/export';

const data = [
  { metric: 'candidates', value: 234, period: '2025-01' },
  { metric: 'hires', value: 15, period: '2025-01' },
];

exportToCSV(data, 'analytics-2025-01.csv');
```

---

## v2.0 — Melhorias de Segurança e UX

> **Versão:** 2.0 | **Atualizado em:** 2025

### Segurança

- Todas as **6 rotas de API** (`/api/analytics/*`) agora utilizam autenticação server-side via `getServerSession` em vez de receber `tenantId` do cliente. O tenant é resolvido automaticamente a partir da sessão autenticada, eliminando o risco de acesso cross-tenant.

### Tratamento de Erros

- Todas as falhas de API exibem **notificações toast** ao usuário, informando o motivo do erro de forma clara.

### Internacionalização (i18n)

- Todas as mensagens de erro foram traduzidas para **pt-BR**, garantindo consistência com o restante da plataforma.

### Exportação

- O componente `ExportButton` **não requer mais a prop `tenantId`**. O tenant é obtido automaticamente pela rota de exportação via sessão autenticada, simplificando a interface do componente.
