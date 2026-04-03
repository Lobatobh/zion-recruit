"use client";

import { useState, useEffect, useCallback, Suspense, lazy, Component, type ReactNode } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  Building2,
  Home as HomeIcon,
  Briefcase,
  Users,
  LayoutGrid,
  Settings,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Bot,
  MessageCircle,
  Brain,
  Key,
  BarChart3,
  FileSearch,
  Webhook,
  Crosshair,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { NavigationProvider, useNavigation } from "@/lib/navigation-context";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

type ViewType =
  | "overview"
  | "jobs"
  | "candidates"
  | "pipeline"
  | "messages"
  | "agents"
  | "disc"
  | "apis"
  | "analytics"
  | "audit"
  | "webhooks"
  | "docs"
  | "disc-test"
  | "careers"
  | "sourcing"
  | "clients"
  | "settings"
  | "portal"
  | "portal-dashboard"
  | "portal-interviews"
  | "portal-messages"
  | "portal-disc-test";

interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  tenantSlug?: string | null;
}

// Public views that don't require authentication
const PUBLIC_VIEWS: ViewType[] = [
  "careers",
  "portal",
  "portal-dashboard",
  "portal-interviews",
  "portal-messages",
  "portal-disc-test",
];

// ============================================
// SAFE URL PARAMS (no Suspense required)
// ============================================

function getInitialParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function getViewFromUrl(): ViewType {
  const params = getInitialParams();
  return (params.get("view") as ViewType) || "overview";
}

function getParamFromUrl(key: string): string {
  const params = getInitialParams();
  return params.get(key) || "";
}

// ============================================
// LOGIN FORM
// ============================================

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm({ onLoginSuccess }: { onLoginSuccess: (user: SessionUser) => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Credenciais inválidas", {
          description: "Verifique seu email e senha e tente novamente.",
        });
      } else {
        toast.success("Login realizado com sucesso!");
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        onLoginSuccess(session?.user);
      }
    } catch {
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-2xl shadow-lg">
              Z
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Zion Recruit
            </span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium text-center mb-2">Credenciais de Demo</p>
            <div className="text-xs text-muted-foreground space-y-1 text-center">
              <p>Email: <code className="bg-muted px-1 rounded">admin@zion.demo</code></p>
              <p>Senha: <code className="bg-muted px-1 rounded">password123</code></p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/60">
          <div className="relative flex h-full items-center justify-center p-12">
            <div className="max-w-lg text-center text-white">
              <Building2 className="h-16 w-16 mx-auto mb-6 opacity-90" />
              <h2 className="text-3xl font-bold mb-4">Transforme seu Processo de Recrutamento</h2>
              <p className="text-lg opacity-90">
                Inteligência artificial para encontrar os melhores candidatos.
              </p>
              <div className="mt-10 grid grid-cols-2 gap-4 text-left">
                {["Matching Inteligente com IA", "Pipeline Visual", "Multi-organização", "Análise de Currículos"].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-white/80" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ERROR BOUNDARY
// ============================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ViewErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ViewErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">Erro ao carregar esta visualização</p>
          <p className="text-sm text-muted-foreground mb-4">Tente recarregar a página.</p>
          <Button
            variant="outline"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
          >
            Recarregar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================
// VIEW LOADING FALLBACK
// ============================================

function ViewLoadingFallback() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}

// ============================================
// DIRECT IMPORT (Overview - most common view)
// ============================================

import { OverviewContent } from "@/components/overview/overview-content";

// ============================================
// LAZY LOADED VIEWS
// ============================================

const LazyJobsList = lazy(() =>
  import("@/components/jobs/jobs-list").then((m) => ({ default: m.JobsList }))
);
const LazyCandidatesList = lazy(() =>
  import("@/components/candidates/candidates-list").then((m) => ({ default: m.CandidatesList }))
);
const LazyKanbanBoard = lazy(() =>
  import("@/components/pipeline/kanban-board").then((m) => ({ default: m.KanbanBoard }))
);
const LazyMessagesPage = lazy(() =>
  import("@/components/messaging/messages-page").then((m) => ({ default: m.MessagesPage }))
);
const LazyAgentsDashboard = lazy(() =>
  import("@/components/agents/agents-dashboard").then((m) => ({ default: m.AgentsDashboard }))
);
const LazyDiscManagementPage = lazy(() =>
  import("@/components/disc/disc-management-page").then((m) => ({ default: m.DiscManagementPage }))
);
const LazyApiCredentialsPage = lazy(() =>
  import("@/components/api-credentials/api-credentials-page").then((m) => ({ default: m.ApiCredentialsPage }))
);
const LazyAnalyticsDashboard = lazy(() =>
  import("@/components/analytics/analytics-dashboard").then((m) => ({ default: m.AnalyticsDashboard }))
);
const LazyAuditLogPage = lazy(() =>
  import("@/components/audit/audit-log-page").then((m) => ({ default: m.AuditLogPage }))
);
const LazyWebhooksPage = lazy(() =>
  import("@/components/webhooks/webhooks-page").then((m) => ({ default: m.WebhooksPage }))
);
const LazyDocsPage = lazy(() =>
  import("@/components/docs/docs-page").then((m) => ({ default: m.DocsPage }))
);
const LazySettingsPage = lazy(() =>
  import("@/components/settings/settings-page").then((m) => ({ default: m.SettingsPage }))
);
const LazyClientManagementPage = lazy(() =>
  import("@/components/clients/client-management-page").then((m) => ({ default: m.ClientManagementPage }))
);
const LazyJobBoard = lazy(() =>
  import("@/components/public/job-board").then((m) => ({ default: m.JobBoard }))
);
const LazyHunterAIPage = lazy(() =>
  import("@/components/sourcing/hunter-ai-page").then((m) => ({ default: m.HunterAIPage }))
);
const LazyDiscTestPage = lazy(() =>
  import("@/components/disc/disc-test-page").then((m) => ({ default: m.DiscTestPage }))
);
const LazyPortalAuth = lazy(() =>
  import("@/components/portal/portal-auth").then((m) => ({ default: m.PortalAuth }))
);
const LazyPortalDashboard = lazy(() =>
  import("@/components/portal/portal-dashboard").then((m) => ({ default: m.PortalDashboard }))
);

// ============================================
// LAZY VIEW RENDERER (with Suspense + ErrorBoundary)
// ============================================

function LazyView({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ViewLoadingFallback />}>
      <ViewErrorBoundary>{children}</ViewErrorBoundary>
    </Suspense>
  );
}

