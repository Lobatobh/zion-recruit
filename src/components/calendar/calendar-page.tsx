"use client";

import { CalendarDays, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const upcomingEvents = [
  { id: "1", title: "Entrevista - Maria Silva", type: "Entrevista", time: "Hoje, 14:00", candidate: "Maria Silva" },
  { id: "2", title: "Follow-up - João Santos", type: "Follow-up", time: "Hoje, 16:30", candidate: "João Santos" },
  { id: "3", title: "DISC Test - Ana Costa", type: "Avaliação", time: "Amanhã, 10:00", candidate: "Ana Costa" },
  { id: "4", title: "Entrevista Técnica - Pedro Lima", type: "Entrevista", time: "Amanhã, 14:00", candidate: "Pedro Lima" },
  { id: "5", title: "Reunião - Equipe RH", type: "Interna", time: "Quinta, 09:00", candidate: null },
];

const eventTypeColors: Record<string, string> = {
  Entrevista: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  "Follow-up": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Avaliação: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Interna: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export function CalendarPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 text-white rounded-b-2xl shadow-lg shadow-violet-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Calendário</h1>
              <p className="text-white/80 text-sm">Agende e gerencie entrevistas e follow-ups</p>
            </div>
          </div>
          <Button className="bg-white text-violet-700 hover:bg-white/90 font-medium">
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Hoje", value: "3", icon: Clock, color: "text-violet-600" },
          { label: "Esta Semana", value: "12", icon: CalendarDays, color: "text-purple-600" },
          { label: "Pendentes", value: "5", icon: Plus, color: "text-fuchsia-600" },
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

      {/* Upcoming Events */}
      <div className="rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Próximos Eventos</h2>
        </div>
        <div className="divide-y divide-border">
          {upcomingEvents.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{event.title}</p>
                {event.candidate && (
                  <p className="text-xs text-muted-foreground">{event.candidate}</p>
                )}
              </div>
              <Badge variant="secondary" className={eventTypeColors[event.type] || ""}>
                {event.type}
              </Badge>
              <span className="text-xs text-muted-foreground shrink-0">{event.time}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
