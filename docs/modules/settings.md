# Módulo de Configurações

> **Componentes:** `src/components/settings/`
> **Rotas API:** `/api/settings/*`
> **Acesso:** OWNER e ADMIN para configurações organizacionais

---

## Visão Geral

O módulo de configurações centraliza o gerenciamento do perfil do usuário, equipe e configurações organizacionais da plataforma. Permite que usuários gerenciem suas informações pessoais, administradores gerenciem membros da equipe e owners/admins personalizem as configurações da organização, incluindo logo, slug, integrações e controle de limites do plano.

---

## Componentes

### `SettingsPage`

**Arquivo:** `settings-page.tsx`

Página principal com navegação por abas:

- **Organização:** Configurações gerais da organização
- **Equipe:** Gerenciamento de membros e permissões
- **Perfil:** Informações pessoais do usuário logado

```typescript
import { SettingsPage } from '@/components/settings/settings-page';
```

### `ProfileSettings`

**Arquivo:** `profile-settings.tsx`

Formulário de configuração do perfil pessoal:

- **Avatar:** Upload e exibição de foto de perfil
- **Nome:** Nome completo editável
- **E-mail:** Exibição em modo somente leitura
- **Lista de organizações:** Organizações às quais o usuário pertence com papéis

```typescript
import { ProfileSettings } from '@/components/settings/profile-settings';
```

**Campos:**

| Campo | Editável | Descrição |
|---|---|---|
| Avatar | Sim | Upload de imagem (JPG, PNG, máx. 2MB) |
| Nome | Sim | Nome completo do usuário |
| E-mail | Não | E-mail cadastrado (imutável por segurança) |
| Organizações | Não (visualização) | Lista com nome e papel em cada organização |

---

### `TeamSettings`

**Arquivo:** `team-settings.tsx`

Gerenciamento da equipe com tabela interativa:

- **Tabela de membros:** Nome, e-mail, papel, data de entrada, status
- **Alteração de papel:** Dropdown para OWNER, ADMIN, MEMBER
- **Remoção de membro:** Botão com confirmação (não pode remover a si mesmo)
- **Botão de convite:** Abre dialog de convite de novo membro

```typescript
import { TeamSettings } from '@/components/settings/team-settings';
```

**Papéis disponíveis:**

| Papel | Permissões |
|---|---|
| `OWNER` | Acesso total + gerenciamento de billing + exclusão da organização |
| `ADMIN` | Gerenciamento de equipe + configurações da organização |
| `MEMBER` | Acesso às funcionalidades conforme o plano |

> ⚠️ Apenas OWNER pode alterar o papel de outros membros. ADMIN pode convidar e remover MEMBERs.

---

### `OrganizationSettings`

**Arquivo:** `organization-settings.tsx`

Configurações da organização:

- **Nome:** Nome da organização (editável por OWNER/ADMIN)
- **Logo:** Upload de logotipo (exibido no portal e e-mails)
- **Slug:** Identificador único da URL pública
- **Plano atual:** Card informativo com link para upgrade

```typescript
import { OrganizationSettings } from '@/components/settings/organization-settings';
```

**Campos:**

| Campo | Editável | Descrição |
|---|---|---|
| Nome | Sim (OWNER/ADMIN) | Nome da organização |
| Logo | Sim (OWNER/ADMIN) | Logo exibido na plataforma e comunicações |
| Slug | Sim (OWNER/ADMIN) | Identificador único para URLs (ex: `empresa-x.zionrecruit.com`) |
| Plano | Não (visualização) | Plano atual com link para upgrade |

---

### `IntegrationsSettings`

**Arquivo:** `integrations-settings.tsx`

Cards de configuração de integrações:

```typescript
import { IntegrationsSettings } from '@/components/settings/integrations-settings';
```

#### Sub-componentes

| Componente | Descrição |
|---|---|
| `EmailSettingsCard` | Configuração de e-mail transacional (provedor, remetente) |
| `CalendarSettingsCard` | Integração com calendário (Google Calendar, Outlook) |

---

### `InviteMemberDialog`

**Arquivo:** `invite-member-dialog.tsx`

Dialog para convite de novos membros:

- **E-mail:** Campo de e-mail do convidado
- **Papel:** Seletor de papel (MEMBER, ADMIN)
- **Envio:** Dispara e-mail de convite via serviço de e-mail

```typescript
import { InviteMemberDialog } from '@/components/settings/invite-member-dialog';

// Abertura do dialog
<InviteMemberDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onInvite={handleInvite}
/>
```

**Fluxo de convite:**

```
Administrador preenche e-mail e papel
    ↓
POST /api/settings/team
    ↓
Cria registro de convite (status: PENDING)
    ↓
Envia e-mail de convite (TEAM_INVITE)
    ↓
Convidado clica no link → Aceita o convite
    ↓
Membro adicionado à equipe
```

---

### `PlanLimitsCard`

**Arquivo:** `plan-limits-card.tsx`

Card informativo com uso vs limites do plano:

