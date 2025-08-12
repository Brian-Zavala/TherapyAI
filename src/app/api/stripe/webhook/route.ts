import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { constructWebhookEvent, stripe, getSubscription } from '@/lib/stripe';
import { prisma } from '@/lib/prisma-optimized';
import { redis } from '@/lib/redis';
import Stripe from 'stripe';
import { deduplicateWebhookEvent } from '@/lib/webhook-deduplication';
import { creditManager } from '@/lib/services/credit-manager.service';

// Stripe requires the raw body to verify webhook signatures.
// We need to export config to tell Next.js not to parse the body
export const runtime = 'nodejs';

// Webhook secret from environment
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper function to determine plan type from subscription
function getPlanTypeFromSubscription(subscription: any): 'free' | 'essential' | 'growth' | 'unlimited' {
  if (!subscription || !subscription.items?.data?.length) {
    return 'free';
  }
  
  const priceId = subscription.items.data[0].price?.id;
  if (!priceId) return 'free';
  
  // Check price ID or metadata to determine plan
  if (priceId.includes('unlimited') || subscription.metadata?.plan === 'unlimited') {
    return 'unlimited';
  } else if (priceId.includes('growth') || subscription.metadata?.plan === 'growth') {
    return 'growth';
  } else if (priceId.includes('essential') || subscription.metadata?.plan === 'essential') {
    return 'essential';
  }
  
  return 'essential'; // Default to essential for paid plans
}

