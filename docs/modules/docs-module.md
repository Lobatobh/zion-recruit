# Módulo de Documentação Interna

> **Componentes:** `src/components/docs/`
> **Dados:** `src/components/docs/docs-data.ts`
> **Acesso:** Visão `docs` (disponível na sidebar de navegação)

---

## Visão Geral

O módulo de documentação interna fornece uma biblioteca de documentação integrada à plataforma, acessível diretamente pela sidebar de navegação. Oferece navegação por seções, busca textual, exemplos de código formatados e design responsivo, servindo como centro de referência para usuários da plataforma.

---

## Componentes

### `DocsPage`

**Arquivo:** `docs-page.tsx`

Página principal da documentação com layout de duas colunas:

- **Coluna esquerda:** Sidebar de navegação + campo de busca
- **Coluna direita:** Conteúdo da seção selecionada

```typescript
import { DocsPage } from '@/components/docs/docs-page';
```

**Características:**

- Layout responsivo (sidebar colapsa em mobile)
- Animação de transição entre seções
- Destaque da seção ativa na sidebar
- Breadcrumbs para navegação hierárquica

---

### `DocsSidebar`

**Arquivo:** `docs-sidebar.tsx`

Sidebar de navegação com estrutura hierárquica:

- **Grupos de seções:** Documentação organizada por categorias
- **Indicador ativo:** Destaque visual da seção atual
- **Busca integrada:** Campo de busca no topo da sidebar
- **Scroll inteligente:** Scroll automático para a seção ativa
- **Collapse/Expand:** Grupos recolhíveis em telas menores

```typescript
import { DocsSidebar } from '@/components/docs/docs-sidebar';
```

**Estrutura de navegação:**

```
📚 Documentação
├── 🚀 Introdução
│   ├── Bem-vindo ao Zion Recruit
│   ├── Primeiros Passos
│   └── Glossário
├── 📋 Candidatos
│   ├── Gerenciamento de Candidatos
│   ├── Pipeline de Recrutamento
│   ├── Notas e Tags
│   └── Avaliação DISC
├── 💼 Vagas
│   ├── Criar e Gerenciar Vagas
│   ├── Publicação de Vagas
│   ├── Portal de Carreiras
│   └── Templates de Vaga
├── 🤖 Agentes de IA
│   ├── Visão Geral dos Agentes
│   ├── Análise de Currículos
│   ├── Match Inteligente
│   └── Sourcing de Talentos
├── 📊 Analytics
│   ├── Dashboard Principal
│   ├── Relatórios de Funil
│   └── Métricas de Tempo
├── ⚙️ Configurações
│   ├── Perfil e Equipe
│   ├── Organização
│   ├── Integrações
│   └── Webhooks e APIs
└── 🔒 Segurança
    ├── Autenticação
    ├── Permissões
    └── Auditoria
```

---

### `DocsContent`

**Arquivo:** `docs-content.tsx`

Renderizador de conteúdo da documentação:

- **Markdown rendering:** Suporte a formatação Markdown (headers, lists, bold, italic, links)
- **Blocos de código:** Syntax highlighting para múltiplas linguagens
- **Tabelas:** Renderização de tabelas formatadas
- **Imagens:** Suporte a imagens com legendas
- **Callouts:** Caixas de destaque (dica, aviso, importante, nota)

```typescript
import { DocsContent } from '@/components/docs/docs-content';
```

**Tipos de callout suportados:**

| Tipo | Ícone | Uso |
|---|---|---|
| `tip` | 💡 | Dicas e sugestões |
| `warning` | ⚠️ | Avisos e cuidados |
| `important` | ❗ | Informações críticas |
| `note` | 📝 | Notas e observações |

**Exemplo de bloco de código:**

````markdown
```typescript
// Exemplo de criação de candidato
const candidate = await api.post('/candidates', {
  name: 'João Silva',
  email: 'joao@email.com',
  phone: '+55 11 99999-9999',
  source: 'career-page'
});
```
````

---

### `DocsData`

**Arquivo:** `docs-data.ts`

Estrutura de dados que define todo o conteúdo da documentação.

```typescript
import { DOCS_SECTIONS } from '@/components/docs/docs-data';
```

