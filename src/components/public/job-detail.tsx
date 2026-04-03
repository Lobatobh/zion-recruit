"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationForm } from "./application-form";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Building2,
  Clock,
  Calendar,
  DollarSign,
  Users,
  Eye,
  Globe,
  Home,
  Building,
  Share2,
  CheckCircle2,
  Send
} from "lucide-react";
import { JobType, WorkModel } from "@prisma/client";

interface PublicJobDetail {
  id: string;
  title: string;
  publicSlug: string | null;
  department: string | null;
  description: string;
  requirements: string;
  benefits: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  type: JobType;
  contractType: string | null;
  workModel: WorkModel | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  salaryType: string | null;
  aiParsedSkills: string | null;
  aiParsedKeywords: string | null;
  aiParsedSeniority: string | null;
  aiSummary: string | null;
  discProfileRequired: string | null;
  viewsCount: number;
  applicationsCount: number;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  tenant: {
    id: string;
    name: string;
    logo: string | null;
    slug: string | null;
  };
}

interface JobDetailProps {
  jobId: string;
  onBack: () => void;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  referrer?: string;
}

const jobTypeLabels: Record<JobType, string> = {
  FULL_TIME: "Tempo Integral",
  PART_TIME: "Meio Período",
  CONTRACT: "Contrato",
  INTERNSHIP: "Estágio",
  FREELANCE: "Freelance",
};

const contractTypeLabels: Record<string, string> = {
  CLT: "CLT",
  PJ: "PJ",
  CONTRACTOR: "Contractor",
  INTERNSHIP: "Estágio",
};

const workModelLabels: Record<WorkModel, string> = {
  REMOTE: "Remoto",
  HYBRID: "Híbrido",
  ONSITE: "Presencial",
};

const workModelIcons: Record<WorkModel, React.ReactNode> = {
  REMOTE: <Globe className="h-4 w-4" />,
  HYBRID: <Building className="h-4 w-4" />,
  ONSITE: <Home className="h-4 w-4" />,
};

export function JobDetail({ jobId, onBack, utmParams, referrer }: JobDetailProps) {
  const [job, setJob] = useState<PublicJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApplication, setShowApplication] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/public/jobs/${jobId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Vaga não encontrada");
          } else {
            setError("Erro ao carregar vaga");
          }
          return;
        }
        
        const data = await response.json();
        setJob(data.job);
      } catch (err) {
        console.error("Error fetching job:", err);
        setError("Erro de conexão");
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const formatSalary = () => {
    if (!job?.salaryMin && !job?.salaryMax) return null;

    const formatter = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: job?.currency || "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    if (job?.salaryMin && job?.salaryMax) {
      return `${formatter.format(job.salaryMin)} - ${formatter.format(job.salaryMax)}`;
    }

    if (job?.salaryMin) {
      return `A partir de ${formatter.format(job.salaryMin)}`;
    }

    if (job?.salaryMax) {
      return `Até ${formatter.format(job.salaryMax)}`;
    }

    return null;
  };

  const getLocation = () => {
    if (!job) return "";
    const parts = [job.city, job.state, job.country].filter(Boolean);
    return parts.join(", ") || job.location || "Não especificado";
  };

  const getSkills = () => {
    if (!job?.aiParsedSkills) return [];
    try {
      return JSON.parse(job.aiParsedSkills);
    } catch {
      return job.aiParsedSkills.split(",").map((s) => s.trim());
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr));
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${job?.title} - ${job?.tenant.name}`,
          text: `Confira esta oportunidade: ${job?.title}`,
          url,
        });
      } catch (err) {
        console.error("Share error:", err);
      }
    } else {
      navigator.clipboard.writeText(url);
      // Could add a toast here
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-3 w-[150px]" />
          </div>
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-destructive mb-4">{error || "Vaga não encontrada"}</div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para vagas
        </Button>
      </div>
    );
  }

  const salary = formatSalary();
  const location = getLocation();
  const skills = getSkills();

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 min-w-0">
            {/* Company */}
            <div className="flex items-center gap-2 mb-2">
              {job.tenant.logo ? (
                <img 
                  src={job.tenant.logo} 
                  alt={job.tenant.name}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <span className="text-muted-foreground">{job.tenant.name}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">{job.title}</h1>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {job.department && (
                <Badge variant="secondary">{job.department}</Badge>
              )}
              <Badge variant="outline">
                {jobTypeLabels[job.type]}
              </Badge>
              {job.contractType && (
                <Badge variant="outline">
                  {contractTypeLabels[job.contractType] || job.contractType}
                </Badge>
              )}
              {job.workModel && (
                <Badge variant="outline" className="gap-1">
                  {workModelIcons[job.workModel]}
                  {workModelLabels[job.workModel]}
                </Badge>
              )}
            </div>

            {/* Location & Salary */}
            <div className="flex flex-wrap gap-4 text-sm mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{location}</span>
              </div>
              {salary && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                  <DollarSign className="h-4 w-4" />
                  <span>{salary}</span>
                </div>
              )}
              {job.publishedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Publicada em {formatDate(job.publishedAt)}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{job.viewsCount} visualizações</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{job.applicationsCount} candidaturas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button size="lg" className="gap-2" onClick={() => setShowApplication(true)}>
            <Send className="h-4 w-4" />
            Candidatar-se
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Descrição da vaga</h2>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Requisitos</h2>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: job.requirements }}
                />
              </CardContent>
            </Card>

            {/* Benefits */}
            {job.benefits && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Benefícios</h2>
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: job.benefits }}
                  />
                </CardContent>
              </Card>
            )}

            {/* AI Summary */}
            {job.aiSummary && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Resumo da vaga
                  </h2>
                  <p className="text-muted-foreground">{job.aiSummary}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Skills */}
            {skills.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Skills desejadas</h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-muted/50">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seniority */}
            {job.aiParsedSeniority && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Nível de experiência</h3>
                  <Badge variant="secondary">{job.aiParsedSeniority}</Badge>
                </CardContent>
              </Card>
            )}

            {/* DISC Profile */}
            {job.discProfileRequired && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Perfil DISC desejado</h3>
                  <Badge variant="outline">{job.discProfileRequired}</Badge>
                </CardContent>
              </Card>
            )}

            {/* Job Info */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold">Informações</h3>
                <Separator />
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-medium">{jobTypeLabels[job.type]}</span>
                  </div>
                  
                  {job.contractType && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contrato</span>
                      <span className="font-medium">{contractTypeLabels[job.contractType] || job.contractType}</span>
                    </div>
                  )}
                  
                  {job.workModel && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modelo</span>
                      <span className="font-medium">{workModelLabels[job.workModel]}</span>
                    </div>
                  )}

                  {job.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expira em</span>
                      <span className="font-medium">{formatDate(job.expiresAt)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Application Form Dialog */}
      <ApplicationForm
        jobId={job.id}
        jobTitle={job.title}
        companyName={job.tenant.name}
        isOpen={showApplication}
        onClose={() => setShowApplication(false)}
        utmParams={utmParams}
        referrer={referrer}
        source="public_board"
      />
    </>
  );
}
