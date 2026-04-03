'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Copy, Eye, EyeOff, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EventSelector, EventBadges } from './event-selector';
import { WebhookEventTypeValue, WebhookWithDecryptedSecret } from '@/lib/webhooks';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  url: z.string().url('Must be a valid URL').startsWith('http', 'Must start with http:// or https://'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface WebhookFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook?: WebhookWithDecryptedSecret;
  onSubmit: (data: FormData) => Promise<void>;
  onTest?: () => Promise<void>;
  onRegenerateSecret?: () => Promise<void>;
  isLoading?: boolean;
}

export function WebhookForm({
  open,
  onOpenChange,
  webhook,
  onSubmit,
  onTest,
  onRegenerateSecret,
  isLoading,
}: WebhookFormProps) {
  const { toast } = useToast();
  const [showSecret, setShowSecret] = useState(false);
  const [secret, setSecret] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  
  const isEditing = !!webhook;
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: webhook?.name || '',
      url: webhook?.url || '',
      events: (webhook?.events as WebhookEventTypeValue[]) || [],
      isActive: webhook?.isActive ?? true,
    },
  });
  
  const handleSubmit = async (data: FormData) => {
    await onSubmit(data);
    if (!isEditing) {
      // For new webhooks, the secret will be returned
      // The parent component will handle displaying it
    }
  };
  
  const handleTest = async () => {
    if (!onTest) return;
    
    setTesting(true);
    try {
      await onTest();
      toast({
        title: 'Test successful',
        description: 'Webhook test delivery was successful',
      });
    } catch (error) {
      toast({
        title: 'Test failed',
        description: error instanceof Error ? error.message : 'Failed to test webhook',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };
  
  const handleRegenerateSecret = async () => {
    if (!onRegenerateSecret) return;
    
    setRegenerating(true);
    try {
      await onRegenerateSecret();
      toast({
        title: 'Secret regenerated',
        description: 'Make sure to update your webhook endpoint with the new secret',
      });
    } catch (error) {
      toast({
        title: 'Failed to regenerate',
        description: error instanceof Error ? error.message : 'Failed to regenerate secret',
        variant: 'destructive',
      });
    } finally {
      setRegenerating(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Copied to clipboard',
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Webhook' : 'Create Webhook'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update webhook configuration and event subscriptions.'
              : 'Configure a new webhook to receive event notifications.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Webhook" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this webhook
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/webhook"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The URL where we'll send webhook requests
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="events"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Events</FormLabel>
                  <FormControl>
                    <EventSelector
                      value={field.value as WebhookEventTypeValue[]}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  {field.value.length > 0 && (
                    <div className="mt-2">
                      <EventBadges events={field.value as WebhookEventTypeValue[]} />
                    </div>
                  )}
                  <FormDescription>
                    Select which events should trigger this webhook
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Webhook will receive events when active
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {isEditing && webhook?.secret && (
              <div className="space-y-2">
                <FormLabel>Secret</FormLabel>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      value={webhook.secret || secret}
                      readOnly
                      className="pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(webhook.secret || secret)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRegenerateSecret}
                    disabled={regenerating}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </div>
                <FormDescription>
                  Use this secret to verify webhook signatures
                </FormDescription>
              </div>
            )}
            
            <DialogFooter className="gap-2">
              {isEditing && onTest && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Test
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Webhook'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Dialog to show the secret after creation
interface SecretDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secret: string;
}

export function SecretDisplayDialog({ open, onOpenChange, secret }: SecretDisplayDialogProps) {
  const { toast } = useToast();
  const [showSecret, setShowSecret] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(secret);
    toast({
      title: 'Copied!',
      description: 'Secret copied to clipboard',
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Webhook Created!</DialogTitle>
          <DialogDescription>
            Save your webhook secret now - it won't be shown again!
          </DialogDescription>
        </DialogHeader>
        
        <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            This secret is used to verify webhook signatures. Store it securely and use it in your webhook endpoint to validate incoming requests.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <FormLabel>Webhook Secret</FormLabel>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                readOnly
                className="pr-20 font-mono text-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            I've saved the secret
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
