"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationSettings } from "./organization-settings";
import { TeamSettings } from "./team-settings";
import { ProfileSettings } from "./profile-settings";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  User,
  Settings,
} from "lucide-react";
import { MemberRole } from "@prisma/client";

export function SettingsPage() {
  const [userRole, setUserRole] = useState<MemberRole>("VIEWER");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await fetch("/api/settings/organization");
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.userRole);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 text-white rounded-b-2xl shadow-lg shadow-violet-500/20">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-white/80 text-sm">Gerencie sua organização, equipe e preferências</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organização
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <OrganizationSettings userRole={userRole} />
        </TabsContent>

        <TabsContent value="team">
          <TeamSettings currentUserRole={userRole} />
        </TabsContent>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