// ============================================
// DASHBOARD CONTENT
// ============================================

function DashboardContent({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  const { currentView, params: urlParams, navigate } = useNavigation();
  const { sidebarCollapsed, setSidebarCollapsed } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = useCallback((view: ViewType, extraParams?: Record<string, string>) => {
    navigate(view, extraParams);
    setMobileOpen(false);
  }, [navigate]);

  const navigationItems: { name: string; view: ViewType; icon: React.ElementType }[] = [
    { name: "Visão Geral", view: "overview", icon: HomeIcon },
    { name: "Vagas", view: "jobs", icon: Briefcase },
    { name: "Candidatos", view: "candidates", icon: Users },
    { name: "Pipeline", view: "pipeline", icon: LayoutGrid },
    { name: "Mensagens", view: "messages", icon: MessageCircle },
    { name: "Hunter AI", view: "sourcing", icon: Crosshair },
    { name: "Agentes IA", view: "agents", icon: Bot },
    { name: "Analytics", view: "analytics", icon: BarChart3 },
    { name: "Audit Logs", view: "audit", icon: FileSearch },
    { name: "Testes DISC", view: "disc", icon: Brain },
    { name: "APIs", view: "apis", icon: Key },
    { name: "Webhooks", view: "webhooks", icon: Webhook },
    { name: "Documentação", view: "docs", icon: BookOpen },
    { name: "Empresas", view: "clients", icon: Building2 },
    { name: "Configurações", view: "settings", icon: Settings },
  ];

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderView = () => {
    switch (currentView) {
      case "overview":
        return (
          <ViewErrorBoundary>
            <OverviewContent />
          </ViewErrorBoundary>
        );

      case "jobs":
        return (
          <LazyView>
            <LazyJobsList />
          </LazyView>
        );

      case "candidates":
        return (
          <LazyView>
            <LazyCandidatesList />
          </LazyView>
        );

      case "pipeline":
        return (
          <LazyView>
            <LazyKanbanBoard />
          </LazyView>
        );

      case "messages":
        return (
          <LazyView>
            <LazyMessagesPage />
          </LazyView>
        );

      case "agents":
        return (
          <LazyView>
            <LazyAgentsDashboard organizationId={user?.id || "default"} />
          </LazyView>
        );

      case "disc":
        return (
          <LazyView>
            <LazyDiscManagementPage />
          </LazyView>
        );

      case "disc-test": {
        const testId = urlParams.testId || "";
        if (!testId) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">ID do teste não encontrado</p>
              <Button variant="outline" className="mt-4" onClick={() => handleNavigate("disc")}>
                Voltar para Testes DISC
              </Button>
            </div>
          );
        }
        return (
          <LazyView>
            <LazyDiscTestPage testId={testId} />
          </LazyView>
        );
      }

      case "apis":
        return (
          <LazyView>
            <LazyApiCredentialsPage />
          </LazyView>
        );

      case "analytics":
        return (
          <LazyView>
            <LazyAnalyticsDashboard tenantId={user?.tenantSlug || "demo"} />
          </LazyView>
        );

      case "audit":
        return (
          <LazyView>
            <LazyAuditLogPage />
          </LazyView>
        );

      case "webhooks":
        return (
          <LazyView>
            <LazyWebhooksPage />
          </LazyView>
        );

      case "docs":
        return (
          <LazyView>
            <LazyDocsPage />
          </LazyView>
        );

      case "sourcing": {
        const jobId = urlParams.jobId || "";
        const jobTitle = urlParams.jobTitle || "";
        return (
          <LazyView>
            <LazyHunterAIPage jobId={jobId || undefined} jobTitle={jobTitle || undefined} />
          </LazyView>
        );
      }

      case "settings":
        return (
          <LazyView>
            <LazySettingsPage />
          </LazyView>
        );

      case "clients":
        return (
          <LazyView>
            <LazyClientManagementPage />
          </LazyView>
        );

      case "careers":
        return (
          <LazyView>
            <LazyJobBoard />
          </LazyView>
        );

      default:
        return (
          <ViewErrorBoundary>
            <OverviewContent />
          </ViewErrorBoundary>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden lg:block relative"
      >
        <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
          <div className={cn("flex h-16 items-center border-b border-sidebar-border px-4", sidebarCollapsed ? "justify-center" : "gap-3")}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              Z
            </div>
            {!sidebarCollapsed && (
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Zion Recruit
              </span>
            )}
          </div>

          <ScrollArea className="flex-1 py-4">
            <nav className={cn("space-y-1 px-2", sidebarCollapsed && "flex flex-col items-center")}>
              {navigationItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigate(item.view)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 w-full text-left",
                    currentView === item.view
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </button>
              ))}
            </nav>
          </ScrollArea>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-[18px] -right-3 z-50 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-accent"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", sidebarCollapsed && "rotate-180")} />
        </Button>
      </motion.aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col bg-sidebar">
            <div className="flex h-16 items-center border-b border-sidebar-border px-4 gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                Z
              </div>
              <span className="font-bold">Zion Recruit</span>
            </div>
            <ScrollArea className="flex-1 py-4">
              <nav className="space-y-1 px-2">
                {navigationItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleNavigate(item.view)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 w-full text-left",
                      currentView === item.view
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </button>
                ))}
              </nav>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="flex h-16 items-center gap-4 border-b border-border bg-background px-4 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              Z
            </div>
            <span className="font-bold">Zion Recruit</span>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-50 h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4" />
                  <span>{user?.tenantSlug || "Sem Organização"}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Organizações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Building2 className="mr-2 h-4 w-4" />
                  {user?.tenantSlug || "Demo Organization"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderView()}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

