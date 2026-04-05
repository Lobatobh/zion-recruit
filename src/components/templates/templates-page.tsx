"use client";

import { FileText, Plus, Mail, MessageSquare, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const templates = [
  { id: "1", name: "Convite para Entrevista", type: "Email", category: "Entrevista", usageCount: 45, lastUsed: "Hoje" },
  { id: "2", name: "Follow-up Pós-Entrevista", type: "Email", category: "Follow-up", usageCount: 32, lastUsed: "Ontem" },
  { id: "3", name: "Proposta de Emprego", type: "Email", category: "Oferta", usageCount: 12, lastUsed: "3 dias" },
  { id: "4", name: "Rejeição Candidato", type: "Email", category: "Rejeição", usageCount: 28, lastUsed: "1 dia" },
  { id: "5", name: "Mensagem WhatsApp Inicial", type: "WhatsApp", category: "Contato", usageCount: 67, lastUsed: "Hoje" },
  { id: "6", name: "Confirmação de DISC Test", type: "Email", category: "Avaliação", usageCount: 20, lastUsed: "2 dias" },
];

const categoryColors: Record<string, string> = {
  Entrevista: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  "Follow-up": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Oferta: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Rejeição: "bg-red-500/10 text-red-700 dark:text-red-400",
  Contato: "bg-green-500/10 text-green-700 dark:text-green-400",
  Avaliação: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const typeIcons: Record<string, typeof Mail> = {
  Email: Mail,
  WhatsApp: MessageSquare,
};

export function TemplatesPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 text-white rounded-b-2xl shadow-lg shadow-violet-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Templates</h1>
              <p className="text-white/80 text-sm">Gerencie templates de emails e mensagens</p>
            </div>
          </div>
          <Button className="bg-white text-violet-700 hover:bg-white/90 font-medium">
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Templates", value: "6", icon: FileText, color: "text-violet-600" },
          { label: "Templates de Email", value: "5", icon: Mail, color: "text-purple-600" },
          { label: "Templates WhatsApp", value: "1", icon: MessageSquare, color: "text-fuchsia-600" },
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

      {/* Templates List */}
      <div className="rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Todos os Templates</h2>
        </div>
        <div className="divide-y divide-border">
          {templates.map((tpl, idx) => {
            const TypeIcon = typeIcons[tpl.type] || FileText;
            return (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                  <TypeIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{tpl.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className={categoryColors[tpl.category] || ""}>
                      {tpl.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Usado {tpl.usageCount}x</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{tpl.lastUsed}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
