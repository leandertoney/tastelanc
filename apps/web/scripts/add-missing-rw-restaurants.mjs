/**
 * Add Missing Restaurant Week Restaurants via Google Places API
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import https from 'https';

config({ path: '.env.local' });

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ||'AIzaSyA2pfw7scIrffb_O_o1Jvj7iimp2Pg3jZE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Missing restaurants from RW website
const missingRestaurants = [
  'Rincon Latino Restaurant Lancaster PA',
  'Mezcla Ice Cream Lancaster PA'
];

function searchGooglePlaces(query) {
  return new Promise((resolve, reject) => {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.results && result.results.length > 0) {
            resolve(result.results[0]); // Return first result
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('\n🔍 Searching for missing Restaurant Week restaurants...\n');

  // Get Lancaster market ID
  const { data: market } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', 'lancaster-pa')
    .single();

  const marketId = market.id;

  for (const query of missingRestaurants) {
    console.log(`\nSearching: ${query}...`);

    try {
      const place = await searchGooglePlaces(query);

      if (!place) {
        console.log(`  ❌ Not found on Google Places`);
        continue;
      }

      console.log(`  ✅ Found: ${place.name}`);
      console.log(`     Address: ${place.formatted_address}`);
      console.log(`     Place ID: ${place.place_id}`);

      // Insert into database
      const { data: inserted, error } = await supabase
        .from('restaurants')
        .insert({
          name: place.name,
          address: place.formatted_address,
          google_place_id: place.place_id,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          market_id: marketId,
          is_active: true,
          rw_description: 'Participating in Lancaster City Restaurant Week 2026'
        })
        .select()
        .single();

      if (error) {
        console.error(`  ❌ Failed to insert: ${error.message}`);
      } else {
        console.log(`  ✅ Added to database: ${inserted.name}`);
      }

      // Wait 1 second between requests to respect API limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }

  console.log('\n\n✅ Done!\n');
}

main().catch(console.error);
