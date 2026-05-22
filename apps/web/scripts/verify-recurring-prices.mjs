#!/usr/bin/env node
import Stripe from 'stripe';
import 'dotenv/config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
});

async function verifyPrices() {
  console.log('\n🔍 Verifying Stripe Prices for Recurring Billing...\n');

  const monthlyPriceId = process.env.STRIPE_PRICE_UNIFIED_MONTHLY;
  const yearlyPriceId = process.env.STRIPE_PRICE_UNIFIED_YEARLY;

  if (!monthlyPriceId || !yearlyPriceId) {
    console.error('❌ Price IDs not found in environment variables');
    process.exit(1);
  }

  try {
    // Check Monthly Price
    console.log('📋 Checking Monthly Price...');
    const monthlyPrice = await stripe.prices.retrieve(monthlyPriceId);
    console.log(`   ID: ${monthlyPrice.id}`);
    console.log(`   Amount: $${monthlyPrice.unit_amount / 100}`);
    console.log(`   Type: ${monthlyPrice.type}`);
    if (monthlyPrice.recurring) {
      console.log(`   ✅ RECURRING: ${monthlyPrice.recurring.interval} (every ${monthlyPrice.recurring.interval_count} ${monthlyPrice.recurring.interval})`);
    } else {
      console.log(`   ❌ NOT RECURRING - This is a one-time payment!`);
    }

    console.log('\n📋 Checking Yearly Price...');
    const yearlyPrice = await stripe.prices.retrieve(yearlyPriceId);
    console.log(`   ID: ${yearlyPrice.id}`);
    console.log(`   Amount: $${yearlyPrice.unit_amount / 100}`);
    console.log(`   Type: ${yearlyPrice.type}`);
    if (yearlyPrice.recurring) {
      console.log(`   ✅ RECURRING: ${yearlyPrice.recurring.interval} (every ${yearlyPrice.recurring.interval_count} ${yearlyPrice.recurring.interval})`);
    } else {
      console.log(`   ❌ NOT RECURRING - This is a one-time payment!`);
    }

    console.log('\n' + '='.repeat(60));
    if (monthlyPrice.recurring && yearlyPrice.recurring) {
      console.log('✅ SUCCESS: Both prices are configured for automatic recurring billing!');
      console.log('\n💡 What this means:');
      console.log('   • Customers will be automatically charged every month/year');
      console.log('   • Stripe handles renewal, invoicing, and payment retry');
      console.log('   • Customers must actively cancel to stop billing');
    } else {
      console.log('❌ WARNING: One or more prices are NOT configured for recurring billing!');
      console.log('   You need to recreate these prices with recurring intervals.');
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyPrices();
