import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = 'AIzaSyA2pfw7scIrffb_O_o1Jvj7iimp2Pg3jZE';

// Check if address indicates a market stall
function isMarketStall(address) {
  const lower = address.toLowerCase();
  return lower.includes('central market') ||
         lower.includes('southern market') ||
         lower.includes('23 n market st') || // Central Market address
         lower.includes('market st');
}

// Query Google Places to get more info
async function getPlaceInfo(name, address) {
  const query = encodeURIComponent(`${name} ${address} Lancaster PA`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const place = data.results[0];
      return {
        name: place.name,
        address: place.formatted_address,
        types: place.types || [],
        businessStatus: place.business_status,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total
      };
    }
  } catch (e) {
    console.log(`   Error querying Google: ${e.message}`);
  }
  return null;
}

async function main() {
  console.log('\n========== REMOVE DUPLICATE RESTAURANTS ==========\n');

  // Get all restaurants
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, address, city, latitude, longitude')
    .eq('is_active', true)
    .order('name');

  // Group by normalized name
  const groups = {};
  restaurants.forEach(r => {
    const key = r.name.toLowerCase().trim();
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  // Find and process duplicates
  const toDelete = [];

  for (const [name, entries] of Object.entries(groups)) {
    if (entries.length <= 1) continue;

    console.log(`\n${entries[0].name} (${entries.length} entries):`);

    // Check for market stalls first
    const marketStalls = entries.filter(r => isMarketStall(r.address));
    const standalones = entries.filter(r => !isMarketStall(r.address));

    if (marketStalls.length > 0 && standalones.length > 0) {
      // Clear case: keep standalone, remove market stalls
      console.log(`   Found ${marketStalls.length} market stall(s), keeping standalone(s)`);
      marketStalls.forEach(r => {
        console.log(`   ❌ REMOVE: ${r.address} (market stall)`);
        toDelete.push(r);
      });
      standalones.forEach(r => {
        console.log(`   ✓ KEEP: ${r.address} (standalone)`);
      });
    } else {
      // Need to check Google Places for more info
      console.log(`   Checking Google Places...`);

      let bestEntry = null;
      let bestScore = -1;

      for (const entry of entries) {
        const placeInfo = await getPlaceInfo(entry.name, entry.address);

        if (placeInfo) {
          const score = (placeInfo.userRatingsTotal || 0) + (placeInfo.rating || 0) * 10;
          console.log(`   - ${entry.address}: ${placeInfo.userRatingsTotal || 0} reviews, ${placeInfo.rating || 'N/A'} rating`);

          if (score > bestScore) {
            bestScore = score;
            bestEntry = entry;
          }
        } else {
          console.log(`   - ${entry.address}: Not found on Google`);
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 200));
      }

      if (bestEntry) {
        entries.forEach(r => {
          if (r.id === bestEntry.id) {
            console.log(`   ✓ KEEP: ${r.address} (most reviews/highest rated)`);
          } else {
            console.log(`   ❌ REMOVE: ${r.address}`);
            toDelete.push(r);
          }
        });
      } else {
        // Keep first one if no Google data
        console.log(`   ✓ KEEP: ${entries[0].address} (first entry)`);
        entries.slice(1).forEach(r => {
          console.log(`   ❌ REMOVE: ${r.address}`);
          toDelete.push(r);
        });
      }
    }
  }

  // Delete duplicates
  if (toDelete.length > 0) {
    console.log(`\n========== DELETING ${toDelete.length} DUPLICATES ==========\n`);

    for (const r of toDelete) {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', r.id);

      if (error) {
        console.log(`Error deleting ${r.name}: ${error.message}`);
      } else {
        console.log(`Deleted: ${r.name} at ${r.address}`);
      }
    }
  }

  // Final count
  const { count } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log('\n========== SUMMARY ==========');
  console.log(`Duplicates removed: ${toDelete.length}`);
  console.log(`Remaining restaurants: ${count}`);
  console.log('==============================\n');
}

main();
