"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase,
  Calendar,
  FileText,
  MessageSquare,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { ApplicationStatus } from "./application-status";
import { InterviewSchedule } from "./interview-schedule";
import { PortalMessages } from "./messages";
import { ProfileEditor } from "./profile-editor";

interface PortalDashboardProps {
  token: string;
  onLogout: () => void;
}

interface CandidateData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  resumeUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  photo?: string;
  status: string;
  createdAt: string;
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
}

interface Interview {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  scheduledAt: string;
  duration: number;
  timezone: string;
  meetingUrl?: string;
  meetingProvider?: string;
  location?: string;
  status: string;
  statusLabel: string;
  interviewerName?: string;
  jobTitle: string;
}

interface Tenant {
  id: string;
  name: string;
  logo?: string;
}

interface PortalData {
  candidate: CandidateData;
  applications: Application[];
  upcomingInterviews: Interview[];
  tenant: Tenant;
}

export function PortalDashboard({ token, onLogout }: PortalDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchPortalData();
  }, [token]);

  const fetchPortalData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/portal/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        setError(result.error || 'Failed to load portal data');
      }
    } catch (err) {
      setError('Failed to load portal data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || 'Failed to load data'}</p>
            <Button onClick={onLogout} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { candidate, applications, upcomingInterviews, tenant } = data;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      APPLIED: 'bg-blue-500',
      SCREENING: 'bg-yellow-500',
      INTERVIEWING: 'bg-purple-500',
      DISC_TEST: 'bg-orange-500',
      OFFERED: 'bg-green-500',
      HIRED: 'bg-emerald-500',
      REJECTED: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {tenant.logo ? (
                <img src={tenant.logo} alt={tenant.name} className="h-8 w-8 rounded" />
              ) : (
                <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
                  {tenant.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="font-semibold text-lg">{tenant.name}</h1>
                <p className="text-xs text-muted-foreground">Candidate Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {candidate.name}
              </span>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="overview">
              <Briefcase className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="applications">
              <FileText className="h-4 w-4 mr-2" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="interviews">
              <Calendar className="h-4 w-4 mr-2" />
              Interviews
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Applications</CardDescription>
                  <CardTitle className="text-3xl">{applications.length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {applications.filter(a => a.status === 'APPLIED').length} pending review
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Upcoming Interviews</CardDescription>
                  <CardTitle className="text-3xl">{upcomingInterviews.length}</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingInterviews.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Next: {new Date(upcomingInterviews[0].scheduledAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active Status</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge className={getStatusColor(candidate.status)}>
                    {candidate.status.replace(/_/g, ' ')}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Profile Completion</CardDescription>
                  <CardTitle className="text-3xl">
                    {calculateProfileCompletion(candidate)}%
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={calculateProfileCompletion(candidate)} />
                </CardContent>
              </Card>
            </div>

            {/* Active Applications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Applications</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('applications')}>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications.slice(0, 3).map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{app.job.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {app.job.department} • {app.job.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge style={{ backgroundColor: app.pipelineStage?.color }}>
                          {app.pipelineStage?.name || 'Applied'}
                        </Badge>
                        {app.matchScore && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {app.matchScore}% match
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Interviews Preview */}
            {upcomingInterviews.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Upcoming Interviews</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('interviews')}>
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingInterviews.slice(0, 2).map((interview) => (
                      <div
                        key={interview.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <h4 className="font-medium">{interview.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {interview.jobTitle}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {new Date(interview.scheduledAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(interview.scheduledAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => setActiveTab('profile')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Update Profile</h3>
                    <p className="text-sm text-muted-foreground">
                      Keep your information up to date
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-green-500 transition-colors" onClick={() => setActiveTab('messages')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Contact Recruiter</h3>
                    <p className="text-sm text-muted-foreground">
                      Send a message to the hiring team
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <ApplicationStatus token={token} applications={applications} />
          </TabsContent>

          {/* Interviews Tab */}
          <TabsContent value="interviews">
            <InterviewSchedule token={token} initialInterviews={upcomingInterviews} />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <PortalMessages token={token} candidateId={candidate.id} tenantId={tenant.id} />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <ProfileEditor token={token} candidate={candidate} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function calculateProfileCompletion(candidate: CandidateData): number {
  const fields = [
    'name',
    'email',
    'phone',
    'linkedin',
    'github',
    'portfolio',
    'resumeUrl',
    'city',
    'state',
    'country',
  ];
  
  const completed = fields.filter((field) => {
    const value = candidate[field as keyof CandidateData];
    return value && value.toString().trim().length > 0;
  });
  
  return Math.round((completed.length / fields.length) * 100);
}
