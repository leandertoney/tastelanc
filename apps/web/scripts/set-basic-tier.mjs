#!/usr/bin/env node
/**
 * Set all non-paying restaurants to Basic tier
 *
 * This script:
 * 1. Finds all restaurants without a stripe_subscription_id
 * 2. Updates their tier_id to the Basic tier
 * 3. Optionally removes the Starter tier from the database
 *
 * Usage: node scripts/set-basic-tier.mjs [--dry-run] [--remove-starter]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const removeStarter = args.includes('--remove-starter');

async function main() {
  console.log('=== Set Basic Tier Script ===\n');

  if (isDryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  // Step 1: Get all tiers
  console.log('Fetching tiers...');
  const { data: tiers, error: tiersError } = await supabase
    .from('tiers')
    .select('id, name, display_name');

  if (tiersError) {
    console.error('Error fetching tiers:', tiersError.message);
    process.exit(1);
  }

  console.log('Available tiers:');
  tiers.forEach(t => console.log(`  - ${t.name}: ${t.id}`));
  console.log('');

  const basicTier = tiers.find(t => t.name === 'basic');
  const starterTier = tiers.find(t => t.name === 'starter');

  if (!basicTier) {
    console.error('Basic tier not found in database!');
    process.exit(1);
  }

  console.log(`Basic tier ID: ${basicTier.id}\n`);

  // Step 2: Find restaurants without stripe_subscription_id
  console.log('Finding restaurants without Stripe subscription...');
  const { data: unpaidRestaurants, error: restaurantsError } = await supabase
    .from('restaurants')
    .select('id, name, tier_id, stripe_subscription_id')
    .is('stripe_subscription_id', null);

  if (restaurantsError) {
    console.error('Error fetching restaurants:', restaurantsError.message);
    process.exit(1);
  }

  console.log(`Found ${unpaidRestaurants.length} restaurants without subscription\n`);

  // Count how many are not already on basic tier
  const needsUpdate = unpaidRestaurants.filter(r => r.tier_id !== basicTier.id);
  console.log(`${needsUpdate.length} restaurants need tier update to Basic\n`);

  if (needsUpdate.length > 0) {
    console.log('Restaurants to update:');
    needsUpdate.slice(0, 10).forEach(r => {
      const currentTier = tiers.find(t => t.id === r.tier_id);
      console.log(`  - ${r.name} (current tier: ${currentTier?.name || 'unknown'})`);
    });
    if (needsUpdate.length > 10) {
      console.log(`  ... and ${needsUpdate.length - 10} more`);
    }
    console.log('');
  }

  // Step 3: Update restaurants to Basic tier
  if (!isDryRun && needsUpdate.length > 0) {
    console.log('Updating restaurants to Basic tier...');

    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ tier_id: basicTier.id })
      .is('stripe_subscription_id', null)
      .neq('tier_id', basicTier.id);

    if (updateError) {
      console.error('Error updating restaurants:', updateError.message);
      process.exit(1);
    }

    console.log(`Updated ${needsUpdate.length} restaurants to Basic tier\n`);
  }

  // Step 4: Show paid restaurants (with stripe_subscription_id)
  const { data: paidRestaurants, error: paidError } = await supabase
    .from('restaurants')
    .select('id, name, tier_id, stripe_subscription_id')
    .not('stripe_subscription_id', 'is', null);

  if (!paidError) {
    console.log(`\nPaid restaurants (${paidRestaurants.length}):`);
    paidRestaurants.forEach(r => {
      const tier = tiers.find(t => t.id === r.tier_id);
      console.log(`  - ${r.name}: ${tier?.name || 'unknown'} tier (${r.stripe_subscription_id})`);
    });
  }

  // Step 5: Optionally remove starter tier
  if (removeStarter && starterTier) {
    console.log('\n--- Removing Starter Tier ---');

    // First check if any restaurants are on starter tier
    const { count: starterCount } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true })
      .eq('tier_id', starterTier.id);

    if (starterCount && starterCount > 0) {
      console.log(`Warning: ${starterCount} restaurants still on starter tier!`);
      console.log('Moving them to basic tier first...');

      if (!isDryRun) {
        await supabase
          .from('restaurants')
          .update({ tier_id: basicTier.id })
          .eq('tier_id', starterTier.id);
      }
    }

    if (!isDryRun) {
      const { error: deleteError } = await supabase
        .from('tiers')
        .delete()
        .eq('name', 'starter');

      if (deleteError) {
        console.error('Error deleting starter tier:', deleteError.message);
      } else {
        console.log('Starter tier removed from database');
      }
    } else {
      console.log('Would remove starter tier from database');
    }
  }

  // Final summary
  console.log('\n=== Summary ===');

  const { data: finalCounts } = await supabase
    .from('restaurants')
    .select('tier_id, tiers(name)')
    .not('tier_id', 'is', null);

  if (finalCounts) {
    const tierCounts = {};
    finalCounts.forEach(r => {
      const tierName = r.tiers?.name || 'unknown';
      tierCounts[tierName] = (tierCounts[tierName] || 0) + 1;
    });

    console.log('Restaurant count by tier:');
    Object.entries(tierCounts).sort().forEach(([tier, count]) => {
      console.log(`  ${tier}: ${count}`);
    });
  }

  console.log('\nDone!');
}

main().catch(console.error);
