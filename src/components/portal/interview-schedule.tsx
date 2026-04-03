"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  CalendarClock,
} from "lucide-react";

interface InterviewScheduleProps {
  token: string;
  initialInterviews: Interview[];
}

interface Interview {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  scheduledAt: string;
  duration: number;
  durationLabel: string;
  timezone: string;
  meetingUrl?: string;
  meetingProvider?: string;
  location?: string;
  status: string;
  statusLabel: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  interviewerName?: string;
  job?: {
    id: string;
    title: string;
    department?: string;
  } | null;
  jobTitle?: string;
}

export function InterviewSchedule({ token, initialInterviews }: InterviewScheduleProps) {
  const [interviews, setInterviews] = useState<{
    upcoming: Interview[];
    past: Interview[];
    cancelled: Interview[];
  }>({
    upcoming: initialInterviews,
    past: [],
    cancelled: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [actionDialog, setActionDialog] = useState<'confirm' | 'reschedule' | 'cancel' | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/portal/interviews', {
        headers: {
          'x-portal-token': token,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setInterviews(data.interviews);
      }
    } catch (error) {
      console.error('Failed to fetch interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedInterview || !actionDialog) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/portal/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portal-token': token,
        },
        body: JSON.stringify({
          interviewId: selectedInterview.id,
          action: actionDialog,
          rescheduleReason,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchInterviews();
        setActionDialog(null);
        setSelectedInterview(null);
        setRescheduleReason('');
      }
    } catch (error) {
      console.error('Failed to process action:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      SCHEDULED: {
        bg: 'bg-yellow-100 dark:bg-yellow-900',
        text: 'text-yellow-800 dark:text-yellow-200',
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      CONFIRMED: {
        bg: 'bg-green-100 dark:bg-green-900',
        text: 'text-green-800 dark:text-green-200',
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
      },
      COMPLETED: {
        bg: 'bg-blue-100 dark:bg-blue-900',
        text: 'text-blue-800 dark:text-blue-200',
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
      },
      CANCELLED: {
        bg: 'bg-red-100 dark:bg-red-900',
        text: 'text-red-800 dark:text-red-200',
        icon: <XCircle className="h-3 w-3 mr-1" />,
      },
      NO_SHOW: {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-200',
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
      },
      RESCHEDULED: {
        bg: 'bg-orange-100 dark:bg-orange-900',
        text: 'text-orange-800 dark:text-orange-200',
        icon: <CalendarClock className="h-3 w-3 mr-1" />,
      },
    };

    const variant = variants[status] || variants.SCHEDULED;
    return (
      <Badge className={`${variant.bg} ${variant.text} flex items-center`}>
        {variant.icon}
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getInterviewIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return <Video className="h-5 w-5" />;
      case 'PHONE':
        return <Phone className="h-5 w-5" />;
      case 'ONSITE':
        return <MapPin className="h-5 w-5" />;
      default:
        return <Calendar className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upcoming Interviews */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Interviews
          </CardTitle>
          <CardDescription>
            Your scheduled interviews - confirm or request reschedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : interviews.upcoming.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming interviews scheduled</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.upcoming.map((interview) => (
                <div
                  key={interview.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        {getInterviewIcon(interview.type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{interview.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {interview.job?.title || interview.jobTitle}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(interview.scheduledAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatTime(interview.scheduledAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {interview.duration} min
                          </div>
                        </div>
                        {interview.interviewerName && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            {interview.interviewerName}
                          </div>
                        )}
                        {interview.meetingUrl && (
                          <Button
                            variant="link"
                            className="p-0 h-auto mt-2"
                            onClick={() => window.open(interview.meetingUrl, '_blank')}
                          >
                            <Video className="h-4 w-4 mr-1" />
                            Join {interview.meetingProvider || 'Meeting'}
                          </Button>
                        )}
                        {interview.location && !interview.meetingUrl && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {interview.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(interview.status)}
                      <div className="flex gap-2 mt-2">
                        {interview.status === 'SCHEDULED' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedInterview(interview);
                              setActionDialog('confirm');
                            }}
                          >
                            Confirm
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInterview(interview);
                            setActionDialog('reschedule');
                          }}
                        >
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedInterview(interview);
                            setActionDialog('cancel');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Interviews */}
      {interviews.past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {interviews.past.map((interview) => (
                <div
                  key={interview.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{interview.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(interview.scheduledAt)} at {formatTime(interview.scheduledAt)}
                      </p>
                    </div>
                    {getStatusBadge(interview.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'confirm' && 'Confirm Interview'}
              {actionDialog === 'reschedule' && 'Request Reschedule'}
              {actionDialog === 'cancel' && 'Cancel Interview'}
            </DialogTitle>
            <DialogDescription>
              {selectedInterview && (
                <>
                  {selectedInterview.title} on {formatDate(selectedInterview.scheduledAt)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {(actionDialog === 'reschedule' || actionDialog === 'cancel') && (
            <div className="space-y-4">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Please provide a reason..."
                rows={3}
              />
            </div>
          )}

          {actionDialog === 'confirm' && (
            <p className="text-sm text-muted-foreground">
              By confirming, you agree to attend the interview at the scheduled time. You'll receive a reminder before the interview.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Go Back
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={actionDialog === 'cancel' ? 'destructive' : 'default'}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionDialog === 'confirm' && 'Confirm Attendance'}
                  {actionDialog === 'reschedule' && 'Request Reschedule'}
                  {actionDialog === 'cancel' && 'Cancel Interview'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
