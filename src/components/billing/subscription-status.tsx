'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { SubscriptionStatus as SubStatus, Plan } from '@prisma/client';
import { PLANS, formatPrice } from '@/lib/stripe/products';
import { useState } from 'react';

interface SubscriptionStatusProps {
  subscription?: {
    id: string;
    status: SubStatus;
    plan: Plan;
    currentPeriodStart: Date | string;
    currentPeriodEnd: Date | string;
    cancelAtPeriodEnd: boolean;
    priceAmount: number;
    priceCurrency: string;
    interval: string;
  } | null;
  tenant: {
    plan: Plan;
    maxJobs: number;
    maxCandidates: number;
    maxMembers: number;
    currentUsage?: {
      jobs: number;
      candidates: number;
      members: number;
    };
  };
  paymentMethod?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  tenantId: string;
}

export function SubscriptionStatus({ 
  subscription, 
  tenant, 
  paymentMethod,
  tenantId 
}: SubscriptionStatusProps) {
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });

      const data = await response.json();

      if (data.success && data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: SubStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'TRIALING':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'PAST_DUE':
      case 'INCOMPLETE':
      case 'UNPAID':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'CANCELED':
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: SubStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500';
      case 'TRIALING':
        return 'bg-blue-500';
      case 'PAST_DUE':
      case 'INCOMPLETE':
      case 'UNPAID':
        return 'bg-red-500';
      case 'CANCELED':
        return 'bg-gray-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const planConfig = PLANS[tenant.plan];
  const periodEnd = subscription?.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd) 
    : null;
  const daysUntilRenewal = periodEnd 
    ? Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your current subscription details</CardDescription>
            </div>
            {subscription && (
              <div className="flex items-center gap-2">
                {getStatusIcon(subscription.status)}
                <Badge className={getStatusColor(subscription.status)}>
                  {subscription.status.replace('_', ' ')}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Info */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <h3 className="font-semibold text-lg">{planConfig.name}</h3>
              <p className="text-sm text-muted-foreground">{planConfig.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {formatPrice(planConfig.price, planConfig.currency)}
              </div>
              {planConfig.price > 0 && (
                <div className="text-sm text-muted-foreground">
                  per {planConfig.interval}
                </div>
              )}
            </div>
          </div>

          {/* Billing Period */}
          {subscription && subscription.status !== 'CANCELED' && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {subscription.cancelAtPeriodEnd 
                    ? 'Access until' 
                    : 'Next billing date'}
                </span>
              </div>
              <span className="font-medium">
                {periodEnd?.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* Days until renewal warning */}
          {subscription && subscription.status === 'PAST_DUE' && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-200">
                    Payment Required
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Your subscription payment has failed. Please update your payment method to avoid service interruption.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trial ending warning */}
          {subscription?.status === 'TRIALING' && daysUntilRenewal && daysUntilRenewal <= 7 && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    Trial Ending Soon
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your trial ends in {daysUntilRenewal} days. Add a payment method to continue using all features.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cancelation scheduled */}
          {subscription?.cancelAtPeriodEnd && (
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                    Subscription Canceled
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Your subscription has been canceled and will end on{' '}
                    {periodEnd?.toLocaleDateString()}. You can reactivate it anytime before then.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Stats */}
      {tenant.currentUsage && (
        <Card>
          <CardHeader>
            <CardTitle>Usage This Period</CardTitle>
            <CardDescription>Your current usage vs plan limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Jobs Usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Jobs</span>
                <span className="text-muted-foreground">
                  {tenant.currentUsage.jobs} / {tenant.maxJobs === 999999 ? '∞' : tenant.maxJobs}
                </span>
              </div>
              <Progress 
                value={tenant.maxJobs === 999999 ? 0 : (tenant.currentUsage.jobs / tenant.maxJobs) * 100} 
                className="h-2"
              />
            </div>

            {/* Candidates Usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Candidates</span>
                <span className="text-muted-foreground">
                  {tenant.currentUsage.candidates} / {tenant.maxCandidates === 999999 ? '∞' : tenant.maxCandidates}
                </span>
              </div>
              <Progress 
                value={tenant.maxCandidates === 999999 ? 0 : (tenant.currentUsage.candidates / tenant.maxCandidates) * 100} 
                className="h-2"
              />
            </div>

            {/* Team Members Usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Team Members</span>
                <span className="text-muted-foreground">
                  {tenant.currentUsage.members} / {tenant.maxMembers === 999999 ? '∞' : tenant.maxMembers}
                </span>
              </div>
              <Progress 
                value={tenant.maxMembers === 999999 ? 0 : (tenant.currentUsage.members / tenant.maxMembers) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Your default payment method</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethod ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium capitalize">{paymentMethod.brand}</div>
                  <div className="text-sm text-muted-foreground">
                    **** **** **** {paymentMethod.last4}
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No payment method on file</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Billing Button */}
      {subscription && (
        <Button 
          onClick={handleManageBilling} 
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage Subscription
            </>
          )}
        </Button>
      )}
    </div>
  );
}
