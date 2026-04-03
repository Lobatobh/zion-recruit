"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlanLimitsCard } from "./plan-limits-card";
import { Building2, Save, Loader2, Calendar } from "lucide-react";
import { Plan, MemberRole } from "@prisma/client";
import { toast } from "sonner";

interface OrganizationSettingsProps {
  userRole: MemberRole;
}

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  plan: Plan;
  maxJobs: number;
  maxMembers: number;
  maxCandidates: number;
  createdAt: string;
  jobsCount: number;
  membersCount: number;
  candidatesCount: number;
}

export function OrganizationSettings({ userRole }: OrganizationSettingsProps) {
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const canEdit = userRole === "OWNER" || userRole === "ADMIN";

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const response = await fetch("/api/settings/organization");
      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
        setName(data.organization.name);
        setLogoUrl(data.organization.logo || "");
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
      toast.error("Erro ao carregar configurações da organização");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome da organização é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          logo: logoUrl.trim() || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrganization((prev) =>
          prev ? { ...prev, name: data.organization.name, logo: data.organization.logo } : null
        );
        toast.success("Organização atualizada com sucesso");
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao atualizar organização");
      }
    } catch (error) {
      console.error("Error saving organization:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Organização não encontrada</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Organization Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informações da Organização
          </CardTitle>
          <CardDescription>
            Configure as informações básicas da sua organização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Section */}
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 rounded-lg">
              <AvatarImage src={logoUrl || undefined} alt={organization.name} />
              <AvatarFallback className="rounded-lg text-2xl bg-primary text-primary-foreground">
                {organization.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Label htmlFor="logo">URL do Logo</Label>
              <Input
                id="logo"
                placeholder="https://exemplo.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={!canEdit}
              />
              <p className="text-xs text-muted-foreground">
                Insira a URL de uma imagem para o logo da organização
              </p>
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Organização</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              placeholder="Nome da organização"
            />
          </div>

          {/* Slug (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <div className="flex items-center gap-2">
              <Input
                id="slug"
                value={organization.slug}
                disabled
                className="bg-muted"
              />
              <Badge variant="secondary">Somente leitura</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              O slug é usado na URL da sua organização e não pode ser alterado
            </p>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Criada em {formatDate(organization.createdAt)}</span>
          </div>

          {/* Save Button */}
          {canEdit && (
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={isSaving || name === organization.name && logoUrl === (organization.logo || "")}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Limits Card */}
      <PlanLimitsCard
        plan={organization.plan}
        maxJobs={organization.maxJobs}
        maxMembers={organization.maxMembers}
        maxCandidates={organization.maxCandidates}
        jobsCount={organization.jobsCount}
        membersCount={organization.membersCount}
        candidatesCount={organization.candidatesCount}
        userRole={userRole}
      />
    </div>
  );
}
