/**
 * Google Places Hours Sync Script
 *
 * For each active restaurant:
 *   1. If missing google_place_id → search Google Places to find it
 *   2. Fetch opening_hours from Google Places API
 *   3. Upsert into restaurant_hours table
 *
 * Usage:
 *   cd apps/web
 *   npx tsx scripts/sync-google-hours.ts --dry-run               # Preview all
 *   npx tsx scripts/sync-google-hours.ts --market=cumberland-pa   # One market
 *   npx tsx scripts/sync-google-hours.ts --limit=10               # Test 10
 *   npx tsx scripts/sync-google-hours.ts --force                  # Re-sync all
 *   npx tsx scripts/sync-google-hours.ts                          # Live, all
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ─── Load .env.local ─────────────────────────────────────────────

const envContent = readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

// ─── Config ──────────────────────────────────────────────────────

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_API_KEY = env.GOOGLE_API_KEY || 'AIzaSyA2pfw7scIrffb_O_o1Jvj7iimp2Pg3jZE';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;

// ─── Types ───────────────────────────────────────────────────────

interface Restaurant {
  id: string;
  name: string;
  google_place_id: string | null;
  city: string | null;
  state: string | null;
}

interface GooglePeriod {
  open: { day: number; time: string };
  close?: { day: number; time: string };
}

interface GoogleOpeningHours {
  periods?: GooglePeriod[];
  weekday_text?: string[];
}

// Google day numbers → our day_of_week values
const DAY_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// ─── Google Places API: Search ───────────────────────────────────

async function searchGooglePlace(name: string, city: string, state: string): Promise<{ placeId: string; openingHours: GoogleOpeningHours | null } | null> {
  // Use Place Details (Text Search) to find the place and get hours in one call
  const query = encodeURIComponent(`${name} ${city} ${state}`);
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id,opening_hours,name&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    if (json.status !== 'OK' || !json.candidates || json.candidates.length === 0) {
      return null;
    }

    const candidate = json.candidates[0];
    return {
      placeId: candidate.place_id,
      openingHours: candidate.opening_hours ?? null,
    };
  } catch (error: any) {
    console.error(`  Search error for "${name}": ${error.message}`);
    return null;
  }
}

// ─── Google Places API: Place Details ────────────────────────────

function formatTime(hhmm: string): string {
  const padded = hhmm.padStart(4, '0');
  return `${padded.slice(0, 2)}:${padded.slice(2)}`;
}

async function fetchOpeningHours(placeId: string): Promise<GoogleOpeningHours | null> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    if (json.status !== 'OK' || !json.result) return null;

    return json.result.opening_hours ?? null;
  } catch (error: any) {
    console.error(`  Details error for ${placeId}: ${error.message}`);
    return null;
  }
}

// ─── Transform Google hours → restaurant_hours rows ──────────────

function transformHours(
  restaurantId: string,
  openingHours: GoogleOpeningHours
): { restaurant_id: string; day_of_week: string; open_time: string | null; close_time: string | null; is_closed: boolean }[] {

  const periods = openingHours.periods;
  if (!periods || periods.length === 0) return [];

  // 24-hour place: single period, open day 0 time 0000, no close
  if (periods.length === 1 && periods[0].open.time === '0000' && !periods[0].close) {
    return ALL_DAYS.map(day => ({
      restaurant_id: restaurantId,
      day_of_week: day,
      open_time: '00:00',
      close_time: '23:59',
      is_closed: false,
    }));
  }

  // Map periods by day
  const dayHours = new Map<string, { open_time: string; close_time: string }>();

  for (const period of periods) {
    const dayName = DAY_MAP[period.open.day];
    if (!dayName) continue;

    const openTime = formatTime(period.open.time);
    const closeTime = period.close ? formatTime(period.close.time) : '23:59';

    // Multiple periods for same day (e.g. lunch + dinner) → extend range
    const existing = dayHours.get(dayName);
    if (existing) {
      if (openTime < existing.open_time) existing.open_time = openTime;
      if (closeTime > existing.close_time) existing.close_time = closeTime;
      dayHours.set(dayName, existing);
    } else {
      dayHours.set(dayName, { open_time: openTime, close_time: closeTime });
    }
  }

  return ALL_DAYS.map(day => {
    const hours = dayHours.get(day);
    if (hours) {
      return {
        restaurant_id: restaurantId,
        day_of_week: day,
        open_time: hours.open_time,
        close_time: hours.close_time,
        is_closed: false,
      };
    }
    return {
      restaurant_id: restaurantId,
      day_of_week: day,
      open_time: null,
      close_time: null,
      is_closed: true,
    };
  });
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
  const marketArg = args.find(a => a.startsWith('--market='));
  const marketSlug = marketArg ? marketArg.split('=')[1] : undefined;

  console.log('═══════════════════════════════════════════════');
  console.log('  GOOGLE PLACES HOURS SYNC');
  console.log('═══════════════════════════════════════════════');
  console.log(`Mode:   ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (force) console.log('Force:  re-syncing all (including already synced)');
  if (limit) console.log(`Limit:  ${limit} restaurants`);
  if (marketSlug) console.log(`Market: ${marketSlug}`);
  console.log('');

  // Resolve market ID if specified
  let marketId: string | undefined;
  if (marketSlug) {
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('id')
      .eq('slug', marketSlug)
      .single();

    if (marketError || !market) {
      console.error(`Market "${marketSlug}" not found.`);
      process.exit(1);
    }
    marketId = market.id;
  }

  // Get restaurant IDs that already have hours (to skip unless --force)
  let alreadySynced = new Set<string>();
  if (!force) {
    const { data: hoursData } = await supabase
      .from('restaurant_hours')
      .select('restaurant_id');

    if (hoursData) {
      alreadySynced = new Set(hoursData.map(h => h.restaurant_id));
    }
    console.log(`Restaurants with existing hours: ${alreadySynced.size}`);
  }

  // Fetch ALL active restaurants (including those without google_place_id)
  let query = supabase
    .from('restaurants')
    .select('id, name, google_place_id, city, state')
    .eq('is_active', true)
    .order('name');

  if (marketId) {
    query = query.eq('market_id', marketId);
  }

  const { data: allRestaurants, error } = await query;

  if (error || !allRestaurants) {
    console.error('Failed to fetch restaurants:', error?.message);
    return;
  }

  // Filter out already-synced (unless --force)
  let restaurants = force
    ? allRestaurants
    : allRestaurants.filter(r => !alreadySynced.has(r.id));

  // Apply limit after filtering
  if (limit) {
    restaurants = restaurants.slice(0, limit);
  }

  const withPlaceId = restaurants.filter(r => r.google_place_id).length;
  const withoutPlaceId = restaurants.filter(r => !r.google_place_id).length;

  console.log(`Total active restaurants: ${allRestaurants.length}`);
  console.log(`To process (after skipping synced): ${restaurants.length}`);
  console.log(`  With google_place_id: ${withPlaceId} (1 API call each)`);
  console.log(`  Need place lookup:    ${withoutPlaceId} (2 API calls each)`);
  console.log('');

  if (restaurants.length === 0) {
    console.log('Nothing to do. Use --force to re-sync existing hours.');
    return;
  }

  const stats = {
    total: restaurants.length,
    synced: 0,
    placeIdFound: 0,
    placeIdNotFound: 0,
    noHours: 0,
    errors: 0,
  };

  for (let i = 0; i < restaurants.length; i += BATCH_SIZE) {
    const batch = restaurants.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (restaurant: Restaurant) => {
        try {
          let placeId = restaurant.google_place_id;
          let openingHours: GoogleOpeningHours | null = null;

          // Step 1: If no google_place_id, search for it
          if (!placeId) {
            const searchResult = await searchGooglePlace(
              restaurant.name,
              restaurant.city || 'Unknown',
              restaurant.state || 'PA',
            );

            if (!searchResult) {
              stats.placeIdNotFound++;
              console.log(`  ${restaurant.name} (${restaurant.city || '?'}): not found on Google`);
              return;
            }

            placeId = searchResult.placeId;
            stats.placeIdFound++;

            // Save google_place_id to DB (even in dry-run, since this is metadata)
            if (!dryRun) {
              await supabase
                .from('restaurants')
                .update({ google_place_id: placeId })
                .eq('id', restaurant.id);
            }

            // findplacefromtext doesn't return full periods, need Place Details
            openingHours = null;
          }

          // Step 2: Fetch full opening hours via Place Details
          if (!openingHours) {
            openingHours = await fetchOpeningHours(placeId);
          }

          if (!openingHours || !openingHours.periods || openingHours.periods.length === 0) {
            stats.noHours++;
            console.log(`  ${restaurant.name} (${restaurant.city || '?'}): no hours from Google`);
            return;
          }

          // Step 3: Transform and upsert
          const rows = transformHours(restaurant.id, openingHours);
          if (rows.length === 0) {
            stats.noHours++;
            return;
          }

          const openDays = rows.filter(r => !r.is_closed);
          const closedDays = rows.filter(r => r.is_closed);
          const sample = openDays.length > 0
            ? `${openDays[0].day_of_week} ${openDays[0].open_time}-${openDays[0].close_time}`
            : 'all closed';
          const prefix = !restaurant.google_place_id ? '[NEW] ' : '';
          console.log(`  ${prefix}${restaurant.name}: ${openDays.length} open, ${closedDays.length} closed (e.g. ${sample})`);

          if (!dryRun) {
            const { error: upsertError } = await supabase
              .from('restaurant_hours')
              .upsert(rows, { onConflict: 'restaurant_id,day_of_week' });

            if (upsertError) {
              console.error(`  DB error for ${restaurant.name}: ${upsertError.message}`);
              stats.errors++;
              return;
            }
          }

          stats.synced++;
        } catch (error: any) {
          stats.errors++;
          console.error(`  Error for ${restaurant.name}: ${error.message}`);
        }
      })
    );

    const processed = Math.min(i + BATCH_SIZE, restaurants.length);
    process.stdout.write(`\rProcessed ${processed}/${restaurants.length}...`);

    if (i + BATCH_SIZE < restaurants.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════');
  console.log(`Total processed:      ${stats.total}`);
  console.log(`Hours synced:         ${stats.synced}`);
  console.log(`Place IDs found:      ${stats.placeIdFound}`);
  console.log(`Not found on Google:  ${stats.placeIdNotFound}`);
  console.log(`No hours available:   ${stats.noHours}`);
  console.log(`Errors:               ${stats.errors}`);

  if (dryRun) {
    console.log('\n--- DRY RUN — no changes were made ---');
  } else {
    const { count } = await supabase
      .from('restaurant_hours')
      .select('*', { count: 'exact', head: true });
    console.log(`\nTotal restaurant_hours rows in DB: ${count}`);
  }
}

main().catch(console.error);
