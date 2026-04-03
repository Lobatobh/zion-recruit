# Compliance - Conformidade Regulatória

**Zion Recruit - Plataforma de Recrutamento Inteligente**

**Versão**: 2.0  
**Data**: Janeiro 2025

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [LGPD - Lei Geral de Proteção de Dados](#2-lgpd)
3. [GDPR - Regulamento Geral de Proteção de Dados](#3-gdpr)
4. [Segurança da Informação](#4-segurança-da-informação)
5. [Recrutamento Ético](#5-recrutamento-ético)
6. [IA Responsável](#6-ia-responsável)
7. [Auditoria e Monitoramento](#7-auditoria-e-monitoramento)
8. [Gestão de Incidentes](#8-gestão-de-incidentes)
9. [Treinamento e Conscientização](#9-treinamento-e-conscientização)
10. [Certificações e Reconhecimentos](#10-certificações-e-reconhecimentos)

---

## 1. Visão Geral

### 1.1 Compromisso com Compliance

A **Zion Assessment Technologies** mantém um programa robusto de compliance que abrange:

- Proteção de dados pessoais
- Segurança da informação
- Ética em recrutamento
- Uso responsável de IA
- Transparência e accountability

### 1.2 Framework de Compliance

```
┌─────────────────────────────────────────────────────┐
│              FRAMEWORK DE COMPLIANCE                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  LGPD   │  │  GDPR   │  │  CCPA   │            │
│  └────┬────┘  └────┬────┘  └────┬────┘            │
│       │            │            │                  │
│       └────────────┼────────────┘                  │
│                    │                               │
│  ┌─────────────────▼─────────────────┐            │
│  │     SEGURANÇA DA INFORMAÇÃO       │            │
│  │   ISO 27001 | SOC 2 | PCI-DSS    │            │
│  └─────────────────┬─────────────────┘            │
│                    │                               │
│  ┌─────────────────▼─────────────────┐            │
│  │      GOVERNANÇA DE DADOS          │            │
│  │   Políticas | Processos | Controles│           │
│  └─────────────────┬─────────────────┘            │
│                    │                               │
│  ┌─────────────────▼─────────────────┐            │
│  │        MONITORAMENTO              │            │
│  │   Auditorias | Métricas | Alertas │            │
│  └───────────────────────────────────┘            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 1.3 Responsabilidades

| Papel | Responsabilidade |
|-------|-----------------|
| **Diretoria** | Aprovação de políticas, alocação de recursos |
| **DPO** | Supervisão de proteção de dados |
| **CISO** | Segurança da informação |
| **Compliance Officer** | Gestão do programa de compliance |
| **Líderes de Equipe** | Implementação local |
| **Todos os Colaboradores** | Cumprimento das políticas |

---

## 2. LGPD - Lei Geral de Proteção de Dados

### 2.1 Enquadramento

A Zion Recruit opera como:

- **Controladora** de dados de usuários da plataforma
- **Operadora** de dados de candidatos (controlados pelas empresas clientes)

### 2.2 Bases Legais Utilizadas

| Base Legal | Aplicação |
|------------|-----------|
| **Execução de Contrato** | Prestação dos serviços de recrutamento |
| **Consentimento** | Avaliações DISC, marketing, integrações |
| **Interesse Legítimo** | Segurança, logs, melhorias |
| **Obrigação Legal** | Retenção fiscal, respostas judiciais |

### 2.3 Direitos dos Titulares

Implementamos mecanismos para garantia dos direitos:

| Direito | Implementação | Prazo |
|---------|---------------|-------|
| Confirmação | API + Interface | Imediato |
| Acesso | Portal do Candidato + API | 15 dias |
| Correção | Interface de edição | Imediato |
| Eliminação | Solicitação via DPO | 15 dias |
| Portabilidade | Export em CSV/JSON | 15 dias |
| Revogação de Consentimento | Configurações de conta | Imediato |

### 2.4 Registro de Operações (ROP)

Mantemos registro detalhado conforme Art. 37 da LGPD:

```json
{
  "operacao": "Processo seletivo de candidatos",
  "controlador": "Empresa Cliente",
  "operador": "Zion Assessment Technologies",
  "finalidade": "Avaliação de candidatos para vagas",
  "dados": ["nome", "email", "telefone", "currículo", "avaliações"],
  "titulares": "Candidatos",
  "baseLegal": "Execução de contrato",
  "prazoRetencao": "24 meses após último contato",
  "medidasSeguranca": ["criptografia", "controle_acesso", "logs"]
}
```

### 2.5 Impacto na Plataforma

| Funcionalidade | Ajuste LGPD |
|----------------|-------------|
| Cadastro | Consentimentos explícitos |
| Pipeline | Logs de todas as ações |
| DISC | Consentimento específico |
| Webhooks | Apenas dados autorizados |
| Relatórios | Dados anonimizados |
| Auditoria | Rastreamento completo |

---

## 3. GDPR - Regulamento Geral de Proteção de Dados

### 3.1 Aplicabilidade

O GDPR é aplicável quando:

- Candidatos são residentes na UE
- Empresas clientes estão sediadas na UE
- Oferecemos serviços a residentes na UE

### 3.2 Diferenças-Chave LGPD vs GDPR

| Aspecto | LGPD | GDPR |
|---------|------|------|
| Prazo de resposta | 15 dias | 30 dias |
| Notificação de incidente | "Prazo razoável" | 72 horas |
| DPO obrigatório | Depende do volume | Sempre |
| Multa máxima | 2% faturamento (R$ 50M) | 4% faturamento (€20M) |

### 3.3 Cláusulas Contratuais Padrão

Para transferências internacionais, utilizamos:

- **SCC (Standard Contractual Clauses)** da Comissão Europeia
- DPA (Data Processing Agreement) com clientes
- Contratos específicos com processadores

### 3.4 Representante na UE

Para clientes europeus:

**Representante**: [Nome da empresa representante]  
**Endereço**: [Endereço na UE]  
**E-mail**: eu-representative@zionrecruit.com

---

## 4. Segurança da Informação

### 4.1 Framework de Segurança

Adotamos controles baseados em:

- **ISO 27001**: Gestão de segurança da informação
- **SOC 2 Type II**: Controles de serviço
- **CIS Controls**: Boas práticas de segurança

### 4.2 Controles Implementados

#### Criptografia

| Contexto | Algoritmo | Chave |
|----------|-----------|-------|
| Em trânsito | TLS 1.3 | - |
| Em repouso (dados sensíveis) | AES-256-GCM | 256 bits |
| Senhas | bcrypt | Salt + custo 12 |
| Webhooks | HMAC-SHA256 | - |

#### Controle de Acesso

| Controle | Implementação |
|----------|---------------|
| Autenticação | NextAuth.js + JWT |
| MFA | Disponível (planejado) |
| RBAC | Roles: OWNER, ADMIN, RECRUITER, VIEWER |
| Princípio menor privilégio | Aplicado |
| Sessão | Timeout 24h, renovação |

#### Rate Limiting

| Tipo | Limite | Proteção |
|------|--------|----------|
| AUTH | 5/min | Brute force |
| API | 100/min | Abuso |
| AI | 20/min | Custo |
| WEBHOOK | 1000/min | Integrações |

### 4.3 Backup e Recuperação

| Aspecto | Configuração |
|---------|--------------|
| Frequência | Diário |
| Retenção | 90 dias |
| Criptografia | AES-256 |
| Teste de restore | Mensal |
| RTO | 4 horas |
| RPO | 24 horas |

---

## 5. Recrutamento Ético

### 5.1 Princípios

1. **Não Discriminação**: Decisões baseadas em critérios objetivos
2. **Transparência**: Candidatos informados sobre o processo
3. **Proporcionalidade**: Dados coletados conforme necessidade
4. **Accountability**: Responsabilização pelas decisões

### 5.2 Prevenção de Discriminação

| Prática | Implementação |
|---------|---------------|
| Dados sensíveis | Não coletados por padrão |
| Algoritmos de IA | Auditados para viés |
| Relatórios | Análise de diversidade |
| Treinamento | Equipe treinada em ética |

### 5.3 Consentimento do Candidato

Ao se candidatar, o candidato é informado sobre:

- Quais dados são coletados
- Como serão utilizados
- Quem terá acesso
- Tempo de retenção
- Seus direitos

### 5.4 Acesso aos Dados Pelo Candidato

Via Portal do Candidato:

- Visualizar dados pessoais
- Atualizar informações
- Ver status da candidatura
- Acessar resultados DISC
- Solicitar exclusão
- Exportar dados

---

## 6. IA Responsável

### 6.1 Princípios de IA

| Princípio | Aplicação |
|-----------|-----------|
| **Transparência** | Documentação dos algoritmos |
| **Equidade** | Testes de viés regulares |
| **Explicabilidade** | Relatórios explicativos |
| **Segurança** | Testes de robustez |
| **Privacidade** | Dados anonimizados quando possível |

### 6.2 Auditoria de Algoritmos

Realizamos auditorias para detectar:

| Tipo de Viés | Teste |
|--------------|-------|
| Gênero | Análise de scores por gênero |
| Raça/Etnia | Análise de scores por grupo |
| Idade | Análise de scores por faixa etária |
| Localização | Análise de scores por região |

### 6.3 Uso de Dados para Treinamento

- **NÃO** utilizamos dados de clientes para treinar modelos de IA
- Utilizamos apenas dados anonimizados para melhorias
- Contratos com provedores de IA (OpenAI, Google) garantem não-treinamento

### 6.4 Explicabilidade

Para cada score de match, fornecemos:

- Fatores considerados
- Peso de cada fator
- Pontuação por critério
- Recomendações de melhoria

---

## 7. Auditoria e Monitoramento

### 7.1 Logs de Auditoria

Todas as ações sensíveis são registradas:

| Evento | Dados Registrados |
|--------|-------------------|
| Login/Logout | Timestamp, IP, user agent |
| Visualização de candidato | Quem, quando, qual |
| Alteração de status | De/para, responsável |
| Exportação de dados | O quê, por quem, para onde |
| Alteração de configurações | O quê, valor anterior/novo |
| Acesso à API | Endpoint, parâmetros, resposta |

### 7.2 Retenção de Logs

| Tipo de Log | Retenção |
|-------------|----------|
| Acesso | 90 dias |
| Auditoria | 5 anos |
| Segurança | 2 anos |
| Aplicação | 30 dias |

### 7.3 Monitoramento

| Monitoramento | Ferramenta | Alerta |
|---------------|------------|--------|
| Disponibilidade | Uptime robot | < 99% |
| Erros de aplicação | Sentry | Taxa > 1% |
| Segurança | WAF + SIEM | Imediato |
| Performance | APM | Latência > 2s |

### 7.4 Auditorias Externas

| Tipo | Frequência | Auditor |
|------|------------|---------|
| Penetration Test | Anual | Empresa terceirizada |
| SOC 2 | Anual | Auditor certificado |
| LGPD/GDPR | Bienal | Consultoria especializada |

---

## 8. Gestão de Incidentes

### 8.1 Classificação de Incidentes

| Nível | Descrição | Exemplo |
|-------|-----------|---------|
| **Crítico** | Violação de dados significativa | Vazamento de dados pessoais |
| **Alto** | Comprometimento de segurança | Acesso não autorizado |
| **Médio** | Falha de serviço | Indisponibilidade prolongada |
| **Baixo** | Anomalia operacional | Performance degradada |

### 8.2 Plano de Resposta

```
┌─────────────────────────────────────────────────────────┐
│              FLUXO DE RESPOSTA A INCIDENTES             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. DETECÇÃO ──► 2. CONTENÇÃO ──► 3. ANÁLISE          │
│       │               │               │                │
│       ▼               ▼               ▼                │
│  [Alertas]      [Isolamento]    [Investigação]         │
│                                                         │
│  4. ERRADICAÇÃO ──► 5. RECUPERAÇÃO ──► 6. LIÇÕES      │
│       │                  │                │            │
│       ▼                  ▼                ▼            │
│  [Correção]         [Restauração]   [Melhorias]        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 8.3 Notificações

| Notificação | Prazo | Destinatário |
|-------------|-------|--------------|
| ANPD | "Prazo razoável" | Autoridade |
| Titulares afetados | Imediato após análise | Titulares |
| Clientes | 24h | Empresas contratantes |

### 8.4 Contatos de Incidentes

**Equipe de Segurança**: seguranca@zionrecruit.com  
**DPO**: dpo@zionrecruit.com  
**Telefone 24/7**: +55 (XX) XXXX-XXXX

---

## 9. Treinamento e Conscientização

### 9.1 Programa de Treinamento

| Treinamento | Público | Frequência |
|-------------|---------|------------|
| LGPD/GDPR | Todos | Anual |
| Segurança da Informação | Todos | Semestral |
| Ética em Recrutamento | RH | Anual |
| IA Responsável | Desenvolvimento | Anual |
| Resposta a Incidentes | Equipe de segurança | Semestral |

### 9.2 Conscientização Contínua

- Newsletter mensal de segurança
- Simulações de phishing trimestrais
- Cartilhas e guias disponíveis
- Canais de denúncia anônima

---

## 10. Certificações e Reconhecimentos

### 10.1 Certificações Atuais

| Certificação | Status | Escopo |
|--------------|--------|--------|
| LGPD Compliance | ✅ Certificado | Todos os serviços |
| GDPR Compliance | ✅ Certificado | Serviços UE |

### 10.2 Certificações em Andamento

| Certificação | Previsão |
|--------------|----------|
| ISO 27001 | Q2 2025 |
| SOC 2 Type II | Q3 2025 |

### 10.3 Reconhecimentos

- selo de privacidade da ANPD (planejado)
- Privacy by Design certification (planejado)

---

## 11. Documentos Relacionados

- [Política de Proteção de Dados](./POLITICA-PROTECAO-DADOS.md)
- [Política de Privacidade](./POLITICA-PRIVACIDADE.md)
- [Termos de Uso](./TERMOS-DE-USO.md)
- [Documentação Técnica](./README.md)

---

## 12. Contatos de Compliance

| Área | Contato |
|------|---------|
| **DPO** | dpo@zionrecruit.com |
| **CISO** | ciso@zionrecruit.com |
| **Compliance** | compliance@zionrecruit.com |
| **Jurídico** | juridico@zionrecruit.com |

---

## 13. Histórico de Versões

| Versão | Data | Alterações |
|--------|------|------------|
| 2.0 | Janeiro 2025 | Atualização completa |
| 1.0 | Janeiro 2024 | Versão inicial |

---

**Zion Assessment Technologies Ltda.**  
CNPJ: XX.XXX.XXX/0001-XX

_Este documento é revisado anualmente ou quando há mudanças regulatórias significativas._
