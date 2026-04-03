# Pipeline Kanban

> **Categoria:** Recrutamento | **Status:** ✅ Estável
>
> Board visual Kanban com drag-and-drop para gerenciamento do fluxo de candidatos através das etapas do processo seletivo.

---

## Descrição

O módulo de **Pipeline Kanban** oferece uma visualização intuitiva em estilo board (quadro) para gerenciar o fluxo de candidatos no processo seletivo. Utiliza a biblioteca **@dnd-kit/core** para implementar drag-and-drop nativo, permitindo que recrutadores movam candidatos entre etapas com simples gestos de arrastar e soltar.

O sistema suporta **atualizações otimistas** — a interface responde instantaneamente à ação do usuário, enquanto a sincronização com o servidor ocorre em background. Inclui funcionalidades como busca, filtro por vaga, colunas colapsáveis e criação de etapas personalizadas com cores distintas.

---

## Componentes

### `KanbanBoard`

**Arquivo:** `src/components/pipeline/kanban-board.tsx`

Componente principal do board Kanban com drag-and-drop.

```typescript
export { KanbanBoard };
```

#### Composição

```
KanbanBoard
├── Barra de Ações
│   ├── Busca por candidato
│   ├── Filtro por vaga
│   └── Botão "Nova Etapa" → AddStageDialog
└── Board Container (@dnd-kit)
    └── StageColumn × N
        ├── Cabeçalho (nome + contagem + cor)
        ├── CandidateCard × M (draggable)
        └── Badge de contagem
```

#### Funcionalidades

- **Drag-and-drop** nativo com @dnd-kit/core
- **Atualizações otimistas** — movimentação instantânea na UI
- **Busca** por nome de candidato (filtra em todas as colunas)
- **Filtro por vaga** — exibe candidatos de uma vaga específica
- **Scroll horizontal** para boards com muitas etapas
- **Auto-scroll** durante drag para boards largos
- **Indicadores visuais** de drop zone durante arraste

#### Configuração do DnD

```typescript
// Simplificação da configuração @dnd-kit
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 }
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }),
  useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 }
  })
);
```

| Sensor | Descrição |
|--------|-----------|
| `PointerSensor` | Arraste via mouse (ativação após 8px de movimentação) |
| `KeyboardSensor` | Acessibilidade via teclado |
| `TouchSensor` | Arraste via touch (ativação após 200ms) |

---

### `StageColumn`

**Arquivo:** `src/components/pipeline/stage-column.tsx`

Coluna do board representando uma etapa do pipeline.

```typescript
export { StageColumn };

interface StageColumnProps {
  stage: PipelineStageWithCandidates;
  candidates: CandidateWithStage[];
  isDropTarget?: boolean;
  onToggleCollapse?: () => void;
  onEditStage?: (stage: PipelineStageWithCandidates) => void;
  onDeleteStage?: (stageId: string) => void;
}
```

#### Características

- **Cabeçalho colorido** — Fundo com a cor da etapa (configurável)
- **Contagem de candidatos** — Badge com número total
- **Colapsável** — Minimiza/expandir a coluna para economizar espaço
- **Drop zone visual** — Indicador visual ao arrastar candidato sobre a coluna
- **Overflow scroll** — Scroll interno quando há muitos candidatos (`max-h-96 overflow-y-auto`)
- **Ações de etapa** — Editar nome/cor e excluir (via menu de contexto)

---

### `CandidateCard`

**Arquivo:** `src/components/pipeline/candidate-card.tsx`

Card de candidato arrastável no board Kanban.

```typescript
export { CandidateCard };

interface CandidateCardProps {
  candidate: CandidateWithStage;
  isDragging?: boolean;
  onClick?: () => void;
}
```

#### Visualização

```
┌──────────────────────────┐
│ [Avatar] Maria Silva      │
│          maria@email.com  │
│ ┌──────────────────────┐ │
│ │ Score: ████████░░ 87  │ │
│ └──────────────────────┘ │
│ 🏢 TechCorp • 3 anos     │
└──────────────────────────┘
```

#### Características

- **Arrastável** — Props do @dnd-kit injetadas automaticamente
- **Score visual** — Barra de progresso com score de compatibilidade
- **Indicador de drag** — Elevação (shadow) e opacidade durante arraste
- **Click para detalhes** — Abre diálogo de detalhes do candidato
- **Informações compactas** — Nome, e-mail, empresa atual, score

---

### `AddStageDialog`

**Arquivo:** `src/components/pipeline/add-stage-dialog.tsx`

Diálogo modal para criação de nova etapa no pipeline.

```typescript
export { AddStageDialog };

interface AddStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageCreated: (stage: PipelineStage) => void;
}
```

#### Campos do Formulário

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | Text | ✅ | Nome da etapa (ex: "Entrevista Técnica") |
| `color` | Color picker | ✅ | Cor de identificação da coluna |
| `order` | Number | ❌ | Ordem de exibição (auto-posicionado se vazio) |

