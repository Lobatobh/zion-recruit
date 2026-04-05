---
Task ID: 1
Agent: Main Agent
Task: Integrar módulo Campanhas IA dentro do módulo Mensagens + fix carregamento infinito

Work Log:
- Analisou e redesenhou o módulo Mensagens como unificado com 3 abas: Conversas, Campanhas IA, Automações
- Removeu Campanhas IA do sidebar e do ViewType
- Investigou e diagnosticou o problema de carregamento infinito:
  - Caddy (port 81) faz proxy para Next.js (port 3000)
  - O sandbox mata processos Node.js quando não há atividade de shell
  - Production build (serve.js) é necessário para estabilidade de memória
  - Dev mode (webpack compilation on demand) usa muita memória
- Build de produção OK, servidor HTTP 200 com 9754 bytes de HTML
- JS bundles e CSS carregam corretamente via Caddy
- A integração dos módulos está completa e funcionando

Stage Summary:
- Módulo Mensagens agora tem 3 abas: Conversas, Campanhas IA, Automações
- Sidebar simplificada (Campanhas IA removida como item separado)
- O carregamento infinito é causado pelo sandbox matando o processo Node.js
- Servidor precisa ser reiniciado quando o preview não carrega
- Comando para reiniciar: `cd /home/z/my-project && node serve.js &`
