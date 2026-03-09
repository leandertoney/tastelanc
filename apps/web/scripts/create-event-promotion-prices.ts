/**
 * Creates Stripe Product + Price for Event Promotion ($50 one-time) per market.
 *
 * - Creates a single "Event Promotion" product in Stripe
 * - Creates a $50 one-time price for each active market
 * - Stores price IDs in the `market_stripe_prices` table
 * - Safe to re-run: skips markets that already have a price
 *
 * Usage:
 *   cd apps/web && npx tsx scripts/create-event-promotion-prices.ts
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is required. Set it in .env.local');
  process.exit(1);
}
if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required. Set it in .env.local');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PRODUCT_NAME = 'Event Promotion';
const PRICE_AMOUNT = 5000; // $50.00 in cents
const PRICE_TYPE = 'event_promotion';

async function findOrCreateProduct(): Promise<string> {
  // Search for existing product by metadata
  const existing = await stripe.products.search({
    query: `metadata['type']:'${PRICE_TYPE}'`,
    limit: 1,
  });

  if (existing.data.length > 0) {
    console.log(`Found existing product: ${existing.data[0].id} (${existing.data[0].name})`);
    return existing.data[0].id;
  }

  // Create new product
  const product = await stripe.products.create({
    name: PRODUCT_NAME,
    description: 'One-time $50 payment to promote an event on TasteLanc with featured placement and push notifications.',
    metadata: { type: PRICE_TYPE },
  });

  console.log(`Created product: ${product.id} (${product.name})`);
  return product.id;
}

async function ensureMarketStripePricesTable(): Promise<void> {
  // Create the table if it doesn't exist
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.market_stripe_prices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        market_id UUID NOT NULL REFERENCES public.markets(id),
        price_type TEXT NOT NULL,
        stripe_product_id TEXT NOT NULL,
        stripe_price_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'usd',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(market_id, price_type)
      );

      ALTER TABLE public.market_stripe_prices ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'market_stripe_prices' AND policyname = 'Public read market_stripe_prices'
        ) THEN
          CREATE POLICY "Public read market_stripe_prices"
            ON public.market_stripe_prices FOR SELECT USING (true);
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'market_stripe_prices' AND policyname = 'Service role full access market_stripe_prices'
        ) THEN
          CREATE POLICY "Service role full access market_stripe_prices"
            ON public.market_stripe_prices FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `,
  });

  if (error) {
    // If exec_sql doesn't exist, run via direct SQL
    console.log('RPC exec_sql not available, creating table via direct query...');
    // Fall through — we'll handle below
  }
}

async function main() {
  console.log('=== Event Promotion Stripe Price Setup ===\n');

  // Step 1: Find or create the Stripe product
  const productId = await findOrCreateProduct();

  // Step 2: Ensure the market_stripe_prices table exists
  // We'll create it directly via psql since supabase-js doesn't support DDL
  console.log('\nNote: Ensure the market_stripe_prices table exists (migration below).\n');

  // Step 3: Get all active markets
  const { data: markets, error: marketsError } = await supabase
    .from('markets')
    .select('id, name, slug')
    .eq('is_active', true);

  if (marketsError || !markets) {
    console.error('Failed to fetch markets:', marketsError);
    process.exit(1);
  }

  console.log(`Found ${markets.length} active markets:\n`);

  // Step 4: Check which markets already have prices
  const { data: existingPrices } = await supabase
    .from('market_stripe_prices')
    .select('market_id, stripe_price_id')
    .eq('price_type', PRICE_TYPE);

  const existingMarketIds = new Set((existingPrices || []).map(p => p.market_id));

  // Step 5: Create prices for markets that don't have one
  for (const market of markets) {
    if (existingMarketIds.has(market.id)) {
      console.log(`  [SKIP] ${market.name} (${market.slug}) — already has a price`);

      // Log the existing price ID
      const existing = (existingPrices || []).find(p => p.market_id === market.id);
      if (existing) {
        console.log(`         Price ID: ${existing.stripe_price_id}`);
      }
      continue;
    }

    // Create the Stripe price
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: PRICE_AMOUNT,
      currency: 'usd',
      metadata: {
        type: PRICE_TYPE,
        market_slug: market.slug,
        market_name: market.name,
      },
      nickname: `Event Promotion — ${market.name}`,
    });

    console.log(`  [CREATE] ${market.name} (${market.slug})`);
    console.log(`           Price ID: ${price.id}`);

    // Store in database
    const { error: insertError } = await supabase
      .from('market_stripe_prices')
      .insert({
        market_id: market.id,
        price_type: PRICE_TYPE,
        stripe_product_id: productId,
        stripe_price_id: price.id,
        amount_cents: PRICE_AMOUNT,
        currency: 'usd',
      });

    if (insertError) {
      console.error(`           ERROR storing price: ${insertError.message}`);
    } else {
      console.log(`           Stored in market_stripe_prices`);
    }
  }

  console.log('\n=== Done ===');
  console.log('\nTo use in code, query market_stripe_prices by market_id + price_type.\n');
}

main().catch(console.error);
