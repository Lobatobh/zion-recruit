"use client";

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AuditDetail } from './audit-detail';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  Bot,
  Settings,
  FileText,
  Briefcase,
  Key,
  Calendar,
  Brain,
  MessageSquare,
} from 'lucide-react';

interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface AuditLogTableProps {
  logs: AuditLog[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-500/10 text-green-600 border-green-200',
  UPDATE: 'bg-blue-500/10 text-blue-600 border-blue-200',
  DELETE: 'bg-red-500/10 text-red-600 border-red-200',
  LOGIN: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  LOGOUT: 'bg-gray-500/10 text-gray-600 border-gray-200',
  LOGIN_FAILED: 'bg-orange-500/10 text-orange-600 border-orange-200',
  EXPORT: 'bg-purple-500/10 text-purple-600 border-purple-200',
  IMPORT: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
  PERMISSION_CHANGE: 'bg-amber-500/10 text-amber-600 border-amber-200',
  SETTINGS_CHANGE: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  API_KEY_CREATED: 'bg-teal-500/10 text-teal-600 border-teal-200',
  API_KEY_REVOKED: 'bg-rose-500/10 text-rose-600 border-rose-200',
  AGENT_RUN: 'bg-violet-500/10 text-violet-600 border-violet-200',
  CANDIDATE_STAGE_CHANGE: 'bg-sky-500/10 text-sky-600 border-sky-200',
  JOB_PUBLISHED: 'bg-lime-500/10 text-lime-600 border-lime-200',
  JOB_CLOSED: 'bg-stone-500/10 text-stone-600 border-stone-200',
  INTERVIEW_SCHEDULED: 'bg-pink-500/10 text-pink-600 border-pink-200',
  INTERVIEW_CANCELLED: 'bg-red-500/10 text-red-600 border-red-200',
  DISC_TEST_SENT: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200',
  MESSAGE_SENT: 'bg-blue-500/10 text-blue-600 border-blue-200',
};

const entityTypeIcons: Record<string, React.ElementType> = {
  Candidate: User,
  Job: Briefcase,
  User: User,
  Tenant: Settings,
  ApiCredential: Key,
  AIAgent: Bot,
  AITask: Bot,
  Interview: Calendar,
  DISCTest: Brain,
  Message: MessageSquare,
  Conversation: MessageSquare,
  PipelineStage: FileText,
  Notification: MessageSquare,
  Subscription: FileText,
};

export function AuditLogTable({
  logs,
  loading,
  page,
  totalPages,
  onPageChange,
}: AuditLogTableProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No audit logs found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or check back later
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Action</TableHead>
              <TableHead className="w-[140px]">Entity</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[140px]">IP Address</TableHead>
              <TableHead className="w-[80px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const Icon = entityTypeIcons[log.entityType] || FileText;
              return (
                <TableRow key={log.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={actionColors[log.action] || 'bg-gray-500/10 text-gray-600'}
                    >
                      {formatAction(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{log.entityType}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.user ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{log.user.name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">{log.user.email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {log.ipAddress || '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && <AuditDetail log={selectedLog} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
