"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "./job-card";
import { JobFilters } from "./job-filters";
import { JobDetail } from "./job-detail";
import {
  Briefcase,
  Search,
  Building2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";

interface PublicJob {
  id: string;
  title: string;
  publicSlug: string | null;
  department: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  type: string;
  workModel: string | null;
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

interface JobsResponse {
  jobs: PublicJob[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: {
    departments: string[];
    locations: string[];
  };
}

interface JobBoardProps {
  onBackToLogin?: () => void;
}

export function JobBoard({ onBackToLogin }: JobBoardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [filterOptions, setFilterOptions] = useState({
    departments: [] as string[],
    locations: [] as string[],
  });
  const [selectedJob, setSelectedJob] = useState<PublicJob | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Get current filters from URL
  const currentFilters = {
    search: searchParams.get("search") || undefined,
    department: searchParams.get("department") || undefined,
    location: searchParams.get("location") || undefined,
    type: searchParams.get("type") || undefined,
  };

  // Get UTM params for tracking
  const utmParams = {
    source: searchParams.get("utm_source") || undefined,
    medium: searchParams.get("utm_medium") || undefined,
    campaign: searchParams.get("utm_campaign") || undefined,
  };

  // Get referrer
  const referrer = typeof document !== "undefined" ? document.referrer : undefined;

  // Check if we're viewing a specific job
  useEffect(() => {
    const jobSlug = searchParams.get("job");
    if (jobSlug && !selectedJobId) {
      setSelectedJobId(jobSlug);
    }
  }, [searchParams, selectedJobId]);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (currentFilters.search) params.set("search", currentFilters.search);
      if (currentFilters.department) params.set("department", currentFilters.department);
      if (currentFilters.location) params.set("location", currentFilters.location);
      if (currentFilters.type) params.set("type", currentFilters.type);
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());

      const response = await fetch(`/api/public/jobs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const data: JobsResponse = await response.json();
      setJobs(data.jobs);
      setPagination(data.pagination);
      setFilterOptions(data.filters);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError("Erro ao carregar vagas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [currentFilters.search, currentFilters.department, currentFilters.location, currentFilters.type, pagination.page, pagination.limit]);

  useEffect(() => {
    if (!selectedJobId) {
      fetchJobs();
    }
  }, [fetchJobs, selectedJobId]);

  // Handle filter changes
  const handleFiltersChange = (filters: typeof currentFilters) => {
    const newParams = new URLSearchParams(searchParams.toString());
    
    // Keep UTM params
    if (utmParams.source) newParams.set("utm_source", utmParams.source);
    if (utmParams.medium) newParams.set("utm_medium", utmParams.medium);
    if (utmParams.campaign) newParams.set("utm_campaign", utmParams.campaign);
    
    // Update filters
    if (filters.search) newParams.set("search", filters.search);
    else newParams.delete("search");
    
    if (filters.department) newParams.set("department", filters.department);
    else newParams.delete("department");
    
    if (filters.location) newParams.set("location", filters.location);
    else newParams.delete("location");
    
    if (filters.type) newParams.set("type", filters.type);
    else newParams.delete("type");

    // Keep view=careers
    newParams.set("view", "careers");

    // Reset to page 1
    setPagination(prev => ({ ...prev, page: 1 }));

    router.push(`/?${newParams.toString()}`);
  };

  // Handle job selection
  const handleViewJob = (job: PublicJob) => {
    setSelectedJob(job);
    setSelectedJobId(job.publicSlug || job.id);
    
    // Update URL
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("job", job.publicSlug || job.id);
    router.push(`/?${newParams.toString()}`, { scroll: false });
  };

  // Handle back to list
  const handleBackToList = () => {
    setSelectedJob(null);
    setSelectedJobId(null);
    
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("job");
    router.push(`/?${newParams.toString()}`, { scroll: false });
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Show job detail if selected
  if (selectedJobId) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <JobDetail
          jobId={selectedJobId}
          onBack={handleBackToList}
          utmParams={utmParams}
          referrer={referrer}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Vagas Abertas</h1>
                <p className="text-muted-foreground text-sm">
                  Encontre sua próxima oportunidade
                </p>
              </div>
            </div>
            
            {onBackToLogin && (
              <Button variant="outline" onClick={onBackToLogin}>
                Voltar ao Login
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>
                {loading ? (
                  <Skeleton className="h-4 w-16 inline-block" />
                ) : (
                  `${pagination.total} vagas disponíveis`
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <JobFilters
          departments={filterOptions.departments}
          locations={filterOptions.locations}
          currentFilters={currentFilters}
          onFiltersChange={handleFiltersChange}
        />

        {/* Jobs List */}
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx}>
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="p-8 text-center">
              <div className="text-destructive mb-4">{error}</div>
              <Button variant="outline" onClick={fetchJobs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </Card>
          ) : jobs.length === 0 ? (
            <Card className="p-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma vaga encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Tente ajustar os filtros ou buscar por outros termos.
              </p>
              <Button variant="outline" onClick={() => handleFiltersChange({})}>
                Limpar filtros
              </Button>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onViewDetails={handleViewJob}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, idx) => {
                      let pageNum: number;
                      if (pagination.totalPages <= 5) {
                        pageNum = idx + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = idx + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + idx;
                      } else {
                        pageNum = pagination.page - 2 + idx;
                      }

                      return (
                        <Button
                          key={idx}
                          variant={pageNum === pagination.page ? "default" : "outline"}
                          size="sm"
                          className="w-9"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-12 py-8 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Zion Recruit. Plataforma de recrutamento com IA.
          </p>
        </div>
      </footer>
    </div>
  );
}