#### Cores Padrão

| Cor | Hex | Uso sugerido |
|-----|-----|-------------|
| Azul | `#6366f1` | Triagem |
| Roxo | `#8b5cf6` | Entrevista RH |
| Rosa | `#ec4899` | Entrevista Técnica |
| Laranja | `#f97316` | Teste prático |
| Verde | `#22c55e` | Aprovação |
| Cinza | `#6b7280` | Rejeição |

---

## Store

### `usePipelineStore`

**Arquivo:** `src/stores/pipeline-store.ts`

Store global (Zustand) para gerenciamento do estado do pipeline.

```typescript
interface PipelineStore {
  // Estado
  stages: PipelineStageWithCandidates[];
  isLoading: boolean;
  error: string | null;
  filters: {
    search: string;
    jobId?: string;
  };
  collapsedStages: Set<string>;

  // Ações
  fetchStages: () => Promise<void>;
  createStage: (input: { name: string; color: string; order?: number }) => Promise<PipelineStage>;
  updateStage: (id: string, input: { name?: string; color?: string; order?: number }) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  moveCandidate: (candidateId: string, fromStageId: string, toStageId: string) => Promise<void>;
  toggleCollapse: (stageId: string) => void;
  setFilters: (filters: Partial<PipelineStore['filters']>) => void;
}
```

#### Atualizações Otimistas

O store implementa atualizações otimistas no método `moveCandidate`:

```typescript
// Fluxo de atualização otimista
moveCandidate: async (candidateId, fromStageId, toStageId) => {
  // 1. Atualizar UI imediatamente
  set(state => ({
    stages: state.stages.map(stage => ({
      ...stage,
      candidates: stage.id === fromStageId
        ? stage.candidates.filter(c => c.id !== candidateId)
        : stage.id === toStageId
        ? [...stage.candidates, movedCandidate]
        : stage.candidates
    }))
  }));

  try {
    // 2. Sincronizar com servidor
    await api.put(`/api/candidates/${candidateId}/stage`, { stageId: toStageId });
  } catch (error) {
    // 3. Reverter em caso de erro
    await get().fetchStages();
  }
}
```

---

## Types

**Arquivo:** `src/types/pipeline.ts`

```typescript
interface PipelineStage {
  id: string;
  tenantId: string;
  name: string;
  color: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface PipelineStageWithCandidates extends PipelineStage {
  candidates: CandidateWithStage[];
}

interface CandidateWithStage {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  matchScore?: number;
  currentCompany?: string;
  experience?: string;
  stageId: string;
  appliedAt: string;
}

// Cores padrão para etapas
const STAGE_COLORS: Record<string, string> = {
  screening: '#6366f1',     // Azul
  interview_hr: '#8b5cf6',  // Roxo
  interview_tech: '#ec4899', // Rosa
  test: '#f97316',          // Laranja
  offer: '#22c55e',         // Verde
  rejected: '#6b7280',      // Cinza
};
```

---

## APIs

### `GET /api/pipeline`

Lista todas as etapas do pipeline com seus candidatos.

#### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `jobId` | string | Filtrar candidatos por vaga |
| `search` | string | Buscar candidatos por nome |
| `minScore` | number | Score mínimo de compatibilidade |

#### Request

```http
GET /api/pipeline?jobId=job_abc123&search=Maria HTTP/1.1
```

#### Response (`200 OK`)

```json
{
  "stages": [
    {
      "id": "stage_1",
      "name": "Triagem",
      "color": "#6366f1",
      "order": 1,
      "candidates": [
        {
          "id": "cand_001",
          "name": "Maria Silva",
          "email": "maria@email.com",
          "matchScore": 92,
          "currentCompany": "TechCorp",
          "stageId": "stage_1",
          "appliedAt": "2025-07-10T09:00:00Z"
        },
        {
          "id": "cand_002",
          "name": "João Santos",
          "email": "joao@email.com",
          "matchScore": 78,
          "stageId": "stage_1",
          "appliedAt": "2025-07-09T14:00:00Z"
        }
      ]
    },
    {
      "id": "stage_2",
      "name": "Entrevista RH",
      "color": "#8b5cf6",
      "order": 2,
      "candidates": [
        {
          "id": "cand_003",
          "name": "Ana Costa",
          "email": "ana@email.com",
          "matchScore": 85,
          "stageId": "stage_2",
          "appliedAt": "2025-07-08T11:00:00Z"
        }
      ]
    },
    {
      "id": "stage_3",
      "name": "Entrevista Técnica",
      "color": "#ec4899",
      "order": 3,
      "candidates": []
    }
  ]
}
```

---

### `POST /api/pipeline`

Cria uma nova etapa no pipeline.

#### Request

```http
POST /api/pipeline HTTP/1.1
Content-Type: application/json
```

```json
{
  "name": "Teste Prático",
  "color": "#f97316",
  "order": 4
}
```

#### Response (`201 Created`)

