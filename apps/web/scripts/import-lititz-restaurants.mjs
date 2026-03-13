/**
 * Import restaurants from any Lancaster County town into the Lancaster market
 *
 * Usage: node scripts/import-lititz-restaurants.mjs --town="Elizabethtown" [--dry-run]
 *
 * 1. Searches Google Places API across multiple categories
 * 2. Deduplicates by place_id
 * 3. Fetches Place Details (phone, website, hours, rating, etc.)
 * 4. Skips restaurants already in the DB (by google_place_id or name+address)
 * 5. Inserts into `restaurants` table with market_id = lancaster-pa
 * 6. Downloads Google Places photos and uploads to Supabase Storage
 * 7. Inserts opening hours into `restaurant_hours` table
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_API_KEY = 'AIzaSyA2pfw7scIrffb_O_o1Jvj7iimp2Pg3jZE';
const MARKET_ID = 'f7e72800-3d4c-4f68-af22-40b1d52dc2e5'; // lancaster-pa
const DRY_RUN = process.argv.includes('--dry-run');

// Parse --town="TownName" from CLI args
const townArg = process.argv.find(a => a.startsWith('--town='));
const TOWN = townArg ? townArg.split('=')[1].replace(/"/g, '') : 'Lititz';

// Zip codes for filtering (town name OR zip)
const TOWN_ZIPS = {
  'Lititz': '17543',
  'Elizabethtown': '17022',
  'Leola': '17540',
  'Manheim': '17545',
  'Ephrata': '17522',
};
const ZIP = TOWN_ZIPS[TOWN] || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials. Check apps/web/.env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Google Places API ────────────────────────────────────────────────────

async function textSearch(query) {
  const results = [];
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;

  while (url) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK') {
      results.push(...data.results);
    }
    if (data.next_page_token) {
      await sleep(2500); // Google requires delay before using next_page_token
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${data.next_page_token}&key=${GOOGLE_API_KEY}`;
    } else {
      url = null;
    }
  }
  return results;
}

async function getPlaceDetails(placeId) {
  const fields = 'name,formatted_address,formatted_phone_number,website,geometry,types,price_level,rating,user_ratings_total,photos,opening_hours,address_components';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || null;
}

async function downloadPhoto(photoReference) {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

async function uploadToSupabase(imageBuffer, restaurantId) {
  const fileName = `restaurants/${restaurantId}/cover.jpg`;
  const { error } = await supabase.storage
    .from('images')
    .upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) {
    console.log(`    ⚠ Upload error: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from('images').getPublicUrl(fileName);
  return data.publicUrl;
}

// ─── Parse address components ─────────────────────────────────────────────

function parseAddress(detail) {
  const components = detail.address_components || [];
  const get = (type) => {
    const c = components.find(c => c.types.includes(type));
    return c ? c.long_name : null;
  };

  // Build street address from formatted_address (first part before city)
  const formatted = detail.formatted_address || '';
  const streetAddress = formatted.split(',')[0]?.trim() || '';

  return {
    address: streetAddress,
    city: get('locality') || get('sublocality') || 'Lititz',
    state: get('administrative_area_level_1') || 'PA',
    zip_code: get('postal_code') || '17543',
  };
}

// ─── Parse opening hours into restaurant_hours format ─────────────────────

const DAY_MAP = {
  'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
  'Friday': 5, 'Saturday': 6, 'Sunday': 0
};

function parseHours(openingHours) {
  if (!openingHours?.weekday_text) return [];

  const hours = [];
  for (const line of openingHours.weekday_text) {
    // e.g. "Monday: 11:00 AM – 10:00 PM" or "Monday: Closed"
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) continue;

    const dayName = match[1];
    const timeStr = match[2].replace(/\u202f/g, ' ').replace(/\u2009/g, ' ').trim();
    const dayOfWeek = DAY_MAP[dayName];

    if (dayOfWeek === undefined) continue;

    if (timeStr.toLowerCase() === 'closed') {
      hours.push({ day_of_week: dayOfWeek, is_closed: true });
      continue;
    }

    // Parse "11:00 AM – 10:00 PM" or "11:00 AM – 12:00 AM"
    const timeParts = timeStr.split(/\s*[–-]\s*/);
    if (timeParts.length === 2) {
      const openTime = convertTo24h(timeParts[0].trim());
      const closeTime = convertTo24h(timeParts[1].trim());
      if (openTime && closeTime) {
        hours.push({ day_of_week: dayOfWeek, open_time: openTime, close_time: closeTime, is_closed: false });
      }
    }
  }
  return hours;
}

