#!/usr/bin/env node

/**
 * Script to create TEST MODE Stripe products and prices
 * This creates products in test mode for development
 */

const Stripe = require('stripe');

// Use test key for development
const TEST_SECRET_KEY = 'sk_test_51RuRSMAc4d9YDJXZZBx3MxC0JyGXooK39DgkHqVbVYKEUxTcTIWYL9fiks6taMqDInElHvJIVoZDmP0qRLfSSneB00ENIn5jM1';

// Initialize Stripe with test key
const stripe = new Stripe(TEST_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
});

// Product definitions
const products = [
  {
    id: 'essential',
    name: 'Essential Plan (TEST)',
    description: 'Perfect for regular therapy sessions - 8 sessions per month, 20 minutes each',
    monthlyPrice: 1299, // $12.99 in cents
    annualPrice: 12900, // $129.00 in cents
  },
  {
    id: 'growth', 
    name: 'Growth Plan (TEST)',
    description: 'Most popular choice - 16 sessions per month, 25 minutes each',
    monthlyPrice: 2499, // $24.99 in cents
    annualPrice: 24900, // $249.00 in cents
  },
  {
    id: 'unlimited',
    name: 'Unlimited Plan (TEST)',
    description: 'Maximum flexibility - 40 sessions per month, 30 minutes each',
    monthlyPrice: 4499, // $44.99 in cents
    annualPrice: 44900, // $449.00 in cents
  }
];

async function createTestProducts() {
  console.log('🧪 Creating TEST MODE Stripe products...\n');
  console.log('Using test key:', TEST_SECRET_KEY.substring(0, 20) + '...\n');
  
  const results = {
    products: {},
    prices: {}
  };

  for (const productDef of products) {
    try {
      // Create the product
      const product = await stripe.products.create({
        name: productDef.name,
        description: productDef.description,
        metadata: {
          plan_type: productDef.id,
          environment: 'test',
        },
      });
      console.log(`✓ Created product: ${productDef.name} (${product.id})`);
      results.products[productDef.id] = product.id;

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: productDef.monthlyPrice,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          plan_type: productDef.id,
          billing: 'monthly',
        },
        nickname: `${productDef.name} - Monthly`,
      });
      console.log(`  ✓ Monthly price: $${productDef.monthlyPrice / 100}/month (${monthlyPrice.id})`);
      results.prices[`${productDef.id}_monthly`] = monthlyPrice.id;

      // Create annual price  
      const annualPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: productDef.annualPrice,
        currency: 'usd',
        recurring: {
          interval: 'year',
        },
        metadata: {
          plan_type: productDef.id,
          billing: 'annual',
        },
        nickname: `${productDef.name} - Annual`,
      });
      console.log(`  ✓ Annual price: $${productDef.annualPrice / 100}/year (${annualPrice.id})\n`);
      results.prices[`${productDef.id}_annual`] = annualPrice.id;

    } catch (error) {
      console.error(`❌ Error creating product ${productDef.name}:`, error.message);
    }
  }

  // Print environment variables
  console.log('\n' + '='.repeat(80));
  console.log('📝 Add these TEST price IDs to your .env file:');
  console.log('='.repeat(80) + '\n');
  
  console.log('# Stripe TEST Price IDs (for development)');
  console.log(`STRIPE_PRICE_ESSENTIAL_MONTHLY="${results.prices.essential_monthly}"`);
  console.log(`STRIPE_PRICE_ESSENTIAL_ANNUAL="${results.prices.essential_annual}"`);
  console.log(`STRIPE_PRICE_GROWTH_MONTHLY="${results.prices.growth_monthly}"`);
  console.log(`STRIPE_PRICE_GROWTH_ANNUAL="${results.prices.growth_annual}"`);
  console.log(`STRIPE_PRICE_UNLIMITED_MONTHLY="${results.prices.unlimited_monthly}"`);
  console.log(`STRIPE_PRICE_UNLIMITED_ANNUAL="${results.prices.unlimited_annual}"`);
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test products created successfully!');
  console.log('🔗 View in Stripe Dashboard: https://dashboard.stripe.com/test/products');
  console.log('='.repeat(80) + '\n');

  return results;
}

// Run the setup
createTestProducts().catch(console.error);