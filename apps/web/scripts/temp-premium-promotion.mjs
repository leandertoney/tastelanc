#!/usr/bin/env node
/**
 * Temporary Premium Promotion Script
 *
 * Upgrades all restaurants in specified Lancaster zip codes to premium status
 * for app launch testing. Creates a backup file for reverting.
 *
 * Target zip codes: 17601, 17602, 17603
 * Revert by: Sunday 11:59pm ET
 *
 * Usage: node scripts/temp-premium-promotion.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

const TARGET_ZIP_CODES = ['17601', '17602', '17603'];

async function main() {
  console.log('=== Temporary Premium Promotion Script ===\n');
  console.log(`Target zip codes: ${TARGET_ZIP_CODES.join(', ')}`);

  if (isDryRun) {
    console.log('\nDRY RUN MODE - No changes will be made\n');
  }

  // Step 1: Get the premium tier ID
  console.log('Fetching tier information...');
  const { data: tiers, error: tiersError } = await supabase
    .from('tiers')
    .select('id, name');

  if (tiersError) {
    console.error('Error fetching tiers:', tiersError.message);
    process.exit(1);
  }

  const premiumTier = tiers.find(t => t.name === 'premium');
  if (!premiumTier) {
    console.error('Premium tier not found in database!');
    process.exit(1);
  }

  console.log('Available tiers:');
  tiers.forEach(t => console.log(`  - ${t.name}: ${t.id}`));
  console.log(`\nWill upgrade to: ${premiumTier.name} (${premiumTier.id})\n`);

  // Step 2: Find restaurants in target zip codes
  console.log('Finding restaurants in target zip codes...');
  const { data: restaurants, error: fetchError } = await supabase
    .from('restaurants')
    .select('id, name, zip_code, tier_id, tiers(name)')
    .in('zip_code', TARGET_ZIP_CODES)
    .eq('is_active', true);

  if (fetchError) {
    console.error('Error fetching restaurants:', fetchError.message);
    process.exit(1);
  }

  console.log(`Found ${restaurants.length} active restaurants in target zip codes\n`);

  if (restaurants.length === 0) {
    console.log('No restaurants to update. Exiting.');
    process.exit(0);
  }

  // Step 3: Create backup data
  const backup = {
    created_at: new Date().toISOString(),
    target_zip_codes: TARGET_ZIP_CODES,
    premium_tier_id: premiumTier.id,
    restaurants: restaurants.map(r => ({
      id: r.id,
      name: r.name,
      zip_code: r.zip_code,
      original_tier_id: r.tier_id,
      original_tier_name: r.tiers?.name || 'unknown',
    })),
  };

  // Count how many are already premium or higher
  const alreadyPremium = restaurants.filter(r =>
    r.tiers?.name === 'premium' || r.tiers?.name === 'elite'
  );
  const needsUpdate = restaurants.filter(r =>
    r.tiers?.name !== 'premium' && r.tiers?.name !== 'elite'
  );

  console.log(`Already premium/elite: ${alreadyPremium.length}`);
  console.log(`Will be upgraded to premium: ${needsUpdate.length}\n`);

  // Show restaurants by zip code
  for (const zip of TARGET_ZIP_CODES) {
    const inZip = restaurants.filter(r => r.zip_code === zip);
    console.log(`${zip} (${inZip.length} restaurants):`);
    inZip.forEach(r => {
      const tierName = r.tiers?.name || 'unknown';
      const action = (tierName !== 'premium' && tierName !== 'elite')
        ? ' -> will upgrade to premium'
        : ' (no change)';
      console.log(`  - ${r.name}: ${tierName}${action}`);
    });
    console.log('');
  }

  // Step 4: Save backup file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(__dirname, 'data', `premium-promotion-backup-${timestamp}.json`);

  if (!isDryRun) {
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`Backup saved to: ${backupPath}\n`);
  } else {
    console.log(`Would save backup to: ${backupPath}\n`);
  }

  // Step 5: Update restaurants to premium tier
  if (needsUpdate.length === 0) {
    console.log('All restaurants are already premium or elite. No updates needed.');
    process.exit(0);
  }

  if (!isDryRun) {
    console.log('Updating restaurants to premium tier...');

    const idsToUpdate = needsUpdate.map(r => r.id);
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ tier_id: premiumTier.id })
      .in('id', idsToUpdate);

    if (updateError) {
      console.error('Error updating restaurants:', updateError.message);
      process.exit(1);
    }

    console.log(`Updated ${needsUpdate.length} restaurants to premium tier!\n`);
  } else {
    console.log(`Would update ${needsUpdate.length} restaurants to premium tier\n`);
  }

  // Step 6: Verify updates
  if (!isDryRun) {
    const { data: verified, error: verifyError } = await supabase
      .from('restaurants')
      .select('id, name, tiers(name)')
      .in('zip_code', TARGET_ZIP_CODES)
      .eq('is_active', true);

    if (!verifyError) {
      const premiumCount = verified.filter(r =>
        r.tiers?.name === 'premium' || r.tiers?.name === 'elite'
      ).length;
      console.log(`Verification: ${premiumCount}/${verified.length} restaurants now premium/elite`);
    }
  }

  // Final instructions
  console.log('\n=== IMPORTANT ===');
  console.log('Remember to run the revert script Sunday at 11:59pm ET:');
  console.log(`  node scripts/revert-premium-promotion.mjs`);
  console.log('\nDone!');
}

main().catch(console.error);
