#!/usr/bin/env node
/**
 * Restaurant Enrichment Data Population Script
 *
 * Populates enrichment fields (vibe_tags, best_for, price_range, noise_level, neighborhood)
 * using heuristic rules based on existing restaurant data (categories, cuisine, address).
 *
 * Only updates fields that are currently null — preserves any manually-set data.
 *
 * Usage:
 *   node scripts/populate_enrichment_data.js                    # dry-run on dev
 *   node scripts/populate_enrichment_data.js --apply            # apply on dev
 *   SUPABASE_ENV=prod node scripts/populate_enrichment_data.js  # dry-run on prod
 *   SUPABASE_ENV=prod node scripts/populate_enrichment_data.js --apply  # apply on prod
 */

const https = require('https');

// Supabase configuration
const SUPABASE_CONFIGS = {
  dev: {
    url: 'https://kcoszrcubshtsezcktnn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtjb3N6cmN1YnNodHNlemNrdG5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDUzNjYsImV4cCI6MjA3OTY4MTM2Nn0.gG67fXJrb2YW5X_trdMrXUYbs3YgkvIezGG-fyt-M7c',
  },
  prod: {
    url: 'https://kufcxxynjvyharhtfptd.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTE5ODksImV4cCI6MjA4MjQyNzk4OX0.kvT7tYVtQmj7R26EtjzlhNt3C_TfGWiTwjsyURuNWcQ',
  },
};

const env = process.env.SUPABASE_ENV || 'dev';
const config = SUPABASE_CONFIGS[env];
const dryRun = !process.argv.includes('--apply');

if (!config) {
  console.error(`Unknown SUPABASE_ENV: ${env}. Use "dev" or "prod".`);
  process.exit(1);
}

console.log(`\n=== Restaurant Enrichment Population ===`);
console.log(`Environment: ${env}`);
console.log(`Mode: ${dryRun ? 'DRY RUN (use --apply to write)' : 'APPLYING CHANGES'}\n`);

// ─── Heuristic Mappings ────────────────────────────────────────────────────────

/**
 * Price range based on cuisine type
 */
const CUISINE_PRICE_MAP = {
  steakhouse: '$$$',
  italian: '$$$',
  mediterranean: '$$$',
  seafood: '$$$',
  american_contemporary: '$$',
  asian: '$$',
  latin: '$$',
  pub_fare: '$$',
  cafe: '$',
};

/**
 * Vibe tags based on categories
 * Each category maps to an array of vibe tags it contributes
 */
const CATEGORY_VIBE_MAP = {
  bars: ['lively', 'casual'],
  nightlife: ['lively', 'trendy'],
  rooftops: ['upscale', 'trendy'],
  brunch: ['casual', 'lively'],
  lunch: ['casual'],
  dinner: ['intimate'],
  outdoor_dining: ['casual', 'chill'],
};

/**
 * Additional vibe refinements based on cuisine
 */
const CUISINE_VIBE_MAP = {
  steakhouse: ['upscale', 'elegant'],
  italian: ['romantic', 'intimate'],
  mediterranean: ['elegant'],
  seafood: ['upscale'],
  american_contemporary: ['trendy'],
  asian: ['trendy'],
  latin: ['lively'],
  pub_fare: ['casual', 'lively'],
  cafe: ['cozy', 'chill'],
};

/**
 * Best-for based on categories + cuisine
 */
const CATEGORY_BEST_FOR_MAP = {
  bars: ['groups', 'happy-hour'],
  nightlife: ['groups', 'late-night'],
  rooftops: ['date-night', 'groups'],
  brunch: ['families', 'groups', 'brunch'],
  lunch: ['casual', 'solo'],
  dinner: ['date-night'],
  outdoor_dining: ['families', 'casual'],
};

const CUISINE_BEST_FOR_MAP = {
  steakhouse: ['date-night', 'celebrations', 'business'],
  italian: ['date-night', 'families'],
  mediterranean: ['date-night'],
  seafood: ['date-night', 'celebrations'],
  american_contemporary: ['groups', 'casual'],
  asian: ['groups', 'casual'],
  latin: ['groups', 'celebrations'],
  pub_fare: ['groups', 'happy-hour', 'casual'],
  cafe: ['solo', 'casual'],
};

/**
 * Noise level based on categories
 */
const CATEGORY_NOISE_MAP = {
  bars: 'loud',
  nightlife: 'loud',
  rooftops: 'moderate',
  brunch: 'moderate',
  lunch: 'moderate',
  dinner: 'moderate',
  outdoor_dining: 'moderate',
};

const CUISINE_NOISE_MAP = {
  steakhouse: 'moderate',
  italian: 'moderate',
  mediterranean: 'quiet',
  seafood: 'moderate',
  american_contemporary: 'moderate',
  asian: 'moderate',
  latin: 'moderate',
  pub_fare: 'loud',
  cafe: 'quiet',
};

