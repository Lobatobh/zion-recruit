"use client";

import { Handshake, Plus, Users, DollarSign, TrendingUp, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const referrals = [
  { id: "1", name: "Carlos Mendes", referrer: "Ana Silva", position: "Senior Developer", status: "pending" as const, date: "2024-01-15", bonus: "R$ 3.000" },
  { id: "2", name: "Juliana Rocha", referrer: "Pedro Santos", position: "Product Manager", status: "interviewing" as const, date: "2024-01-12", bonus: "R$ 5.000" },
  { id: "3", name: "Lucas Ferreira", referrer: "Maria Costa", position: "UX Designer", status: "hired" as const, date: "2024-01-08", bonus: "R$ 2.500" },
  { id: "4", name: "Patrícia Alves", referrer: "João Lima", position: "DevOps Engineer", status: "rejected" as const, date: "2024-01-05", bonus: "R$ 0" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  interviewing: { label: "Entrevistando", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  hired: { label: "Contratado", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  rejected: { label: "Rejeitado", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
};

export function ReferralsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 text-white rounded-b-2xl shadow-lg shadow-violet-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Handshake className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Indicações</h1>
              <p className="text-white/80 text-sm">Gerencie indicações de candidatos e bônus de referência</p>
            </div>
          </div>
          <Button className="bg-white text-violet-700 hover:bg-white/90 font-medium">
            <Plus className="h-4 w-4 mr-2" />
            Nova Indicação
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Indicações", value: "4", icon: Users, color: "text-violet-600" },
          { label: "Pendentes", value: "1", icon: TrendingUp, color: "text-amber-600" },
          { label: "Contratados", value: "1", icon: Gift, color: "text-emerald-600" },
          { label: "Bônus Pagos", value: "R$ 2.500", icon: DollarSign, color: "text-purple-600" },
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

      {/* Referrals List */}
      <div className="rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Indicações Recentes</h2>
        </div>
        <div className="divide-y divide-border">
          {referrals.map((ref, idx) => {
            const status = statusConfig[ref.status];
            return (
              <motion.div
                key={ref.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/10 to-purple-500/10 shrink-0 text-sm font-bold text-violet-600">
                  {ref.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{ref.name}</p>
                  <p className="text-xs text-muted-foreground">{ref.position} · Indicado por {ref.referrer}</p>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium">{ref.bonus}</p>
                  <p className="text-xs text-muted-foreground">{ref.date}</p>
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
