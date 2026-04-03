"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Search,
  Plus,
  Briefcase,
  Users,
  Send,
  AlertTriangle,
  RefreshCw,
  List,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { containerVariants, type ClientListItem } from "./client-types";
import { StatsCard, EmptyState, ClientCard } from "./client-card";
import { TimelineView } from "./client-timeline";
import { CreateClientDialog, SendUpdateDialog } from "./client-dialogs";
import { ClientDetailDialog } from "./client-detail-dialog";

// ============================================
// MAIN COMPONENT: ClientManagementPage
// ============================================

export function ClientManagementPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientListItem | null>(null);
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [sendUpdateClient, setSendUpdateClient] = useState<ClientListItem | null>(null);
  const [sendUpdateOpen, setSendUpdateOpen] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Erro ao carregar empresas");
      const data = await res.json();
      setClients(data.data || data.clients || data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Computed stats
  const stats = useMemo(() => {
    const totalCompanies = clients.length;
    const activeJobs = clients.reduce((acc, c) => acc + (c.stats?.activeJobs || 0), 0);
    const totalCandidates = clients.reduce((acc, c) => acc + (c.stats?.totalCandidates || 0), 0);
    const notificationsSent = clients.reduce((acc, c) => acc + (c.stats?.notificationsSent || 0), 0);
    return { totalCompanies, activeJobs, totalCandidates, notificationsSent };
  }, [clients]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.industry || "").toLowerCase().includes(q) ||
        (c.contactEmail || "").toLowerCase().includes(q) ||
        (c.contactName || "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  const handleEditClient = (client: ClientListItem) => {
    setEditingClient(client);
    setCreateDialogOpen(true);
  };

  const handleSendUpdate = (client: ClientListItem) => {
    setSendUpdateClient(client);
    setSendUpdateOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Sticky Gradient Header */}
      <div className="sticky top-0 z-40">
        <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600">
          <div className="px-4 lg:px-8 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Empresas</h1>
                  <p className="text-sm text-white/80">Acompanhamento em tempo real</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <div className="flex bg-white/10 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                      viewMode === "list"
                        ? "bg-white text-teal-700 shadow-sm"
                        : "text-white/80 hover:text-white"
                    )}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Lista</span>
                  </button>
                  <button
                    onClick={() => setViewMode("timeline")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                      viewMode === "timeline"
                        ? "bg-white text-teal-700 shadow-sm"
                        : "text-white/80 hover:text-white"
                    )}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Timeline</span>
                  </button>
                </div>

                <Button
                  onClick={() => {
                    setEditingClient(null);
                    setCreateDialogOpen(true);
                  }}
                  className="bg-white text-teal-700 hover:bg-white/90 font-medium shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Nova Empresa</span>
                  <span className="sm:hidden">Nova</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white border-b shadow-sm px-4 lg:px-8 py-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresas por nome, segmento ou contato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-gray-50 border-gray-200 focus-visible:ring-teal-500/20"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatsCard
            title="Total de Empresas"
            value={stats.totalCompanies}
            icon={Building2}
            accentColor="teal"
            index={0}
          />
          <StatsCard
            title="Vagas Ativas"
            value={stats.activeJobs}
            icon={Briefcase}
            accentColor="emerald"
            subtitle={`${clients.length} empresas`}
            index={1}
          />
          <StatsCard
            title="Candidatos em Processo"
            value={stats.totalCandidates}
            icon={Users}
            accentColor="amber"
            index={2}
          />
          <StatsCard
            title="Notificações Enviadas"
            value={stats.notificationsSent}
            icon={Send}
            accentColor="violet"
            index={3}
          />
        </motion.div>

        {/* Client List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-white/80 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="h-14 rounded-lg" />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar empresas</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button
              variant="outline"
              onClick={fetchClients}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          </div>
        ) : viewMode === "list" ? (
          <AnimatePresence mode="wait">
            {filteredClients.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EmptyState
                  icon={Building2}
                  title={
                    search
                      ? "Nenhuma empresa encontrada"
                      : "Nenhuma empresa cadastrada"
                  }
                  description={
                    search
                      ? "Tente ajustar os termos da busca."
                      : "Comece adicionando sua primeira empresa cliente para acompanhar o processo seletivo."
                  }
                  action={
                    !search ? (
                      <Button
                        onClick={() => {
                          setEditingClient(null);
                          setCreateDialogOpen(true);
                        }}
                        className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Nova Empresa
                      </Button>
                    ) : undefined
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {filteredClients.map((client, idx) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    index={idx}
                    onView={() => setDetailClientId(client.id)}
                    onSendUpdate={() => handleSendUpdate(client)}
                    onEdit={() => handleEditClient(client)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          /* Timeline View */
          <AnimatePresence mode="wait">
            {filteredClients.length === 0 ? (
              <motion.div
                key="empty-timeline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <EmptyState
                  icon={CalendarClock}
                  title="Nenhum evento para exibir"
                  description="Os eventos das empresas aparecerão na timeline."
                />
              </motion.div>
            ) : (
              <motion.div
                key="timeline-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {filteredClients.map((client) => (
                  <TimelineView
                    key={client.id}
                    clientId={client.id}
                    onLoadMore={() => {}}
                    hasMore={false}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Dialogs */}
      <CreateClientDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditingClient(null);
        }}
        editingClient={editingClient}
        onSaved={fetchClients}
      />

      <ClientDetailDialog
        clientId={detailClientId}
        open={!!detailClientId}
        onOpenChange={(open) => {
          if (!open) setDetailClientId(null);
        }}
      />

      {sendUpdateClient && (
        <SendUpdateDialog
          open={sendUpdateOpen}
          onOpenChange={setSendUpdateOpen}
          clientId={sendUpdateClient.id}
          clientName={sendUpdateClient.name}
          contacts={
            sendUpdateClient.contacts
              ? sendUpdateClient.contacts.map((c) => ({
                  id: c.id,
                  name: c.name,
                  email: c.email,
                  phone: c.phone,
                  role: c.role,
                  isPrimary: c.isPrimary,
                }))
              : sendUpdateClient.contactEmail
                ? [
                    {
                      id: "default",
                      name: sendUpdateClient.contactName || sendUpdateClient.name,
                      email: sendUpdateClient.contactEmail,
                      phone: sendUpdateClient.contactPhone,
                      isPrimary: true,
                    },
                  ]
                : []
          }
        />
      )}
    </div>
  );
}
