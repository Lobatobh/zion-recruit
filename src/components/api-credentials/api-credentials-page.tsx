"use client";

/**
 * API Credentials Management Page - Zion Recruit
 * Manage API keys and credentials for various providers
 * Supports: AI APIs, Database (Supabase), Communication, Cloud Services
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  Plus,
  Search,
  MoreVertical,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Copy,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Shield,
  AlertCircle,
  Database,
  Mail,
  MessageSquare,
  Phone,
  Cloud,
  CreditCard,
  Building2,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Types
interface ApiCredential {
  id: string;
  provider: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  defaultModel: string | null;
  monthlyLimit: number | null;
  alertThreshold: number | null;
  currentUsage: number;
  lastUsedAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  createdAt: string;
  usageResetAt: string | null;
  // Extra fields
  projectUrl?: string | null;
  projectKey?: string | null;
  region?: string | null;
  accountId?: string | null;
  instanceName?: string | null;
  webhookUrl?: string | null;
}

interface UsageStats {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  byProvider: Record<string, { tokens: number; cost: number; requests: number }>;
}

interface Alert {
  id: string;
  credentialId: string;
  type: string;
  severity: string;
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
}

// Provider Categories
const providerCategories = {
  ai: {
    name: "Inteligência Artificial",
    providers: ["OPENAI", "GEMINI", "OPENROUTER", "ANTHROPIC"],
  },
  database: {
    name: "Banco de Dados & Storage",
    providers: ["SUPABASE"],
  },
  communication: {
    name: "Comunicação",
    providers: ["RESEND", "SENDGRID", "EVOLUTION", "TWILIO"],
  },
  integration: {
    name: "Integrações",
    providers: ["LINKEDIN", "STRIPE"],
  },
  cloud: {
    name: "Cloud Services",
    providers: ["AWS", "GOOGLE_CLOUD", "AZURE"],
  },
};

// Provider Configuration
const providerConfig: Record<string, {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  category: string;
  models: string[];
  docsUrl: string;
  fields: string[]; // Required/optional fields for this provider
  fieldLabels: Record<string, string>;
}> = {
  // AI Providers
  OPENAI: {
    name: "OpenAI",
    icon: <Zap className="h-5 w-5" />,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    category: "ai",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo", "o1-preview", "o1-mini"],
    docsUrl: "https://platform.openai.com/api-keys",
    fields: ["apiKey", "organizationId"],
    fieldLabels: {
      apiKey: "API Key",
      organizationId: "Organization ID (opcional)",
    },
  },
  GEMINI: {
    name: "Google Gemini",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    category: "ai",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"],
    docsUrl: "https://aistudio.google.com/app/apikey",
    fields: ["apiKey"],
    fieldLabels: {
      apiKey: "API Key",
    },
  },
  OPENROUTER: {
    name: "OpenRouter",
    icon: <RefreshCw className="h-5 w-5" />,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    category: "ai",
    models: [
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3-haiku",
      "meta-llama/llama-3.1-8b-instruct",
      "mistralai/mistral-7b-instruct",
      "google/gemini-pro",
    ],
    docsUrl: "https://openrouter.ai/keys",
    fields: ["apiKey"],
    fieldLabels: {
      apiKey: "API Key",
    },
  },
  ANTHROPIC: {
    name: "Anthropic",
    icon: <Shield className="h-5 w-5" />,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    category: "ai",
    models: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307", "claude-3-opus-20240229"],
    docsUrl: "https://console.anthropic.com/settings/keys",
    fields: ["apiKey"],
    fieldLabels: {
      apiKey: "API Key",
    },
  },

  // Database & Storage
  SUPABASE: {
    name: "Supabase",
    icon: <Database className="h-5 w-5" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/20",
    category: "database",
    models: [],
    docsUrl: "https://supabase.com/dashboard/project/_/settings/api",
    fields: ["projectUrl", "apiKey", "projectKey"],
    fieldLabels: {
      projectUrl: "Project URL",
      apiKey: "Service Role Key (secret)",
      projectKey: "Anon Public Key",
    },
  },

  // Communication
  RESEND: {
    name: "Resend",
    icon: <Mail className="h-5 w-5" />,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
    category: "communication",
    models: [],
    docsUrl: "https://resend.com/api-keys",
    fields: ["apiKey", "webhookUrl"],
    fieldLabels: {
      apiKey: "API Key",
      webhookUrl: "Webhook URL (opcional)",
    },
  },
  SENDGRID: {
    name: "SendGrid",
    icon: <Mail className="h-5 w-5" />,
    color: "text-teal-600",
    bgColor: "bg-teal-100 dark:bg-teal-900/20",
    category: "communication",
    models: [],
    docsUrl: "https://app.sendgrid.com/settings/api_keys",
    fields: ["apiKey", "webhookUrl"],
    fieldLabels: {
      apiKey: "API Key",
      webhookUrl: "Webhook URL (opcional)",
    },
  },
  EVOLUTION: {
    name: "Evolution API",
    icon: <MessageSquare className="h-5 w-5" />,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    category: "communication",
    models: [],
    docsUrl: "https://doc.evolution-api.com/",
    fields: ["endpoint", "apiKey", "instanceName", "webhookUrl"],
    fieldLabels: {
      endpoint: "Server URL",
      apiKey: "API Key",
      instanceName: "Nome da Instância",
      webhookUrl: "Webhook URL",
    },
  },
  TWILIO: {
    name: "Twilio",
    icon: <Phone className="h-5 w-5" />,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    category: "communication",
    models: [],
    docsUrl: "https://www.twilio.com/console",
    fields: ["accountId", "apiKey", "apiSecret"],
    fieldLabels: {
      accountId: "Account SID",
      apiKey: "Auth Token",
      apiSecret: "API Secret (opcional)",
    },
  },

  // Integrations
  LINKEDIN: {
    name: "LinkedIn",
    icon: <Building2 className="h-5 w-5" />,
    color: "text-blue-700",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    category: "integration",
    models: [],
    docsUrl: "https://www.linkedin.com/developers/apps",
    fields: ["apiKey", "apiSecret"],
    fieldLabels: {
      apiKey: "Client ID",
      apiSecret: "Client Secret",
    },
  },
  STRIPE: {
    name: "Stripe",
    icon: <CreditCard className="h-5 w-5" />,
    color: "text-violet-600",
    bgColor: "bg-violet-100 dark:bg-violet-900/20",
    category: "integration",
    models: [],
    docsUrl: "https://dashboard.stripe.com/apikeys",
    fields: ["apiKey", "apiSecret", "webhookUrl"],
    fieldLabels: {
      apiKey: "Publishable Key",
      apiSecret: "Secret Key",
      webhookUrl: "Webhook Secret",
    },
  },

  // Cloud Services
  AWS: {
    name: "Amazon Web Services",
    icon: <Cloud className="h-5 w-5" />,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/20",
    category: "cloud",
    models: [],
    docsUrl: "https://aws.amazon.com/console/",
    fields: ["apiKey", "apiSecret", "region"],
    fieldLabels: {
      apiKey: "Access Key ID",
      apiSecret: "Secret Access Key",
      region: "Region (ex: us-east-1)",
    },
  },
  GOOGLE_CLOUD: {
    name: "Google Cloud",
    icon: <Cloud className="h-5 w-5" />,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    category: "cloud",
    models: [],
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    fields: ["apiKey", "apiSecret", "projectUrl"],
    fieldLabels: {
      apiKey: "API Key",
      apiSecret: "Service Account JSON",
      projectUrl: "Project ID",
    },
  },
  AZURE: {
    name: "Microsoft Azure",
    icon: <Cloud className="h-5 w-5" />,
    color: "text-sky-600",
    bgColor: "bg-sky-100 dark:bg-sky-900/20",
    category: "cloud",
    models: [],
    docsUrl: "https://portal.azure.com/",
    fields: ["accountId", "apiKey", "apiSecret", "region"],
    fieldLabels: {
      accountId: "Subscription ID",
      apiKey: "Client ID",
      apiSecret: "Client Secret",
      region: "Region",
    },
  },
};

const severityColors: Record<string, string> = {
  INFO: "bg-blue-500",
  WARNING: "bg-yellow-500",
  ERROR: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

export function ApiCredentialsPage() {
  const [credentials, setCredentials] = useState<ApiCredential[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<ApiCredential | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({
    provider: "",
    name: "",
    description: "",
    apiKey: "",
    apiSecret: "",
    endpoint: "",
    organizationId: "",
    defaultModel: "",
    monthlyLimit: "",
    alertThreshold: "80",
    isDefault: false,
    // Extra fields
    projectUrl: "",
    projectKey: "",
    region: "",
    accountId: "",
    instanceName: "",
    webhookUrl: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (providerFilter !== "all") {
        params.append("provider", providerFilter);
      }
      if (categoryFilter !== "all") {
        params.append("category", categoryFilter);
      }

      const [credentialsRes, statsRes, alertsRes] = await Promise.all([
        fetch(`/api/credentials?${params.toString()}`),
        fetch("/api/credentials/stats"),
        fetch("/api/credentials/alerts"),
      ]);

      const [credentialsData, statsData, alertsData] = await Promise.all([
        credentialsRes.json(),
        statsRes.json(),
        alertsRes.json(),
      ]);

      if (credentialsRes.ok) {
        setCredentials(credentialsData.credentials || []);
      }
      if (statsRes.ok) {
        setStats(statsData);
      }
      if (alertsRes.ok) {
        setAlerts(alertsData.alerts || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar credenciais");
    } finally {
      setIsLoading(false);
    }
  }, [providerFilter, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCredentials = credentials.filter((cred) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        cred.name.toLowerCase().includes(query) ||
        cred.provider.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleAddCredential = async () => {
    if (!formData.provider || !formData.name || !formData.apiKey) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: formData.provider,
          name: formData.name,
          description: formData.description || undefined,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret || undefined,
          endpoint: formData.endpoint || undefined,
          organizationId: formData.organizationId || undefined,
          defaultModel: formData.defaultModel || undefined,
          monthlyLimit: formData.monthlyLimit ? parseInt(formData.monthlyLimit) : undefined,
          alertThreshold: parseInt(formData.alertThreshold),
          isDefault: formData.isDefault,
          // Extra fields
          projectUrl: formData.projectUrl || undefined,
          projectKey: formData.projectKey || undefined,
          region: formData.region || undefined,
          accountId: formData.accountId || undefined,
          instanceName: formData.instanceName || undefined,
          webhookUrl: formData.webhookUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar credencial");
      }

      toast.success("Credencial criada com sucesso");
      setShowAddDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar credencial");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCredential = async () => {
    if (!selectedCredential || !formData.name) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/credentials/${selectedCredential.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          apiKey: formData.apiKey || undefined,
          apiSecret: formData.apiSecret || undefined,
          endpoint: formData.endpoint || undefined,
          organizationId: formData.organizationId || undefined,
          defaultModel: formData.defaultModel || undefined,
          monthlyLimit: formData.monthlyLimit ? parseInt(formData.monthlyLimit) : undefined,
          alertThreshold: parseInt(formData.alertThreshold),
          isDefault: formData.isDefault,
          // Extra fields
          projectUrl: formData.projectUrl || undefined,
          projectKey: formData.projectKey || undefined,
          region: formData.region || undefined,
          accountId: formData.accountId || undefined,
          instanceName: formData.instanceName || undefined,
          webhookUrl: formData.webhookUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar credencial");
      }

      toast.success("Credencial atualizada com sucesso");
      setShowEditDialog(false);
      setSelectedCredential(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar credencial");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta credencial?")) {
      return;
    }

    try {
      const response = await fetch(`/api/credentials/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir credencial");
      }

      toast.success("Credencial excluída");
      fetchData();
    } catch (error) {
      toast.error("Erro ao excluir credencial");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/credentials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar credencial");
      }

      toast.success(isActive ? "Credencial ativada" : "Credencial desativada");
      fetchData();
    } catch (error) {
      toast.error("Erro ao atualizar credencial");
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/credentials/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isResolved: true }),
      });

      if (!response.ok) {
        throw new Error("Erro ao resolver alerta");
      }

      toast.success("Alerta resolvido");
      fetchData();
    } catch (error) {
      toast.error("Erro ao resolver alerta");
    }
  };

  const resetForm = () => {
    setFormData({
      provider: "",
      name: "",
      description: "",
      apiKey: "",
      apiSecret: "",
      endpoint: "",
      organizationId: "",
      defaultModel: "",
      monthlyLimit: "",
      alertThreshold: "80",
      isDefault: false,
      projectUrl: "",
      projectKey: "",
      region: "",
      accountId: "",
      instanceName: "",
      webhookUrl: "",
    });
  };

  const openEditDialog = (credential: ApiCredential) => {
    setSelectedCredential(credential);
    setFormData({
      provider: credential.provider,
      name: credential.name,
      description: credential.description || "",
      apiKey: "", // Don't prefill API key for security
      apiSecret: "",
      endpoint: "",
      organizationId: "",
      defaultModel: credential.defaultModel || "",
      monthlyLimit: credential.monthlyLimit?.toString() || "",
      alertThreshold: credential.alertThreshold?.toString() || "80",
      isDefault: credential.isDefault,
      projectUrl: credential.projectUrl || "",
      projectKey: "",
      region: credential.region || "",
      accountId: credential.accountId || "",
      instanceName: credential.instanceName || "",
      webhookUrl: credential.webhookUrl || "",
    });
    setShowEditDialog(true);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCost = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "USD",
    });
  };

  const getUsagePercentage = (credential: ApiCredential) => {
    if (!credential.monthlyLimit) return 0;
    return Math.min(100, (credential.currentUsage / credential.monthlyLimit) * 100);
  };

  const unreadAlerts = alerts.filter((a) => !a.isRead && !a.isResolved);

  // Render provider-specific form fields
  const renderProviderFields = () => {
    const config = providerConfig[formData.provider];
    if (!config) return null;

    return (
      <>
        {config.fields.includes("apiKey") && (
          <div className="space-y-2">
            <Label htmlFor="apiKey">{config.fieldLabels.apiKey} *</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey["new"] ? "text" : "password"}
                placeholder="sk-..."
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
                onClick={() => setShowApiKey({ ...showApiKey, new: !showApiKey["new"] })}
              >
                {showApiKey["new"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {config.fields.includes("apiSecret") && (
          <div className="space-y-2">
            <Label htmlFor="apiSecret">{config.fieldLabels.apiSecret}</Label>
            <Input
              id="apiSecret"
              type="password"
              placeholder="••••••••"
              value={formData.apiSecret}
              onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
            />
          </div>
        )}

        {config.fields.includes("organizationId") && (
          <div className="space-y-2">
            <Label htmlFor="organizationId">{config.fieldLabels.organizationId}</Label>
            <Input
              id="organizationId"
              placeholder="org-..."
              value={formData.organizationId}
              onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
            />
          </div>
        )}

        {config.fields.includes("projectUrl") && (
          <div className="space-y-2">
            <Label htmlFor="projectUrl">{config.fieldLabels.projectUrl}</Label>
            <Input
              id="projectUrl"
              placeholder="https://xxx.supabase.co"
              value={formData.projectUrl}
              onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
            />
          </div>
        )}

        {config.fields.includes("projectKey") && (
          <div className="space-y-2">
            <Label htmlFor="projectKey">{config.fieldLabels.projectKey}</Label>
            <Input
              id="projectKey"
              type="password"
              placeholder="eyJhbGciOi..."
              value={formData.projectKey}
              onChange={(e) => setFormData({ ...formData, projectKey: e.target.value })}
            />
          </div>
        )}

        {config.fields.includes("endpoint") && (
          <div className="space-y-2">
            <Label htmlFor="endpoint">{config.fieldLabels.endpoint}</Label>
            <Input
              id="endpoint"
              placeholder="https://api.example.com"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
            />
          </div>
        )}

        {config.fields.includes("region") && (
          <div className="space-y-2">
            <Label htmlFor="region">{config.fieldLabels.region}</Label>
            <Input
              id="region"
              placeholder="us-east-1"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            />
          </div>
        )}

        {config.fields.includes("accountId") && (
          <div className="space-y-2">
            <Label htmlFor="accountId">{config.fieldLabels.accountId}</Label>
            <Input
              id="accountId"
              placeholder="AC..."
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
            />
          </div>
        )}

        {config.fields.includes("instanceName") && (
          <div className="space-y-2">
            <Label htmlFor="instanceName">{config.fieldLabels.instanceName}</Label>
            <Input
              id="instanceName"
              placeholder="production"
              value={formData.instanceName}
              onChange={(e) => setFormData({ ...formData, instanceName: e.target.value })}
            />
          </div>
        )}

        {config.fields.includes("webhookUrl") && (
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">{config.fieldLabels.webhookUrl}</Label>
            <Input
              id="webhookUrl"
              placeholder="https://..."
              value={formData.webhookUrl}
              onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="h-full flex flex-col p-6 lg:p-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 text-white rounded-b-2xl shadow-lg shadow-violet-500/20 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Key className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">APIs e Credenciais</h1>
              <p className="text-white/80 text-sm">Gerencie suas chaves de API, credenciais e monitore o uso</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={() => setShowAddDialog(true)} className="bg-white text-violet-700 hover:bg-white/90 font-medium">
              <Plus className="h-4 w-4 mr-2" />
              Nova Credencial
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold">
                  {credentials.filter((c) => c.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tokens (mês)</p>
                <p className="text-2xl font-bold">
                  {stats?.totalTokens?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo (mês)</p>
                <p className="text-2xl font-bold">
                  {formatCost(stats?.totalCost || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                <Zap className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requisições</p>
                <p className="text-2xl font-bold">
                  {stats?.totalRequests?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alertas</p>
                <p className="text-2xl font-bold">{unreadAlerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="credentials" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="credentials">Credenciais</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            Alertas
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadAlerts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="flex-1 mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou provider..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                <SelectItem value="ai">Inteligência Artificial</SelectItem>
                <SelectItem value="database">Banco de Dados</SelectItem>
                <SelectItem value="communication">Comunicação</SelectItem>
                <SelectItem value="integration">Integrações</SelectItem>
                <SelectItem value="cloud">Cloud Services</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.keys(providerConfig).map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {providerConfig[provider].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Credentials List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : filteredCredentials.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Key className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma credencial encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Adicione suas chaves de API para começar a usar os serviços
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Credencial
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-6 px-6 lg:-mx-8 lg:px-8">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {filteredCredentials.map((credential) => {
                    const config = providerConfig[credential.provider] || providerConfig.OPENAI;
                    const usagePercentage = getUsagePercentage(credential);

                    return (
                      <motion.div
                        key={credential.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <Card className={cn(
                          "transition-all",
                          !credential.isActive && "opacity-60"
                        )}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg", config.bgColor)}>
                                  <span className={config.color}>{config.icon}</span>
                                </div>
                                <div>
                                  <CardTitle className="text-lg">{credential.name}</CardTitle>
                                  <CardDescription>{config.name}</CardDescription>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(credential)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleActive(credential.id, !credential.isActive)}>
                                    {credential.isActive ? "Desativar" : "Ativar"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteCredential(credential.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Status badges */}
                            <div className="flex flex-wrap gap-2">
                              {credential.isDefault && (
                                <Badge variant="secondary">Padrão</Badge>
                              )}
                              {credential.isActive ? (
                                <Badge className="bg-green-500">Ativo</Badge>
                              ) : (
                                <Badge variant="outline">Inativo</Badge>
                              )}
                              {credential.lastError && (
                                <Badge variant="destructive">Erro</Badge>
                              )}
                            </div>

                            {/* Extra info for non-AI providers */}
                            {credential.projectUrl && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Project URL: </span>
                                <span className="font-mono text-xs truncate block">{credential.projectUrl}</span>
                              </div>
                            )}

                            {credential.instanceName && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Instância: </span>
                                <span className="font-mono">{credential.instanceName}</span>
                              </div>
                            )}

                            {credential.region && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Região: </span>
                                <span className="font-mono">{credential.region}</span>
                              </div>
                            )}

                            {/* Model */}
                            {credential.defaultModel && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Modelo: </span>
                                <span className="font-mono">{credential.defaultModel}</span>
                              </div>
                            )}

                            {/* Usage */}
                            {credential.monthlyLimit && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Uso Mensal</span>
                                  <span>
                                    {credential.currentUsage.toLocaleString()} / {credential.monthlyLimit.toLocaleString()} tokens
                                  </span>
                                </div>
                                <Progress value={usagePercentage} className={cn(
                                  "h-2",
                                  usagePercentage > 90 && "[&>div]:bg-red-500",
                                  usagePercentage > 70 && "[&>div]:bg-yellow-500"
                                )} />
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                Último uso: {formatDate(credential.lastUsedAt)}
                              </span>
                              <a
                                href={config.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:underline"
                              >
                                Docs <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>

                            {/* Error message */}
                            {credential.lastError && (
                              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                  <span>{credential.lastError}</span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="flex-1 mt-4">
          {alerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum alerta</h3>
              <p className="text-muted-foreground">
                Você está dentro dos limites de uso configurados
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-6 px-6 lg:-mx-8 lg:px-8">
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      alert.isResolved && "opacity-60",
                      alert.isRead && !alert.isResolved && "bg-muted/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2",
                        severityColors[alert.severity]
                      )} />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(alert.createdAt)}
                            </p>
                          </div>
                          {!alert.isResolved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveAlert(alert.id)}
                            >
                              Resolver
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Credential Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Credencial</DialogTitle>
            <DialogDescription>
              Adicione uma nova credencial de API ou serviço
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(providerCategories).map(([key, cat]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={categoryFilter === key ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => {
                      setCategoryFilter(key);
                      setFormData({ ...formData, provider: "" });
                    }}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider *</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o provider" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(providerConfig)
                    .filter(([, config]) => categoryFilter === "all" || config.category === categoryFilter)
                    .map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span className={config.color}>{config.icon}</span>
                          {config.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: Produção, Testes, Desenvolvimento..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Descrição opcional..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Provider-specific fields */}
            {formData.provider && renderProviderFields()}

            {/* Model selection for AI providers */}
            {formData.provider && providerConfig[formData.provider]?.models.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="defaultModel">Modelo Padrão</Label>
                <Select
                  value={formData.defaultModel}
                  onValueChange={(value) => setFormData({ ...formData, defaultModel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerConfig[formData.provider].models.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyLimit">Limite Mensal</Label>
                <Input
                  id="monthlyLimit"
                  type="number"
                  placeholder="1000000"
                  value={formData.monthlyLimit}
                  onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alertThreshold">Alerta (%)</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  placeholder="80"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isDefault">Definir como padrão</Label>
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setCategoryFilter("all");
            }}>
              Cancelar
            </Button>
            <Button onClick={handleAddCredential} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Credential Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Credencial</DialogTitle>
            <DialogDescription>
              Atualize as configurações da credencial
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Provider-specific fields */}
            {formData.provider && renderProviderFields()}

            {/* Model selection for AI providers */}
            {formData.provider && providerConfig[formData.provider]?.models.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="edit-defaultModel">Modelo Padrão</Label>
                <Select
                  value={formData.defaultModel}
                  onValueChange={(value) => setFormData({ ...formData, defaultModel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerConfig[formData.provider].models.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-monthlyLimit">Limite Mensal</Label>
                <Input
                  id="edit-monthlyLimit"
                  type="number"
                  value={formData.monthlyLimit}
                  onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-alertThreshold">Alerta (%)</Label>
                <Input
                  id="edit-alertThreshold"
                  type="number"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-isDefault">Definir como padrão</Label>
              <Switch
                id="edit-isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditCredential} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
