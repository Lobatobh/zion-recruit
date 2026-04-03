"use client";

import { motion } from "framer-motion";
import { Briefcase, Users, MapPin, ArrowUpRight } from "lucide-react";
import {
  JobWithCandidates,
  JobStatus,
  getJobStatusLabel,
  getJobTypeLabel,
  formatSalary,
} from "@/types/job";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<JobStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  CLOSED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  ARCHIVED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

interface JobCardProps {
  job: JobWithCandidates;
  onClick?: () => void;
  compact?: boolean;
}

export function JobCard({ job, onClick, compact = false }: JobCardProps) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        onClick={onClick}
        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{job.title}</span>
            <Badge
              variant={job.status === "PUBLISHED" ? "default" : "secondary"}
              className="text-xs"
            >
              {getJobStatusLabel(job.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {job.department || "Sem departamento"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {job.candidatesCount} candidatos
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="cursor-pointer hover:shadow-md transition-all"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="font-medium">{job.title}</div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {job.department && <span>{job.department}</span>}
                  {job.location && (
                    <>
                      {job.department && <span>•</span>}
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={statusColors[job.status]}>
              {getJobStatusLabel(job.status)}
            </Badge>
            <Badge variant="outline">{getJobTypeLabel(job.type)}</Badge>
            {job.remote && (
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                Remoto
              </Badge>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                <strong className="text-foreground">{job.candidatesCount}</strong>{" "}
                candidatos
              </span>
            </div>
            {salary && (
              <span className="font-medium text-primary">{salary}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Mini card for dashboard quick view
export function JobMiniCard({
  job,
  onClick,
}: {
  job: JobWithCandidates;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Briefcase className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium">{job.title}</div>
          <div className="text-xs text-muted-foreground">
            {job.department || "Sem departamento"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className={`text-xs ${statusColors[job.status]}`}
        >
          {getJobStatusLabel(job.status)}
        </Badge>
        <div className="text-xs text-muted-foreground">
          {job.candidatesCount} candidatos
        </div>
      </div>
    </motion.div>
  );
}
