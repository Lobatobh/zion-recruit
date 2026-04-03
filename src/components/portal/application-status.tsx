"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Building,
  Briefcase,
  Calendar,
  ExternalLink,
  FileText,
} from "lucide-react";

interface ApplicationStatusProps {
  token: string;
  applications: Application[];
}

interface Application {
  id: string;
  job: {
    id: string;
    title: string;
    department?: string;
    location?: string;
    type: string;
    workModel?: string;
    company: {
      id: string;
      name: string;
      logo?: string;
    };
  };
  status: string;
  statusLabel: string;
  pipelineStage?: {
    id: string;
    name: string;
    color: string;
  };
  matchScore?: number;
  appliedAt: string;
  hasInterviews: boolean;
  hasDiscTest: boolean;
  timeline: Array<{
    id: string;
    name: string;
    color: string;
    order: number;
    isCurrent: boolean;
    isCompleted: boolean;
    isPending: boolean;
  }>;
  interviews?: Array<{
    id: string;
    title: string;
    type: string;
    scheduledAt: string;
    duration: number;
    status: string;
  }>;
  discTest?: {
    id: string;
    status: string;
    completedAt?: string;
    primaryProfile?: string;
  };
}

export function ApplicationStatus({ token, applications }: ApplicationStatusProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Applications Yet</h3>
          <p className="text-muted-foreground">
            You haven't applied to any positions yet. Check out our job board for open positions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getWorkModelLabel = (model?: string) => {
    const labels: Record<string, string> = {
      REMOTE: 'Remote',
      HYBRID: 'Hybrid',
      ONSITE: 'On-site',
    };
    return model ? labels[model] || model : '';
  };

  const getJobTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      FULL_TIME: 'Full-time',
      PART_TIME: 'Part-time',
      CONTRACT: 'Contract',
      INTERNSHIP: 'Internship',
      FREELANCE: 'Freelance',
    };
    return labels[type] || type;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Your Applications</CardTitle>
          <CardDescription>
            Track the status of your job applications
          </CardDescription>
        </CardHeader>
      </Card>

      <Accordion type="single" collapsible className="space-y-4">
        {applications.map((application) => (
          <AccordionItem key={application.id} value={application.id} className="border rounded-lg">
            <AccordionTrigger className="px-6 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <h3 className="font-medium text-lg">{application.job.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="h-3.5 w-3.5" />
                      <span>{application.job.company.name}</span>
                      {application.job.location && (
                        <>
                          <MapPin className="h-3.5 w-3.5 ml-2" />
                          <span>{application.job.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {application.matchScore !== undefined && application.matchScore !== null && (
                    <div className="text-right mr-4">
                      <p className="text-sm font-medium">{application.matchScore}% Match</p>
                      <Progress value={application.matchScore} className="w-20 h-2" />
                    </div>
                  )}
                  <Badge
                    style={{
                      backgroundColor: application.pipelineStage?.color || '#6B7280',
                      color: 'white',
                    }}
                  >
                    {application.pipelineStage?.name || 'Applied'}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Job Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Job Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Department:</span>
                        <span className="ml-2">{application.job.department || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <span className="ml-2">{getJobTypeLabel(application.job.type)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Work Model:</span>
                        <span className="ml-2">{getWorkModelLabel(application.job.workModel)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Applied:</span>
                        <span className="ml-2">{formatDate(application.appliedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status History */}
                  <div>
                    <h4 className="font-medium mb-2">Status History</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Application submitted</span>
                        <span className="text-muted-foreground ml-auto">
                          {formatDate(application.appliedAt)}
                        </span>
                      </div>
                      {application.status !== 'APPLIED' && application.status !== 'SOURCED' && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>Moved to {application.statusLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {(application.hasInterviews || application.hasDiscTest) && (
                    <div className="flex gap-2">
                      {application.hasInterviews && (
                        <Badge variant="outline" className="gap-1">
                          <Calendar className="h-3 w-3" />
                          Interview Scheduled
                        </Badge>
                      )}
                      {application.hasDiscTest && (
                        <Badge variant="outline" className="gap-1">
                          <FileText className="h-3 w-3" />
                          Assessment Pending
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="font-medium mb-4">Recruitment Pipeline</h4>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-4">
                      {application.timeline.map((stage, index) => (
                        <div key={stage.id} className="relative flex items-start gap-4 pl-10">
                          <div
                            className={`absolute left-2 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                              stage.isCompleted
                                ? 'bg-green-500 border-green-500'
                                : stage.isCurrent
                                ? 'bg-blue-500 border-blue-500'
                                : 'bg-white dark:bg-gray-800 border-gray-300'
                            }`}
                          >
                            {stage.isCompleted && (
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            )}
                            {stage.isCurrent && (
                              <Circle className="h-2 w-2 text-white fill-white" />
                            )}
                          </div>
                          <div>
                            <p
                              className={`font-medium ${
                                stage.isCurrent ? 'text-blue-600' : stage.isCompleted ? 'text-green-600' : 'text-muted-foreground'
                              }`}
                            >
                              {stage.name}
                            </p>
                            {stage.isCurrent && (
                              <p className="text-xs text-muted-foreground">Current stage</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
