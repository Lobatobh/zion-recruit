"use client";

import { useSession, signOut } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  Briefcase,
  Users,
  LayoutGrid,
  Settings,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Building2,
  Bot,
  MessageCircle,
  Brain,
  Key,
  BarChart3,
  FileSearch,
  Webhook,
  Search,
  BookOpen,
} from "lucide-react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Check, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "./theme-toggle";

export type ViewType = "overview" | "jobs" | "candidates" | "pipeline" | "messages" | "agents" | "disc" | "apis" | "analytics" | "audit" | "webhooks" | "docs" | "disc-test" | "careers" | "sourcing" | "settings";

const navigationItems: { name: string; view: ViewType; icon: React.ElementType }[] = [
  { name: "Visão Geral", view: "overview", icon: Home },
  { name: "Vagas", view: "jobs", icon: Briefcase },
  { name: "Candidatos", view: "candidates", icon: Users },
  { name: "Pipeline", view: "pipeline", icon: LayoutGrid },
  { name: "Mensagens", view: "messages", icon: MessageCircle },
  { name: "Sourcing", view: "sourcing", icon: Search },
  { name: "Agentes IA", view: "agents", icon: Bot },
  { name: "Analytics", view: "analytics", icon: BarChart3 },
  { name: "Audit Logs", view: "audit", icon: FileSearch },
  { name: "Testes DISC", view: "disc", icon: Brain },
  { name: "APIs", view: "apis", icon: Key },
  { name: "Webhooks", view: "webhooks", icon: Webhook },
  { name: "Documentação", view: "docs", icon: BookOpen },
  { name: "Configurações", view: "settings", icon: Settings },
];

function NavItem({
  item,
  isActive,
  collapsed = false,
  onClick,
}: {
  item: (typeof navigationItems)[0];
  isActive: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set("view", item.view);
    router.push(url.pathname + url.search);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 w-full text-left",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span>{item.name}</span>}
    </button>
  );
}

function Sidebar({
  collapsed,
  className,
  currentView,
}: {
  collapsed: boolean;
  className?: string;
  currentView: ViewType;
}) {
  const { data: session } = useSession();

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-sidebar border-r border-sidebar-border",
        className
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
          Z
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="overflow-hidden"
          >
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Zion Recruit
            </span>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav
          className={cn(
            "space-y-1 px-2",
            collapsed ? "flex flex-col items-center" : ""
          )}
        >
          {navigationItems.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={currentView === item.view}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* User section at bottom */}
      {!collapsed && (
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Plano Atual</p>
            <p className="text-sm font-medium truncate">{session?.user?.tenantSlug || 'Zion Recruit'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TenantSwitcher() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [organizations, setOrganizations] = useState<Array<{
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    role: string;
    plan: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch user's organizations on mount
  useEffect(() => {
    async function fetchOrgs() {
      try {
        const res = await fetch("/api/tenant");
        if (res.ok) {
          const data = await res.json();
          setOrganizations(data.organizations || []);
        }
      } catch {
        // Silently fail - user can still use current org
      }
    }
    fetchOrgs();
  }, []);

  const handleSwitch = useCallback(async (tenantId: string) => {
    if (tenantId === session?.user?.tenantId) return;

    setSwitching(tenantId);
    try {
      const res = await fetch("/api/tenant/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      if (res.ok) {
        // Update NextAuth session with new tenant (no page reload needed)
        await updateSession({ switchTenant: tenantId });
        router.refresh();
      }
    } catch {
      // Error switching - do nothing
    } finally {
      setSwitching(null);
    }
  }, [session?.user?.tenantId, router, pathname, updateSession]);

  const currentSlug = session?.user?.tenantSlug || "Sem Organização";
  const currentOrgId = session?.user?.tenantId;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Building2 className="h-4 w-4" />
          <span className="hidden md:inline-block max-w-[160px] truncate">
            {currentSlug}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organizações</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Current organization */}
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org.id)}
            disabled={switching !== null}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm truncate">{org.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{org.role.toLowerCase()}</span>
              </div>
            </div>
            {org.id === currentOrgId && (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            )}
            {switching === org.id && (
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}

        {organizations.length === 0 && (
          <DropdownMenuItem disabled>
            <span className="text-sm text-muted-foreground">Nenhuma organização</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setCreateDialogOpen(true)}
          className="flex items-center gap-2 cursor-pointer text-primary"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">Nova Organização</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* Create Organization Dialog */}
      <CreateOrganizationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(tenantId) => {
          setCreateDialogOpen(false);
          handleSwitch(tenantId);
        }}
      />
    </DropdownMenu>
  );
}

function Header() {
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <div className="flex items-center gap-4">
        {/* Organization Switcher */}
        <TenantSwitcher />
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={session?.user?.image || undefined}
                  alt={session?.user?.name || "User"}
                />
                <AvatarFallback>
                  {getInitials(session?.user?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email}
                </p>
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
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchParams = useSearchParams();
  const currentView = (searchParams.get("view") as ViewType) || "overview";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden lg:block relative"
      >
        <Sidebar collapsed={sidebarCollapsed} currentView={currentView} />

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-[18px] -right-3 z-50 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-accent"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3 w-3" />
          </motion.div>
        </Button>
      </motion.aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <Sidebar collapsed={false} currentView={currentView} />
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
        <div className="hidden lg:block">
          <Header />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function AppShellFallback() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar Placeholder */}
      <div className="hidden lg:block w-60 bg-sidebar border-r border-sidebar-border">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4 gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            Z
          </div>
          <span className="text-xl font-bold">Zion Recruit</span>
        </div>
        <div className="p-4 space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-9 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Main Content Placeholder */}
      <div className="flex flex-1 flex-col">
        <div className="h-16 border-b border-border bg-background/95 px-4 lg:px-6 flex items-center justify-end gap-2">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </div>
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-32 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-48 bg-muted rounded animate-pulse" />
              <div className="h-48 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <AppShellContent>{children}</AppShellContent>
    </Suspense>
  );
}

// ============================================
// Create Organization Dialog
// ============================================

function CreateOrganizationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (tenantId: string) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name
    const generated = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 63);
    setSlug(generated);
  };

  const handleSubmit = async () => {
    setError("");
    if (!name.trim() || !slug.trim()) {
      setError("Nome e identificador são obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar organização");
        return;
      }

      onCreated(data.tenant.id);
      setName("");
      setSlug("");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Organização</DialogTitle>
          <DialogDescription>
            Crie uma nova organização para gerenciar suas vagas e candidatos separadamente.
            Você será o proprietário desta organização.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="org-name">Nome da Organização</Label>
            <Input
              id="org-name"
              placeholder="Ex: TechCorp Recrutamento"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug">Identificador</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">zion.app/</span>
              <Input
                id="org-slug"
                placeholder="techcorp-recrutamento"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Usado na URL. Apenas letras minúsculas, números e hífens.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Plano inicial: <span className="font-medium text-foreground">Gratuito</span>
              {" · "}Até 10 vagas, 5 membros e 500 candidatos
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim() || !slug.trim()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Organização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
