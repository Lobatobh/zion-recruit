"use client";

import { Megaphone, Plus, Bot, Users, Send, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const campaigns = [
  {
    id: "1",
    name: "Senior Dev Python",
    status: "active" as const,
    sent: 45,
    replied: 12,
    interested: 5,
    source: "LinkedIn",
  },
  {
    id: "2",
    name: "Product Manager",
    status: "active" as const,
    sent: 30,
    replied: 8,
    interested: 3,
    source: "Email",
  },
  {
    id: "3",
    name: "UX Designer",
    status: "paused" as const,
    sent: 20,
    replied: 4,
    interested: 1,
    source: "LinkedIn",
  },
  {
    id: "4",
    name: "DevOps Engineer",
    status: "draft" as const,
    sent: 0,
    replied: 0,
    interested: 0,
    source: "Email",
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Ativa", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  paused: { label: "Pausada", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  draft: { label: "Rascunho", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400" },
  completed: { label: "Concluída", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
};

export function CampaignsDashboard() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 text-white rounded-b-2xl shadow-lg shadow-violet-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Campanhas IA</h1>
              <p className="text-white/80 text-sm">Automação de outreach com inteligência artificial</p>
            </div>
          </div>
          <Button className="bg-white text-violet-700 hover:bg-white/90 font-medium">
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Campanhas", value: "4", icon: Megaphone, color: "text-violet-600" },
          { label: "Mensagens Enviadas", value: "95", icon: Send, color: "text-purple-600" },
          { label: "Respostas", value: "24", icon: BarChart3, color: "text-fuchsia-600" },
          { label: "Candidatos Interessados", value: "9", icon: Users, color: "text-emerald-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Campaigns List */}
      <div className="rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Campanhas</h2>
        </div>
        <div className="divide-y divide-border">
          {campaigns.map((campaign, idx) => {
            const status = statusConfig[campaign.status];
            return (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 shrink-0">
                  <Bot className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{campaign.name}</p>
                  <p className="text-xs text-muted-foreground">Fonte: {campaign.source}</p>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{campaign.sent} enviadas</span>
                  <span>{campaign.replied} respostas</span>
                  <span className="text-emerald-600 font-medium">{campaign.interested} interessados</span>
                </div>
                <Badge variant="secondary" className={status.className}>
                  {status.label}
                </Badge>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
