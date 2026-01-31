/**
 * Run Subscription Reconciliation
 *
 * This script reconciles all Stripe subscriptions with the database,
 * attempting to auto-match unlinked subscriptions and logging any
 * that can't be matched for admin review.
 *
 * Usage: npx tsx scripts/run-reconciliation.ts
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import {
  findMatchingRestaurant,
  logUnmatchedSubscription,
  markSubscriptionMatched,
  type StripeCustomerInfo,
} from '../lib/subscription-matching';

// Load env from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Price IDs for consumer subscriptions (from stripe.ts and env)
const CONSUMER_PRICE_IDS = [
  // Regular consumer prices
  process.env.STRIPE_PRICE_CONSUMER_PREMIUM_MONTHLY || 'price_consumer_monthly',
  process.env.STRIPE_PRICE_CONSUMER_PREMIUM_YEARLY || 'price_consumer_yearly',
  // Early access founder prices
  'price_1Sa4YbLikRpMKEPP0xFpkGHl', // early access monthly $1.99
  'price_1Sa4b0LikRpMKEPPgGcJT2gr', // early access yearly $19.99
];

const SELF_PROMOTER_PRICE_ID = process.env.STRIPE_PRICE_SELF_PROMOTER_MONTHLY || 'price_self_promoter_monthly';

function isConsumerSubscription(priceId: string): boolean {
  return CONSUMER_PRICE_IDS.includes(priceId);
}

function isSelfPromoterSubscription(priceId: string): boolean {
  return priceId === SELF_PROMOTER_PRICE_ID;
}

async function runReconciliation() {
  console.log('🔄 Starting Subscription Reconciliation...\n');

  const results = {
    totalSubscriptions: 0,
    alreadyLinked: 0,
    newlyMatched: [] as { subscriptionId: string; restaurantName: string; method: string; confidence: number }[],
    unmatched: [] as { subscriptionId: string; customerEmail: string | null; customerName: string | null; amount: number }[],
    consumers: 0,
    selfPromoters: 0,
    errors: [] as string[],
  };

  // Get all active and trialing subscriptions from Stripe
  console.log('📥 Fetching active subscriptions from Stripe...');
  const [activeSubscriptions, trialingSubscriptions] = await Promise.all([
    stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      expand: ['data.customer'],
    }),
    stripe.subscriptions.list({
      status: 'trialing',
      limit: 100,
      expand: ['data.customer'],
    }),
  ]);

  const subscriptions = {
    data: [...activeSubscriptions.data, ...trialingSubscriptions.data],
  };

  results.totalSubscriptions = subscriptions.data.length;
  console.log(`   Found ${results.totalSubscriptions} active subscriptions\n`);

  // Get all restaurants with their stripe_subscription_id
  const { data: linkedRestaurants } = await supabase
    .from('restaurants')
    .select('stripe_subscription_id, name')
    .not('stripe_subscription_id', 'is', null);

  const linkedSubIds = new Set(linkedRestaurants?.map(r => r.stripe_subscription_id) || []);
  console.log(`📊 ${linkedSubIds.size} restaurants already have linked subscriptions\n`);

  console.log('─'.repeat(60));
  console.log('Processing subscriptions...\n');

  for (const sub of subscriptions.data) {
    try {
      const customer = sub.customer;
      if (typeof customer !== 'object' || customer.deleted) continue;

      const priceId = sub.items.data[0]?.price.id;
      const amountCents = sub.items.data[0]?.price.unit_amount || 0;
      const billingInterval = sub.items.data[0]?.price.recurring?.interval || 'month';
      const amount = amountCents / 100;

      // Skip consumer subscriptions
      if (isConsumerSubscription(priceId)) {
        results.consumers++;
        continue;
      }

      // Skip self-promoter subscriptions
      if (isSelfPromoterSubscription(priceId)) {
        results.selfPromoters++;
        continue;
      }

      // Check if already linked
      if (linkedSubIds.has(sub.id)) {
        const linkedRestaurant = linkedRestaurants?.find(r => r.stripe_subscription_id === sub.id);
        console.log(`✓ Already linked: ${linkedRestaurant?.name || 'Unknown'} ($${amount}/${billingInterval})`);
        results.alreadyLinked++;
        continue;
      }

      // Not linked - try to match
      console.log(`\n🔍 Attempting to match: ${customer.email || customer.name || customer.id}`);
      console.log(`   Amount: $${amount}/${billingInterval}`);

      const customerInfo: StripeCustomerInfo = {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        metadata: customer.metadata || {},
      };

      const matchResult = await findMatchingRestaurant(
        supabase,
        customerInfo,
        sub.id
      );

      console.log(`   Attempts: ${matchResult.attempts.length} methods tried`);

      if (matchResult.matched && matchResult.restaurantId) {
        // Get tier for this price
        const tier = amountCents >= 100000 ? 'elite' : 'premium';
        const { data: tierData } = await supabase
          .from('tiers')
          .select('id')
          .eq('name', tier)
          .single();

        if (tierData) {
          // Update restaurant
          await supabase
            .from('restaurants')
            .update({
              tier_id: tierData.id,
              stripe_subscription_id: sub.id,
              stripe_customer_id: customer.id,
            })
            .eq('id', matchResult.restaurantId);

          await markSubscriptionMatched(supabase, sub.id, matchResult.restaurantId, 'reconcile');

          console.log(`   ✅ MATCHED: ${matchResult.restaurantName}`);
          console.log(`      Method: ${matchResult.matchMethod} (${matchResult.confidence}% confidence)`);

          results.newlyMatched.push({
            subscriptionId: sub.id,
            restaurantName: matchResult.restaurantName || 'Unknown',
            method: matchResult.matchMethod || 'unknown',
            confidence: matchResult.confidence,
          });
        }
      } else {
        // Log unmatched
        await logUnmatchedSubscription(
          supabase,
          sub.id,
          customerInfo,
          amountCents,
          billingInterval,
          matchResult.attempts
        );

        console.log(`   ❌ NO MATCH FOUND`);
        console.log(`      Logged for admin review`);

        // Print what was tried
        for (const attempt of matchResult.attempts) {
          const status = attempt.found ? '✓' : '✗';
          console.log(`      ${status} ${attempt.method}: "${attempt.searched || 'N/A'}"`);
        }

        results.unmatched.push({
          subscriptionId: sub.id,
          customerEmail: customer.email,
          customerName: customer.name,
          amount,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.errors.push(`${sub.id}: ${message}`);
      console.log(`   ⚠️ ERROR: ${message}`);
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('RECONCILIATION SUMMARY');
  console.log('═'.repeat(60));
  console.log(`
Total Stripe Subscriptions: ${results.totalSubscriptions}
├── Consumer Subscriptions: ${results.consumers}
├── Self-Promoter Subscriptions: ${results.selfPromoters}
└── Restaurant Subscriptions: ${results.totalSubscriptions - results.consumers - results.selfPromoters}

Restaurant Subscription Status:
├── Already Linked: ${results.alreadyLinked}
├── Newly Matched: ${results.newlyMatched.length}
└── Unmatched (needs review): ${results.unmatched.length}
`);

  if (results.newlyMatched.length > 0) {
    console.log('✅ NEWLY MATCHED:');
    for (const m of results.newlyMatched) {
      console.log(`   • ${m.restaurantName} via ${m.method} (${m.confidence}%)`);
    }
    console.log('');
  }

  if (results.unmatched.length > 0) {
    console.log('❌ UNMATCHED (requires manual review):');
    for (const u of results.unmatched) {
      console.log(`   • ${u.customerEmail || u.customerName || 'Unknown'} - $${u.amount}`);
    }
    console.log('');
  }

  if (results.errors.length > 0) {
    console.log('⚠️ ERRORS:');
    for (const e of results.errors) {
      console.log(`   • ${e}`);
    }
    console.log('');
  }

  console.log('Done! ✨\n');

  return results;
}

// Run it
runReconciliation()
  .then((results) => {
    process.exit(results.errors.length > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
