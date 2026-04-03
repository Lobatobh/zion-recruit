# Visão Geral (Dashboard)

> **Categoria:** Core | **Status:** ✅ Estável
>
> Painel principal do sistema com métricas em tempo real, ações rápidas e visão consolidada do pipeline de recrutamento.

---

## Descrição

O módulo de **Visão Geral** é o ponto de entrada principal da plataforma Zion Recruit. Apresenta um dashboard interativo com as métricas mais relevantes do processo seletivo, incluindo estatísticas com comparação de tendências (vs. mês anterior), uma grade de ações rápidas para navegação eficiente, e um resumo visual do pipeline com barras de progresso por etapa.

O componente utiliza animações staggered do **Framer Motion** para proporcionar uma experiência de carregamento fluida e profissional.

---

## Componentes

### `OverviewContent`

**Arquivo:** `src/components/overview/overview-content.tsx`

Componente principal exportado que renderiza o dashboard completo.

```typescript
export { OverviewContent };
```

#### Composição

```
OverviewContent
├── Título + Saudação
├── StatCard × 4 (métricas principais)
├── Quick Actions Grid (6 ações rápidas)
└── Pipeline Overview (barras de progresso por etapa)
```

#### Propriedades

| Prop | Tipo | Descrição |
|------|------|-----------|
| _Nenhuma prop externa_ | — | Dados obtidos via fetch interno ao `/api/overview` |

---

### `StatCard` (interno)

Componente interno de card de estatística. Não exportado — utilizado apenas dentro de `OverviewContent`.

```typescript
// Uso interno — não exportado
interface StatCardProps {
  title: string;        // Rótulo da métrica (ex: "Vagas Ativas")
  value: string | number; // Valor exibido (ex: "24")
  icon: LucideIcon;     // Ícone Lucide React
  trend?: {
    value: number;      // Variação percentual (ex: +12.5)
    isPositive: boolean; // Se a tendência é positiva
  };
  color: string;        // Cor temática (Tailwind class)
  description?: string; // Texto auxiliar
}
```

#### Características

- Exibe o valor principal com animação de contagem
- Indicador visual de tendência comparativa (vs. mês anterior)
- Setas ↑/↓ com cores verde (positivo) ou vermelho (negativo)
- Fundo com gradiente sutil baseado na cor temática

---

### `LoadingSkeleton` (interno)

Componente de skeleton loading para o dashboard. Não exportado.

```typescript
// Uso interno — não exportado
```

#### Características

- Replica a estrutura visual do dashboard com placeholders animados
- 4 cards de estatística em formato skeleton
- Grade de ações rápidas com shimmer effect
- Seção de pipeline com barras placeholder
- Mantém o layout estável durante o carregamento (sem layout shift)

---

## Interfaces

### `OverviewStats`

Estatísticas gerais do dashboard com comparação de tendências.

```typescript
interface OverviewStats {
  activeJobs: number;       // Total de vagas ativas
  totalCandidates: number;  // Total de candidatos cadastrados
  inProcess: number;        // Candidatos em processo ativo
  hiredThisMonth: number;   // Contratações no mês atual
}
```

### `RecentJob`

Representação simplificada de uma vaga recente.

```typescript
interface RecentJob {
  id: string;
  title: string;            // Título da vaga
  department?: string;      // Departamento
  status: JobStatus;        // Status da vaga
  candidatesCount: number;  // Número de candidatos inscritos
  createdAt: string;        // Data de criação (ISO)
}
```

### `RecentCandidate`

Representação simplificada de um candidato recente.

```typescript
interface RecentCandidate {
  id: string;
  name: string;             // Nome completo
  email: string;            // E-mail
  currentStage?: string;    // Etapa atual no pipeline
  matchScore?: number;      // Score de compatibilidade (0-100)
  appliedAt: string;        // Data da candidatura (ISO)
}
```

### `PipelineStage`

Etapa do pipeline com contagem de candidatos.

```typescript
interface PipelineStage {
  id: string;
  name: string;             // Nome da etapa (ex: "Entrevista Técnica")
  count: number;            // Número de candidatos nesta etapa
  color: string;            // Cor de identificação (hex)
  order: number;            // Ordem de exibição
}
```

### `OverviewData`

Estrutura completa de dados retornados pela API do dashboard.

```typescript
interface OverviewData {
  stats: OverviewStats;           // Métricas principais
  recentJobs: RecentJob[];        // Últimas 5 vagas criadas
  recentCandidates: RecentCandidate[]; // Últimos 6 candidatos
  pipelineStages: PipelineStage[]; // Etapas do pipeline com contagens
  tenant: {
    name: string;                 // Nome da organização
    plan: string;                 // Plano contratado
  };
}
```

