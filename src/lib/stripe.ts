import Stripe from 'stripe';

// Using lazy initialization pattern as recommended in Stripe docs for build-time issues
let stripeInstance: Stripe | null = null;

const getStripeInstance = (): Stripe => {
  if (!stripeInstance) {
    // Use placeholder during build if env var is not available
    const secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
    
    if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable in production');
    }
    
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return stripeInstance;
};

// Export a proxy that lazily initializes Stripe
export const stripe = new Proxy({} as Stripe, {
  get(target, prop, receiver) {
    const instance = getStripeInstance();
    return Reflect.get(instance, prop, instance);
  },
});

// Helper function to validate price IDs
const isValidPriceId = (priceId: string | undefined): boolean => {
  if (!priceId) return false;
  // Check if it's a valid Stripe price ID format (starts with price_)
  // or if it's just a number (which is invalid)
  return priceId.startsWith('price_') && priceId.length > 10;
};

// Validate pro price ID
const validateEnvironmentVariables = () => {
  if (!isValidPriceId(process.env.STRIPE_PRICE_PRO_MONTHLY)) {
    console.warn('⚠️ STRIPE_PRICE_PRO_MONTHLY is not set or invalid (should start with "price_")');
    console.warn('1. Go to https://dashboard.stripe.com/products and create a Pro product at $5/month');
    console.warn('2. Copy the price ID and add it to your .env as STRIPE_PRICE_PRO_MONTHLY\n');
  }
};

validateEnvironmentVariables();

// Stripe price IDs — single Pro plan at $5/month
export const STRIPE_PRICES = {
  pro: {
    monthly: isValidPriceId(process.env.STRIPE_PRICE_PRO_MONTHLY)
      ? process.env.STRIPE_PRICE_PRO_MONTHLY!
      : 'price_test_pro',
  },
};

// Stripe success and cancel URLs
export const getStripeUrls = (origin: string) => ({
  success: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel: `${origin}/pricing`,
});

export async function createCheckoutSession({
  priceId,
  customerId,
  customerEmail,
  origin,
  metadata = {},
}: {
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  origin: string;
  metadata?: Record<string, string>;
}) {
  const urls = getStripeUrls(origin);
  const stripeClient = getStripeInstance();
  
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    // payment_method_types is optional in latest API - Stripe auto-detects based on account
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: urls.success,
    cancel_url: urls.cancel,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    // Automatic tax requires origin address configuration in Stripe dashboard
    // Disable for test mode or configure at: https://dashboard.stripe.com/test/settings/tax
    automatic_tax: {
      enabled: false,
    },
    // Customer creation behavior (2022-08-01 change: default is now 'if_required')
    customer_creation: customerId ? undefined : 'if_required',
    customer_update: customerId ? {
      address: 'auto',
    } : undefined,
    // Enhanced subscription data for better tracking
    subscription_data: {
      metadata: {
        ...metadata,
        source: 'web_checkout',
      },
    },
    // Phone number collection (new in Acacia)
    phone_number_collection: {
      enabled: false, // Set to true if you want to collect phone numbers
    },
    metadata,
  };

  // Add customer if exists, otherwise collect email
  if (customerId) {
    sessionConfig.customer = customerId;
  } else if (customerEmail) {
    sessionConfig.customer_email = customerEmail;
  }

  const session = await stripeClient.checkout.sessions.create(sessionConfig);
  
  return session;
}

export async function getCustomerByEmail(email: string) {
  const stripeClient = getStripeInstance();
  const customers = await stripeClient.customers.list({
    email,
    limit: 1,
  });
  
  return customers.data[0] || null;
}

export async function createCustomer({
  email,
  name,
  metadata = {},
}: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}) {
  const stripeClient = getStripeInstance();
  const customer = await stripeClient.customers.create({
    email,
    name,
    metadata,
  });
  
  return customer;
}

export async function cancelSubscription(subscriptionId: string, immediately = false) {
  const stripeClient = getStripeInstance();
  // Best practice: Allow for immediate cancellation or at period end
  const subscription = await stripeClient.subscriptions.update(subscriptionId, {
    cancel_at_period_end: !immediately,
    cancellation_details: {
      comment: 'Customer requested cancellation',
    },
  });
  
  // If immediate cancellation is requested
  if (immediately) {
    return await stripeClient.subscriptions.cancel(subscriptionId);
  }
  
  return subscription;
}

export async function getSubscription(subscriptionId: string) {
  const stripeClient = getStripeInstance();
  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
  return subscription;
}

export async function updateSubscription(
  subscriptionId: string,
  params: Stripe.SubscriptionUpdateParams
) {
  const stripeClient = getStripeInstance();
  const subscription = await stripeClient.subscriptions.update(subscriptionId, params);
  return subscription;
}

// Webhook event handler types
export interface StripeWebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
) {
  const stripeClient = getStripeInstance();
  return stripeClient.webhooks.constructEvent(payload, signature, secret);
}

// Modern helper for handling Stripe errors
export function handleStripeError(error: any) {
  if (error.type === 'StripeCardError') {
    // Card errors are expected, return user-friendly message
    return { 
      error: error.message,
      code: error.code,
      decline_code: error.decline_code,
    };
  } else if (error.type === 'StripeRateLimitError') {
    // Too many requests made to the API too quickly
    console.error('Stripe rate limit error:', error);
    return { error: 'Too many requests. Please try again later.' };
  } else if (error.type === 'StripeInvalidRequestError') {
    // Invalid parameters were supplied to Stripe's API
    console.error('Invalid Stripe request:', error);
    return { error: 'Invalid request. Please check your information.' };
  } else if (error.type === 'StripeAPIError') {
    // An error occurred internally with Stripe's API
    console.error('Stripe API error:', error);
    return { error: 'Payment service error. Please try again.' };
  } else if (error.type === 'StripeConnectionError') {
    // Network communication with Stripe failed
    console.error('Stripe connection error:', error);
    return { error: 'Network error. Please check your connection.' };
  } else if (error.type === 'StripeAuthenticationError') {
    // Authentication with Stripe's API failed
    console.error('Stripe authentication error:', error);
    return { error: 'Authentication error. Please contact support.' };
  } else {
    // Handle any other errors
    console.error('Unknown Stripe error:', error);
    return { error: 'An unexpected error occurred.' };
  }
}

// Helper to retrieve or create a customer with better error handling
export async function getOrCreateCustomer({
  email,
  name,
  metadata = {},
}: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}) {
  try {
    // First try to find existing customer
    const existingCustomer = await getCustomerByEmail(email);
    if (existingCustomer) {
      // Update metadata if customer exists
      const stripeClient = getStripeInstance();
      return await stripeClient.customers.update(existingCustomer.id, {
        name: name || existingCustomer.name || undefined,
        metadata: { ...existingCustomer.metadata, ...metadata },
      });
    }
    
    // Create new customer if not found
    return await createCustomer({ email, name, metadata });
  } catch (error) {
    console.error('Error in getOrCreateCustomer:', error);
    throw error;
  }
}