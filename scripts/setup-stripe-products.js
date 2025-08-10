#!/usr/bin/env node

/**
 * Script to create Stripe products and prices for the therapy platform
 * Run this to set up your Stripe products and get the price IDs
 */

const Stripe = require('stripe');

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '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', {
  apiVersion: '2025-01-27.acacia',
});

// Product definitions
const products = [
  {
    id: 'essential',
    name: 'Essential Plan',
    description: 'Perfect for regular therapy sessions - 8 sessions per month, 20 minutes each',
    features: [
      '8 sessions per month',
      '20 minutes per session',
      'Full analytics dashboard',
      'Crisis detection & support',
      'Email/text summaries',
      'AI-powered insights',
      'Session transcripts'
    ],
    monthlyPrice: 1299, // $12.99 in cents
    annualPrice: 12900, // $129.00 in cents (approx 17% discount)
  },
  {
    id: 'growth',
    name: 'Growth Plan',
    description: 'Most popular choice - 16 sessions per month, 25 minutes each',
    features: [
      '16 sessions per month',
      '25 minutes per session',
      'Full analytics dashboard',
      'Crisis detection & support',
      'Email/text summaries',
      'AI-powered insights',
      'Session transcripts',
      'Priority support'
    ],
    monthlyPrice: 2499, // $24.99 in cents
    annualPrice: 24900, // $249.00 in cents (approx 17% discount)
  },
  {
    id: 'unlimited',
    name: 'Unlimited Plan',
    description: 'Maximum flexibility - 40 sessions per month, 30 minutes each',
    features: [
      '40 sessions per month',
      '30 minutes per session',
      'Full analytics dashboard',
      'Crisis detection & support',
      'Email/text summaries',
      'AI-powered insights',
      'Session transcripts',
      'Priority support',
      'Advanced CBT modules',
      'Personalized therapy plans',
      'Partner/family accounts (2)',
      'Downloadable transcripts'
    ],
    monthlyPrice: 4499, // $44.99 in cents
    annualPrice: 44900, // $449.00 in cents (approx 17% discount)
  }
];

async function createProducts() {
  console.log('🚀 Setting up Stripe products and prices...\n');
  
  const results = {
    products: {},
    prices: {}
  };

  for (const productDef of products) {
    try {
      // Check if product already exists
      const existingProducts = await stripe.products.search({
        query: `name:"${productDef.name}"`,
      });

      let product;
      if (existingProducts.data.length > 0) {
        product = existingProducts.data[0];
        console.log(`✓ Product already exists: ${productDef.name} (${product.id})`);
      } else {
        // Create the product
        product = await stripe.products.create({
          name: productDef.name,
          description: productDef.description,
          metadata: {
            plan_type: productDef.id,
            features: productDef.features.join('|'),
          },
        });
        console.log(`✓ Created product: ${productDef.name} (${product.id})`);
      }

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
      console.log(`  ✓ Created monthly price: $${productDef.monthlyPrice / 100}/month (${monthlyPrice.id})`);
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
      console.log(`  ✓ Created annual price: $${productDef.annualPrice / 100}/year (${annualPrice.id})\n`);
      results.prices[`${productDef.id}_annual`] = annualPrice.id;

    } catch (error) {
      console.error(`❌ Error creating product ${productDef.name}:`, error.message);
    }
  }

  // Print environment variables to update
  console.log('\n' + '='.repeat(80));
  console.log('📝 Update your .env file with these values:');
  console.log('='.repeat(80) + '\n');
  
  console.log('# Stripe Price IDs for subscription tiers');
  console.log(`STRIPE_PRICE_ESSENTIAL_MONTHLY="${results.prices.essential_monthly}"`);
  console.log(`STRIPE_PRICE_ESSENTIAL_ANNUAL="${results.prices.essential_annual}"`);
  console.log(`STRIPE_PRICE_GROWTH_MONTHLY="${results.prices.growth_monthly}"`);
  console.log(`STRIPE_PRICE_GROWTH_ANNUAL="${results.prices.growth_annual}"`);
  console.log(`STRIPE_PRICE_UNLIMITED_MONTHLY="${results.prices.unlimited_monthly}"`);
  console.log(`STRIPE_PRICE_UNLIMITED_ANNUAL="${results.prices.unlimited_annual}"`);
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Stripe products and prices created successfully!');
  console.log('='.repeat(80) + '\n');

  return results;
}

// Run the setup
createProducts().catch(console.error);