**Formato da estrutura:**

```typescript
interface DocsSection {
  id: string;              // Identificador único da seção
  title: string;           // Título exibido
  icon: string;            // Emoji ou ícone
  group: string;           // Grupo/categoria
  order: number;           // Ordem de exibição
  content: string;         // Conteúdo em Markdown
  keywords: string[];      // Palavras-chave para busca
  relatedSections?: string[]; // Seções relacionadas
}
```

**Exportação:**

```typescript
export const DOCS_SECTIONS: DocsSection[] = [
  // Array ordenado de todas as seções
];
```

---

## Funcionalidades

### Navegação por Sidebar

- **Hierarquia:** Seções organizadas em grupos expansíveis
- **Ativo:** Seção atual destacada visualmente
- **Scroll:** Sidebar acompanha a rolagem do conteúdo
- **Mobile:** Sidebar transforma-se em menu drawer no mobile

### Busca

- **Campo de busca:** Localizado no topo da sidebar
- **Busca instantânea:** Resultados filtrados em tempo real conforme digitação
- **Escopo:** Busca em títulos, conteúdo e palavras-chave
- **Destaques:** Termos buscados destacados nos resultados

```typescript
// Algoritmo de busca simplificado
function searchDocs(query: string): DocsSection[] {
  const lowerQuery = query.toLowerCase();
  return DOCS_SECTIONS.filter(section =>
    section.title.toLowerCase().includes(lowerQuery) ||
    section.keywords.some(k => k.includes(lowerQuery)) ||
    section.content.toLowerCase().includes(lowerQuery)
  );
}
```

### Exemplos de Código

Os blocos de código suportam:

- **Syntax highlighting:** Detecção automática da linguagem
- **Cópia:** Botão para copiar o conteúdo do bloco
- **Linha numérica:** Numeração de linhas opcional
- **Destaques:** Linhas específicas podem ser destacadas

**Linguagens suportadas:**

| Linguagem | Identificador |
|---|---|
| TypeScript | `typescript`, `ts` |
| JavaScript | `javascript`, `js` |
| JSON | `json` |
| Bash | `bash`, `shell` |
| SQL | `sql` |
| CSS | `css` |
| HTML | `html` |

### Design Responsivo

| Breakpoint | Layout |
|---|---|
| **Desktop** (≥1024px) | Sidebar fixa à esquerda + conteúdo à direita |
| **Tablet** (768px–1023px) | Sidebar colapsável + conteúdo em largura total |
| **Mobile** (<768px) | Menu drawer + conteúdo em largura total |

---

## Estrutura de Conteúdo

### Seções da Documentação

O conteúdo é organizado em 8 grupos com seções detalhadas:

#### 🚀 Introdução

| Seção | Descrição |
|---|---|
| Bem-vindo ao Zion Recruit | Visão geral da plataforma e recursos |
| Primeiros Passos | Guia de configuração inicial |
| Glossário | Definições de termos técnicos |

#### 📋 Candidatos

| Seção | Descrição |
|---|---|
| Gerenciamento de Candidatos | CRUD de candidatos, campos, filtros |
| Pipeline de Recrutamento | Kanban board, etapas, drag & drop |
| Notas e Tags | Anotações, etiquetas, categorização |
| Avaliação DISC | Teste comportamental, perfis, relatórios |

#### 💼 Vagas

| Seção | Descrição |
|---|---|
| Criar e Gerenciar Vagas | Formulário de vaga, campos, público-alvo |
| Publicação de Vagas | Configuração de vaga pública, SEO |
| Portal de Carreiras | Página pública de vagas, candidatura |
| Templates de Vaga | Modelos pré-configurados por área |

#### 🤖 Agentes de IA

| Seção | Descrição |
|---|---|
| Visão Geral dos Agentes | Tipos de agentes, configuração |
| Análise de Currículos | Parse automático, extração de dados |
| Match Inteligente | Score de compatibilidade, ranking |
| Sourcing de Talentos | Busca automatizada, perfis |

#### 📊 Analytics

| Seção | Descrição |
|---|---|
| Dashboard Principal | Visão geral com KPIs e gráficos |
| Relatórios de Funil | Análise de conversão por etapa |
| Métricas de Tempo | Time-to-hire, time-to-fill |

