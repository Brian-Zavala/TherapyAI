import { loadStripe } from '@stripe/stripe-js';

// Make sure to use the NEXT_PUBLIC_ prefix for client-side environment variables
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
}

// Initialize Stripe.js
let stripePromise: Promise<any> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// Helper function to redirect to Stripe Checkout
export async function redirectToCheckout(sessionId: string) {
  const stripe = await getStripe();
  
  if (!stripe) {
    throw new Error('Stripe failed to initialize');
  }
  
  const { error } = await stripe.redirectToCheckout({ sessionId });
  
  if (error) {
    console.error('Stripe checkout error:', error);
    throw error;
  }
}

// Helper function to handle checkout session creation
export async function createCheckoutSession({
  priceId,
  planType,
  isAnnual,
}: {
  priceId: string;
  planType: 'essential' | 'growth' | 'unlimited';
  isAnnual: boolean;
}) {
  try {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        planType,
        isAnnual,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const { sessionId } = await response.json();
    
    // Redirect to Stripe Checkout
    await redirectToCheckout(sessionId);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}