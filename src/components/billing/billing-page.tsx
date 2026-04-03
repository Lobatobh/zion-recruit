'use client';

import { PricingCards } from './pricing-cards';
import { SubscriptionStatus } from './subscription-status';
import { BillingHistory } from './billing-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, History, Sparkles } from 'lucide-react';
import { Plan, SubscriptionStatus as SubStatus } from '@prisma/client';

interface BillingPageProps {
  tenantId: string;
  currentPlan: Plan;
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
  invoices?: Array<{
    id: string;
    number: string | null;
    status: string;
    amountPaid: number;
    currency: string;
    createdAt: number;
    invoicePdf: string | null;
    hostedInvoiceUrl: string | null;
  }>;
}

export function BillingPage({
  tenantId,
  currentPlan,
  subscription,
  tenant,
  paymentMethod,
  invoices = [],
}: BillingPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Billing & Subscription</h2>
        <p className="text-muted-foreground">
          Manage your subscription, payment methods, and view billing history.
        </p>
      </div>

      <Tabs defaultValue="subscription" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionStatus
            subscription={subscription}
            tenant={tenant}
            paymentMethod={paymentMethod}
            tenantId={tenantId}
          />
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Available Plans</h3>
              <p className="text-sm text-muted-foreground">
                Choose the plan that best fits your needs. All plans include a 14-day free trial.
              </p>
            </div>
            <PricingCards
              currentPlan={currentPlan}
              tenantId={tenantId}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <BillingHistory invoices={invoices} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
