#!/usr/bin/env node
/**
 * Revert Premium Promotion Script
 *
 * Reverts restaurants to their original tier using the backup file
 * created by temp-premium-promotion.mjs
 *
 * Usage: node scripts/revert-premium-promotion.mjs [backup-file] [--dry-run]
 *
 * If no backup file is specified, uses the most recent backup in scripts/data/
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
const backupArg = args.find(a => !a.startsWith('--'));

async function findLatestBackup() {
  const dataDir = path.join(__dirname, 'data');
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('premium-promotion-backup-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    return null;
  }

  return path.join(dataDir, files[0]);
}

async function main() {
  console.log('=== Revert Premium Promotion Script ===\n');

  if (isDryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  // Step 1: Find backup file
  let backupPath;
  if (backupArg) {
    if (fs.existsSync(backupArg)) {
      backupPath = backupArg;
    } else {
      backupPath = path.join(__dirname, 'data', backupArg);
    }
  } else {
    backupPath = await findLatestBackup();
  }

  if (!backupPath || !fs.existsSync(backupPath)) {
    console.error('No backup file found!');
    console.error('Usage: node scripts/revert-premium-promotion.mjs [backup-file]');
    console.error('\nAvailable backups:');
    const dataDir = path.join(__dirname, 'data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir).filter(f => f.includes('premium-promotion'));
      files.forEach(f => console.log(`  - ${f}`));
    }
    process.exit(1);
  }

  console.log(`Using backup file: ${backupPath}\n`);

  // Step 2: Load backup data
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  console.log(`Backup created: ${backup.created_at}`);
  console.log(`Target zip codes: ${backup.target_zip_codes.join(', ')}`);
  console.log(`Restaurants to restore: ${backup.restaurants.length}\n`);

  // Step 3: Show what will be reverted
  const toRevert = backup.restaurants.filter(r => r.original_tier_id !== backup.premium_tier_id);

  console.log(`Restaurants that will be reverted: ${toRevert.length}`);
  toRevert.forEach(r => {
    console.log(`  - ${r.name} (${r.zip_code}): premium -> ${r.original_tier_name}`);
  });

  if (toRevert.length === 0) {
    console.log('\nNo restaurants need reverting (all were originally premium).');
    process.exit(0);
  }

  console.log('');

  // Step 4: Revert each restaurant to original tier
  if (!isDryRun) {
    console.log('Reverting restaurants...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const restaurant of backup.restaurants) {
      const { error } = await supabase
        .from('restaurants')
        .update({ tier_id: restaurant.original_tier_id })
        .eq('id', restaurant.id);

      if (error) {
        console.error(`  Error reverting ${restaurant.name}: ${error.message}`);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`Reverted ${successCount} restaurants successfully`);
    if (errorCount > 0) {
      console.log(`Failed to revert ${errorCount} restaurants`);
    }
  } else {
    console.log(`Would revert ${backup.restaurants.length} restaurants\n`);
  }

  // Step 5: Verify
  if (!isDryRun) {
    const { data: verified, error: verifyError } = await supabase
      .from('restaurants')
      .select('id, name, tiers(name)')
      .in('zip_code', backup.target_zip_codes)
      .eq('is_active', true);

    if (!verifyError) {
      const premiumCount = verified.filter(r =>
        r.tiers?.name === 'premium' || r.tiers?.name === 'elite'
      ).length;
      console.log(`\nVerification: ${premiumCount}/${verified.length} restaurants still premium/elite`);
    }
  }

  console.log('\nDone! Promotion has been reverted.');
}

main().catch(console.error);
