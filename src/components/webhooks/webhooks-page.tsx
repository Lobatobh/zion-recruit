'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ExternalLink, RefreshCw, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { WebhookList } from './webhook-list';
import { WebhookForm, SecretDisplayDialog } from './webhook-form';
import { DeliveryHistory } from './delivery-history';
import {
  WebhookWithDecryptedSecret,
  WebhookEventTypeValue,
} from '@/lib/webhooks';

export function WebhooksPage() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookWithDecryptedSecret[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookWithDecryptedSecret | null>(null);
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [newSecret, setNewSecret] = useState<string>('');
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('webhooks');
  
  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/webhooks');
      const data = await response.json();
      
      if (response.ok) {
        setWebhooks(data.webhooks);
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load webhooks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);
  
  const handleCreate = () => {
    setEditingWebhook(null);
    setFormOpen(true);
  };
  
  const handleEdit = (webhook: WebhookWithDecryptedSecret) => {
    setEditingWebhook(webhook);
    setFormOpen(true);
  };
  
  const handleFormSubmit = async (data: {
    name: string;
    url: string;
    events: WebhookEventTypeValue[];
    isActive: boolean;
  }) => {
    try {
      const url = editingWebhook
        ? `/api/webhooks/${editingWebhook.id}`
        : '/api/webhooks';
      
      const response = await fetch(url, {
        method: editingWebhook ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save webhook');
      }
      
      // Show secret for new webhooks
      if (!editingWebhook && result.webhook?.secret) {
        setNewSecret(result.webhook.secret);
        setSecretDialogOpen(true);
      }
      
      toast({
        title: editingWebhook ? 'Webhook updated' : 'Webhook created',
        description: editingWebhook
          ? 'Your webhook has been updated successfully'
          : 'Your webhook has been created successfully',
      });
      
      setFormOpen(false);
      fetchWebhooks();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save webhook',
        variant: 'destructive',
      });
    }
  };
  
  const handleTest = async (webhookId: string) => {
    try {
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Test failed');
      }
      
      toast({
        title: 'Test successful',
        description: `Webhook delivered successfully (HTTP ${result.statusCode})`,
      });
      
      fetchWebhooks();
    } catch (error) {
      toast({
        title: 'Test failed',
        description: error instanceof Error ? error.message : 'Failed to test webhook',
        variant: 'destructive',
      });
    }
  };
  
  const handleToggleActive = async (webhookId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update webhook');
      }
      
      toast({
        title: isActive ? 'Webhook enabled' : 'Webhook disabled',
        description: isActive
          ? 'The webhook will now receive events'
          : 'The webhook has been disabled',
      });
      
      fetchWebhooks();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update webhook status',
        variant: 'destructive',
      });
    }
  };
  
  const handleDelete = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete webhook');
      }
      
      toast({
        title: 'Webhook deleted',
        description: 'The webhook has been removed',
      });
      
      fetchWebhooks();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete webhook',
        variant: 'destructive',
      });
    }
  };
  
  const handleViewDeliveries = (webhookId: string) => {
    setSelectedWebhookId(webhookId);
    setActiveTab('deliveries');
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 text-white rounded-b-2xl shadow-lg shadow-violet-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link2 className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Webhooks</h1>
              <p className="text-white/80 text-sm">Manage webhooks for real-time event notifications</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchWebhooks} disabled={loading} className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleCreate} className="bg-white text-violet-700 hover:bg-white/90 font-medium">
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </div>
        </div>
      </div>
      
      {/* Documentation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Webhooks Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Webhooks allow external services to receive real-time notifications when events occur in your recruitment pipeline.
            When an event is triggered, we'll send an HTTP POST request to your configured URL with details about the event.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Each webhook has a unique secret used to verify request signatures</li>
            <li>Signatures use HMAC-SHA256 for secure verification</li>
            <li>Failed deliveries are automatically retried with exponential backoff</li>
            <li>Webhooks are disabled after 10 consecutive failures</li>
          </ul>
        </CardContent>
      </Card>
      
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="webhooks">
            Webhooks
            {webhooks.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/10">
                {webhooks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="deliveries">
            Delivery History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="webhooks" className="mt-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <WebhookList
              webhooks={webhooks}
              onEdit={handleEdit}
              onTest={handleTest}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              onViewDeliveries={handleViewDeliveries}
            />
          )}
        </TabsContent>
        
        <TabsContent value="deliveries" className="mt-4">
          <DeliveryHistory webhookId={selectedWebhookId || undefined} />
        </TabsContent>
      </Tabs>
      
      {/* Webhook Form Dialog */}
      <WebhookForm
        open={formOpen}
        onOpenChange={setFormOpen}
        webhook={editingWebhook || undefined}
        onSubmit={handleFormSubmit}
        onTest={editingWebhook ? () => handleTest(editingWebhook.id) : undefined}
      />
      
      {/* Secret Display Dialog */}
      <SecretDisplayDialog
        open={secretDialogOpen}
        onOpenChange={setSecretDialogOpen}
        secret={newSecret}
      />
    </div>
  );
}
