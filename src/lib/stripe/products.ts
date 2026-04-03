import { Plan } from '@prisma/client';

// Plan configuration with pricing
export interface PlanConfig {
  id: Plan;
  name: string;
  description: string;
  price: number; // in cents
  priceId: string; // Stripe Price ID
  productId: string; // Stripe Product ID
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    jobs: number;
    candidates: number;
    members: number;
  };
  highlighted?: boolean;
  cta: string;
}

// Default plan configurations
// Note: In production, replace these with actual Stripe Price/Product IDs from your Stripe Dashboard
export const PLANS: Record<Plan, PlanConfig> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    description: 'Perfect for trying out Zion Recruit',
    price: 0,
    priceId: 'price_free',
    productId: 'prod_free',
    currency: 'usd',
    interval: 'month',
    features: [
      '1 active job posting',
      '50 candidates database',
      '1 team member',
      'Basic AI screening',
      'Email support',
      'Standard pipeline',
    ],
    limits: {
      jobs: 1,
      candidates: 50,
      members: 1,
    },
    cta: 'Get Started Free',
  },
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    description: 'Great for small recruitment teams',
    price: 4900, // $49.00
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter_test',
    productId: process.env.STRIPE_STARTER_PRODUCT_ID || 'prod_starter_test',
    currency: 'usd',
    interval: 'month',
    features: [
      '5 active job postings',
      '500 candidates database',
      '3 team members',
      'Advanced AI screening',
      'DISC assessments',
      'Email & chat support',
      'Custom pipeline stages',
      'Basic analytics',
    ],
    limits: {
      jobs: 5,
      candidates: 500,
      members: 3,
    },
    highlighted: false,
    cta: 'Start Starter Plan',
  },
  PROFESSIONAL: {
    id: 'PROFESSIONAL',
    name: 'Professional',
    description: 'Best for growing organizations',
    price: 14900, // $149.00
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional_test',
    productId: process.env.STRIPE_PROFESSIONAL_PRODUCT_ID || 'prod_professional_test',
    currency: 'usd',
    interval: 'month',
    features: [
      '25 active job postings',
      '5,000 candidates database',
      '10 team members',
      'Full AI agent suite',
      'Unlimited DISC assessments',
      'Priority support',
      'Advanced analytics & reports',
      'API access',
      'Custom integrations',
      'Omnichannel messaging',
      'Calendar integration',
    ],
    limits: {
      jobs: 25,
      candidates: 5000,
      members: 10,
    },
    highlighted: true,
    cta: 'Start Professional Plan',
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'For large-scale recruitment operations',
    price: 0, // Custom pricing
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_test',
    productId: process.env.STRIPE_ENTERPRISE_PRODUCT_ID || 'prod_enterprise_test',
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited job postings',
      'Unlimited candidates',
      'Unlimited team members',
      'Dedicated account manager',
      'Custom AI training',
      'SSO & SAML',
      'SLA guarantee',
      'Custom integrations',
      'White-label options',
      'On-premise deployment',
      'Advanced security',
      'Audit logs',
    ],
    limits: {
      jobs: -1, // Unlimited
      candidates: -1, // Unlimited
      members: -1, // Unlimited
    },
    cta: 'Contact Sales',
  },
};

// Get plan by ID
export const getPlanById = (planId: Plan): PlanConfig => {
  return PLANS[planId];
};

// Get all plans as array
export const getAllPlans = (): PlanConfig[] => {
  return Object.values(PLANS);
};

// Get paid plans only (for pricing page)
export const getPaidPlans = (): PlanConfig[] => {
  return Object.values(PLANS).filter(plan => plan.price > 0 || plan.id === 'ENTERPRISE');
};

// Compare plans to determine upgrade/downgrade
export const comparePlans = (currentPlan: Plan, newPlan: Plan): 'upgrade' | 'downgrade' | 'same' => {
  const planOrder: Plan[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
  const currentIndex = planOrder.indexOf(currentPlan);
  const newIndex = planOrder.indexOf(newPlan);
  
  if (newIndex > currentIndex) return 'upgrade';
  if (newIndex < currentIndex) return 'downgrade';
  return 'same';
};

// Check if plan has specific feature
export const planHasFeature = (plan: Plan, feature: string): boolean => {
  const config = PLANS[plan];
  return config.features.some(f => f.toLowerCase().includes(feature.toLowerCase()));
};

// Get plan limits
export const getPlanLimits = (plan: Plan) => {
  return PLANS[plan].limits;
};

// Format price for display
export const formatPrice = (price: number, currency: string = 'usd'): string => {
  if (price === 0) return 'Custom';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price / 100);
};
