/**
 * Google Places API Enrichment Script
 *
 * Uses Google Places API (New) to fetch definitive meal-service data
 * (servesBreakfast, servesBrunch, servesLunch, servesDinner) and place types,
 * then updates restaurant categories and cuisines in Supabase.
 *
 * Usage:
 *   node scripts/sync_google_places.js --dry-run   # Preview changes
 *   node scripts/sync_google_places.js              # Apply changes
 *   node scripts/sync_google_places.js --limit=10   # Process first 10 only
 */
const https = require('https');

// ─── Config ──────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GOOGLE_API_KEY) {
  console.error('Missing required environment variables.');
  console.error('Set: SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_API_KEY');
  console.error('Example:');
  console.error('  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=... GOOGLE_API_KEY=... node scripts/sync_google_places.js');
  process.exit(1);
}

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;

// ─── Google type → our cuisine mapping ───────────────────────────

const GOOGLE_TYPE_TO_CUISINE = {
  cafe: 'cafe',
  coffee_shop: 'cafe',
  bakery: 'cafe',
  italian_restaurant: 'italian',
  pizza_restaurant: 'italian',
  chinese_restaurant: 'asian',
  japanese_restaurant: 'asian',
  sushi_restaurant: 'asian',
  ramen_restaurant: 'asian',
  thai_restaurant: 'asian',
  vietnamese_restaurant: 'asian',
  korean_restaurant: 'asian',
  indian_restaurant: 'asian',
  mexican_restaurant: 'latin',
  brazilian_restaurant: 'latin',
  seafood_restaurant: 'seafood',
  steak_house: 'steakhouse',
  mediterranean_restaurant: 'mediterranean',
  greek_restaurant: 'mediterranean',
  middle_eastern_restaurant: 'mediterranean',
  turkish_restaurant: 'mediterranean',
};

// Google types that indicate bar/nightlife categories
const BAR_TYPES = new Set(['bar', 'pub', 'wine_bar', 'cocktail_bar']);
const NIGHTLIFE_TYPES = new Set(['night_club']);
const BREWERY_TYPES = new Set(['brewery']);
const CAFE_TYPES = new Set(['cafe', 'coffee_shop', 'bakery']);

// Our valid categories and cuisines
const VALID_CATEGORIES = new Set([
  'bars', 'nightlife', 'rooftops', 'brunch', 'lunch', 'dinner', 'outdoor_dining',
]);
const VALID_CUISINES = new Set([
  'american_contemporary', 'italian', 'mediterranean', 'asian',
  'latin', 'seafood', 'steakhouse', 'pub_fare', 'cafe',
]);

