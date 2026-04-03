'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { EventTypeInfo, WebhookEventTypeValue, getDeliveryStatus } from '@/lib/webhooks';

interface Delivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  statusCode: number | null;
  response: string | null;
  deliveredAt: Date | null;
  attempts: number;
  nextRetryAt: Date | null;
  createdAt: Date;
  webhook: {
    id: string;
    name: string;
    url: string;
  };
}

interface DeliveryHistoryProps {
  webhookId?: string;
  className?: string;
}

export function DeliveryHistory({ webhookId, className }: DeliveryHistoryProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  
  const limit = 20;
  
  useEffect(() => {
    fetchDeliveries();
  }, [webhookId, page]);
  
  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const url = webhookId
        ? `/api/webhooks/${webhookId}/deliveries?limit=${limit}&offset=${page * limit}`
        : `/api/webhooks/deliveries?limit=${limit}&offset=${page * limit}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setDeliveries(data.deliveries);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusIcon = (delivery: Delivery) => {
    const status = getDeliveryStatus({
      deliveredAt: delivery.deliveredAt ? new Date(delivery.deliveredAt) : null,
      statusCode: delivery.statusCode,
      nextRetryAt: delivery.nextRetryAt ? new Date(delivery.nextRetryAt) : null,
      attempts: delivery.attempts,
    });
    
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'retrying':
        return <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getStatusBadge = (delivery: Delivery) => {
    const status = getDeliveryStatus({
      deliveredAt: delivery.deliveredAt ? new Date(delivery.deliveredAt) : null,
      statusCode: delivery.statusCode,
      nextRetryAt: delivery.nextRetryAt ? new Date(delivery.nextRetryAt) : null,
      attempts: delivery.attempts,
    });
    
    const variants = {
      success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      retrying: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    };
    
    return (
      <Badge variant="outline" className={cn('font-normal', variants[status])}>
        {status}
      </Badge>
    );
  };
  
  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  };
  
  const totalPages = Math.ceil(total / limit);
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Delivery History</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No delivery history yet
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedDelivery(delivery)}
                >
                  {getStatusIcon(delivery)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {EventTypeInfo[delivery.eventType as WebhookEventTypeValue]?.label || delivery.eventType}
                      </span>
                      {getStatusBadge(delivery)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {delivery.webhook.name} • {formatDate(delivery.createdAt)}
                      {delivery.statusCode && ` • ${delivery.statusCode}`}
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      {/* Delivery Detail Dialog */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogDescription>
              {selectedDelivery && (
                <>
                  {EventTypeInfo[selectedDelivery.eventType as WebhookEventTypeValue]?.label}
                  {' • '}
                  {formatDate(selectedDelivery.createdAt)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDelivery && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                  {getStatusIcon(selectedDelivery)}
                  <div>
                    <div className="font-medium">Status</div>
                    <div className="text-sm text-muted-foreground">
                      {getDeliveryStatus({
                        deliveredAt: selectedDelivery.deliveredAt ? new Date(selectedDelivery.deliveredAt) : null,
                        statusCode: selectedDelivery.statusCode,
                        nextRetryAt: selectedDelivery.nextRetryAt ? new Date(selectedDelivery.nextRetryAt) : null,
                        attempts: selectedDelivery.attempts,
                      })}
                      {selectedDelivery.statusCode && ` • HTTP ${selectedDelivery.statusCode}`}
                    </div>
                  </div>
                </div>
                
                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">Webhook</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedDelivery.webhook.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Attempts</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedDelivery.attempts}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Delivered At</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedDelivery.deliveredAt
                        ? formatDate(selectedDelivery.deliveredAt)
                        : 'Pending'}
                    </div>
                  </div>
                  {selectedDelivery.nextRetryAt && (
                    <div>
                      <div className="text-sm font-medium">Next Retry</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(selectedDelivery.nextRetryAt)}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Payload */}
                <div>
                  <div className="text-sm font-medium mb-2">Payload</div>
                  <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-xs">
                    {JSON.stringify(selectedDelivery.payload, null, 2)}
                  </pre>
                </div>
                
                {/* Response */}
                {selectedDelivery.response && (
                  <div>
                    <div className="text-sm font-medium mb-2">Response</div>
                    <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-xs max-h-40">
                      {selectedDelivery.response}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