- **Barras de progresso** para cada métrica (membros, vagas, candidatos, etc.)
- **Indicador de alerta** quando próximo ao limite (>80%)
- **Link para upgrade** quando limite atingido
- **Resumo mensal** de consumo

```typescript
import { PlanLimitsCard } from '@/components/settings/plan-limits-card';

<PlanLimitsCard
  plan="professional"
  limits={{
    teamMembers: { current: 8, limit: 25 },
    activeJobs: { current: 15, limit: 100 },
    candidates: { current: 2300, limit: 10000 }
  }}
/>
```

**Exemplo visual:**

```
📊 Uso do Plano Professional

Membros da Equipe     ████████░░░░░░░░░░░░  8/25
Vagas Ativas          ████████░░░░░░░░░░░░  15/100
Candidatos            ██████░░░░░░░░░░░░░░  2.300/10.000
Análises DISC/mês     ██████████████████░░  45/500 ⚠️
Agentes de IA         ██████░░░░░░░░░░░░░░  3/5
```

---

### `EmailSettingsCard`

**Arquivo:** `email-settings-card.tsx`

Card de configuração de e-mail transacional:

- **Status da integração:** Conectado / Desconectado
- **Provedor:** Resend (configurado via credenciais)
- **Endereço remetente:** E-mail de origem (ex: `noreply@empresa.com`)
- **Domínios:** Lista de domínios verificados
- **Teste de envio:** Botão para enviar e-mail de teste

```typescript
import { EmailSettingsCard } from '@/components/settings/email-settings-card';
```

---

### `CalendarSettingsCard`

**Arquivo:** `calendar-settings-card.tsx`

Card de integração com calendário:

- **Provedores suportados:** Google Calendar, Microsoft Outlook
- **Status de conexão:** Conectado / Não conectado
- **Conta conectada:** E-mail da conta vinculada
- **Sincronização:** Toggle para ativar/desativar sync de entrevistas
- **Desconectar:** Botão para remover integração

```typescript
import { CalendarSettingsCard } from '@/components/settings/calendar-settings-card';
```

---

## APIs

### `GET /api/settings/profile`

Retorna o perfil do usuário logado com suas organizações.

**Resposta:**

```json
{
  "user": {
    "id": "user_abc123",
    "name": "Maria Santos",
    "email": "maria@empresa.com",
    "image": "https://cdn.zionrecruit.com/avatars/maria.jpg",
    "createdAt": "2024-06-15T00:00:00.000Z"
  },
  "organizations": [
    {
      "id": "org_456",
      "name": "Empresa X",
      "slug": "empresa-x",
      "role": "OWNER",
      "logo": "https://cdn.zionrecruit.com/logos/empresa-x.png",
      "plan": "professional"
    }
  ]
}
```

---

### `PUT /api/settings/profile`

Atualiza o perfil do usuário logado.

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | `string` | Não | Novo nome completo |
| `image` | `string` | Não | URL da nova imagem de avatar |

**Resposta:**

```json
{
  "success": true,
  "user": {
    "id": "user_abc123",
    "name": "Maria Santos Silva",
    "email": "maria@empresa.com",
    "image": "https://cdn.zionrecruit.com/avatars/maria-updated.jpg"
  }
}
```

---

### `GET /api/settings/team`

Lista todos os membros da equipe do tenant.

**Resposta:**

```json
{
  "members": [
    {
      "id": "user_abc123",
      "name": "Maria Santos",
      "email": "maria@empresa.com",
      "image": "https://cdn.zionrecruit.com/avatars/maria.jpg",
      "role": "OWNER",
      "joinedAt": "2024-06-15T00:00:00.000Z",
      "isActive": true,
      "lastLoginAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": "user_def456",
      "name": "João Oliveira",
      "email": "joao@empresa.com",
      "image": null,
      "role": "ADMIN",
      "joinedAt": "2024-08-20T00:00:00.000Z",
      "isActive": true,
      "lastLoginAt": "2025-01-15T09:00:00.000Z"
    },
    {
      "id": "user_ghi789",
      "name": "Ana Costa",
      "email": "ana@empresa.com",
      "image": "https://cdn.zionrecruit.com/avatars/ana.jpg",
      "role": "MEMBER",
      "joinedAt": "2024-10-01T00:00:00.000Z",
      "isActive": true,
      "lastLoginAt": "2025-01-14T16:00:00.000Z"
    }
  ],
  "total": 3,
  "invites": [
    {
      "id": "inv_xyz123",
      "email": "novo@empresa.com",
      "role": "MEMBER",
      "status": "PENDING",
      "expiresAt": "2025-01-22T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/settings/team`

Envia convite para novo membro da equipe.

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `email` | `string` | Sim | E-mail do convidado |
| `role` | `string` | Não | Papel (padrão: `MEMBER`) |

**Resposta:**

```json
{
  "success": true,
  "invite": {
    "id": "inv_xyz123",
    "email": "novo@empresa.com",
    "role": "MEMBER",
    "status": "PENDING",
    "expiresAt": "2025-01-22T00:00:00.000Z"
  },
  "message": "Convite enviado com sucesso"
}
```

