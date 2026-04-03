"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Save,
  Loader2,
  Mail,
  Calendar,
  Building2,
} from "lucide-react";
import { Plan, MemberRole } from "@prisma/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    plan: Plan;
    role: MemberRole;
    joinedAt: string;
  }>;
}

const planLabels: Record<Plan, string> = {
  FREE: "Gratuito",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

const roleLabels: Record<MemberRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  RECRUITER: "Recrutador",
  VIEWER: "Visualizador",
};

export function ProfileSettings() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/settings/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setName(data.profile.name || "");
        setImageUrl(data.profile.image || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Erro ao carregar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          image: imageUrl.trim() || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile((prev) =>
          prev
            ? { ...prev, name: data.profile.name, image: data.profile.image }
            : null
        );
        toast.success("Perfil atualizado com sucesso");
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao atualizar perfil");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Perfil não encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>
            Atualize suas informações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={imageUrl || undefined} alt={profile.name || "User"} />
              <AvatarFallback className="text-2xl">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Label htmlFor="image">URL da Foto</Label>
              <Input
                id="image"
                placeholder="https://exemplo.com/foto.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Insira a URL de uma imagem para sua foto de perfil
              </p>
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <div className="flex items-center gap-2">
              <Input
                id="profile-email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <Badge variant="secondary">
                <Mail className="h-3 w-3 mr-1" />
                Verificado
              </Badge>
            </div>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Membro desde {formatDate(profile.createdAt)}</span>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={
                isSaving ||
                (name === (profile.name || "") && imageUrl === (profile.image || ""))
              }
            >
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
        </CardContent>
      </Card>

      {/* Organizations Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizações
          </CardTitle>
          <CardDescription>
            Organizações das quais você é membro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile.organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    {org.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Membro desde {formatDate(org.joinedAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{planLabels[org.plan]}</Badge>
                  <Badge>{roleLabels[org.role]}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
