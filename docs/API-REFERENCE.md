# API Reference - Zion Recruit

**Versão**: 2.0  
**Base URL**: `https://api.zionrecruit.com`  
**Documentação OpenAPI**: `/api/docs`

---

## Autenticação

### Sessão NextAuth

```typescript
// Login via interface
POST /api/auth/signin

// Sessão atual
GET /api/auth/session
Response: { user: { id, name, email, tenantId }, expires }

// Logout
POST /api/auth/signout
```

### Token Interno (Serviços)

```typescript
// Header para bypass de rate limit
x-internal-service-token: <seu-token-secreto>
```

---

## Rate Limiting

### Headers de Resposta

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699887600000
Retry-After: 60  // apenas quando excedido
```

### Limites por Tipo

| Tipo | Limite | Rotas |
|------|--------|-------|
| AUTH | 5/min | /api/auth/* |
| API | 100/min | /api/* |
| AI | 20/min | /api/agents/*, /api/ai/* |
| WEBHOOK | 1000/min | /webhook/* |
| PUBLIC | 60/min | /api/public/* |

---

## Candidatos

### Listar Candidatos

```http
GET /api/candidates

Query Parameters:
  - jobId: string (opcional) - Filtrar por vaga
  - status: string (opcional) - Filtrar por status
  - search: string (opcional) - Buscar por nome/email
  - minScore: number (opcional) - Score mínimo
  - page: number (padrão: 1)
  - limit: number (padrão: 20, máx: 100)

