import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCheckoutSession, getCustomerByEmail, createCustomer, STRIPE_PRICES } from '@/lib/stripe';
import { prisma } from '@/lib/prisma-optimized';

export async function POST(request: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);
    
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
    const validPlanTypes = ['essential', 'growth', 'unlimited'];
    if (!validPlanTypes.includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }
    
    // Validate the price ID matches the expected price for the plan
    const expectedPriceId = STRIPE_PRICES[planType as keyof typeof STRIPE_PRICES]?.[isAnnual ? 'annual' : 'monthly'];
    
    // In development, allow test price IDs that start with 'price_test_'
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTestPriceId = priceId.startsWith('price_test_');
    
    if (!isDevelopment && priceId !== expectedPriceId) {
      return NextResponse.json(
        { error: 'Invalid price ID for selected plan' },
        { status: 400 }
      );
    }
    
    if (isDevelopment && !isTestPriceId && priceId !== expectedPriceId) {
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
        customerId = user.stripeCustomerId;
      } else {
        // Check if customer exists in Stripe
        let customer = await getCustomerByEmail(customerEmail);
        
        // Create customer if doesn't exist
        if (!customer) {
          customer = await createCustomer({
            email: customerEmail,
            name: session.user.name || undefined,
            metadata: {
              userId: userId,
            },
          });
        }
        
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
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}