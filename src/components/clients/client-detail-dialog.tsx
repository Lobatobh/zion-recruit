"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Users,
  Send,
  Mail,
  MessageSquare,
  Globe,
  MapPin,
  Eye,
  Edit3,
  Trash2,
  CalendarClock,
  Briefcase,
  UserPlus,
  Bell,
  Zap,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  EVENT_LABELS,
  FREQUENCY_LABELS,
  AI_TONE_LABELS,
  getInitials,
  type ClientDetail,
  type ClientContact,
  type JobItem,
} from "./client-types";
import { TimelineView } from "./client-timeline";
import { AddContactDialog, SendUpdateDialog } from "./client-dialogs";

// ============================================
// SUB-COMPONENT: ClientDetailDialog
// ============================================

export function ClientDetailDialog({
  clientId,
  open,
  onOpenChange,
}: {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [sendUpdateOpen, setSendUpdateOpen] = useState(false);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const fetchClient = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error("Erro ao carregar empresa");
      const data = await res.json();
      setClient(data.data || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const fetchJobs = useCallback(async () => {
    if (!clientId) return;
    setJobsLoading(true);
    try {
      const res = await fetch(`/api/vacancies?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.data || data.jobs || data || []);
      }
    } catch {
      // Silently fail
    } finally {
      setJobsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (open && clientId) {
      fetchClient();
      fetchJobs();
    }
  }, [open, clientId, fetchClient, fetchJobs]);

  const handleAddContact = async (data: Omit<ClientContact, "id"> & { id?: string }) => {
    if (!clientId) return;
    const method = data.id ? "PUT" : "POST";
    const url = data.id
      ? `/api/clients/${clientId}/contacts/${data.id}`
      : `/api/clients/${clientId}/contacts`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Erro ao salvar contato");
    toast.success(data.id ? "Contato atualizado!" : "Contato adicionado!");
    fetchClient();
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!clientId) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts/${contactId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao remover contato");
      toast.success("Contato removido!");
      fetchClient();
    } catch {
      toast.error("Erro ao remover contato");
    }
  };

  const stats = client?.stats || {
    totalJobs: 0,
    activeJobs: 0,
    totalCandidates: 0,
    contactsCount: 0,
    notificationsSent: 0,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="grid grid-cols-4 gap-3 pt-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-48 rounded-lg mt-4" />
            </div>
          ) : error || !client ? (
            <div className="p-6 flex flex-col items-center justify-center py-16">
              <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">{error || "Empresa não encontrada"}</p>
              <Button variant="outline" size="sm" onClick={fetchClient}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Tentar Novamente
              </Button>
            </div>
          ) : (
            <>
              {/* Gradient Header */}
              <div className="relative bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 px-6 py-5 text-white flex-shrink-0">
                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -top-4 -left-4 w-20 h-20 bg-white/5 rounded-full" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-white font-bold text-lg shadow-sm flex-shrink-0">
                    {getInitials(client.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold truncate">{client.name}</h2>
                    {client.industry && (
                      <p className="text-white/80 text-sm">{client.industry}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => setSendUpdateOpen(true)}
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Enviar
                  </Button>
                </div>

                {/* Mini stats */}
                <div className="relative grid grid-cols-4 gap-3 mt-4">
                  {[
                    { label: "Vagas", value: stats.activeJobs, icon: Briefcase },
                    { label: "Contatos", value: stats.contactsCount, icon: Users },
                    { label: "Candidatos", value: stats.totalCandidates, icon: Users },
                    { label: "Notificações", value: stats.notificationsSent, icon: Send },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-center"
                    >
                      <s.icon className="h-3.5 w-3.5 mx-auto mb-1 text-white/70" />
                      <p className="text-lg font-bold">{s.value}</p>
                      <p className="text-[10px] text-white/60">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden mt-1">
                <TabsList className="mx-6 mt-4 w-fit">
                  <TabsTrigger value="overview" className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    Visão Geral
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Timeline
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex-1 overflow-auto mt-4 px-6 pb-6">
                  <div className="grid gap-5">
                    {/* Company Info */}
                    <Card className="border-dashed">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-teal-600" />
                          Informações da Empresa
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-2 text-sm">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          {client.website && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{client.website}</span>
                            </div>
                          )}
                          {client.address && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{client.address}</span>
                            </div>
                          )}
                        </div>
                        {client.notes && (
                          <div className="mt-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                            {client.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Contacts */}
                    <Card className="border-dashed">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Users className="h-4 w-4 text-emerald-600" />
                            Contatos ({(client.contacts || []).length})
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setEditingContact(null);
                              setContactDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {(client.contacts || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">
                            Nenhum contato cadastrado.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {(client.contacts || []).map((contact) => (
                              <div
                                key={contact.id}
                                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold flex-shrink-0">
                                  {getInitials(contact.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium truncate">{contact.name}</p>
                                    {contact.isPrimary && (
                                      <Badge className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700">
                                        Principal
                                      </Badge>
                                    )}
                                    {contact.role && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                                        {contact.role}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                    {contact.email && <span className="truncate">{contact.email}</span>}
                                    {contact.phone && <span className="flex-shrink-0">{contact.phone}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setEditingContact(contact);
                                      setContactDialogOpen(true);
                                    }}
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDeleteContact(contact.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Active Jobs */}
                    <Card className="border-dashed">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-teal-600" />
                          Vagas Ativas ({jobs.filter((j) => j.status === "active" || j.status === "published").length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {jobsLoading ? (
                          <div className="space-y-2">
                            {[...Array(2)].map((_, i) => (
                              <Skeleton key={i} className="h-12 rounded-lg" />
                            ))}
                          </div>
                        ) : jobs.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">
                            Nenhuma vaga encontrada.
                          </p>
                        ) : (
                          <ScrollArea className="max-h-48">
                            <div className="space-y-2">
                              {jobs.map((job) => (
                                <div
                                  key={job.id}
                                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 flex-shrink-0">
                                    <Briefcase className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{job.title}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      {job.department && <span>{job.department}</span>}
                                      {job.location && (
                                        <>
                                          <span>·</span>
                                          <span>{job.location}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-[10px] flex-shrink-0",
                                      job.status === "active" || job.status === "published"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : job.status === "paused"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-gray-100 text-gray-700"
                                    )}
                                  >
                                    {job.status === "active" || job.status === "published"
                                      ? "Ativa"
                                      : job.status === "paused"
                                        ? "Pausada"
                                        : "Encerrada"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </CardContent>
                    </Card>

                    {/* Notification Preferences */}
                    <Card className="border-dashed">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Bell className="h-4 w-4 text-violet-600" />
                          Preferências de Notificação
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                              <Mail className={cn("h-4 w-4", client.notificationSettings?.emailEnabled ? "text-emerald-500" : "text-muted-foreground")} />
                              <div>
                                <p className="text-xs font-medium">Email</p>
                                <p className={cn("text-[10px]", client.notificationSettings?.emailEnabled ? "text-emerald-600" : "text-muted-foreground")}>
                                  {client.notificationSettings?.emailEnabled ? "Ativo" : "Inativo"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                              <MessageSquare className={cn("h-4 w-4", client.notificationSettings?.whatsappEnabled ? "text-emerald-500" : "text-muted-foreground")} />
                              <div>
                                <p className="text-xs font-medium">WhatsApp</p>
                                <p className={cn("text-[10px]", client.notificationSettings?.whatsappEnabled ? "text-emerald-600" : "text-muted-foreground")}>
                                  {client.notificationSettings?.whatsappEnabled ? "Ativo" : "Inativo"}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {FREQUENCY_LABELS[client.notificationSettings?.frequency || "immediate"]}
                            </span>
                            <span>·</span>
                            <span>Tom: {AI_TONE_LABELS[client.notificationSettings?.aiTone || "professional"]}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(client.notificationSettings?.eventTypes || []).map((type) => (
                              <Badge key={type} variant="outline" className="text-[10px] px-1.5 py-0">
                                {EVENT_LABELS[type] || type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="flex-1 overflow-auto mt-2 pb-6">
                  <TimelineView
                    clientId={clientId!}
                    onLoadMore={() => {}}
                    hasMore={false}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Sub dialogs */}
      <AddContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        onSave={handleAddContact}
        editingContact={editingContact}
      />
      <SendUpdateDialog
        open={sendUpdateOpen}
        onOpenChange={setSendUpdateOpen}
        clientId={clientId!}
        clientName={client?.name || ""}
        contacts={client?.contacts || []}
      />
    </>
  );
}
