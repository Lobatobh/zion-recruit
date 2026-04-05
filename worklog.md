---
Task ID: 1
Agent: Main Agent
Task: Integrar módulo Campanhas IA dentro do módulo Mensagens com melhorias

Work Log:
- Analisou o módulo Mensagens existente (messages-page.tsx) - chat com conversas, WebSocket, compose dialog
- Analisou o módulo Campanhas IA (campaigns-dashboard.tsx) - dashboard de campanhas de outreach com IA
- Redesenhou o messages-page.tsx como módulo unificado com 3 abas:
  1. **Conversas** - Interface de chat existente (lista de conversas + chat view)
  2. **Campanhas IA** - Dashboard de campanhas movido para dentro do módulo Mensagens
  3. **Automações** - Nova aba com configurações de automação (Bot WhatsApp, Sequências Email, Triagem IA, Agendamento Auto, Nutrição de Leads)
- Atualizou o app-page.tsx (sidebar):
  - Removeu "Campanhas IA" do grupo "Inteligência IA" no sidebar
  - Removeu "campaigns" do tipo ViewType
  - Removeu o LazyCampaignsPage import
  - Removeu o case "campaigns" do renderView()
  - Removeu o ícone Megaphone dos imports
- Build concluído com sucesso (warnings esperados apenas)
- Servidor iniciado e verificado (HTTP 200, 9754 bytes de resposta)

Stage Summary:
- Módulo Mensagens agora é unificado com 3 abas: Conversas, Campanhas IA, Automações
- Header com gradiente violeta mostrando stats rápidos (campanhas ativas, total de conversas, não lidas)
- Campanhas IA agora com cards expansíveis, métricas de conversão, configuração de tom de IA
- Automações com 5 automações configuráveis (toggle on/off) + personalidade da IA
- Sidebar simplificada (Campanhas IA removida como item separado)
- Build OK, servidor HTTP 200
