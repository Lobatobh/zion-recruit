"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Send,
  Mail,
  MessageSquare,
  CalendarClock,
  Sparkles,
  Briefcase,
  CircleDot,
  Star,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  containerVariants,
  itemVariants,
  EVENT_LABELS,
  getEventColor,
  getEventTextColor,
  formatRelativeTime,
  type ClientEvent,
} from "./client-types";
import { EmptyState } from "./client-card";

// ============================================
// SUB-COMPONENT: EventItem
// ============================================

function EventItem({ event, index }: { event: ClientEvent; index: number }) {
  const color = getEventColor(event.eventType);
  const textColor = getEventTextColor(event.eventType);
  const label = EVENT_LABELS[event.eventType] || event.eventType;

  return (
    <motion.div
      variants={itemVariants}
      className="relative flex gap-4 pb-6 last:pb-0"
    >
      {/* Timeline line */}
      <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border last:hidden" />

      {/* Dot */}
      <div className="relative z-10 flex-shrink-0">
        <div className={cn("h-[30px] w-[30px] rounded-full flex items-center justify-center", color, "shadow-sm")}>
          {event.eventType.startsWith("CANDIDATE_") && <Users className="h-3.5 w-3.5 text-white" />}
          {event.eventType.startsWith("INTERVIEW_") && <CalendarClock className="h-3.5 w-3.5 text-white" />}
          {event.eventType.startsWith("DISC_") && <Sparkles className="h-3.5 w-3.5 text-white" />}
          {event.eventType.startsWith("JOB_") && <Briefcase className="h-3.5 w-3.5 text-white" />}
          {event.eventType === "WEEKLY_SUMMARY" && <Star className="h-3.5 w-3.5 text-white" />}
          {event.eventType === "MANUAL_UPDATE" && <Send className="h-3.5 w-3.5 text-white" />}
          {!event.eventType.startsWith("CANDIDATE_") && !event.eventType.startsWith("INTERVIEW_") && !event.eventType.startsWith("DISC_") && !event.eventType.startsWith("JOB_") && event.eventType !== "WEEKLY_SUMMARY" && event.eventType !== "MANUAL_UPDATE" && <CircleDot className="h-3.5 w-3.5 text-white" />}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <span className={cn("text-xs font-semibold uppercase tracking-wide", textColor)}>
              {label}
            </span>
            {event.title && (
              <h4 className="text-sm font-medium text-foreground mt-0.5">{event.title}</h4>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatRelativeTime(event.createdAt)}
          </span>
        </div>

        {event.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
        )}

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {event.candidateName && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
              <Users className="h-2.5 w-2.5" />
              {event.candidateName}
            </Badge>
          )}
          {event.jobName && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
              <Briefcase className="h-2.5 w-2.5" />
              {event.jobName}
            </Badge>
          )}
        </div>

        {/* Notification status */}
        {event.notifications && event.notifications.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            {event.notifications.map((notif) => (
              <Badge
                key={notif.id}
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  notif.status === "sent"
                    ? "bg-emerald-100 text-emerald-700"
                    : notif.status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                )}
              >
                {notif.channel === "email" ? (
                  <Mail className="h-2.5 w-2.5 mr-0.5" />
                ) : (
                  <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
                )}
                {notif.status === "sent" ? "Enviado" : notif.status === "failed" ? "Falhou" : "Pendente"}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// SUB-COMPONENT: TimelineView
// ============================================

export function TimelineView({
  clientId,
  onLoadMore,
  hasMore,
}: {
  clientId: string;
  onLoadMore: () => void;
  hasMore: boolean;
}) {
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(
    async (pageNum: number, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const res = await fetch(
          `/api/clients/${clientId}/events?page=${pageNum}&limit=20`
        );
        if (!res.ok) throw new Error("Erro ao carregar eventos");

        const data = await res.json();
        const newEvents: ClientEvent[] = data.events || data.data || data || [];

        setEvents((prev) => (append ? [...prev, ...newEvents] : newEvents));
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [clientId]
  );

  useEffect(() => {
    fetchEvents(1);
  }, [fetchEvents]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-[30px] w-[30px] rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
        <p className="text-sm text-muted-foreground mb-3">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchEvents(1)}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nenhum evento registrado"
        description="Os eventos desta empresa aparecerão aqui conforme o processo seletivo avançar."
      />
    );
  }

  return (
    <div>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4"
      >
        {events.map((event, idx) => (
          <EventItem key={event.id} event={event} index={idx} />
        ))}
      </motion.div>

      {hasMore && (
        <div className="flex justify-center mt-4 pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEvents(page + 1, true)}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
            )}
            Carregar Mais
          </Button>
        </div>
      )}
    </div>
  );
}