// ─── HTTP helpers ────────────────────────────────────────────────

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function supabaseFetch(path, options = {}) {
  return makeRequest(`${SUPABASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || '',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

// ─── Google Places API (New) ─────────────────────────────────────

async function searchGooglePlace(name, city, state) {
  const textQuery = `${name} ${city} ${state}`;
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.types',
    'places.primaryType',
    'places.servesBreakfast',
    'places.servesBrunch',
    'places.servesLunch',
    'places.servesDinner',
  ].join(',');

  try {
    const res = await makeRequest(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify({ textQuery }),
      },
    );

    if (res.status !== 200 || !res.data.places || res.data.places.length === 0) {
      // Fall back to legacy API
      return searchGooglePlaceLegacy(name, city, state);
    }

    const place = res.data.places[0];
    return {
      source: 'new_api',
      placeId: place.id || null,
      displayName: place.displayName?.text || null,
      types: place.types || [],
      primaryType: place.primaryType || null,
      servesBreakfast: place.servesBreakfast ?? null,
      servesBrunch: place.servesBrunch ?? null,
      servesLunch: place.servesLunch ?? null,
      servesDinner: place.servesDinner ?? null,
    };
  } catch (error) {
    console.error(`  Google API error for "${name}":`, error.message);
    return searchGooglePlaceLegacy(name, city, state);
  }
}

async function searchGooglePlaceLegacy(name, city, state) {
  const query = encodeURIComponent(`${name} ${city} ${state}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_API_KEY}`;

  try {
    const res = await makeRequest(url);
    if (res.data.status !== 'OK' || !res.data.results || res.data.results.length === 0) {
      return null;
    }

    const place = res.data.results[0];
    return {
      source: 'legacy_api',
      placeId: place.place_id || null,
      displayName: place.name || null,
      types: place.types || [],
      primaryType: null, // Legacy API doesn't have primaryType
      servesBreakfast: null, // Legacy API doesn't have these
      servesBrunch: null,
      servesLunch: null,
      servesDinner: null,
    };
  } catch (error) {
    console.error(`  Legacy API error for "${name}":`, error.message);
    return null;
  }
}

// ─── Name matching ───────────────────────────────────────────────

function normalizeForComparison(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(ourName, googleName) {
  if (!googleName) return false;

  const a = normalizeForComparison(ourName);
  const b = normalizeForComparison(googleName);

  // Exact match
  if (a === b) return true;

  // One contains the other
  if (a.includes(b) || b.includes(a)) return true;

  // Word overlap >= 50%
  const wordsA = new Set(a.split(' ').filter((w) => w.length > 2));
  const wordsB = new Set(b.split(' ').filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }

  const minSize = Math.min(wordsA.size, wordsB.size);
  return overlap / minSize >= 0.5;
}

// ─── Category/cuisine mapping ────────────────────────────────────

function computeUpdates(restaurant, googleData) {
  const changes = {
    categories: [...(restaurant.categories || [])],
    cuisine: restaurant.cuisine,
    google_place_id: googleData.placeId,
    reasons: [],
  };

  const allTypes = new Set(googleData.types || []);
  const primaryType = googleData.primaryType;

  // ─── 1. Meal service signals (highest priority) ───
  const servesBreakfast = googleData.servesBreakfast;
  const servesBrunch = googleData.servesBrunch;
  const servesLunch = googleData.servesLunch;
  const servesDinner = googleData.servesDinner;

  if (servesBreakfast === true || servesBrunch === true) {
    if (!changes.categories.includes('brunch')) {
      changes.categories.push('brunch');
      changes.reasons.push(
        `+brunch (Google: servesBreakfast=${servesBreakfast}, servesBrunch=${servesBrunch})`,
      );
    }
  } else if (servesBreakfast === false && servesBrunch === false) {
    if (changes.categories.includes('brunch')) {
      changes.categories = changes.categories.filter((c) => c !== 'brunch');
      changes.reasons.push(
        `-brunch (Google: servesBreakfast=false, servesBrunch=false)`,
      );
    }
  }
  // If null (legacy API), don't change brunch based on meal service

  if (servesLunch === true && !changes.categories.includes('lunch')) {
    changes.categories.push('lunch');
    changes.reasons.push('+lunch (Google: servesLunch=true)');
  }

  if (servesDinner === true && !changes.categories.includes('dinner')) {
    changes.categories.push('dinner');
    changes.reasons.push('+dinner (Google: servesDinner=true)');
  }

  // ─── 2. Primary type → cuisine ───
  const typesToCheck = primaryType ? [primaryType, ...allTypes] : [...allTypes];
  const currentCuisineIsDefault =
    !changes.cuisine || changes.cuisine === 'american_contemporary';

  if (currentCuisineIsDefault) {
    for (const type of typesToCheck) {
      if (GOOGLE_TYPE_TO_CUISINE[type]) {
        const newCuisine = GOOGLE_TYPE_TO_CUISINE[type];
        if (VALID_CUISINES.has(newCuisine) && newCuisine !== changes.cuisine) {
          changes.reasons.push(
            `cuisine: ${changes.cuisine || 'null'} → ${newCuisine} (Google type: ${type})`,
          );
          changes.cuisine = newCuisine;
          break; // Use first match (primaryType has priority)
        }
      }
    }
  }

  // ─── 3. Type → category mapping ───
  for (const type of allTypes) {
    if (BAR_TYPES.has(type) && !changes.categories.includes('bars')) {
      changes.categories.push('bars');
      changes.reasons.push(`+bars (Google type: ${type})`);
    }
    if (NIGHTLIFE_TYPES.has(type) && !changes.categories.includes('nightlife')) {
      changes.categories.push('nightlife');
      changes.reasons.push(`+nightlife (Google type: ${type})`);
    }
  }

  // Brewery special case: add bars, remove brunch unless confirmed by meal service
  if (
    [...allTypes].some((t) => BREWERY_TYPES.has(t)) ||
    (primaryType && BREWERY_TYPES.has(primaryType))
  ) {
    if (!changes.categories.includes('bars')) {
      changes.categories.push('bars');
      changes.reasons.push('+bars (Google: brewery)');
    }
    // Only remove brunch if Google didn't confirm breakfast/brunch service
    if (
      servesBreakfast !== true &&
      servesBrunch !== true &&
      changes.categories.includes('brunch')
    ) {
      changes.categories = changes.categories.filter((c) => c !== 'brunch');
      changes.reasons.push('-brunch (brewery without confirmed breakfast/brunch service)');
    }
  }

  // Bar/pub without cafe: remove brunch (bars don't serve breakfast)
  // This handles legacy API where we don't have servesBreakfast data
  const isBar = [...allTypes].some((t) => BAR_TYPES.has(t) || NIGHTLIFE_TYPES.has(t));
  const isCafe = [...allTypes].some((t) => CAFE_TYPES.has(t));
  if (
    isBar &&
    !isCafe &&
    servesBreakfast !== true &&
    servesBrunch !== true &&
    changes.categories.includes('brunch')
  ) {
    changes.categories = changes.categories.filter((c) => c !== 'brunch');
    changes.reasons.push('-brunch (Google: bar/pub type without cafe — bars do not serve breakfast)');
  }

  // Cafe/bakery: add brunch if not contradicted
  if (
    [...allTypes].some((t) => CAFE_TYPES.has(t)) ||
    (primaryType && CAFE_TYPES.has(primaryType))
  ) {
    if (servesBreakfast !== false && servesBrunch !== false) {
      if (!changes.categories.includes('brunch')) {
        changes.categories.push('brunch');
        changes.reasons.push('+brunch (Google: cafe/bakery type)');
      }
    }
  }

  // ─── 4. Filter to valid categories only ───
  changes.categories = changes.categories.filter((c) => VALID_CATEGORIES.has(c));

  return changes;
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  console.log('=== Google Places Enrichment ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  if (limit) console.log(`Limit: ${limit} restaurants`);
  console.log('');

  // Fetch all active restaurants
  let url = '/rest/v1/restaurants?is_active=eq.true&select=id,name,categories,cuisine,city,state&order=name';
  if (limit) url += `&limit=${limit}`;

  const { data: restaurants } = await supabaseFetch(url);
  if (!Array.isArray(restaurants)) {
    console.error('Failed to fetch restaurants:', restaurants);
    return;
  }

  console.log(`Found ${restaurants.length} restaurants to process\n`);

  const stats = {
    total: restaurants.length,
    matched: 0,
    notFound: 0,
    nameMismatch: 0,
    changed: 0,
    unchanged: 0,
    brunchAdded: 0,
    brunchRemoved: 0,
    cuisineChanged: 0,
    errors: 0,
  };

  const allChanges = [];
  const notFound = [];
  const nameMismatches = [];

  for (let i = 0; i < restaurants.length; i += BATCH_SIZE) {
    const batch = restaurants.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (restaurant) => {
        try {
          const googleData = await searchGooglePlace(
            restaurant.name,
            restaurant.city || 'Lancaster',
            restaurant.state || 'PA',
          );

          if (!googleData) {
            stats.notFound++;
            notFound.push(restaurant.name);
            return null;
          }

          // Verify name match
          if (!namesMatch(restaurant.name, googleData.displayName)) {
            stats.nameMismatch++;
            nameMismatches.push({
              ours: restaurant.name,
              google: googleData.displayName,
            });
            return null;
          }

          stats.matched++;
          const updates = computeUpdates(restaurant, googleData);

          // Check if anything actually changed
          const categoriesChanged =
            JSON.stringify([...restaurant.categories].sort()) !==
            JSON.stringify([...updates.categories].sort());
          const cuisineChanged = restaurant.cuisine !== updates.cuisine;
          const hasChanges = categoriesChanged || cuisineChanged || updates.google_place_id;

          if (updates.reasons.length > 0) {
            stats.changed++;
            if (updates.reasons.some((r) => r.startsWith('+brunch'))) stats.brunchAdded++;
            if (updates.reasons.some((r) => r.startsWith('-brunch'))) stats.brunchRemoved++;
            if (updates.reasons.some((r) => r.startsWith('cuisine:'))) stats.cuisineChanged++;
          } else {
            stats.unchanged++;
          }

          return {
            restaurant,
            googleData,
            updates,
            hasChanges,
            categoriesChanged,
            cuisineChanged,
          };
        } catch (error) {
          stats.errors++;
          console.error(`  Error processing ${restaurant.name}:`, error.message);
          return null;
        }
      }),
    );

    // Apply updates
    for (const result of batchResults) {
      if (!result || !result.hasChanges) continue;

      allChanges.push(result);

      if (!dryRun) {
        const updateBody = {};
        if (result.categoriesChanged) {
          updateBody.categories = result.updates.categories;
        }
        if (result.cuisineChanged) {
          updateBody.cuisine = result.updates.cuisine;
        }
        if (!result.categoriesChanged && !result.cuisineChanged) continue;
        updateBody.updated_at = new Date().toISOString();

        const { status } = await supabaseFetch(
          `/rest/v1/restaurants?id=eq.${result.restaurant.id}`,
          {
            method: 'PATCH',
            body: updateBody,
            prefer: 'return=minimal',
          },
        );

        if (status !== 204) {
          console.error(`  Failed to update ${result.restaurant.name} (status ${status})`);
        }
      }
    }

    const processed = Math.min(i + BATCH_SIZE, restaurants.length);
    process.stdout.write(`\rProcessed ${processed}/${restaurants.length}...`);

    // Rate limiting delay
    if (i + BATCH_SIZE < restaurants.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log('\n');

  // ─── Report ───
  console.log('=== RESULTS ===\n');
  console.log(`Total restaurants:  ${stats.total}`);
  console.log(`Google matched:     ${stats.matched}`);
  console.log(`Not found:          ${stats.notFound}`);
  console.log(`Name mismatch:      ${stats.nameMismatch}`);
  console.log(`Errors:             ${stats.errors}`);
  console.log('');
  console.log(`Categories changed: ${stats.changed}`);
  console.log(`No changes needed:  ${stats.unchanged}`);
  console.log(`Brunch added:       ${stats.brunchAdded}`);
  console.log(`Brunch removed:     ${stats.brunchRemoved}`);
  console.log(`Cuisine changed:    ${stats.cuisineChanged}`);

  // Show changes
  if (allChanges.length > 0) {
    console.log('\n=== CHANGES ===\n');
    for (const change of allChanges) {
      if (change.updates.reasons.length === 0) continue;
      console.log(`${change.restaurant.name}`);
      console.log(`  Google: ${change.googleData.displayName} (${change.googleData.source})`);
      console.log(
        `  Type: ${change.googleData.primaryType || change.googleData.types.join(', ')}`,
      );
      console.log(
        `  Before: categories=${JSON.stringify(change.restaurant.categories)}, cuisine=${change.restaurant.cuisine}`,
      );
      console.log(
        `  After:  categories=${JSON.stringify(change.updates.categories)}, cuisine=${change.updates.cuisine}`,
      );
      for (const reason of change.updates.reasons) {
        console.log(`    → ${reason}`);
      }
      console.log('');
    }
  }

  // Show not-found restaurants
  if (notFound.length > 0) {
    console.log('\n=== NOT FOUND ON GOOGLE ===\n');
    notFound.forEach((name) => console.log(`  ${name}`));
  }

  // Show name mismatches
  if (nameMismatches.length > 0) {
    console.log('\n=== NAME MISMATCHES (skipped) ===\n');
    nameMismatches.forEach((m) =>
      console.log(`  Ours: "${m.ours}" → Google: "${m.google}"`),
    );
  }

  if (dryRun) {
    console.log('\n--- DRY RUN — no changes were made ---');
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('\n--- Changes applied to database ---');
  }
}

main().catch(console.error);