---

## API

### `GET /api/overview`

Retorna todos os dados necessários para renderizar o dashboard.

#### Request

```http
GET /api/overview HTTP/1.1
Content-Type: application/json
```

#### Response (`200 OK`)

```json
{
  "stats": {
    "activeJobs": 24,
    "totalCandidates": 187,
    "inProcess": 63,
    "hiredThisMonth": 8
  },
  "recentJobs": [
    {
      "id": "job_abc123",
      "title": "Desenvolvedor Full-Stack Senior",
      "department": "Engenharia",
      "status": "ACTIVE",
      "candidatesCount": 15,
      "createdAt": "2025-07-10T14:30:00Z"
    }
  ],
  "recentCandidates": [
    {
      "id": "cand_xyz789",
      "name": "Maria Silva",
      "email": "maria@email.com",
      "currentStage": "Entrevista Técnica",
      "matchScore": 87,
      "appliedAt": "2025-07-10T09:15:00Z"
    }
  ],
  "pipelineStages": [
    {
      "id": "stage_1",
      "name": "Triagem",
      "count": 42,
      "color": "#6366f1",
      "order": 1
    },
    {
      "id": "stage_2",
      "name": "Entrevista RH",
      "count": 12,
      "color": "#8b5cf6",
      "order": 2
    }
  ],
  "tenant": {
    "name": "TechCorp Brasil",
    "plan": "Professional"
  }
}
```

#### Response (`401 Unauthorized`)

```json
{
  "error": "Não autorizado"
}
```

#### Response (`500 Internal Server Error`)

```json
{
  "error": "Erro interno do servidor"
}
```

---

## Funcionalidades

### Métricas com Tendência

Cada card de estatística exibe:

- **Valor principal** — Número atual da métrica
- **Indicador de tendência** — Variação percentual comparada ao mês anterior
  - 🟢 Seta verde para cima (`+X%`) quando positivo
  - 🔴 Seta vermelha para baixo (`-X%`) quando negativo
- **Ícone temático** — Ícone Lucide correspondente à métrica

| Métrica | Ícone | Cor |
|---------|-------|-----|
| Vagas Ativas | `Briefcase` | Azul |
| Candidatos Totais | `Users` | Roxo |
| Em Processo | `Clock` | Laranja |
| Contratados no Mês | `UserCheck` | Verde |

### Ações Rápidas

Grade com **6 ações de navegação rápida** para os módulos principais:

| Ação | Ícone | Destino |
|------|-------|---------|
| Nova Vaga | `Plus` | Diálogo de criação de vaga |
| Novo Candidato | `UserPlus` | Diálogo de cadastro de candidato |
| Pipeline | `Columns` | Board Kanban |
| Entrevistas | `Calendar` | Lista de entrevistas |
| Relatórios | `FileText` | Página de relatórios |
| Configurações | `Settings` | Configurações do sistema |

### Pipeline Overview

Visão consolidada do pipeline com:

- **Barras de progresso** horizontais por etapa
- **Contagem de candidatos** em cada estágio
- **Cores distintas** para identificação visual
- **Largura proporcional** baseada na quantidade de candidatos

---

## Animações

O módulo utiliza **Framer Motion** com animações staggered para proporcionar uma experiência de carregamento fluida:

```typescript
// Padrão de animação utilizado
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,  // Delay de 100ms entre cada filho
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
```

### Comportamento

- **Container pai** — Animação de fade-in com stagger nos filhos
- **Cards de estatística** — Entrada com slide-up suave, cada card com 100ms de delay
- **Ações rápidas** — Entrada escalonada com scale de 0.95 → 1.0
- **Pipeline bars** — Crescimento horizontal animado

---

## Stores

> **Nenhum store global utilizado.**  
> Os dados do dashboard são buscados diretamente via `fetch` no componente e gerenciados com estado local (`useState`/`useEffect`).

---

## Hooks

> **Nenhum custom hook utilizado.**  
> A lógica de busca e renderização é encapsulada diretamente no componente `OverviewContent`.

---

## Considerações Técnicas

| Aspecto | Detalhe |
|---------|---------|
| **Renderização** | Client-side (`'use client'`) |
| **Carregamento** | Skeleton loading durante fetch |
| **Responsividade** | Grid adaptável: 4→2→1 colunas (stats), 6→3→2 colunas (ações) |
| **Performance** | Single fetch para todos os dados (sem múltiplas requisições) |
| **Cache** | Sem cache — dados sempre frescos |
| **Error handling** | Try/catch com fallback para estado vazio |
| **Acessibilidade** | Labels ARIA em cards e ações |

---

> **←** [Voltar ao Índice](./INDEX.md)