export async function POST(request: NextRequest) {
  try {
  // Validate webhook secret is configured
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook endpoint not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.warn('⚠️ Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = await constructWebhookEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    // Return 400 to prevent Stripe from retrying invalid requests
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Atomic deduplication check (Best Practice #1)
  const eventObject = event.data.object as any;
  const objectId = eventObject && 'id' in eventObject ? eventObject.id : undefined;
  const isNewEvent = await deduplicateWebhookEvent(event.id, event.type, objectId);
  
  if (!isNewEvent) {
    console.log(`♻️ Duplicate event detected: ${event.type} (${event.id})`);
    return NextResponse.json({ received: true, duplicate: true });
  }
  
  // For critical events, process immediately; for others, queue
  const criticalEvents = ['checkout.session.completed'];
  const shouldProcessImmediately = criticalEvents.includes(event.type);
  
  // Handle the event
  try {
    console.log(`📨 Processing webhook event: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('📋 Checkout session completed:', {
          sessionId: session.id,
          customer: session.customer,
          subscription: session.subscription,
          metadata: session.metadata,
          customerEmail: session.customer_email,
        });
        
        // Log the raw metadata to debug
        console.log('🔍 Raw metadata:', JSON.stringify(session.metadata, null, 2));
        console.log('🔍 User ID from metadata:', session.metadata?.userId);
        
        if (!session.subscription) {
          console.warn('⚠️ Checkout completed but no subscription ID found');
          break;
        }
        
        // Get the subscription and customer info
        let subscription: any;
        
        // Check if this is a test webhook
        const isTestWebhook = session.metadata?.testWebhook === 'true';
        
        if (isTestWebhook) {
          console.log('🧪 Test webhook detected, using mock subscription data');
          subscription = {
            id: session.subscription as string,
            status: 'active',
            items: { data: [] }
          };
        } else {
          try {
            subscription = await getSubscription(
              session.subscription as string
            );
            
            console.log('📊 Subscription details:', {
              id: subscription.id,
              status: subscription.status,
              items: subscription.items.data.map(item => ({
                price: item.price.id,
                product: item.price.product,
              })),
            });
          } catch (error: any) {
            console.error(`❌ Failed to fetch subscription: ${error.message}`);
            // If subscription fetch fails but we have metadata, try to update anyway
            if (session.metadata?.userId) {
              console.log('⚠️ Proceeding with metadata despite subscription fetch failure');
              subscription = {
                id: session.subscription as string,
                status: 'active',
                items: { data: [] }
              };
            } else {
              throw error;
            }
          }
        }
        
        // Update user subscription in database with transaction
        if (session.metadata?.userId) {
          console.log(`🔄 Attempting to update user ${session.metadata.userId} subscription...`);
          try {
            await prisma.$transaction(async (tx) => {
              // Check if user exists
              const user = await tx.user.findUnique({
                where: { id: session.metadata.userId },
              });
              
              console.log(`👤 Found user:`, user ? `${user.email} (${user.id})` : 'NOT FOUND');
              
              if (!user) {
                throw new Error(`User ${session.metadata.userId} not found`);
              }
              
              // Update user subscription
              const updatedUser = await tx.user.update({
                where: { id: session.metadata.userId },
                data: {
                  subscriptionStatus: 'active',
                  subscriptionId: subscription.id,
                  stripeCustomerId: session.customer as string,
                  billingEmail: session.customer_email || user.email,
                },
              });
              
              console.log(`📝 User updated:`, {
                id: updatedUser.id,
                email: updatedUser.email,
                subscriptionStatus: updatedUser.subscriptionStatus,
                subscriptionId: updatedUser.subscriptionId,
                stripeCustomerId: updatedUser.stripeCustomerId,
              });
            });
            
            console.log(`✅ Subscription activated for user ${session.metadata.userId}`);
            
            // Initialize credits for the new subscription
            try {
              const planType = getPlanTypeFromSubscription(subscription);
              const billingStart = new Date();
              const billingEnd = new Date();
              billingEnd.setMonth(billingEnd.getMonth() + 1);
              
              await creditManager.initializeBillingPeriod(
                session.metadata.userId,
                planType,
                billingStart,
                billingEnd,
                subscription.id
              );
              
              console.log(`💳 Credits initialized for user ${session.metadata.userId} (${planType} plan)`);
            } catch (creditError: any) {
              console.error(`⚠️ Failed to initialize credits: ${creditError.message}`);
              // Don't throw - subscription is active even if credit init fails
            }
          } catch (error: any) {
            console.error(`❌ Failed to update user subscription: ${error.message}`);
            console.error('Full error:', error);
            throw error; // Re-throw to trigger webhook retry
          }
        } else {
          console.warn('⚠️ No userId in checkout session metadata');
          console.warn('Session metadata:', session.metadata);
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get the customer
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        ) as Stripe.Customer;
        
        // Update user subscription status
        if (customer.metadata?.userId) {
          await prisma.user.update({
            where: { id: customer.metadata.userId },
            data: {
              subscriptionStatus: subscription.status,
              subscriptionId: subscription.id,
            },
          });
          
          // Initialize credits for new subscription
          const planType = getPlanTypeFromSubscription(subscription);
          const billingStart = new Date(subscription.current_period_start * 1000);
          const billingEnd = new Date(subscription.current_period_end * 1000);
          
          await creditManager.initializeBillingPeriod(
            customer.metadata.userId,
            planType,
            billingStart,
            billingEnd,
            subscription.id
          );
          
          console.log(`💳 Credits initialized for subscription.created: ${customer.metadata.userId} (${planType})`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const previousAttributes = (event.data as any).previous_attributes;
        
        // Get the customer
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        ) as Stripe.Customer;
        
        // Update user subscription status
        if (customer.metadata?.userId) {
          await prisma.user.update({
            where: { id: customer.metadata.userId },
            data: {
              subscriptionStatus: subscription.status,
              subscriptionId: subscription.id,
            },
          });
          
          // Check if plan changed (price ID changed)
          if (previousAttributes?.items) {
            const newPlanType = getPlanTypeFromSubscription(subscription);
            
            // Determine old plan type from previous attributes
            const oldPriceId = previousAttributes.items?.data?.[0]?.price?.id;
            let oldPlanType: 'free' | 'essential' | 'growth' | 'unlimited' = 'free';
            
            if (oldPriceId) {
              if (oldPriceId.includes('unlimited')) oldPlanType = 'unlimited';
              else if (oldPriceId.includes('growth')) oldPlanType = 'growth';
              else if (oldPriceId.includes('essential')) oldPlanType = 'essential';
            }
            
            const billingStart = new Date(subscription.current_period_start * 1000);
            const billingEnd = new Date(subscription.current_period_end * 1000);
            
            // Use upgrade handler if moving to higher tier
            const planHierarchy = { free: 0, essential: 1, growth: 2, unlimited: 3 };
            
            if (planHierarchy[newPlanType] > planHierarchy[oldPlanType]) {
              // Upgrade - preserve existing credits and add new tier credits
              await creditManager.handleSubscriptionUpgrade(
                customer.metadata.userId,
                newPlanType,
                oldPlanType,
                billingStart,
                billingEnd,
                subscription.id
              );
              console.log(`⬆️ Credits upgraded: ${customer.metadata.userId} (${oldPlanType} → ${newPlanType})`);
            } else {
              // Downgrade or same tier - reset to new plan credits
              await creditManager.initializeBillingPeriod(
                customer.metadata.userId,
                newPlanType,
                billingStart,
                billingEnd,
                subscription.id
              );
              console.log(`💳 Credits reset for plan change: ${customer.metadata.userId} (${oldPlanType} → ${newPlanType})`);
            }
          }
          
          console.log(`📝 Subscription updated for user ${customer.metadata.userId}: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get the customer
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        ) as Stripe.Customer;
        
        // Update user subscription status to canceled
        if (customer.metadata?.userId) {
          await prisma.user.update({
            where: { id: customer.metadata.userId },
            data: {
              subscriptionStatus: 'canceled',
              subscriptionId: null,
            },
          });
          
          // Downgrade to free tier
          await creditManager.downgradeToFree(customer.metadata.userId);
          
          console.log(`❌ Subscription canceled for user ${customer.metadata.userId}, downgraded to free tier`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`💰 Payment succeeded for invoice ${invoice.id}`);
        
        // Reset credits for new billing period
        if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
          const customer = await stripe.customers.retrieve(
            invoice.customer as string
          ) as Stripe.Customer;
          
          if (customer.metadata?.userId) {
            const subscription = await getSubscription(invoice.subscription as string);
            const planType = getPlanTypeFromSubscription(subscription);
            const billingStart = new Date(subscription.current_period_start * 1000);
            const billingEnd = new Date(subscription.current_period_end * 1000);
            
            await creditManager.resetBillingPeriod(
              customer.metadata.userId,
              planType,
              billingStart,
              billingEnd,
              subscription.id
            );
            
            console.log(`🔄 Credits reset for new billing period: ${customer.metadata.userId} (${planType})`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Get the customer
        const customer = await stripe.customers.retrieve(
          invoice.customer as string
        ) as Stripe.Customer;
        
        // Handle payment failure with grace period for active sessions
        if (customer.metadata?.userId) {
          const userId = customer.metadata.userId;
          
          // Check for active sessions
          const activeSessions = await prisma.therapySession.findMany({
            where: {
              userId,
              status: {
                in: ['ACTIVE', 'PAUSED']
              }
            },
            select: {
              id: true,
              status: true,
              sessionLength: true,
              startedAt: true
            }
          });
          
          // Set grace period based on active sessions
          const gracePeriodHours = activeSessions.length > 0 ? 24 : 0; // 24 hours if active sessions
          const gracePeriodEnd = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);
          
          // Update user with grace period
          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: 'past_due',
              metadata: {
                paymentGracePeriod: gracePeriodEnd.toISOString(),
                activeSessionsOnFailure: activeSessions.length,
                paymentFailedAt: new Date().toISOString()
              }
            },
          });
          
          // Store grace period in Redis for quick access
          if (activeSessions.length > 0) {
            await redis.set(
              `payment:grace:${userId}`,
              JSON.stringify({
                gracePeriodEnd: gracePeriodEnd.toISOString(),
                activeSessions: activeSessions.map(s => s.id),
                originalPlan: customer.metadata.planType || 'free'
              }),
              'EX',
              gracePeriodHours * 60 * 60 // Expire after grace period
            );
            
            console.log(`⚠️ Payment failed for user ${userId} - ${gracePeriodHours}h grace period granted (${activeSessions.length} active sessions)`);
          } else {
            console.log(`⚠️ Payment failed for user ${userId} - No active sessions, immediate downgrade`);
            
            // Immediately downgrade to free tier if no active sessions
            await creditManager.downgradeToFree(userId);
          }
          
          // TODO: Send payment failed email with grace period info
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    
    // For non-critical events, we could queue for retry
    // For now, just log the error
    if (!shouldProcessImmediately) {
      console.log('Non-critical event failed, would queue for retry');
      return NextResponse.json({ received: true });
    }
    
    // For critical events, return error to trigger Stripe retry
    return NextResponse.json(
      { error: 'Failed to process critical event', details: error.message },
      { status: 500 }
    );
  }
  } catch (globalError: any) {
    console.error('Global webhook error:', globalError);
    return NextResponse.json(
      { error: 'Internal server error', message: globalError.message },
      { status: 500 }
    );
  }
}