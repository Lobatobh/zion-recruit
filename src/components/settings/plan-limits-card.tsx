"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Users,
  UserCircle,
  Crown,
} from "lucide-react";
import { Plan, MemberRole } from "@prisma/client";

interface PlanLimitsCardProps {
  plan: Plan;
  maxJobs: number;
  maxMembers: number;
  maxCandidates: number;
  jobsCount: number;
  membersCount: number;
  candidatesCount: number;
  userRole: MemberRole;
}

const planLabels: Record<Plan, string> = {
  FREE: "Gratuito",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

const planColors: Record<Plan, string> = {
  FREE: "bg-gray-500",
  STARTER: "bg-blue-500",
  PROFESSIONAL: "bg-purple-500",
  ENTERPRISE: "bg-amber-500",
};

export function PlanLimitsCard({
  plan,
  maxJobs,
  maxMembers,
  maxCandidates,
  jobsCount,
  membersCount,
  candidatesCount,
  userRole,
}: PlanLimitsCardProps) {
  const limits = [
    {
      label: "Vagas",
      current: jobsCount,
      max: maxJobs,
      icon: Briefcase,
      color: "text-blue-500",
    },
    {
      label: "Membros",
      current: membersCount,
      max: maxMembers,
      icon: Users,
      color: "text-green-500",
    },
    {
      label: "Candidatos",
      current: candidatesCount,
      max: maxCandidates,
      icon: UserCircle,
      color: "text-amber-500",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Plano Atual
          </CardTitle>
          <Badge className={`${planColors[plan]} text-white border-0`}>
            {planLabels[plan]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {limits.map((limit) => {
          const percentage = Math.min((limit.current / limit.max) * 100, 100);
          const isNearLimit = percentage >= 80;
          const isAtLimit = percentage >= 100;

          return (
            <div key={limit.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <limit.icon className={`h-4 w-4 ${limit.color}`} />
                  <span className="text-muted-foreground">{limit.label}</span>
                </div>
                <span
                  className={`font-medium ${
                    isAtLimit
                      ? "text-destructive"
                      : isNearLimit
                        ? "text-amber-500"
                        : ""
                  }`}
                >
                  {limit.current} / {limit.max}
                </span>
              </div>
              <Progress
                value={percentage}
                className={`h-2 ${isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-amber-500" : ""}`}
              />
            </div>
          );
        })}

        {plan !== "ENTERPRISE" && (userRole === "OWNER" || userRole === "ADMIN") && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Precisa de mais recursos?{" "}
              <button className="text-primary hover:underline font-medium">
                Fazer upgrade do plano
              </button>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