**Erros:**

| Status | Condição |
|---|---|
| `409` | E-mail já é membro da equipe |
| `409` | Já existe convite pendente para este e-mail |
| `403` | Sem permissão (requer OWNER ou ADMIN) |
| `422` | Limite de membros do plano atingido |

---

### `PUT /api/settings/team/[id]`

Altera o papel de um membro da equipe.

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `role` | `string` | Sim | Novo papel (`MEMBER`, `ADMIN`, `OWNER`) |

**Resposta:**

```json
{
  "success": true,
  "member": {
    "id": "user_ghi789",
    "name": "Ana Costa",
    "role": "ADMIN"
  }
}
```

> ⚠️ Apenas OWNER pode alterar papéis. Não é possível alterar o próprio papel. Deve haver pelo menos um OWNER na organização.

---

### `DELETE /api/settings/team/[id]`

Remove um membro da equipe.

**Resposta:**

```json
{
  "success": true,
  "message": "Membro removido com sucesso"
}
```

> ⚠️ Não é possível remover a si mesmo. Não é possível remover o último OWNER.

---

### `GET /api/settings/organization`

Retorna as configurações da organização do tenant.

**Resposta:**

```json
{
  "organization": {
    "id": "org_456",
    "name": "Empresa X",
    "slug": "empresa-x",
    "logo": "https://cdn.zionrecruit.com/logos/empresa-x.png",
    "plan": "professional",
    "createdAt": "2024-06-15T00:00:00.000Z"
  },
  "usage": {
    "teamMembers": { "current": 3, "limit": 25 },
    "activeJobs": { "current": 12, "limit": 100 },
    "candidates": { "current": 1800, "limit": 10000 },
    "discAssessments": { "current": 35, "limit": 500 },
    "aiAgents": { "current": 2, "limit": 5 },
    "apiKeys": { "current": 3, "limit": 10 },
    "webhooks": { "current": 5, "limit": 25 }
  },
  "integrations": {
    "email": { "configured": true, "provider": "resend" },
    "calendar": { "configured": false, "provider": null },
    "whatsapp": { "configured": true, "provider": "evolution" }
  }
}
```

---

### `PUT /api/settings/organization`

Atualiza as configurações da organização.

> ⚠️ Requer papel OWNER ou ADMIN.

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | `string` | Não | Novo nome da organização |
| `logo` | `string` | Não | URL da nova logo |
| `slug` | `string` | Não | Novo slug (deve ser único) |

**Resposta:**

```json
{
  "success": true,
  "organization": {
    "id": "org_456",
    "name": "Empresa X Atualizada",
    "slug": "empresa-x-novo",
    "logo": "https://cdn.zionrecruit.com/logos/empresa-x-v2.png"
  }
}
```

**Erros:**

| Status | Condição |
|---|---|
| `403` | Sem permissão (requer OWNER ou ADMIN) |
| `409` | Slug já está em uso por outra organização |
| `422` | Slug com formato inválido |

---

## Controle de Permissões

### Matriz de Permissões

| Ação | OWNER | ADMIN | MEMBER |
|---|---|---|---|
| Editar perfil próprio | ✅ | ✅ | ✅ |
| Ver equipe | ✅ | ✅ | ✅ |
| Convidar membro | ✅ | ✅ | ❌ |
| Remover membro | ✅ | ✅ (só MEMBERs) | ❌ |
| Alterar papel | ✅ | ❌ | ❌ |
| Editar organização | ✅ | ✅ | ❌ |
| Gerenciar billing | ✅ | ❌ | ❌ |
| Gerenciar integrações | ✅ | ✅ | ❌ |
| Excluir organização | ✅ | ❌ | ❌ |

---

## Fluxo de Convite de Membro

```
ADMIN/OWNER acessa aba "Equipe"
    ↓
Clica em "Convidar Membro"
    ↓
InviteMemberDialog abre
    ↓
Preenche e-mail e papel
    ↓
POST /api/settings/team
    ↓
Verifica permissões + limites do plano
    ↓
Cria registro de convite (status: PENDING)
    ↓
Envia e-mail com link de aceite (TEAM_INVITE)
    ↓
Convidado recebe e-mail → Clica no link
    ↓
Verifica validade do convite (7 dias)
    ↓
Cria/associa conta do usuário
    ↓
Adiciona como membro da equipe
    ↓
Marca convite como ACCEPTED
    ↓
Notifica administrador
```

---

## Considerações de Produção

1. **Último OWNER:** Nunca permita a remoção do último OWNER da organização
2. **Slug único:** O slug é utilizado em URLs públicas e deve ser validado para caracteres seguros
3. **Convites expirados:** Convites pendentes expiram após 7 dias
4. **Avatar/Logo:** Utilize CDN para armazenamento de imagens e aplique otimização (resize, compressão)
5. **Audit:** Todas as alterações de configurações são registradas no log de auditoria
6. **Rate limit:** Convites por e-mail devem ter rate limit para evitar spam
