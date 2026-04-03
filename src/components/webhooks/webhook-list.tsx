'use client';

import { useState, useEffect } from 'react';
import {
  MoreVertical,
  Edit,
  Trash2,
  Send,
  Power,
  PowerOff,
  ExternalLink,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EventBadges } from './event-selector';
import { WebhookWithDecryptedSecret, WebhookEventTypeValue, EventTypeInfo } from '@/lib/webhooks';
import { cn } from '@/lib/utils';

interface WebhookListProps {
  webhooks: WebhookWithDecryptedSecret[];
  onEdit: (webhook: WebhookWithDecryptedSecret) => void;
  onTest: (webhookId: string) => Promise<void>;
  onToggleActive: (webhookId: string, isActive: boolean) => Promise<void>;
  onDelete: (webhookId: string) => Promise<void>;
  onViewDeliveries: (webhookId: string) => void;
  className?: string;
}

export function WebhookList({
  webhooks,
  onEdit,
  onTest,
  onToggleActive,
  onDelete,
  onViewDeliveries,
  className,
}: WebhookListProps) {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  const handleTest = async (webhookId: string) => {
    setTestingId(webhookId);
    try {
      await onTest(webhookId);
    } finally {
      setTestingId(null);
    }
  };
  
  const handleToggle = async (webhookId: string, currentActive: boolean) => {
    setTogglingId(webhookId);
    try {
      await onToggleActive(webhookId, !currentActive);
    } finally {
      setTogglingId(null);
    }
  };
  
  const handleDelete = async () => {
    if (!deleteId) return;
    await onDelete(deleteId);
    setDeleteId(null);
  };
  
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  };
  
  if (webhooks.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <ExternalLink className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No webhooks yet</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Create your first webhook to receive real-time notifications when events happen in your recruitment pipeline.
        </p>
      </div>
    );
  }
  
  return (
    <>
      <div className={cn('space-y-4', className)}>
        {webhooks.map((webhook) => {
          const isTesting = testingId === webhook.id;
          const isToggling = togglingId === webhook.id;
          const hasFailures = webhook.failureCount > 0;
          
          return (
            <Card key={webhook.id} className={cn(
              'transition-colors',
              !webhook.isActive && 'opacity-60'
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Status indicator */}
                  <div className="mt-1">
                    {webhook.isActive ? (
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        hasFailures ? 'bg-amber-500' : 'bg-green-500'
                      )} />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                    )}
                  </div>
                  
                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{webhook.name}</h3>
                      {webhook.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          Disabled
                        </Badge>
                      )}
                      {hasFailures && (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {webhook.failureCount} failures
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-2 truncate">
                      {webhook.url}
                    </div>
                    
                    <EventBadges
                      events={webhook.events as WebhookEventTypeValue[]}
                      maxDisplay={4}
                    />
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last triggered: {formatDate(webhook.lastTriggeredAt)}
                      </div>
                      {webhook.lastStatus && (
                        <Badge variant="secondary" className="text-xs">
                          {webhook.lastStatus}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(webhook)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTest(webhook.id)} disabled={isTesting}>
                        <Send className={cn('h-4 w-4 mr-2', isTesting && 'animate-pulse')} />
                        {isTesting ? 'Testing...' : 'Test'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewDeliveries(webhook.id)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Deliveries
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleToggle(webhook.id, webhook.isActive)}
                        disabled={isToggling}
                      >
                        {webhook.isActive ? (
                          <>
                            <PowerOff className="h-4 w-4 mr-2" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4 mr-2" />
                            Enable
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone.
              The endpoint will no longer receive event notifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