// ============================================
// PUBLIC VIEW ROUTER (for careers & portal)
// ============================================

function PublicViewRouter({ initialView }: { initialView: ViewType }) {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<ViewType>(initialView);

  // Sync with URL on popstate
  useEffect(() => {
    const handlePopState = () => {
      const view = getViewFromUrl();
      if (PUBLIC_VIEWS.includes(view)) {
        setCurrentView(view);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (currentView === "careers") {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <LazyJobBoard />
      </Suspense>
    );
  }

  if (currentView === "portal") {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <PortalAuthWrapper />
      </Suspense>
    );
  }

  // Portal dashboard and sub-views
  const token = getParamFromUrl("token");

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Token de acesso não encontrado</p>
          <Button variant="outline" onClick={() => window.location.href = "/?view=portal"}>
            Ir para login do portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LazyPortalDashboard
        token={token}
        onLogout={() => window.location.href = "/?view=portal"}
      />
    </Suspense>
  );
}

function PortalAuthWrapper() {
  const router = useRouter();
  const initialToken = getParamFromUrl("token") || undefined;

  const handleAuthenticated = () => {
    window.location.href = "/?view=portal-dashboard";
  };

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LazyPortalAuth
        onAuthenticated={handleAuthenticated}
        initialToken={initialToken}
      />
    </Suspense>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

function PageContentInner() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialView] = useState<ViewType>(() => getViewFromUrl());

  // Check if current view is a public view (no auth required)
  const isPublicView = PUBLIC_VIEWS.includes(initialView);

  // Auto-bailout: if loading takes more than 2s, proceed without session
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // If it's a public view, no need to check session
    if (isPublicView) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const checkSession = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch("/api/auth/session", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (mounted && response.ok) {
          const data = await response.json();
          setUser(data?.user || null);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [isPublicView]);

  // Loading state - shows briefly then auto-resolves
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-3xl shadow-lg mx-auto mb-6">
            Z
          </div>
          <h1 className="text-2xl font-bold mb-2">Zion Recruit</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Public views (no auth required)
  if (isPublicView) {
    return <PublicViewRouter initialView={initialView} />;
  }

  // Authenticated dashboard
  if (user) {
    return (
      <NavigationProvider>
        <DashboardContent user={user} onSignOut={handleSignOut} />
      </NavigationProvider>
    );
  }

  // Login form
  return <LoginForm onLoginSuccess={setUser} />;

  async function handleSignOut() {
    await signOut({ redirect: false });
    setUser(null);
  }
}

// ============================================
// GLOBAL ERROR BOUNDARY
// ============================================

class GlobalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("GlobalErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="text-center max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-3xl shadow-lg mx-auto mb-6">
              Z
            </div>
            <h1 className="text-2xl font-bold mb-2">Zion Recruit</h1>
            <p className="text-muted-foreground mb-4">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-muted p-3 rounded-lg mb-4 overflow-auto max-h-32 text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={() => window.location.reload()}>
              Recarregar Página
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================
// EXPORT - Named export for AppPage
// ============================================

export function AppPage() {
  return (
    <GlobalErrorBoundary>
      <PageContentInner />
    </GlobalErrorBoundary>
  );
}
