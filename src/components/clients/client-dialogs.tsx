"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Users,
  Send,
  Mail,
  MessageSquare,
  Plus,
  UserPlus,
  Loader2,
  Filter,
  Bell,
  Sparkles,
  Search,
  MapPin,
  Globe,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EVENT_LABELS,
  FREQUENCY_LABELS,
  AI_TONE_LABELS,
  ALL_EVENT_TYPES,
  type ClientContact,
  type ClientListItem,
} from "./client-types";

// ============================================
// HELPERS
// ============================================

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatCurrencyBrl(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return value.toString();
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPhoneBrasil(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

// ============================================
// INITIAL FORM STATE
// ============================================

function getInitialForm() {
  return {
    // Company
    cnpj: "",
    name: "",
    tradeName: "",
    legalNature: "",
    companySize: "",
    shareCapital: "",
    registration: "",
    companyEmail: "",
    companyPhone: "",
    mainActivity: "",
    status: "",
    foundingDate: "",
    // Address
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    // Extra
    industry: "",
    website: "",
    notes: "",
    // Contact
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    // Notifications
    emailEnabled: true,
    whatsappEnabled: false,
    frequency: "immediate" as "immediate" | "daily" | "weekly",
    aiTone: "professional" as "professional" | "casual" | "formal",
    eventTypes: [...ALL_EVENT_TYPES],
  };
}

// ============================================
// SUB-COMPONENT: AddContactDialog
// ============================================

export function AddContactDialog({
  open,
  onOpenChange,
  onSave,
  editingContact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<ClientContact, "id"> & { id?: string }) => Promise<void>;
  editingContact?: ClientContact | null;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    isPrimary: false,
  });

  useEffect(() => {
    if (editingContact) {
      setForm({
        name: editingContact.name || "",
        email: editingContact.email || "",
        phone: editingContact.phone || "",
        role: editingContact.role || "",
        isPrimary: editingContact.isPrimary || false,
      });
    } else {
      setForm({ name: "", email: "", phone: "", role: "", isPrimary: false });
    }
  }, [editingContact, open]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Preencha nome e email do contato");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...(editingContact ? { id: editingContact.id } : {}),
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role || undefined,
        isPrimary: form.isPrimary,
      });
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar contato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingContact ? "Editar Contato" : "Novo Contato"}</DialogTitle>
          <DialogDescription>
            {editingContact
              ? "Atualize as informações do contato."
              : "Adicione um novo contato para esta empresa."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="contact-name">Nome *</Label>
            <Input
              id="contact-name"
              placeholder="Nome completo"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact-email">Email *</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="email@empresa.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="contact-phone">Telefone</Label>
              <Input
                id="contact-phone"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-role">Cargo</Label>
              <Input
                id="contact-role"
                placeholder="Ex: Gerente RH"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 py-1">
            <Switch
              checked={form.isPrimary}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isPrimary: checked }))}
            />
            <Label className="cursor-pointer">Contato principal</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.email.trim()}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-1.5" />
            )}
            {editingContact ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// SUB-COMPONENT: CreateClientDialog
// ============================================

export function CreateClientDialog({
  open,
  onOpenChange,
  editingClient,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClient?: ClientListItem | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("company");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [form, setForm] = useState(getInitialForm);

  useEffect(() => {
    if (open) {
      setActiveTab("company");
      if (editingClient) {
        setForm((f) => ({
          ...f,
          name: editingClient.name || "",
          industry: editingClient.industry || "",
          website: editingClient.website || "",
          contactName: editingClient.contactName || "",
          contactEmail: editingClient.contactEmail || "",
          contactPhone: editingClient.contactPhone || "",
        }));
      } else {
        setForm(getInitialForm());
      }
    }
  }, [editingClient, open]);

  const updateField = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    },
    []
  );

  const toggleEventType = (type: string) => {
    setForm((f) => ({
      ...f,
      eventTypes: f.eventTypes.includes(type)
        ? f.eventTypes.filter((t) => t !== type)
        : [...f.eventTypes, type],
    }));
  };

  // ---- CNPJ Lookup ----
  const lookupCnpj = async () => {
    const digits = form.cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      toast.error("CNPJ inválido. Informe 14 dígitos.");
      return;
    }

    setCnpjLoading(true);
    try {
      const res = await fetch(`/api/brasilapi/cnpj/v1/${digits}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "CNPJ não encontrado na Receita Federal.");
        return;
      }

      const data = await res.json();

      // Map BrasilAPI response to form fields
      setForm((f) => ({
        ...f,
        cnpj: formatCnpj(data.cnpj || digits),
        name: data.razao_social || "",
        tradeName: data.nome_fantasia || "",
        legalNature: data.natureza_juridica || "",
        companySize: data.descricao_porte || "",
        shareCapital: data.capital_social
          ? formatCurrencyBrl(data.capital_social)
          : "",
        mainActivity: data.cnae_fiscal_descricao || "",
        status: data.descricao_situacao || "",
        foundingDate: data.data_inicio_atividade || "",
        state: data.uf || f.state,
        cep: data.cep ? formatCep(data.cep) : f.cep,
        companyEmail: data.email || f.companyEmail,
        companyPhone: data.telefone
          ? formatPhoneBrasil(data.telefone)
          : f.companyPhone,
      }));

      toast.success("Dados do CNPJ carregados!");

      // Auto-lookup CEP if we got one from CNPJ
      const rawCep = (data.cep || "").replace(/\D/g, "");
      if (rawCep.length === 8) {
        lookupCepSilent(rawCep);
      }
    } catch {
      toast.error("Erro ao consultar CNPJ. Tente novamente.");
    } finally {
      setCnpjLoading(false);
    }
  };

  // ---- CEP Lookup (silent, no loading on tab) ----
  const lookupCepSilent = async (cepDigits: string) => {
    if (cepDigits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`/api/brasilapi/cep/v2/${cepDigits}`);
      if (!res.ok) return;

      const data = await res.json();
      if (data.erro) return;

      setForm((f) => ({
        ...f,
        cep: formatCep(data.cep || cepDigits),
        street: data.street || "",
        neighborhood: data.neighborhood || "",
        city: data.city || "",
        state: data.state || f.state,
      }));
    } catch {
      // Silently fail — user can fill address manually
    } finally {
      setCepLoading(false);
    }
  };

  // ---- CEP Lookup (user-triggered) ----
  const lookupCep = async () => {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      toast.error("CEP inválido. Informe 8 dígitos.");
      return;
    }
    setCepLoading(true);
    try {
      const res = await fetch(`/api/brasilapi/cep/v2/${digits}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "CEP não encontrado.");
        return;
      }

      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setForm((f) => ({
        ...f,
        cep: formatCep(data.cep || digits),
        street: data.street || "",
        neighborhood: data.neighborhood || "",
        city: data.city || "",
        state: data.state || f.state,
      }));

      toast.success("Endereço encontrado!");
    } catch {
      toast.error("Erro ao consultar CEP. Tente novamente.");
    } finally {
      setCepLoading(false);
    }
  };

  // Frequency map: frontend lowercase -> API enum values
  const FREQUENCY_MAP: Record<string, string> = {
    immediate: "IMMEDIATE",
    daily: "DAILY_DIGEST",
    weekly: "WEEKLY_DIGEST",
  };

  // ---- Save ----
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const address = [form.street, form.number, form.complement, form.neighborhood, form.city, form.state]
        .filter(Boolean)
        .join(", ");

      const payload = {
        cnpj: form.cnpj.replace(/\D/g, "") || undefined,
        name: form.name,
        tradeName: form.tradeName || undefined,
        legalNature: form.legalNature || undefined,
        companySize: form.companySize || undefined,
        shareCapital: form.shareCapital || undefined,
        registration: form.registration || undefined,
        companyEmail: form.companyEmail || undefined,
        companyPhone: form.companyPhone || undefined,
        mainActivity: form.mainActivity || undefined,
        status: form.status || undefined,
        foundingDate: form.foundingDate || undefined,
        cep: form.cep.replace(/\D/g, "") || undefined,
        street: form.street || undefined,
        number: form.number || undefined,
        complement: form.complement || undefined,
        neighborhood: form.neighborhood || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        address: address || undefined,
        industry: form.industry || undefined,
        website: form.website || undefined,
        notes: form.notes || undefined,
        contactName: form.contactName || undefined,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        notifyEmail: form.emailEnabled,
        notifyWhatsapp: form.whatsappEnabled,
        notifyFrequency: FREQUENCY_MAP[form.frequency] || "IMMEDIATE",
        notifyEvents: form.eventTypes,
        aiTone: form.aiTone,
      };

      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
      const method = editingClient ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar empresa");

      toast.success(
        editingClient ? "Empresa atualizada com sucesso!" : "Empresa criada com sucesso!"
      );
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error(editingClient ? "Erro ao atualizar empresa" : "Erro ao criar empresa");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl flex flex-col p-0 gap-0 overflow-hidden max-h-[85vh] sm:max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {editingClient ? (
              <Building2 className="h-5 w-5 text-teal-600" />
            ) : (
              <Plus className="h-5 w-5 text-teal-600" />
            )}
            {editingClient ? "Editar Empresa" : "Nova Empresa"}
          </DialogTitle>
          <DialogDescription>
            {editingClient
              ? "Atualize os dados cadastrais e configurações da empresa."
              : "Cadastre uma nova empresa preenchendo os dados abaixo."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          {/* Tab Navigation */}
          <TabsList className="w-full grid grid-cols-4 mx-6 shrink-0">
            <TabsTrigger value="company" className="text-xs sm:text-sm gap-1.5">
              <Building2 className="h-3.5 w-3.5 hidden sm:block" />
              Dados Cadastrais
            </TabsTrigger>
            <TabsTrigger value="address" className="text-xs sm:text-sm gap-1.5">
              <MapPin className="h-3.5 w-3.5 hidden sm:block" />
              Endereço
            </TabsTrigger>
            <TabsTrigger value="contact" className="text-xs sm:text-sm gap-1.5">
              <Users className="h-3.5 w-3.5 hidden sm:block" />
              Contato
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm gap-1.5">
              <Bell className="h-3.5 w-3.5 hidden sm:block" />
              Notificações
            </TabsTrigger>
          </TabsList>

          {/* Scrollable content area */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-4">
            {/* ====== TAB 1: Dados Cadastrais ====== */}
            <TabsContent value="company" className="mt-0">
              <div className="grid gap-5 pb-6">
                {/* CNPJ Lookup */}
                <div className="rounded-xl border border-dashed border-teal-300 bg-gradient-to-br from-teal-50/80 to-emerald-50/80 p-4">
                  <p className="text-xs font-medium text-teal-700 mb-3 flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5" />
                    Busca automática via CNPJ — Preenche todos os campos abaixo
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="cnpj" className="text-xs mb-1.5">
                        CNPJ
                      </Label>
                      <Input
                        id="cnpj"
                        placeholder="00.000.000/0001-91"
                        value={form.cnpj}
                        onChange={(e) =>
                          updateField("cnpj", formatCnpj(e.target.value))
                        }
                        className="font-mono tracking-wide"
                      />
                    </div>
                    <div className="pt-5">
                      <Button
                        type="button"
                        size="sm"
                        onClick={lookupCnpj}
                        disabled={cnpjLoading || !form.cnpj}
                        className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white whitespace-nowrap h-9"
                      >
                        {cnpjLoading ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 mr-1.5" />
                        )}
                        Buscar CNPJ
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Company Data Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="client-name">
                      Razão Social <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="client-name"
                      placeholder="Nome oficial da empresa"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="trade-name">Nome Fantasia</Label>
                    <Input
                      id="trade-name"
                      placeholder="Nome comercial"
                      value={form.tradeName}
                      onChange={(e) => updateField("tradeName", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="legal-nature">Natureza Jurídica</Label>
                    <Input
                      id="legal-nature"
                      placeholder="Ex: Sociedade Limitada"
                      value={form.legalNature}
                      onChange={(e) => updateField("legalNature", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="company-size">Porte da Empresa</Label>
                    <Input
                      id="company-size"
                      placeholder="Ex: MICRO EMPRESA"
                      value={form.companySize}
                      onChange={(e) => updateField("companySize", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="share-capital">Capital Social</Label>
                    <Input
                      id="share-capital"
                      placeholder="Ex: R$ 100.000,00"
                      value={form.shareCapital}
                      onChange={(e) => updateField("shareCapital", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="registration">Inscrição Estadual</Label>
                    <Input
                      id="registration"
                      placeholder="Informe manualmente"
                      value={form.registration}
                      onChange={(e) => updateField("registration", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="main-activity">Atividade Principal (CNAE)</Label>
                    <Input
                      id="main-activity"
                      placeholder="Ex: Consultoria em TI"
                      value={form.mainActivity}
                      onChange={(e) => updateField("mainActivity", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="company-status">Situação Cadastral</Label>
                    <Input
                      id="company-status"
                      placeholder="Ex: ATIVA"
                      value={form.status}
                      onChange={(e) => updateField("status", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="founding-date">Data de Abertura</Label>
                    <Input
                      id="founding-date"
                      placeholder="Ex: 2020-01-15"
                      value={form.foundingDate}
                      onChange={(e) => updateField("foundingDate", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="client-industry">Segmento</Label>
                    <Input
                      id="client-industry"
                      placeholder="Ex: Tecnologia, Saúde, Financeiro"
                      value={form.industry}
                      onChange={(e) => updateField("industry", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="client-website">Website</Label>
                    <Input
                      id="client-website"
                      placeholder="www.empresa.com"
                      value={form.website}
                      onChange={(e) => updateField("website", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="company-email">Email da Empresa</Label>
                    <Input
                      id="company-email"
                      type="email"
                      placeholder="contato@empresa.com"
                      value={form.companyEmail}
                      onChange={(e) => updateField("companyEmail", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="company-phone">Telefone da Empresa</Label>
                    <Input
                      id="company-phone"
                      placeholder="(11) 3000-0000"
                      value={form.companyPhone}
                      onChange={(e) => updateField("companyPhone", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="client-notes">Observações</Label>
                    <Textarea
                      id="client-notes"
                      placeholder="Observações gerais sobre a empresa, preferências, histórico..."
                      value={form.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ====== TAB 2: Endereço ====== */}
            <TabsContent value="address" className="mt-0">
              <div className="grid gap-5 pb-6">
                {/* CEP Lookup */}
                <div className="rounded-xl border border-dashed border-sky-300 bg-gradient-to-br from-sky-50/80 to-cyan-50/80 p-4">
                  <p className="text-xs font-medium text-sky-700 mb-3 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Busca automática via CEP — Preenche rua, bairro, cidade e estado
                  </p>
                  <div className="flex gap-2">
                    <div className="w-48">
                      <Label htmlFor="cep" className="text-xs mb-1.5">
                        CEP
                      </Label>
                      <Input
                        id="cep"
                        placeholder="00000-000"
                        value={form.cep}
                        onChange={(e) =>
                          updateField("cep", formatCep(e.target.value))
                        }
                        className="font-mono tracking-wide"
                      />
                    </div>
                    <div className="pt-5">
                      <Button
                        type="button"
                        size="sm"
                        onClick={lookupCep}
                        disabled={cepLoading || !form.cep}
                        className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white whitespace-nowrap h-9"
                      >
                        {cepLoading ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 mr-1.5" />
                        )}
                        Buscar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Address Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="street">Rua / Avenida</Label>
                    <Input
                      id="street"
                      placeholder="Ex: Av. Paulista"
                      value={form.street}
                      onChange={(e) => updateField("street", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      placeholder="Ex: 1000"
                      value={form.number}
                      onChange={(e) => updateField("number", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      placeholder="Ex: Sala 501, Bloco A"
                      value={form.complement}
                      onChange={(e) => updateField("complement", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      placeholder="Ex: Bela Vista"
                      value={form.neighborhood}
                      onChange={(e) => updateField("neighborhood", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      placeholder="Ex: São Paulo"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      placeholder="Ex: SP"
                      value={form.state}
                      onChange={(e) => updateField("state", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ====== TAB 3: Contato ====== */}
            <TabsContent value="contact" className="mt-0">
              <div className="grid gap-5 pb-6">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Informações de contato do responsável na empresa
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="contact-name">
                        Nome do Contato
                      </Label>
                      <Input
                        id="contact-name"
                        placeholder="Nome completo do responsável"
                        value={form.contactName}
                        onChange={(e) => updateField("contactName", e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="contact-email">Email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="email@empresa.com"
                        value={form.contactEmail}
                        onChange={(e) => updateField("contactEmail", e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="contact-phone">Telefone</Label>
                      <Input
                        id="contact-phone"
                        placeholder="(11) 99999-9999"
                        value={form.contactPhone}
                        onChange={(e) => updateField("contactPhone", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ====== TAB 4: Notificações ====== */}
            <TabsContent value="notifications" className="mt-0">
              <div className="grid gap-5 pb-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-violet-600" />
                    Configurações de Notificação
                  </h4>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-xs text-muted-foreground">
                            Enviar notificações por email
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={form.emailEnabled}
                        onCheckedChange={(checked) =>
                          updateField("emailEnabled", checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">WhatsApp</p>
                          <p className="text-xs text-muted-foreground">
                            Enviar notificações por WhatsApp
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={form.whatsappEnabled}
                        onCheckedChange={(checked) =>
                          updateField("whatsappEnabled", checked)
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Frequência</Label>
                        <Select
                          value={form.frequency}
                          onValueChange={(v) =>
                            updateField("frequency", v as typeof form.frequency)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Tom da IA</Label>
                        <Select
                          value={form.aiTone}
                          onValueChange={(v) =>
                            updateField("aiTone", v as typeof form.aiTone)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(AI_TONE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Tipos de Evento</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ALL_EVENT_TYPES.map((type) => (
                          <div key={type} className="flex items-center gap-2">
                            <Checkbox
                              id={`event-${type}`}
                              checked={form.eventTypes.includes(type)}
                              onCheckedChange={() => toggleEventType(type)}
                              className="h-3.5 w-3.5"
                            />
                            <label
                              htmlFor={`event-${type}`}
                              className="text-xs text-muted-foreground cursor-pointer leading-tight"
                            >
                              {EVENT_LABELS[type]}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer with navigation + save */}
        <DialogFooter className="px-6 py-3 border-t flex flex-col sm:flex-row gap-2 shrink-0 bg-background">
          <div className="flex-1 flex items-center gap-1">
            {activeTab !== "company" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const tabs = ["company", "address", "contact", "notifications"];
                  const idx = tabs.indexOf(activeTab);
                  if (idx > 0) setActiveTab(tabs[idx - 1]);
                }}
              >
                ← Anterior
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            {activeTab !== "notifications" ? (
              <Button
                type="button"
                onClick={() => {
                  const tabs = ["company", "address", "contact", "notifications"];
                  const idx = tabs.indexOf(activeTab);
                  if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
                }}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                Próximo →
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1.5" />
                )}
                {editingClient ? "Salvar Alterações" : "Criar Empresa"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// SUB-COMPONENT: SendUpdateDialog
// ============================================

export function SendUpdateDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  contacts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  contacts: ClientContact[];
}) {
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "both">("both");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage("");
      setChannel("both");
      setSelectedContacts(contacts.map((c) => c.id));
    }
  }, [open, contacts]);

  const handleGenerateAI = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/clients/generate-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          channel,
          tone: "professional",
        }),
      });

      if (!res.ok) throw new Error("Erro ao gerar mensagem");

      const data = await res.json();
      if (data.message) {
        setMessage(data.message);
        toast.success("Mensagem gerada pela IA!");
      }
    } catch {
      // Fallback message
      setMessage(
        `Olá! Gostaríamos de compartilhar uma atualização sobre o processo seletivo em andamento para a ${clientName}.`
      );
      toast.info("Mensagem padrão gerada");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (selectedContacts.length === 0) {
      toast.error("Selecione pelo menos um contato");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message || undefined,
          channel,
          contactIds: selectedContacts,
        }),
      });

      if (!res.ok) throw new Error("Erro ao enviar notificação");

      toast.success("Atualização enviada com sucesso!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao enviar atualização");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-teal-600" />
            Enviar Atualização Manual
          </DialogTitle>
          <DialogDescription>
            Envie uma atualização para os contatos da {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Channel selection */}
          <div className="grid gap-2">
            <Label>Canal de Envio</Label>
            <div className="flex gap-2">
              {(
                [
                  { value: "email", label: "Email", icon: Mail },
                  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
                  { value: "both", label: "Ambos", icon: Send },
                ] as const
              ).map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={channel === opt.value ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-1",
                    channel === opt.value &&
                      "bg-gradient-to-r from-teal-600 to-emerald-600 text-white"
                  )}
                  onClick={() => setChannel(opt.value)}
                >
                  <opt.icon className="h-3.5 w-3.5 mr-1.5" />
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Contact selection */}
          {contacts.length > 0 && (
            <div className="grid gap-2">
              <Label>Destinatários</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto rounded-lg border p-2">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`send-contact-${contact.id}`}
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={(checked) => {
                        setSelectedContacts((prev) =>
                          checked
                            ? [...prev, contact.id]
                            : prev.filter((id) => id !== contact.id)
                        );
                      }}
                    />
                    <label
                      htmlFor={`send-contact-${contact.id}`}
                      className="text-xs cursor-pointer flex-1 truncate"
                    >
                      {contact.name}
                      <span className="text-muted-foreground ml-1">
                        ({contact.email})
                      </span>
                    </label>
                    {contact.isPrimary && (
                      <Badge className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700">
                        Principal
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Mensagem (opcional)</Label>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-violet-600 hover:text-violet-700 h-7"
                onClick={handleGenerateAI}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Gerar com IA
              </Button>
            </div>
            <Textarea
              placeholder="Digite uma mensagem personalizada ou use a IA para gerar..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          {/* Preview */}
          {message && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Pré-visualização
              </p>
              <p className="text-xs text-foreground line-clamp-3">{message}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || selectedContacts.length === 0}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            Enviar ({selectedContacts.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
