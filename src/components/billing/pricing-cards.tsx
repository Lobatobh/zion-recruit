'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLANS, formatPrice, type PlanConfig } from '@/lib/stripe/products';
import { Plan } from '@prisma/client';

interface PricingCardsProps {
  currentPlan?: Plan;
  tenantId: string;
  onSelectPlan?: (plan: PlanConfig) => void;
}

export function PricingCards({ currentPlan = 'FREE', tenantId, onSelectPlan }: PricingCardsProps) {
  const [loading, setLoading] = useState<Plan | null>(null);

  const handleSelectPlan = async (plan: PlanConfig) => {
    if (plan.id === currentPlan) return;
    
    if (plan.id === 'ENTERPRISE') {
      // Open contact sales modal or redirect
      if (onSelectPlan) {
        onSelectPlan(plan);
      }
      return;
    }

    setLoading(plan.id);
    
    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, tenantId }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        console.error('Failed to create checkout session:', data.error);
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
    } finally {
      setLoading(null);
    }
  };

  const plans = Object.values(PLANS);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlan;
        const isLoading = loading === plan.id;

        return (
          <Card
            key={plan.id}
            className={cn(
              'relative flex flex-col transition-all duration-200',
              plan.highlighted && 'border-primary shadow-lg scale-105',
              isCurrent && 'border-green-500 bg-green-50/50 dark:bg-green-950/20'
            )}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              </div>
            )}

            {isCurrent && (
              <div className="absolute -top-3 right-4">
                <Badge variant="outline" className="bg-green-500 text-white border-green-500">
                  Current Plan
                </Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                {plan.id === 'ENTERPRISE' ? (
                  <Building2 className="h-6 w-6 text-primary" />
                ) : plan.id === 'FREE' ? (
                  <span className="text-xl font-bold text-primary">Free</span>
                ) : (
                  <Zap className="h-6 w-6 text-primary" />
                )}
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <div className="mb-6 text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">
                    {formatPrice(plan.price, plan.currency)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">
                      /{plan.interval}
                    </span>
                  )}
                </div>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium text-sm mb-2">Limits:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {plan.limits.jobs === -1 ? 'Unlimited' : plan.limits.jobs} jobs</li>
                  <li>• {plan.limits.candidates === -1 ? 'Unlimited' : plan.limits.candidates} candidates</li>
                  <li>• {plan.limits.members === -1 ? 'Unlimited' : plan.limits.members} team members</li>
                </ul>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={plan.highlighted ? 'default' : 'outline'}
                disabled={isCurrent || isLoading}
                onClick={() => handleSelectPlan(plan)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isCurrent ? (
                  'Current Plan'
                ) : (
                  plan.cta
                )}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
