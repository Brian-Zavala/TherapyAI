#!/usr/bin/env node

/**
 * Script to check if subscription was saved to database after successful checkout
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSubscriptionStatus() {
  console.log('🔍 Checking subscription status in database...\n');
  
  try {
    // Get all users with stripe customer IDs or active subscriptions
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { stripeCustomerId: { not: null } },
          { subscriptionStatus: { not: 'free' } },
          { subscriptionId: { not: null } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
        subscriptionId: true,
        billingEmail: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    if (users.length === 0) {
      console.log('❌ No users with subscriptions found in database');
      console.log('\nPossible reasons:');
      console.log('1. Webhook endpoint not receiving events');
      console.log('2. Webhook handler not updating database');
      console.log('3. User not logged in during checkout');
      console.log('4. Metadata not passed to Stripe checkout session');
    } else {
      console.log(`✅ Found ${users.length} user(s) with subscription data:\n`);
      
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.name || 'Not set'}`);
        console.log(`  Stripe Customer: ${user.stripeCustomerId || 'None'}`);
        console.log(`  Subscription Status: ${user.subscriptionStatus || 'free'}`);
        console.log(`  Subscription ID: ${user.subscriptionId || 'None'}`);
        console.log(`  Billing Email: ${user.billingEmail || 'Not set'}`);
        console.log(`  Last Updated: ${user.updatedAt.toISOString()}`);
        console.log('');
      });
    }
    
    // Also check recent sessions to see if any webhooks were processed
    console.log('📊 Checking recent therapy sessions for webhook activity...\n');
    
    const recentSessions = await prisma.therapySession.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    if (recentSessions.length > 0) {
      console.log(`Found ${recentSessions.length} recent session(s):`);
      recentSessions.forEach(session => {
        console.log(`  Session ${session.id}: ${session.status} - ${session.user.email} - ${session.createdAt.toISOString()}`);
      });
    } else {
      console.log('No recent therapy sessions found');
    }
    
  } catch (error) {
    console.error('Error checking subscription status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubscriptionStatus();