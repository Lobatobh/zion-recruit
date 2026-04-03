"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  Building2, 
  Users, 
  Eye,
  ArrowRight,
  Globe,
  Home,
  Building
} from "lucide-react";
import { JobType, WorkModel } from "@prisma/client";

interface PublicJob {
  id: string;
  title: string;
  publicSlug: string | null;
  department: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  type: JobType;
  workModel: WorkModel | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  salaryType: string | null;
  description: string;
  benefits: string | null;
  aiParsedSkills: string | null;
  aiParsedSeniority: string | null;
  viewsCount: number;
  applicationsCount: number;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  tenant: {
    id: string;
    name: string;
    logo: string | null;
  };
}

interface JobCardProps {
  job: PublicJob;
  onViewDetails: (job: PublicJob) => void;
}

const jobTypeLabels: Record<JobType, string> = {
  FULL_TIME: "Tempo Integral",
  PART_TIME: "Meio Período",
  CONTRACT: "Contrato",
  INTERNSHIP: "Estágio",
  FREELANCE: "Freelance",
};

const workModelLabels: Record<WorkModel, string> = {
  REMOTE: "Remoto",
  HYBRID: "Híbrido",
  ONSITE: "Presencial",
};

const workModelIcons: Record<WorkModel, React.ReactNode> = {
  REMOTE: <Globe className="h-3.5 w-3.5" />,
  HYBRID: <Building className="h-3.5 w-3.5" />,
  ONSITE: <Home className="h-3.5 w-3.5" />,
};

export function JobCard({ job, onViewDetails }: JobCardProps) {
  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return null;

    const formatter = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: job.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    if (job.salaryMin && job.salaryMax) {
      return `${formatter.format(job.salaryMin)} - ${formatter.format(job.salaryMax)}`;
    }

    if (job.salaryMin) {
      return `A partir de ${formatter.format(job.salaryMin)}`;
    }

    if (job.salaryMax) {
      return `Até ${formatter.format(job.salaryMax)}`;
    }

    return null;
  };

  const getLocation = () => {
    const parts = [job.city, job.state, job.country].filter(Boolean);
    return parts.join(", ") || job.location || "Não especificado";
  };

  const getSkills = () => {
    if (!job.aiParsedSkills) return [];
    try {
      return JSON.parse(job.aiParsedSkills);
    } catch {
      return job.aiParsedSkills.split(",").map((s) => s.trim()).slice(0, 4);
    }
  };

  const skills = getSkills();
  const salary = formatSalary();
  const location = getLocation();

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/30 overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {/* Company */}
            <div className="flex items-center gap-2 mb-1.5">
              {job.tenant.logo ? (
                <img 
                  src={job.tenant.logo} 
                  alt={job.tenant.name}
                  className="h-5 w-5 rounded object-cover"
                />
              ) : (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground truncate">
                {job.tenant.name}
              </span>
            </div>
            
            {/* Title */}
            <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {job.title}
            </h3>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-2 mb-3">
          {job.department && (
            <Badge variant="secondary" className="text-xs">
              {job.department}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {jobTypeLabels[job.type]}
          </Badge>
          {job.workModel && (
            <Badge variant="outline" className="text-xs gap-1">
              {workModelIcons[job.workModel]}
              {workModelLabels[job.workModel]}
            </Badge>
          )}
        </div>

        {/* Location & Salary */}
        <div className="space-y-2 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          {salary && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
              <Briefcase className="h-4 w-4 shrink-0" />
              <span>{salary}</span>
            </div>
          )}
        </div>

        {/* Description preview */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {job.description.replace(/<[^>]*>/g, "").slice(0, 150)}...
        </p>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 3).map((skill: string, idx: number) => (
              <Badge key={idx} variant="outline" className="text-xs bg-muted/50">
                {skill}
              </Badge>
            ))}
            {skills.length > 3 && (
              <Badge variant="outline" className="text-xs bg-muted/50">
                +{skills.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="px-5 py-3 bg-muted/30 border-t flex items-center justify-between">
        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            <span>{job.viewsCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{job.applicationsCount} candidaturas</span>
          </div>
        </div>

        {/* CTA */}
        <Button 
          size="sm" 
          onClick={() => onViewDetails(job)}
          className="gap-1"
        >
          Ver vaga
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