function convertTo24h(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = match[2];
  const period = match[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n========== ${TOWN.toUpperCase()}, PA RESTAURANT IMPORT ==========\n`);
  if (DRY_RUN) console.log('🔸 DRY RUN — no database writes\n');

  // 1. Search multiple categories
  const categories = [
    'restaurant', 'bar', 'cafe', 'bakery', 'brewery', 'pizza',
    'food', 'dining', 'ice cream', 'deli', 'pub', 'winery', 'brunch',
  ];
  const queries = categories.map(c => `${c} in ${TOWN} PA`);

  console.log(`Searching Google Places for "${TOWN}"...`);
  const placeMap = new Map(); // place_id -> basic result

  for (const q of queries) {
    const results = await textSearch(q);
    for (const r of results) {
      const addr = r.formatted_address || '';
      if (addr.includes(TOWN) || (ZIP && addr.includes(ZIP))) {
        placeMap.set(r.place_id, r);
      }
    }
    await sleep(200);
  }

  console.log(`Found ${placeMap.size} unique ${TOWN} places from Google.\n`);

  // 2. Get existing restaurants to avoid duplicates
  const { data: existing } = await supabase
    .from('restaurants')
    .select('id, name, google_place_id, address, city')
    .eq('market_id', MARKET_ID);

  const existingPlaceIds = new Set((existing || []).filter(r => r.google_place_id).map(r => r.google_place_id));
  const existingNames = new Set((existing || []).map(r => r.name.toLowerCase().trim()));

  // Manual skip list — non-restaurants, duplicates under different Google listings
  const SKIP_PLACE_IDS = new Set([
    // "Bull's Head Public House" — duplicate of "Bulls Head Public House"
    // "Bricker Village" — shopping center, not a restaurant
    // "Oregon Dairy Farm LLC" — farm, not a restaurant (Oregon Dairy Restaurant is separate)
  ]);
  const SKIP_NAMES = new Set([
    "bull's head public house",  // duplicate of "Bulls Head Public House"
    "bricker village",           // shopping center at same address as Brickerville House
    "oregon dairy farm llc",     // farm, not a restaurant
  ]);

  // 3. Filter out duplicates
  const toImport = [];
  const seenAddresses = new Set();
  let skippedDupe = 0;

  for (const [placeId, basic] of placeMap.entries()) {
    const nameLower = basic.name.toLowerCase().trim();

    if (SKIP_PLACE_IDS.has(placeId) || SKIP_NAMES.has(nameLower)) {
      console.log(`  SKIP (manual): ${basic.name}`);
      skippedDupe++;
      continue;
    }
    if (existingPlaceIds.has(placeId)) {
      console.log(`  SKIP (place_id match): ${basic.name}`);
      skippedDupe++;
      continue;
    }
    if (existingNames.has(nameLower)) {
      console.log(`  SKIP (name match): ${basic.name}`);
      skippedDupe++;
      continue;
    }
    // Dedupe by address (e.g. Lititz Springs Inn = same building as Bulls Head)
    const addr = (basic.formatted_address || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenAddresses.has(addr)) {
      console.log(`  SKIP (same address): ${basic.name} @ ${basic.formatted_address}`);
      skippedDupe++;
      continue;
    }
    seenAddresses.add(addr);

    toImport.push({ placeId, name: basic.name });
  }

  console.log(`\nSkipped ${skippedDupe} already in DB.`);
  console.log(`Importing ${toImport.length} new restaurants.\n`);

  if (toImport.length === 0) {
    console.log('Nothing to import!');
    return;
  }

  // 4. Fetch details and import each
  let imported = 0;
  let failed = 0;
  let photosUploaded = 0;

  for (let i = 0; i < toImport.length; i++) {
    const { placeId, name } = toImport[i];
    process.stdout.write(`[${i + 1}/${toImport.length}] ${name}... `);

    try {
      const detail = await getPlaceDetails(placeId);
      if (!detail) {
        console.log('❌ No details');
        failed++;
        continue;
      }

      const addr = parseAddress(detail);
      const loc = detail.geometry?.location || {};
      const slug = slugify(name);

      // Map Google price_level (0-4) to our format
      const priceMap = { 0: '$', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

      const restaurant = {
        name: detail.name || name,
        slug,
        address: addr.address,
        city: addr.city,
        state: addr.state,
        zip_code: addr.zip_code,
        phone: detail.formatted_phone_number || null,
        website: detail.website || null,
        latitude: loc.lat || null,
        longitude: loc.lng || null,
        google_place_id: placeId,
        google_types: detail.types || [],
        google_rating: detail.rating || null,
        google_review_count: detail.user_ratings_total || 0,
        price_range: detail.price_level != null ? priceMap[detail.price_level] : null,
        market_id: MARKET_ID,
        is_active: true,
        is_verified: false,
        neighborhood: TOWN,
      };

      if (DRY_RUN) {
        console.log(`✓ (dry run) — ${addr.address}, ${addr.city}`);
        imported++;
        continue;
      }

      // Insert restaurant
      const { data: inserted, error: insertError } = await supabase
        .from('restaurants')
        .insert(restaurant)
        .select('id')
        .single();

      if (insertError) {
        console.log(`❌ Insert error: ${insertError.message}`);
        failed++;
        continue;
      }

      const restaurantId = inserted.id;

      // Upload cover photo
      if (detail.photos?.length > 0) {
        const photoRef = detail.photos[0].photo_reference;
        const imageBuffer = await downloadPhoto(photoRef);
        if (imageBuffer && imageBuffer.length > 1000) {
          const coverUrl = await uploadToSupabase(imageBuffer, restaurantId);
          if (coverUrl) {
            await supabase
              .from('restaurants')
              .update({ cover_image_url: coverUrl })
              .eq('id', restaurantId);
            photosUploaded++;
          }
        }
      }

      // Insert opening hours
      const hours = parseHours(detail.opening_hours);
      if (hours.length > 0) {
        const hourRows = hours.map(h => ({
          restaurant_id: restaurantId,
          day_of_week: h.day_of_week,
          open_time: h.open_time || null,
          close_time: h.close_time || null,
          is_closed: h.is_closed || false,
        }));
        const { error: hoursError } = await supabase
          .from('restaurant_hours')
          .insert(hourRows);
        if (hoursError) {
          console.log(`⚠ Hours error: ${hoursError.message}`);
        }
      }

      console.log('✓');
      imported++;

      await sleep(150); // Rate limiting
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n========== SUMMARY ==========\n');
  console.log(`Imported:       ${imported}`);
  console.log(`Photos:         ${photosUploaded}`);
  console.log(`Failed:         ${failed}`);
  console.log(`Skipped (dupe): ${skippedDupe}`);
  console.log(`Total found:    ${placeMap.size}`);
  console.log('\n==============================\n');

  if (imported > 0 && !DRY_RUN) {
    console.log('Next step: Run AI categorization to fill in categories & cuisine:');
    console.log('  cd apps/web && npx tsx scripts/categorize-restaurants.ts --market=lancaster-pa --uncategorized-only');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
