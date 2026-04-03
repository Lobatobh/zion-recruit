"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { InviteMemberDialog } from "./invite-member-dialog";
import {
  Users,
  MoreHorizontal,
  Loader2,
  UserPlus,
  Shield,
  ShieldCheck,
  Eye,
  UserCircle,
  Trash2,
} from "lucide-react";
import { MemberRole } from "@prisma/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: MemberRole;
  joinedAt: string;
}

interface TeamSettingsProps {
  currentUserRole: MemberRole;
}

const roleLabels: Record<MemberRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  RECRUITER: "Recrutador",
  VIEWER: "Visualizador",
};

const roleVariants: Record<MemberRole, "default" | "secondary" | "outline" | "destructive"> = {
  OWNER: "default",
  ADMIN: "secondary",
  RECRUITER: "outline",
  VIEWER: "outline",
};

const roleIcons: Record<MemberRole, React.ElementType> = {
  OWNER: ShieldCheck,
  ADMIN: Shield,
  RECRUITER: UserCircle,
  VIEWER: Eye,
};

export function TeamSettings({ currentUserRole }: TeamSettingsProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [memberToChangeRole, setMemberToChangeRole] = useState<TeamMember | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const canManageTeam = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const isOwner = currentUserRole === "OWNER";

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/settings/team");
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast.error("Erro ao carregar membros da equipe");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: MemberRole) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/settings/team/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        const data = await response.json();
        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id ? { ...m, role: data.member.role } : m
          )
        );
        toast.success("Função atualizada com sucesso");
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao atualizar função");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Erro ao atualizar função");
    } finally {
      setIsUpdating(false);
      setMemberToChangeRole(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/settings/team/${memberToRemove.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
        toast.success("Membro removido com sucesso");
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao remover membro");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Erro ao remover membro");
    } finally {
      setIsUpdating(false);
      setMemberToRemove(null);
    }
  };

  const getInitials = (name: string) => {
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

  const canModifyMember = (member: TeamMember) => {
    if (member.role === "OWNER") return false;
    if (member.role === "ADMIN" && !isOwner) return false;
    return canManageTeam;
  };

  const canChangeRoleTo = (member: TeamMember, newRole: MemberRole) => {
    if (member.role === "OWNER") return false;
    if (member.role === "ADMIN" && !isOwner) return false;
    if (newRole === "OWNER") return false;
    return canManageTeam;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Membros da Equipe
              </CardTitle>
              <CardDescription>
                Gerencie os membros da sua organização
              </CardDescription>
            </div>
            {canManageTeam && (
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Membro
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum membro encontrado
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Entrou</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const RoleIcon = roleIcons[member.role];
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={member.image || undefined}
                                alt={member.name}
                              />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleVariants[member.role]} className="gap-1">
                            <RoleIcon className="h-3 w-3" />
                            {roleLabels[member.role]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(member.joinedAt)}
                        </TableCell>
                        <TableCell>
                          {canModifyMember(member) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Alterar Função</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {Object.entries(roleLabels)
                                  .filter(([role]) => role !== "OWNER")
                                  .filter(([role]) => canChangeRoleTo(member, role as MemberRole))
                                  .map(([role, label]) => (
                                    <DropdownMenuItem
                                      key={role}
                                      onClick={() =>
                                        handleRoleChange(member, role as MemberRole)
                                      }
                                      disabled={member.role === role}
                                    >
                                      {label}
                                      {member.role === role && " (atual)"}
                                    </DropdownMenuItem>
                                  ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setMemberToRemove(member)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvited={fetchMembers}
      />

      {/* Remove Member Confirmation */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={() => setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{memberToRemove?.name}</strong>{" "}
              da organização? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
