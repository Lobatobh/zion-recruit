import Stripe from 'stripe';

// Stripe client initialization
// Uses test mode keys by default (sk_test_...)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-04-30.basil',
  appInfo: {
    name: 'Zion Recruit',
    version: '2.0.0',
  },
});

// Webhook secret for verifying signatures
export const getWebhookSecret = () => {
  return process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';
};

// Helper to check if Stripe is configured
export const isStripeConfigured = () => {
  return !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_');
};

// Price ID helper for the current environment
export const getPriceId = (priceKey: string) => {
  // In production, use live mode price IDs
  // In development/test, use test mode price IDs
  const isProduction = process.env.NODE_ENV === 'production';
  const prefix = isProduction ? 'LIVE_' : 'TEST_';
  return process.env[`STRIPE_${prefix}${priceKey}`] || process.env[`STRIPE_${priceKey}`];
};
