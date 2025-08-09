import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
});

// Validate required environment variables
const validateEnvironmentVariables = () => {
  const required = [
    'STRIPE_PRICE_ESSENTIAL_MONTHLY',
    'STRIPE_PRICE_ESSENTIAL_ANNUAL',
    'STRIPE_PRICE_GROWTH_MONTHLY',
    'STRIPE_PRICE_GROWTH_ANNUAL',
    'STRIPE_PRICE_UNLIMITED_MONTHLY',
    'STRIPE_PRICE_UNLIMITED_ANNUAL',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️ Missing Stripe price environment variables: ${missing.join(', ')}`);
    console.warn('Using test price IDs as fallback. Please configure production price IDs.');
  }
};

validateEnvironmentVariables();

// Stripe price IDs from environment variables with fallbacks for development
export const STRIPE_PRICES = {
  essential: {
    monthly: process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY || 'price_test_essential_monthly',
    annual: process.env.STRIPE_PRICE_ESSENTIAL_ANNUAL || 'price_test_essential_annual',
  },
  growth: {
    monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY || 'price_test_growth_monthly',
    annual: process.env.STRIPE_PRICE_GROWTH_ANNUAL || 'price_test_growth_annual',
  },
  unlimited: {
    monthly: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY || 'price_test_unlimited_monthly',
    annual: process.env.STRIPE_PRICE_UNLIMITED_ANNUAL || 'price_test_unlimited_annual',
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
  
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
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
    automatic_tax: {
      enabled: true,
    },
    customer_update: customerId ? {
      address: 'auto',
    } : undefined,
    metadata,
  };

  // Add customer if exists, otherwise collect email
  if (customerId) {
    sessionConfig.customer = customerId;
  } else if (customerEmail) {
    sessionConfig.customer_email = customerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);
  
  return session;
}

export async function getCustomerByEmail(email: string) {
  const customers = await stripe.customers.list({
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
  const customer = await stripe.customers.create({
    email,
    name,
    metadata,
  });
  
  return customer;
}

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}

export async function getSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

export async function updateSubscription(
  subscriptionId: string,
  params: Stripe.SubscriptionUpdateParams
) {
  const subscription = await stripe.subscriptions.update(subscriptionId, params);
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
  return stripe.webhooks.constructEvent(payload, signature, secret);
}