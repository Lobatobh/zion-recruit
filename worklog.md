---
Task ID: 1
Agent: main
Task: AI Autonomous Messaging - Campaign execution, candidate-reply, Assumir Conversa

Work Log:
- Analyzed existing codebase: Prisma schema (Campaign, Automation, Conversation, Message models), AI screening service, WebSocket messaging, ChatView, CampaignsTab
- Created `/api/messages/campaigns/[id]/execute` - Campaign execution API that creates conversations and sends AI welcome messages to candidates
- Created `/api/messages/conversations/[id]/candidate-reply` - Auto-reply API that processes candidate messages through AI when aiMode is on
- Updated ChatView with 3 new banners: AI Control (violet gradient), Human Control (emerald), Intervention (destructive)
- Added "Assumir Conversa" (HandMetal icon) prominent button that disables AI mode and sends system message
- Added "Reativar IA" button to re-enable AI mode after takeover
- Added "Simular resposta do candidato" popover for testing AI auto-response flow
- Added "Executar Campanha" dropdown item in CampaignsTab
- Seeded demo data: 8 pipeline stages, 1 job (Dev Full Stack Sr), 4 candidates, 1 campaign
- Fixed tenant ID references across all new files (correct ID: cmn67w6by0000otpmwm26xoo8)

Stage Summary:
- AI can now autonomously contact candidates through campaigns
- Conversations are visible to recruiter in real-time in the Conversas tab
- Recruiter can take over any conversation at any time with "Assumir Conversa" button
- When AI mode is on and candidate replies, AI responds automatically
- Demo data seeded for testing the full flow
