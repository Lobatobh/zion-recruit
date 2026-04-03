"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Clock,
  Globe,
  Monitor,
  FileText,
  ArrowRight,
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

interface AuditDetailProps {
  log: AuditLog;
}

export function AuditDetail({ log }: AuditDetailProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Action</p>
          <Badge variant="outline">{formatAction(log.action)}</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Entity Type</p>
          <p className="font-medium">{log.entityType}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Entity ID</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {log.entityId || 'N/A'}
          </code>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Log ID</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">{log.id}</code>
        </div>
      </div>

      <Separator />

      {/* User Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            User
          </CardTitle>
        </CardHeader>
        <CardContent>
          {log.user ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{log.user.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{log.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {log.userId}
                </code>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">System action (no user)</p>
          )}
        </CardContent>
      </Card>

      {/* Request Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Request Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">IP Address</p>
              <code className="text-sm font-mono">
                {log.ipAddress || 'Not recorded'}
              </code>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Timestamp</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{formatDate(log.createdAt)}</p>
              </div>
            </div>
          </div>
          {log.userAgent && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-1">User Agent</p>
              <div className="flex items-start gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground break-all">
                  {log.userAgent}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Changes */}
      {log.changes && Object.keys(log.changes).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-4">
                {Object.entries(log.changes).map(([key, change]) => (
                  <div key={key} className="border rounded-lg p-3">
                    <p className="font-medium text-sm mb-2">{key}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Old Value</p>
                        <pre className="text-xs bg-red-500/10 text-red-600 p-2 rounded overflow-x-auto">
                          {formatValue((change as { old: unknown }).old)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">New Value</p>
                        <pre className="text-xs bg-green-500/10 text-green-600 p-2 rounded overflow-x-auto">
                          {formatValue((change as { new: unknown }).new)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {log.metadata && Object.keys(log.metadata).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Metadata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
