"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  Users,
  Send,
  Mail,
  Phone,
  Clock,
  Eye,
  Edit3,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  itemVariants,
  formatRelativeTime,
  getInitials,
  type ClientListItem,
} from "./client-types";

// ============================================
// SUB-COMPONENT: StatsCard
// ============================================

export function StatsCard({
  title,
  value,
  icon: Icon,
  accentColor,
  subtitle,
  index,
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  accentColor: string;
  subtitle?: string;
  index: number;
}) {
  const colorMap: Record<string, { bg: string; iconBg: string; text: string; shadow: string }> = {
    teal: {
      bg: "bg-teal-500/10",
      iconBg: "bg-gradient-to-br from-teal-500 to-teal-600",
      text: "text-teal-600",
      shadow: "shadow-teal-500/20",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      text: "text-emerald-600",
      shadow: "shadow-emerald-500/20",
    },
    amber: {
      bg: "bg-amber-500/10",
      iconBg: "bg-gradient-to-br from-amber-500 to-amber-600",
      text: "text-amber-600",
      shadow: "shadow-amber-500/20",
    },
    violet: {
      bg: "bg-violet-500/10",
      iconBg: "bg-gradient-to-br from-violet-500 to-violet-600",
      text: "text-violet-600",
      shadow: "shadow-violet-500/20",
    },
  };

  const colors = colorMap[accentColor] || colorMap.teal;

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white/80 backdrop-blur-sm p-4",
        "hover:-translate-y-0.5 transition-all duration-200 hover:shadow-lg",
        colors.shadow
      )}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-gray-100/60 to-transparent" />
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shadow-sm", colors.iconBg)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          <p className={cn("text-2xl font-bold tabular-nums", colors.text)}>
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// SUB-COMPONENT: NotificationBadge
// ============================================

export function NotificationBadge({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[10px] px-1.5 py-0",
        enabled
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
      )}
    >
      {label} {enabled ? "✓" : "—"}
    </Badge>
  );
}

// ============================================
// SUB-COMPONENT: EmptyState
// ============================================

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 blur-xl bg-gradient-to-br from-teal-200 to-emerald-200 opacity-30 rounded-full" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100">
          <Icon className="h-10 w-10 text-teal-500" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">{description}</p>
      {action}
    </motion.div>
  );
}

// ============================================
// SUB-COMPONENT: ClientCard
// ============================================

export function ClientCard({
  client,
  index,
  onView,
  onSendUpdate,
  onEdit,
}: {
  client: ClientListItem;
  index: number;
  onView: () => void;
  onSendUpdate: () => void;
  onEdit: () => void;
}) {
  const stats = client.stats || {
    totalJobs: 0,
    activeJobs: 0,
    totalCandidates: 0,
    contactsCount: 0,
    notificationsSent: 0,
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.01, y: -2 }}
      className="relative overflow-hidden rounded-xl border bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-lg transition-shadow duration-300"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 opacity-60" />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold text-sm shadow-sm flex-shrink-0">
            {getInitials(client.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
              {client.industry && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                  {client.industry}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {client.cnpj && (
                <span className="font-mono">{client.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}</span>
              )}
              {client.city && (
                <span>{client.city}{client.state ? ` - ${client.state}` : ""}</span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSendUpdate}>
                <Send className="h-4 w-4 mr-2" />
                Enviar Atualização
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Edit3 className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-teal-50/80">
            <Briefcase className="h-3.5 w-3.5 text-teal-600 mx-auto mb-1" />
            <p className="text-sm font-semibold text-teal-700">{stats.activeJobs}</p>
            <p className="text-[10px] text-teal-600/70">Vagas Ativas</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-50/80">
            <Users className="h-3.5 w-3.5 text-emerald-600 mx-auto mb-1" />
            <p className="text-sm font-semibold text-emerald-700">{stats.contactsCount}</p>
            <p className="text-[10px] text-emerald-600/70">Contatos</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-50/80">
            <Users className="h-3.5 w-3.5 text-amber-600 mx-auto mb-1" />
            <p className="text-sm font-semibold text-amber-700">{stats.totalCandidates}</p>
            <p className="text-[10px] text-amber-600/70">Candidatos</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-violet-50/80">
            <Send className="h-3.5 w-3.5 text-violet-600 mx-auto mb-1" />
            <p className="text-sm font-semibold text-violet-700">{stats.notificationsSent}</p>
            <p className="text-[10px] text-violet-600/70">Notificações</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NotificationBadge
              enabled={client.notificationSettings?.emailEnabled ?? false}
              label="Email"
            />
            <NotificationBadge
              enabled={client.notificationSettings?.whatsappEnabled ?? false}
              label="WhatsApp"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {stats.lastEventAt ? (
              <>
                <Clock className="h-3 w-3" />
                {formatRelativeTime(stats.lastEventAt)}
              </>
            ) : (
              <span>Sem atividade recente</span>
            )}
          </div>
        </div>
      </div>

      {/* Click overlay */}
      <button
        onClick={onView}
        className="absolute inset-0 w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded-xl"
        aria-label={`Ver detalhes de ${client.name}`}
      />
    </motion.div>
  );
}