```json
{
  "id": "stage_4",
  "name": "Teste Prático",
  "color": "#f97316",
  "order": 4,
  "createdAt": "2025-07-10T16:00:00Z",
  "updatedAt": "2025-07-10T16:00:00Z"
}
```

---

### `GET /api/pipeline/[id]`

Obtém detalhes de uma etapa específica.

#### Response (`200 OK`)

```json
{
  "id": "stage_1",
  "name": "Triagem",
  "color": "#6366f1",
  "order": 1,
  "candidates": [],
  "createdAt": "2025-07-01T10:00:00Z",
  "updatedAt": "2025-07-01T10:00:00Z"
}
```

---

### `PUT /api/pipeline/[id]`

Atualiza os dados de uma etapa existente.

#### Request

```http
PUT /api/pipeline/stage_1 HTTP/1.1
Content-Type: application/json
```

```json
{
  "name": "Triagem Inicial",
  "color": "#4f46e5"
}
```

#### Response (`200 OK`)

```json
{
  "id": "stage_1",
  "name": "Triagem Inicial",
  "color": "#4f46e5",
  "order": 1,
  "updatedAt": "2025-07-10T16:30:00Z"
}
```

---

### `DELETE /api/pipeline/[id]`

Remove uma etapa do pipeline. **Candidatos são movidos para a primeira etapa automaticamente.**

#### Request

```http
DELETE /api/pipeline/stage_4 HTTP/1.1
```

#### Response (`200 OK`)

```json
{
  "message": "Etapa removida com sucesso",
  "deletedStageId": "stage_4",
  "movedCandidatesCount": 3,
  "targetStageId": "stage_1"
}
```

#### Comportamento de Segurança

```
Antes:                              Depois:
┌────────┐ ┌──────────┐ ┌────────┐   ┌────────┐ ┌──────────┐
│Triagem │ │Teste Prát│ │Entrev. │   │Triagem │ │Entrev.   │
│ 2 cand │ │ 3 cand   │ │ 1 cand │   │ 5 cand │ │ 1 cand   │
└────────┘ └──────────┘ └────────┘   └────────┘ └──────────┘
                 ↑ DELETE                        ↑
           3 candidatos                          └─ Movidos para
           movidos para                            primeira etapa
           Triagem
```

---

## Funcionalidades

### Drag-and-Drop

Sistema completo de arrastar e soltar com @dnd-kit:

| Recurso | Descrição |
|---------|-----------|
| **Arraste跨列unas** | Mover candidatos entre etapas |
| **Arraste dentro da coluna** | Reordenar candidatos na mesma etapa |
| **Indicador visual** | Sombra e elevação durante arraste |
| **Drop zone** | Highlight da coluna alvo |
| **Cancelamento** | Soltar fora da zona cancela a ação |
| **Touch support** | Funciona em dispositivos móveis |
| **Keyboard support** | Acessível via teclado |

### Atualizações Otimistas

Fluxo de atualização instantânea:

```
Usuário arrasta candidato
    ↓
UI atualiza IMEDIATAMENTE (optimistic)
    ↓
Requisição POST/PUT para servidor (background)
    ↓
┌── Sucesso → Nenhuma ação necessária
│
└── Erro → Reverter UI + notificar usuário
```

### Busca e Filtros

| Filtro | Tipo | Comportamento |
|--------|------|---------------|
| **Busca** | Input textual | Filtra candidatos em todas as colunas simultaneamente |
| **Vaga** | Dropdown | Exibe apenas candidatos da vaga selecionada |

### Colunas Colapsáveis

- Botão de collapse/expand no cabeçalho de cada coluna
- Estado de collapse persistido no store (Zustand)
- Coluna colapsada exibe apenas nome e contagem

### Etapas Padrão (Auto-criação)

Ao criar um novo tenant, as seguintes etapas são criadas automaticamente:

| Ordem | Nome | Cor |
|-------|------|-----|
| 1 | Triagem | `#6366f1` (Azul) |
| 2 | Entrevista RH | `#8b5cf6` (Roxo) |
| 3 | Entrevista Técnica | `#ec4899` (Rosa) |
| 4 | Teste Prático | `#f97316` (Laranja) |
| 5 | Aprovação | `#22c55e` (Verde) |

---

## Considerações Técnicas

| Aspecto | Detalhe |
|---------|---------|
| **Renderização** | Client-side (`'use client'`) |
| **Estado global** | Zustand (`usePipelineStore`) |
| **DnD Library** | @dnd-kit/core + @dnd-kit/sortable |
| **Atualizações** | Otimistas com rollback em erro |
| **Responsividade** | Scroll horizontal em telas menores |
| **Performance** | Virtualização não necessária (típico <100 cards) |
| **Scrollbar** | Custom styling (`max-h-96 overflow-y-auto`) |
| **Acessibilidade** | Keyboard navigation + ARIA labels |

---

> **←** [Voltar ao Índice](./INDEX.md)