#### ⚙️ Configurações

| Seção | Descrição |
|---|---|
| Perfil e Equipe | Gerenciamento de usuários |
| Organização | Dados da empresa, logo, plano |
| Integrações | WhatsApp, e-mail, calendário |
| Webhooks e APIs | Configuração de webhooks, credenciais |

#### 🔒 Segurança

| Seção | Descrição |
|---|---|
| Autenticação | Login, MFA, sessões |
| Permissões | Roles, acesso, escopo |
| Auditoria | Logs, exportação, compliance |

---

## Exemplo de Estrutura de Dados

```typescript
// docs-data.ts
export const DOCS_SECTIONS: DocsSection[] = [
  {
    id: 'intro-welcome',
    title: 'Bem-vindo ao Zion Recruit',
    icon: '👋',
    group: 'introduction',
    order: 1,
    keywords: ['plataforma', 'recrutamento', 'ats', 'visão geral'],
    relatedSections: ['intro-getting-started', 'intro-glossary'],
    content: `
# Bem-vindo ao Zion Recruit

O **Zion Recruit** é uma plataforma completa de recrutamento e seleção...

## Recursos Principais

- **Pipeline visual** para gerenciamento de candidatos
- **Agentes de IA** para automação de tarefas
- **Portal do candidato** com experiência self-service

> 💡 **Dica:** Comece pelo guia de [Primeiros Passos](#/docs/intro-getting-started)
    `
  },
  // ... mais seções
];
```

---

## Acesso e Navegação

### Via Sidebar

A documentação é acessível pela sidebar de navegação principal, no item **"Documentação"** (ícone 📚).

```
Sidebar principal
├── Dashboard
├── Candidatos
├── Vagas
├── Pipeline
├── ...
├── 📚 Documentação  ← Acessa a visão docs
└── ⚙️ Configurações
```

### Via URL

A documentação é renderizada na rota `/docs` como uma view interna.

### Via Link Direto

É possível linkar diretamente para uma seção específica:

```
/docs#candidate-pipeline
/docs#ai-agents-overview
/docs#security-audit
```

---

## Extensibilidade

### Adicionar Nova Seção

Para adicionar uma nova seção de documentação:

```typescript
// 1. Adicione a seção em docs-data.ts
export const DOCS_SECTIONS: DocsSection[] = [
  // ... seções existentes
  {
    id: 'novo-modulo',
    title: 'Novo Módulo',
    icon: '🆕',
    group: 'extensões',
    order: 50,
    keywords: ['novo', 'módulo', 'feature'],
    relatedSections: ['intro-welcome'],
    content: `
# Novo Módulo

Descrição completa do novo módulo...

## Funcionalidades

- Feature 1
- Feature 2
    `
  }
];
```

### Adicionar Novo Grupo

Para adicionar um novo grupo de seções, basta utilizar um novo valor no campo `group`. A sidebar detecta automaticamente os grupos e os renderiza com separadores.

---

## Boas Práticas para Conteúdo

1. **Linguagem:** Todo o conteúdo deve ser em **Português (pt-BR)**
2. **Estrutura:** Utilize headers hierárquicos (H1 → H2 → H3)
3. **Callouts:** Use callouts para dicas, avisos e informações importantes
4. **Exemplos:** Inclua exemplos práticos sempre que possível
5. **Código:** Formate blocos de código com a linguagem correta
6. **Palavras-chave:** Adicione sinônimos e termos relacionados para melhorar a busca
7. **Links internos:** Referencie seções relacionadas com links internos
8. **Concisão:** Mantenha o conteúdo focado e direto ao ponto

---

## Considerações de Produção

1. **Performance:** O conteúdo é renderizado no client-side — evite seções com conteúdo excessivamente longo
2. **Cache:** Considere implementar cache do conteúdo renderizado para melhor performance
3. **Versionamento:** Atualize a documentação sempre que módulos forem modificados
4. **Feedback:** Considere adicionar um mecanismo de feedback (útil/não útil) em cada seção
5. **Acessibilidade:** Garanta contraste adequado e suporte a leitores de tela
6. **Imagens:** Utilize formato WebP para imagens e inclua `alt` text descritivo
