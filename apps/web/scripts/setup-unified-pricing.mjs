#!/usr/bin/env node
/**
 * Stripe Unified Pricing Setup Script
 *
 * This script automatically creates the unified pricing products in Stripe
 * and outputs the price IDs that need to be added to .env.local
 *
 * Usage:
 *   node scripts/setup-unified-pricing.mjs
 *
 * Requirements:
 *   - STRIPE_SECRET_KEY must be set in environment
 */

import Stripe from 'stripe';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ ERROR: STRIPE_SECRET_KEY not found in environment variables');
  console.error('Please set STRIPE_SECRET_KEY in apps/web/.env.local');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
});

console.log('\n🎯 TasteLanc Unified Pricing Setup\n');
console.log('This script will create:');
console.log('  - Product: "TasteLanc Premium - Unified"');
console.log('  - Price 1: $99.00/month (recurring)');
console.log('  - Price 2: $899.00/year (recurring)\n');

async function main() {
  try {
    // Step 1: Check if product already exists
    console.log('🔍 Checking for existing products...');
    const existingProducts = await stripe.products.search({
      query: 'name:"TasteLanc Premium - Unified"',
    });

    let product;
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`✅ Found existing product: ${product.id}`);
    } else {
      // Step 2: Create the product
      console.log('📦 Creating new product...');
      product = await stripe.products.create({
        name: 'TasteLanc Premium - Unified',
        description: 'Complete platform access with all Elite features - unified pricing tier',
        metadata: {
          tier: 'unified',
          features: 'all_elite_features',
          created_by: 'setup-unified-pricing-script',
        },
      });
      console.log(`✅ Product created: ${product.id}`);
    }

    // Step 3: Check for existing prices
    console.log('\n🔍 Checking for existing prices...');
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    let monthlyPrice;
    let yearlyPrice;

    // Check if we already have monthly and yearly prices
    for (const price of existingPrices.data) {
      if (price.recurring?.interval === 'month' && price.unit_amount === 9900) {
        monthlyPrice = price;
        console.log(`✅ Found existing monthly price: ${price.id}`);
      }
      if (price.recurring?.interval === 'year' && price.unit_amount === 89900) {
        yearlyPrice = price;
        console.log(`✅ Found existing yearly price: ${price.id}`);
      }
    }

    // Step 4: Create monthly price if it doesn't exist
    if (!monthlyPrice) {
      console.log('\n💵 Creating monthly price ($99/month)...');
      monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 9900, // $99.00 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
        metadata: {
          tier: 'unified',
          billing_period: 'monthly',
        },
      });
      console.log(`✅ Monthly price created: ${monthlyPrice.id}`);
    }

    // Step 5: Create yearly price if it doesn't exist
    if (!yearlyPrice) {
      console.log('\n💵 Creating yearly price ($899/year)...');
      yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 89900, // $899.00 in cents
        currency: 'usd',
        recurring: {
          interval: 'year',
          interval_count: 1,
        },
        metadata: {
          tier: 'unified',
          billing_period: 'yearly',
          savings: '$289 vs monthly',
        },
      });
      console.log(`✅ Yearly price created: ${yearlyPrice.id}`);
    }

    // Step 6: Output summary and instructions
    console.log('\n' + '='.repeat(70));
    console.log('✅ SETUP COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n📋 Add these to your apps/web/.env.local file:\n');
    console.log('# Unified Pricing - Restaurant Subscriptions');
    console.log(`STRIPE_PRICE_UNIFIED_MONTHLY=${monthlyPrice.id}`);
    console.log(`STRIPE_PRICE_UNIFIED_YEARLY=${yearlyPrice.id}`);
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 Summary:');
    console.log(`  Product ID: ${product.id}`);
    console.log(`  Product Name: ${product.name}`);
    console.log(`  Monthly Price: $99.00/month (${monthlyPrice.id})`);
    console.log(`  Yearly Price: $899.00/year (${yearlyPrice.id})`);
    console.log(`  Savings: $289/year with annual billing`);
    console.log('\n🔗 View in Stripe Dashboard:');
    console.log(`  https://dashboard.stripe.com/products/${product.id}`);
    console.log('\n✅ Next Steps:');
    console.log('  1. Copy the environment variables above to .env.local');
    console.log('  2. Restart your dev server: npm run dev');
    console.log('  3. Test at: http://localhost:3002/dashboard/subscription');
    console.log('  4. Use test card: 4242 4242 4242 4242\n');

    return {
      success: true,
      productId: product.id,
      monthlyPriceId: monthlyPrice.id,
      yearlyPriceId: yearlyPrice.id,
    };
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);

    if (error.type === 'StripeAuthenticationError') {
      console.error('\n💡 Your Stripe API key may be invalid or expired.');
      console.error('   Check that STRIPE_SECRET_KEY in .env.local is correct.');
    } else if (error.type === 'StripePermissionError') {
      console.error('\n💡 Your Stripe API key does not have permission to create products.');
      console.error('   Make sure you are using a secret key (starts with sk_), not a publishable key.');
    }

    console.error('\n📚 Full error details:', error);
    process.exit(1);
  }
}

// Run the script
main().then((result) => {
  if (result.success) {
    console.log('🎉 All done!\n');
    process.exit(0);
  }
}).catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
