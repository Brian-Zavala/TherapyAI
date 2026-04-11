import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, getOrCreateCustomer, STRIPE_PRICES, handleStripeError } from '@/lib/stripe';
import { prisma } from '@/lib/prisma-optimized';

export async function POST(request: NextRequest) {
  try {
    // Get the user session
    const session = await getAuthSession();
    
    // Get request data
    const body = await request.json();
    const { priceId, planType, isAnnual } = body;
    
    // Validate the price ID
    if (!priceId || !planType) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Validate the plan type
    const validPlanTypes = ['pro'];
    if (!validPlanTypes.includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Validate the price ID matches one of the expected Pro prices
    const validPriceIds = [STRIPE_PRICES['pro'].monthly, STRIPE_PRICES['pro'].annual];

    // In development, allow test price IDs that start with 'price_test_'
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTestPriceId = priceId.startsWith('price_test_');

    if (!isDevelopment && !validPriceIds.includes(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID for selected plan' },
        { status: 400 }
      );
    }

    if (isDevelopment && !isTestPriceId && !validPriceIds.includes(priceId)) {
      console.warn(`⚠️ Using non-standard price ID in development: ${priceId}`);
    }
    
    let customerId: string | undefined;
    let customerEmail: string | undefined;
    let userId: string | undefined;
    
    // If user is authenticated, try to get or create their Stripe customer
    if (session?.user?.email) {
      customerEmail = session.user.email;
      userId = session.user.id;
      
      // Check if user already has a Stripe customer ID in the database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });
      
      if (user?.stripeCustomerId) {
        // Verify the customer still exists in Stripe
        try {
          const { stripe } = require('@/lib/stripe');
          await stripe.customers.retrieve(user.stripeCustomerId);
          customerId = user.stripeCustomerId;
        } catch (error: any) {
          // Customer doesn't exist in Stripe, create a new one
          console.warn(`Customer ${user.stripeCustomerId} not found in Stripe, creating new customer`);
          customerId = undefined as any; // Will create new customer below
        }
      }
      
      // If no valid customer ID, create a new customer
      if (!customerId) {
        // Get or create customer using modern helper
        const customer = await getOrCreateCustomer({
          email: customerEmail,
          name: session.user.name || undefined,
          metadata: {
            userId: userId,
            source: 'checkout_page',
          },
        });
        
        customerId = customer.id;
        
        // Save Stripe customer ID to database
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        });
      }
    }
    
    // Get the origin for success/cancel URLs
    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3001';
    
    // Create the checkout session
    const checkoutSession = await createCheckoutSession({
      priceId,
      customerId,
      customerEmail,
      origin,
      metadata: {
        userId: userId || '',
        planType,
        isAnnual: isAnnual ? 'true' : 'false',
      },
    });
    
    // Return the session ID
    return NextResponse.json({ 
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
    
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    
    // Use modern error handler for Stripe errors
    const errorResponse = handleStripeError(error);
    
    return NextResponse.json(
      { 
        error: errorResponse.error || 'Failed to create checkout session',
        message: error.message || 'Unknown error occurred',
        code: errorResponse.code,
      },
      { status: error.statusCode || 500 }
    );
  }
}