/**
 * Update Restaurant Week Participants in Database
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';

config({ path: '.env.local' });

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Restaurant names from website
const rwRestaurants = fs.readFileSync('/tmp/rw-restaurants-clean.txt', 'utf-8')
  .split('\n')
  .filter(Boolean)
  .map(name => name.trim());

console.log(`\n🔍 Found ${rwRestaurants.length} restaurants from website\n`);

async function main() {
  // Get Lancaster market ID
  const { data: market } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', 'lancaster-pa')
    .single();

  const marketId = market.id;

  // Get all active Lancaster restaurants
  const { data: allRestaurants } = await supabase
    .from('restaurants')
    .select('id, name, rw_description')
    .eq('market_id', marketId)
    .eq('is_active', true);

  console.log(`📊 Database has ${allRestaurants?.length} active Lancaster restaurants\n`);

  const matched = [];
  const unmatched = [];
  const updated = [];

  // Match website names to database names
  for (const rwName of rwRestaurants) {
    const normalized = rwName.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    const match = allRestaurants?.find(r => {
      const dbNormalized = r.name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      return (
        dbNormalized.includes(normalized) ||
        normalized.includes(dbNormalized) ||
        dbNormalized === normalized
      );
    });

    if (match) {
      matched.push({ rwName, dbName: match.name, id: match.id, hasRW: !!match.rw_description });

      // Update if doesn't have RW description
      if (!match.rw_description) {
        const { error } = await supabase
          .from('restaurants')
          .update({ rw_description: 'Participating in Lancaster City Restaurant Week 2026' })
          .eq('id', match.id);

        if (!error) {
          updated.push(match.name);
          console.log(`✅ Updated: ${match.name}`);
        } else {
          console.error(`❌ Failed to update ${match.name}:`, error.message);
        }
      } else {
        console.log(`⏭️  Already has RW: ${match.name}`);
      }
    } else {
      unmatched.push(rwName);
    }
  }

  console.log(`\n\n📊 Results:\n`);
  console.log(`✅ Matched: ${matched.length}/${rwRestaurants.length}`);
  console.log(`📝 Updated: ${updated.length}`);
  console.log(`❌ Unmatched: ${unmatched.length}\n`);

  if (unmatched.length > 0) {
    console.log(`\n🚨 Unmatched restaurants (not in database):\n`);
    unmatched.forEach((name, i) => {
      console.log(`${i + 1}. ${name}`);
    });
  }

  console.log(`\n\n✅ Done! Total RW participants now: ${matched.filter(m => m.hasRW).length + updated.length}\n`);
}

main().catch(console.error);
