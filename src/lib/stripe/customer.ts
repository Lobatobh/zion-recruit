import { stripe } from './client';
import { db } from '@/lib/db';

export interface CustomerData {
  email: string;
  name: string;
  tenantId: string;
  tenantName: string;
  metadata?: Record<string, string>;
}

/**
 * Create a Stripe customer for a tenant
 */
export async function createStripeCustomer(data: CustomerData) {
  try {
    const customer = await stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: {
        tenantId: data.tenantId,
        tenantName: data.tenantName,
        ...data.metadata,
      },
    });

    // Update tenant with Stripe customer ID
    await db.tenant.update({
      where: { id: data.tenantId },
      data: { stripeCustomerId: customer.id },
    });

    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

/**
 * Get or create a Stripe customer for a tenant
 */
export async function getOrCreateStripeCustomer(
  tenantId: string,
  email: string,
  name: string,
  tenantName: string
) {
  // Check if tenant already has a Stripe customer ID
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { stripeCustomerId: true, name: true },
  });

  if (tenant?.stripeCustomerId) {
    // Verify customer exists in Stripe
    try {
      const customer = await stripe.customers.retrieve(tenant.stripeCustomerId);
      if (customer && !('deleted' in customer)) {
        return customer;
      }
    } catch (error) {
      console.error('Error retrieving Stripe customer:', error);
      // Customer doesn't exist, create new one
    }
  }

  // Create new customer
  return createStripeCustomer({
    email,
    name,
    tenantId,
    tenantName: tenantName || tenant.name,
  });
}

/**
 * Update a Stripe customer
 */
export async function updateStripeCustomer(
  customerId: string,
  data: {
    email?: string;
    name?: string;
    metadata?: Record<string, string>;
  }
) {
  try {
    const customer = await stripe.customers.update(customerId, data);
    return customer;
  } catch (error) {
    console.error('Error updating Stripe customer:', error);
    throw error;
  }
}

/**
 * Get customer by ID from Stripe
 */
export async function getStripeCustomer(customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ('deleted' in customer) {
      return null;
    }
    return customer;
  } catch (error) {
    console.error('Error retrieving Stripe customer:', error);
    return null;
  }
}

/**
 * Get customer's default payment method
 */
export async function getCustomerDefaultPaymentMethod(customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ('deleted' in customer) {
      return null;
    }
    
    const customerData = customer as Stripe.Customer;
    
    if (customerData.invoice_settings?.default_payment_method) {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        customerData.invoice_settings.default_payment_method as string
      );
      return paymentMethod;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting default payment method:', error);
    return null;
  }
}

/**
 * List customer's payment methods
 */
export async function listCustomerPaymentMethods(customerId: string) {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data;
  } catch (error) {
    console.error('Error listing payment methods:', error);
    return [];
  }
}

/**
 * Delete a Stripe customer
 */
export async function deleteStripeCustomer(customerId: string) {
  try {
    await stripe.customers.del(customerId);
    return true;
  } catch (error) {
    console.error('Error deleting Stripe customer:', error);
    return false;
  }
}