// ─── Enrichment Logic ──────────────────────────────────────────────────────────

function generateEnrichment(restaurant) {
  const updates = {};
  const categories = restaurant.categories || [];
  const cuisine = restaurant.cuisine;

  // Price range
  if (!restaurant.price_range && cuisine && CUISINE_PRICE_MAP[cuisine]) {
    updates.price_range = CUISINE_PRICE_MAP[cuisine];
  }

  // Vibe tags
  if (!restaurant.vibe_tags || restaurant.vibe_tags.length === 0) {
    const vibes = new Set();
    for (const cat of categories) {
      const catVibes = CATEGORY_VIBE_MAP[cat];
      if (catVibes) catVibes.forEach((v) => vibes.add(v));
    }
    if (cuisine && CUISINE_VIBE_MAP[cuisine]) {
      CUISINE_VIBE_MAP[cuisine].forEach((v) => vibes.add(v));
    }
    if (vibes.size > 0) {
      updates.vibe_tags = Array.from(vibes).slice(0, 5);
    }
  }

  // Best for
  if (!restaurant.best_for || restaurant.best_for.length === 0) {
    const bestFor = new Set();
    for (const cat of categories) {
      const catBestFor = CATEGORY_BEST_FOR_MAP[cat];
      if (catBestFor) catBestFor.forEach((v) => bestFor.add(v));
    }
    if (cuisine && CUISINE_BEST_FOR_MAP[cuisine]) {
      CUISINE_BEST_FOR_MAP[cuisine].forEach((v) => bestFor.add(v));
    }
    if (bestFor.size > 0) {
      updates.best_for = Array.from(bestFor).slice(0, 4);
    }
  }

  // Noise level
  if (!restaurant.noise_level) {
    // Prioritize category-based noise (bars/nightlife are more certain)
    let noise = null;
    for (const cat of categories) {
      const catNoise = CATEGORY_NOISE_MAP[cat];
      if (catNoise) {
        // "loud" takes priority over "moderate"
        if (catNoise === 'loud' || !noise) {
          noise = catNoise;
        }
      }
    }
    // Fall back to cuisine-based noise
    if (!noise && cuisine && CUISINE_NOISE_MAP[cuisine]) {
      noise = CUISINE_NOISE_MAP[cuisine];
    }
    if (noise) {
      updates.noise_level = noise;
    }
  }

  // Neighborhood — parse from address
  if (!restaurant.neighborhood && restaurant.city) {
    // Default to city name as neighborhood
    updates.neighborhood = restaurant.city === 'Lancaster' ? 'Downtown Lancaster' : restaurant.city;
  }

  return updates;
}

// ─── Supabase API Helpers ──────────────────────────────────────────────────────

function makeRequest(url, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function fetchAllRestaurants() {
  const url = new URL(`${config.url}/rest/v1/restaurants`);
  url.searchParams.set('select', 'id,name,categories,cuisine,address,city,state,price_range,vibe_tags,best_for,noise_level,neighborhood');
  url.searchParams.set('is_active', 'eq.true');
  url.searchParams.set('order', 'name.asc');

  const result = await makeRequest(url.toString(), {
    method: 'GET',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (result.status !== 200) {
    throw new Error(`Failed to fetch restaurants: ${JSON.stringify(result.data)}`);
  }

  return result.data;
}

async function updateRestaurant(id, updates) {
  const url = new URL(`${config.url}/rest/v1/restaurants`);
  url.searchParams.set('id', `eq.${id}`);

  const result = await makeRequest(url.toString(), {
    method: 'PATCH',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
  }, updates);

  if (result.status !== 204 && result.status !== 200) {
    throw new Error(`Failed to update restaurant ${id}: ${JSON.stringify(result.data)}`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const restaurants = await fetchAllRestaurants();
  console.log(`Found ${restaurants.length} active restaurants\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const restaurant of restaurants) {
    const updates = generateEnrichment(restaurant);

    if (Object.keys(updates).length === 0) {
      console.log(`  SKIP  ${restaurant.name} — already enriched`);
      skipped++;
      continue;
    }

    const fields = Object.keys(updates).join(', ');

    if (dryRun) {
      console.log(`  [DRY] ${restaurant.name}`);
      for (const [key, value] of Object.entries(updates)) {
        const display = Array.isArray(value) ? value.join(', ') : value;
        console.log(`         ${key}: ${display}`);
      }
      updated++;
    } else {
      try {
        await updateRestaurant(restaurant.id, updates);
        console.log(`  DONE  ${restaurant.name} — updated: ${fields}`);
        updated++;
      } catch (err) {
        console.error(`  FAIL  ${restaurant.name} — ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total:   ${restaurants.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  if (errors > 0) console.log(`Errors:  ${errors}`);
  if (dryRun) console.log(`\nThis was a dry run. Use --apply to write changes.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