Response 200:
{
  "candidates": [
    {
      "id": "clx123...",
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "+55 11 99999-9999",
      "status": "SCREENING",
      "matchScore": 85,
      "job": { "id": "...", "title": "Desenvolvedor" },
      "pipelineStage": { "id": "...", "name": "Triagem", "color": "#3B82F6" },
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

### Criar Candidato

```http
POST /api/candidates

Request Body:
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "+55 11 99999-9999",
  "jobId": "clx123...",
  "resumeUrl": "https://...",
  "linkedin": "https://linkedin.com/in/joaosilva",
  "github": "https://github.com/joaosilva",
  "source": "LinkedIn"
}

Response 201:
{
  "id": "clx456...",
  "name": "João Silva",
  "email": "joao@email.com",
  "status": "APPLIED",
  "matchScore": null,
  "createdAt": "2025-01-20T14:30:00Z"
}
```

### Obter Candidato

```http
GET /api/candidates/:id

Response 200:
{
  "id": "clx456...",
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "+55 11 99999-9999",
  "resumeUrl": "https://...",
  "resumeText": "Texto extraído do currículo...",
  "parsedSkills": ["JavaScript", "React", "Node.js"],
  "parsedExperience": [...],
  "matchScore": 85,
  "matchDetails": {
    "skillsScore": 90,
    "experienceScore": 80,
    "overallScore": 85,
    "strengths": ["Domínio em React"],
    "gaps": ["Experiência com TypeScript"]
  },
  "discTest": {
    "completed": true,
    "profile": "DI",
    "scores": { "D": 85, "I": 75, "S": 30, "C": 45 }
  },
  "job": { "id": "...", "title": "Desenvolvedor Full Stack" },
  "pipelineStage": { "id": "...", "name": "Triagem" },
  "notes": [...],
  "messages": [...],
  "createdAt": "2025-01-20T14:30:00Z"
}
```

### Atualizar Candidato

```http
PATCH /api/candidates/:id

Request Body:
{
  "status": "INTERVIEWING",
  "tags": ["frontend", "react"],
  "rating": 4
}

Response 200:
{
  "id": "clx456...",
  "status": "INTERVIEWING",
  ...
}
```

### Calcular Match

```http
POST /api/candidates/:id/match

Response 200:
{
  "matchScore": 85,
  "skillsScore": 90,
  "experienceScore": 80,
  "matchDetails": {
    "matchedSkills": ["JavaScript", "React", "Node.js"],
    "missingSkills": ["TypeScript"],
    "experienceMatch": true
  },
  "recommendation": "GOOD_MATCH"
}
```

### Gerar Relatório

```http
POST /api/candidates/:id/report

Response 200:
{
  "reportId": "rpt123...",
  "status": "GENERATING",
  "estimatedTime": 30
}

// Polling para resultado
GET /api/candidates/:id/report
Response 200:
{
  "reportId": "rpt123...",
  "status": "COMPLETED",
  "reportUrl": "https://...",
  "summary": "Candidato com forte perfil técnico..."
}
```

---

## Vagas

### Listar Vagas

```http
GET /api/jobs

Query Parameters:
  - status: string (opcional)
  - department: string (opcional)
  - search: string (opcional)
  - page: number
  - limit: number

Response 200:
{
  "jobs": [
    {
      "id": "clx123...",
      "title": "Desenvolvedor Full Stack",
      "department": "Engenharia",
      "status": "ACTIVE",
      "location": "São Paulo, SP",
      "type": "CLT",
      "salary": { "min": 8000, "max": 12000, "currency": "BRL" },
      "candidatesCount": 45,
      "createdAt": "2025-01-10T09:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

### Criar Vaga

```http
POST /api/jobs

Request Body:
{
  "title": "Desenvolvedor Full Stack",
  "department": "Engenharia",
  "description": "Buscamos profissional...",
  "requirements": "Experiência com React e Node.js...",
  "location": "São Paulo, SP",
  "type": "CLT",
  "salary": { "min": 8000, "max": 12000, "currency": "BRL" },
  "skills": ["React", "Node.js", "TypeScript"],
  "seniority": "SENIOR",
  "isPublic": true
}

Response 201:
{
  "id": "clx789...",
  "title": "Desenvolvedor Full Stack",
  "status": "DRAFT",
  "parsedRequirements": {
    "skills": ["React", "Node.js", "TypeScript"],
    "seniority": "SENIOR",
    "experience": "3-5 anos"
  },
  ...
}
```

### Publicar Vaga

```http
POST /api/jobs/:id/publish

Response 200:
{
  "id": "clx789...",
  "status": "ACTIVE",
  "publicSlug": "desenvolvedor-full-stack-sao-paulo",
  "publicUrl": "https://zionrecruit.com/careers/job/desenvolvedor-full-stack-sao-paulo"
}
```

---

## Pipeline

### Listar Estágios

```http
GET /api/pipeline

Response 200:
{
  "stages": [
    {
      "id": "stage1",
      "name": "Novo",
      "order": 1,
      "color": "#6B7280",
      "isDefault": true,
      "candidatesCount": 15
    },
    {
      "id": "stage2",
      "name": "Triagem",
      "order": 2,
      "color": "#3B82F6",
      "isDefault": false,
      "candidatesCount": 8
    }
  ]
}
```

### Mover Candidato

```http
POST /api/pipeline/move

Request Body:
{
  "candidateId": "clx456...",
  "stageId": "stage3"
}

Response 200:
{
  "success": true,
  "candidate": {
    "id": "clx456...",
    "pipelineStageId": "stage3"
  }
}
```

---

## Analytics

### Overview

```http
GET /api/analytics/overview

Query Parameters:
  - startDate: ISO date
  - endDate: ISO date

Response 200:
{
  "activeJobs": 12,
  "totalCandidates": 450,
  "inProcess": 85,
  "hired": 15,
  "timeToHire": {
    "average": 28,
    "median": 22,
    "trend": "down"
  },
  "conversionRate": {
    "overall": 3.3,
    "byStage": {
      "Novo": 100,
      "Triagem": 45,
      "Entrevista": 25,
      "Contratado": 3.3
    }
  }
}
```

### Pipeline Funnel

```http
GET /api/analytics/pipeline

Response 200:
{
  "funnel": [
    { "stage": "Novo", "count": 150, "conversionRate": 100 },
    { "stage": "Triagem", "count": 67, "conversionRate": 44.7 },
    { "stage": "Entrevista", "count": 28, "conversionRate": 18.7 },
    { "stage": "Teste Técnico", "count": 15, "conversionRate": 10 },
    { "stage": "DISC", "count": 12, "conversionRate": 8 },
    { "stage": "Final", "count": 8, "conversionRate": 5.3 },
    { "stage": "Contratado", "count": 5, "conversionRate": 3.3 }
  ]
}
```

### Fontes

```http
GET /api/analytics/sources

Response 200:
{
  "sources": [
    { "source": "LinkedIn", "candidates": 180, "hired": 8, "conversionRate": 4.4 },
    { "source": "Indeed", "candidates": 120, "hired": 4, "conversionRate": 3.3 },
    { "source": "Indicação", "candidates": 50, "hired": 2, "conversionRate": 4.0 },
    { "source": "Job Board", "candidates": 100, "hired": 1, "conversionRate": 1.0 }
  ]
}
```

### Performance dos Agentes IA

```http
GET /api/analytics/agent-performance

Response 200:
{
  "agents": [
    {
      "type": "JOB_PARSER",
      "totalRuns": 150,
      "successRate": 98.5,
      "averageDuration": 1.2,
      "tokensUsed": 45000
    },
    {
      "type": "MATCHING",
      "totalRuns": 1200,
      "successRate": 99.2,
      "averageDuration": 0.8,
      "tokensUsed": 180000
    }
  ],
  "totals": {
    "totalRuns": 1500,
    "totalTokens": 500000,
    "estimatedCost": 15.50
  }
}
```

---

## Webhooks

### Listar Webhooks

```http
GET /api/webhooks

Response 200:
{
  "webhooks": [
    {
      "id": "wh123...",
      "name": "Slack Notification",
      "url": "https://hooks.slack.com/...",
      "events": ["candidate.created", "candidate.hired"],
      "isActive": true,
      "lastTriggeredAt": "2025-01-20T10:00:00Z",
      "lastStatus": "success"
    }
  ]
}
```

### Criar Webhook

```http
POST /api/webhooks

Request Body:
{
  "name": "Slack Notification",
  "url": "https://hooks.slack.com/...",
  "events": ["candidate.created", "candidate.hired", "job.closed"]
}

Response 201:
{
  "id": "wh456...",
  "name": "Slack Notification",
  "secret": "whsec_xxxxxxxxxxxx",  // Única vez exibido!
  "events": ["candidate.created", "candidate.hired", "job.closed"],
  "isActive": true
}
```

### Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| `candidate.created` | Novo candidato |
| `candidate.updated` | Candidato atualizado |
| `candidate.hired` | Candidato contratado |
| `candidate.rejected` | Candidato rejeitado |
| `job.created` | Nova vaga |
| `job.updated` | Vaga atualizada |
| `job.closed` | Vaga fechada |
| `interview.scheduled` | Entrevista agendada |
| `interview.completed` | Entrevista realizada |
| `disc.completed` | Teste DISC concluído |
| `message.received` | Mensagem recebida |
| `task.completed` | Tarefa IA concluída |

### Verificar Assinatura

```typescript
// Assinatura HMAC-SHA256
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Payload de Webhook

```json
{
  "id": "evt_123...",
  "type": "candidate.hired",
  "timestamp": "2025-01-20T14:30:00Z",
  "tenantId": "tenant_123...",
  "data": {
    "candidate": {
      "id": "cand_456...",
      "name": "João Silva",
      "email": "joao@email.com"
    },
    "job": {
      "id": "job_789...",
      "title": "Desenvolvedor Full Stack"
    }
  }
}
```

---

## Portal do Candidato

### Solicitar Magic Link

```http
POST /api/portal/auth

Request Body:
{
  "email": "candidato@email.com"
}

Response 200:
{
  "success": true,
  "message": "E-mail enviado com instruções de acesso"
}
```

### Verificar Token

```http
POST /api/portal/verify

Request Body:
{
  "token": "magic_token_xxx"
}

Response 200:
{
  "success": true,
  "candidate": {
    "id": "cand_456...",
    "name": "João Silva",
    "email": "joao@email.com"
  },
  "applications": [...],
  "interviews": [...]
}
```

---

## Job Board Público

### Listar Vagas Públicas

```http
GET /api/public/jobs

Query Parameters:
  - department: string
  - location: string
  - type: string
  - search: string
  - page: number
  - limit: number

Response 200:
{
  "jobs": [
    {
      "id": "job_123...",
      "title": "Desenvolvedor Full Stack",
      "department": "Engenharia",
      "location": "São Paulo, SP",
      "type": "CLT",
      "salary": "R$ 8.000 - R$ 12.000",
      "publicSlug": "desenvolvedor-full-stack-sao-paulo"
    }
  ],
  "total": 10
}
```

### Detalhes da Vaga

```http
GET /api/public/jobs/:slug

Response 200:
{
  "id": "job_123...",
  "title": "Desenvolvedor Full Stack",
  "department": "Engenharia",
  "location": "São Paulo, SP",
  "type": "CLT",
  "description": "...",
  "requirements": "...",
  "benefits": [...],
  "skills": ["React", "Node.js", "TypeScript"],
  "views": 1234,
  "applications": 45
}
```

### Candidatar-se

```http
POST /api/public/jobs/:id/apply

Request Body:
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "+55 11 99999-9999",
  "resumeUrl": "https://...",
  "linkedin": "https://linkedin.com/in/joaosilva",
  "coverLetter": "Sou desenvolvedor...",
  "utm": {
    "source": "linkedin",
    "medium": "organic",
    "campaign": "jan2025"
  }
}

Response 201:
{
  "success": true,
  "applicationId": "app_123...",
  "message": "Candidatura recebida com sucesso"
}
```

---

## Audit Logs

### Listar Logs

```http
GET /api/audit

Query Parameters:
  - userId: string
  - action: string
  - entityType: string
  - startDate: ISO date
  - endDate: ISO date
  - page: number
  - limit: number

Response 200:
{
  "logs": [
    {
      "id": "log_123...",
      "action": "UPDATE",
      "entityType": "Candidate",
      "entityId": "cand_456...",
      "userId": "user_789...",
      "userName": "Maria Santos",
      "changes": {
        "before": { "status": "SCREENING" },
        "after": { "status": "INTERVIEWING" }
      },
      "ipAddress": "192.168.1.1",
      "createdAt": "2025-01-20T14:30:00Z"
    }
  ],
  "total": 1500
}
```

### Exportar Logs

```http
GET /api/audit/export?format=csv

Response 200:
Content-Type: text/csv
Content-Disposition: attachment; filename="audit_logs_2025-01-20.csv"
```

---

## Billing

### Listar Planos

```http
GET /api/billing

Response 200:
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "currency": "BRL",
      "features": {
        "jobs": 1,
        "candidates": 50,
        "members": 1
      }
    },
    {
      "id": "starter",
      "name": "Starter",
      "price": 249,
      "currency": "BRL",
      "features": {
        "jobs": 5,
        "candidates": 500,
        "members": 3
      }
    }
  ]
}
```

### Criar Checkout Session

```http
POST /api/billing

Request Body:
{
  "planId": "professional",
  "interval": "monthly"  // ou "yearly"
}

Response 200:
{
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

### Status da Assinatura

```http
GET /api/billing/subscription

Response 200:
{
  "status": "active",
  "plan": "professional",
  "currentPeriodEnd": "2025-02-20T00:00:00Z",
  "cancelAtPeriodEnd": false,
  "usage": {
    "jobs": { "used": 12, "limit": 25 },
    "candidates": { "used": 1200, "limit": 5000 }
  }
}
```

---

## Erros

### Formato de Erro

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": [
      { "field": "email", "message": "E-mail inválido" }
    ]
  },
  "requestId": "req_123..."
}
```

### Códigos de Erro

| Código | HTTP | Descrição |
|--------|------|-----------|
| `UNAUTHORIZED` | 401 | Não autenticado |
| `FORBIDDEN` | 403 | Sem permissão |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `VALIDATION_ERROR` | 400 | Dados inválidos |
| `RATE_LIMIT_EXCEEDED` | 429 | Limite excedido |
| `INTERNAL_ERROR` | 500 | Erro interno |

---

## SDKs

### JavaScript/TypeScript

```bash
npm install @zion-recruit/sdk
```

```typescript
import { ZionRecruit } from '@zion-recruit/sdk';

const client = new ZionRecruit({
  apiKey: 'your-api-key'
});

// Listar candidatos
const candidates = await client.candidates.list({
  jobId: 'job_123',
  status: 'SCREENING'
});

// Criar candidato
const candidate = await client.candidates.create({
  name: 'João Silva',
  email: 'joao@email.com',
  jobId: 'job_123'
});
```

---

**Versão da API**: v2.0  
**Contato**: api@zionrecruit.com
