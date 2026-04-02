/**
 * fetch-ocean-city-restaurants.ts
 *
 * Discovers restaurants in Ocean City, MD via Google Places Text Search (legacy API),
 * fetches enrichment details via Place Details, applies category/cuisine logic,
 * and upserts directly into Supabase.
 * No CSV required — Google Places is the source of truth.
 *
 * Usage:
 *   cd apps/web
 *   SUPABASE_URL=https://kufcxxynjvyharhtfptd.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   GOOGLE_API_KEY=AIzaSyA2pfw7scIrffb_O_o1Jvj7iimp2Pg3jZE \
 *   npx tsx scripts/fetch-ocean-city-restaurants.ts
 *
 * Flags:
 *   --dry-run          Preview rows, skip DB writes
 *   --limit=N          Stop after N unique places discovered
 *   --area=boardwalk|midtown|uptown|west  Run one area only
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_API_KEY =
  process.env.GOOGLE_API_KEY || 'AIzaSyA2pfw7scIrffb_O_o1Jvj7iimp2Pg3jZE';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ─── Search config ────────────────────────────────────────────────────────────

interface SearchCenter {
  name: string;
  areaSlug: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  queries: string[];
}

// Each query returns up to 20 results × 3 pages = 60 per query
// Multiple queries per area ensure good coverage
const SEARCH_CENTERS: SearchCenter[] = [
  {
    name: 'Boardwalk',
    areaSlug: 'oc-boardwalk',
    lat: 38.3365,
    lng: -75.0849,
    radiusMeters: 1200,
    queries: [
      'restaurants Ocean City MD boardwalk',
      'bars Ocean City MD boardwalk',
      'seafood Ocean City MD boardwalk',
      'nightlife Ocean City MD',
      'cafe Ocean City MD',
    ],
  },
  {
    name: 'Midtown',
    areaSlug: 'oc-midtown',
    lat: 38.3600,
    lng: -75.0800,
    radiusMeters: 1400,
    queries: [
      'restaurants midtown Ocean City MD',
      'bars Ocean City MD midtown',
      'dining Ocean City MD 45th street',
      'seafood restaurant Ocean City MD midtown',
    ],
  },
  {
    name: 'Uptown',
    areaSlug: 'oc-uptown',
    lat: 38.3850,
    lng: -75.0730,
    radiusMeters: 1600,
    queries: [
      'restaurants uptown Ocean City MD',
      'bars Ocean City MD north end',
      'dining Ocean City MD 100th street',
      'seafood restaurant Ocean City MD uptown',
    ],
  },
  {
    name: 'West Ocean City',
    areaSlug: 'oc-west',
    lat: 38.3400,
    lng: -75.1200,
    radiusMeters: 1800,
    queries: [
      'restaurants West Ocean City MD',
      'marina dining West Ocean City Maryland',
      'seafood Route 50 Ocean City MD',
      'bars West Ocean City Maryland',
    ],
  },
];

// ─── Franchise filter ─────────────────────────────────────────────────────────

const FRANCHISE_PREFIXES = new Set([
  'mcdonald',
  "mcdonald's",
  'burger king',
  'wendy',
  "wendy's",
  'subway',
  'taco bell',
  'kfc',
  'chick-fil-a',
  "domino's",
  'dominos',
  'pizza hut',
  'papa john',
  "papa john's",
  'dunkin',
  'starbucks',
  'panera',
  'chipotle',
  'olive garden',
  "applebee's",
  'applebees',
  'ihop',
  "denny's",
  'dennys',
  'waffle house',
  'five guys',
  'shake shack',
  'popeyes',
  'raising cane',
  "raising cane's",
  'wingstop',
  'sonic',
  "hardee's",
  "arby's",
  "jersey mike's",
  'jersey mikes',
  'firehouse subs',
  'qdoba',
  "moe's",
  'bojangles',
  "zaxby's",
  "culver's",
  '7-eleven',
  'wawa',
  'royal farms',
  'sheetz',
  'little caesars',
  "little caesar's",
  'papa murphy',
  'dairy queen',
  'baskin-robbins',
  'cold stone',
  "captain d's",
  'long john silver',
]);

function isFranchise(name: string): boolean {
  const lower = name.toLowerCase().trim();
  for (const prefix of FRANCHISE_PREFIXES) {
    if (lower === prefix || lower.startsWith(prefix + ' ') || lower.startsWith(prefix + "'")) {
      return true;
    }
  }
  return false;
}

// ─── Category / cuisine logic (from sync_google_places.js) ────────────────────

const GOOGLE_TYPE_TO_CUISINE: Record<string, string> = {
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

const BAR_TYPES = new Set(['bar', 'pub', 'wine_bar', 'cocktail_bar']);
const NIGHTLIFE_TYPES = new Set(['night_club']);
const BREWERY_TYPES = new Set(['brewery']);
const CAFE_TYPES = new Set(['cafe', 'coffee_shop', 'bakery']);

const VALID_CATEGORIES = new Set([
  'bars',
  'nightlife',
  'rooftops',
  'brunch',
  'lunch',
  'dinner',
  'outdoor_dining',
]);
const VALID_CUISINES = new Set([
  'american_contemporary',
  'italian',
  'mediterranean',
  'asian',
  'latin',
  'seafood',
  'steakhouse',
  'pub_fare',
  'cafe',
]);

interface GoogleData {
  placeId: string | null;
  displayName: string | null;
  types: string[];
  primaryType: string | null;
  servesBreakfast: boolean | null;
  servesBrunch: boolean | null;
  servesLunch: boolean | null;
  servesDinner: boolean | null;
}

interface ComputedUpdates {
  categories: string[];
  cuisine: string | null;
  google_place_id: string | null;
  google_types: string[];
}

function computeUpdates(
  restaurant: { categories: string[]; cuisine: string | null },
  googleData: GoogleData,
): ComputedUpdates {
  const changes = {
    categories: [...(restaurant.categories || [])],
    cuisine: restaurant.cuisine,
    google_place_id: googleData.placeId,
    google_types: googleData.types || [],
  };

  const allTypes = new Set(googleData.types || []);
  const primaryType = googleData.primaryType;
  const { servesBreakfast, servesBrunch, servesLunch, servesDinner } = googleData;

  // Meal service signals
  if (servesBreakfast === true || servesBrunch === true) {
    if (!changes.categories.includes('brunch')) changes.categories.push('brunch');
  } else if (servesBreakfast === false && servesBrunch === false) {
    changes.categories = changes.categories.filter((c) => c !== 'brunch');
  }

  if (servesLunch === true && !changes.categories.includes('lunch')) {
    changes.categories.push('lunch');
  }
  if (servesDinner === true && !changes.categories.includes('dinner')) {
    changes.categories.push('dinner');
  }

  // Cuisine from primaryType first, then types
  const typesToCheck = primaryType ? [primaryType, ...allTypes] : [...allTypes];
  const currentCuisineIsDefault = !changes.cuisine || changes.cuisine === 'american_contemporary';
  if (currentCuisineIsDefault) {
    for (const type of typesToCheck) {
      if (GOOGLE_TYPE_TO_CUISINE[type]) {
        const newCuisine = GOOGLE_TYPE_TO_CUISINE[type];
        if (VALID_CUISINES.has(newCuisine) && newCuisine !== changes.cuisine) {
          changes.cuisine = newCuisine;
          break;
        }
      }
    }
  }

  // Bar/nightlife
  for (const type of allTypes) {
    if (BAR_TYPES.has(type) && !changes.categories.includes('bars')) {
      changes.categories.push('bars');
    }
    if (NIGHTLIFE_TYPES.has(type) && !changes.categories.includes('nightlife')) {
      changes.categories.push('nightlife');
    }
  }

  // Brewery
  const isBrewery =
    [...allTypes].some((t) => BREWERY_TYPES.has(t)) ||
    (primaryType != null && BREWERY_TYPES.has(primaryType));
  if (isBrewery) {
    if (!changes.categories.includes('bars')) changes.categories.push('bars');
    if (servesBreakfast !== true && servesBrunch !== true) {
      changes.categories = changes.categories.filter((c) => c !== 'brunch');
    }
  }

  // Bar without cafe: remove brunch
  const isBar = [...allTypes].some((t) => BAR_TYPES.has(t) || NIGHTLIFE_TYPES.has(t));
  const isCafe = [...allTypes].some((t) => CAFE_TYPES.has(t));
  if (isBar && !isCafe && servesBreakfast !== true && servesBrunch !== true) {
    changes.categories = changes.categories.filter((c) => c !== 'brunch');
  }

  // Cafe/bakery: add brunch
  const isCafeType =
    [...allTypes].some((t) => CAFE_TYPES.has(t)) ||
    (primaryType != null && CAFE_TYPES.has(primaryType));
  if (isCafeType && servesBreakfast !== false && servesBrunch !== false) {
    if (!changes.categories.includes('brunch')) changes.categories.push('brunch');
  }

  // Filter to valid
  changes.categories = changes.categories.filter((c) => VALID_CATEGORIES.has(c));

  return changes;
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function supabaseFetch(
  path: string,
  options: { method?: string; body?: object; prefer?: string; on_conflict?: string } = {},
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (options.prefer) headers['Prefer'] = options.prefer;
  if (options.on_conflict) headers['on_conflict'] = options.on_conflict;

  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data: any;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

// ─── Google Places (Legacy) ───────────────────────────────────────────────────

interface LegacyPlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  photos?: Array<{ photo_reference: string; width: number; height: number }>;
  // from details call:
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

async function searchPlacesText(
  query: string,
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<LegacyPlaceResult[]> {
  const results: LegacyPlaceResult[] = [];
  let pageToken: string | undefined;
  let page = 0;

  while (page < 3) {
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=${radiusMeters}&key=${GOOGLE_API_KEY}`;
    if (pageToken) url += `&pagetoken=${pageToken}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Text Search error ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      if (data.status === 'OVER_QUERY_LIMIT') {
        console.error('  Rate limit hit — waiting 2s...');
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      // Don't throw on ZERO_RESULTS or other terminal statuses
      break;
    }

    results.push(...(data.results || []));
    pageToken = data.next_page_token;
    page++;
    if (!pageToken) break;
    // Google requires a short delay before using next_page_token
    await new Promise((r) => setTimeout(r, 2000));
  }

  return results;
}

async function fetchPlaceDetails(placeId: string): Promise<Partial<LegacyPlaceResult>> {
  const fields = 'place_id,name,formatted_phone_number,website,address_components,opening_hours';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) return {};
  const data = await res.json();
  if (data.status !== 'OK') return {};
  return data.result || {};
}

// ─── Hours parsing ────────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface HoursRow {
  restaurant_id: string;
  day_of_week: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

function parseHours(
  restaurantId: string,
  periods: Array<{ open: { day: number; time: string }; close?: { day: number; time: string } }>,
): HoursRow[] {
  // Build a map of day → {open, close}
  const dayMap: Record<number, { open: string | null; close: string | null }> = {};

  for (const period of periods) {
    const day = period.open.day;
    // "0900" → "09:00:00"
    const openTime = period.open.time
      ? `${period.open.time.slice(0, 2)}:${period.open.time.slice(2)}:00`
      : null;
    const closeTime = period.close?.time
      ? `${period.close.time.slice(0, 2)}:${period.close.time.slice(2)}:00`
      : null;
    dayMap[day] = { open: openTime, close: closeTime };
  }

  // Emit a row for all 7 days — closed if not in map
  return DAY_NAMES.map((name, idx) => {
    const entry = dayMap[idx];
    if (!entry) {
      return { restaurant_id: restaurantId, day_of_week: name, open_time: null, close_time: null, is_closed: true };
    }
    return { restaurant_id: restaurantId, day_of_week: name, open_time: entry.open, close_time: entry.close, is_closed: false };
  });
}

// ─── Photo URL ────────────────────────────────────────────────────────────────

function buildPhotoUrl(photoReference: string): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

// ─── Address parsing ──────────────────────────────────────────────────────────

interface ParsedAddress {
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

function parseFromFormatted(formatted: string): ParsedAddress {
  // "3200 Boardwalk, Ocean City, MD 21842, USA"
  const parts = formatted.split(',').map((p) => p.trim());
  const address = parts[0] || '';
  const city = parts[1] || 'Ocean City';
  const stateZip = parts[2] || '';
  const [state = 'MD', zip_code = ''] = stateZip.trim().split(' ');
  return { address, city, state: state.trim(), zip_code: zip_code.trim() };
}

function parseAddressComponents(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
  formattedAddress: string,
): ParsedAddress {
  let city = '';
  let state = '';
  let zipCode = '';
  let streetNumber = '';
  let route = '';

  for (const component of components || []) {
    const types = component.types || [];
    if (types.includes('locality')) city = component.long_name;
    else if (types.includes('administrative_area_level_1')) state = component.short_name;
    else if (types.includes('postal_code')) zipCode = component.long_name;
    else if (types.includes('street_number')) streetNumber = component.long_name;
    else if (types.includes('route')) route = component.long_name;
  }

  const streetAddr = [streetNumber, route].filter(Boolean).join(' ');
  if (city && state) {
    return {
      address: streetAddr || formattedAddress || '',
      city: city || 'Ocean City',
      state: state || 'MD',
      zip_code: zipCode,
    };
  }
  // Fall back to parsing formatted address
  return parseFromFormatted(formattedAddress);
}

// ─── Slug ─────────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
  const areaFilter = args.find((a) => a.startsWith('--area='))?.split('=')[1]?.toLowerCase();

  console.log('=== TasteOceanCity — Google Places Import ===');
  console.log(`Mode:    ${dryRun ? 'DRY RUN (no DB writes)' : 'LIVE'}`);
  if (limit) console.log(`Limit:   ${limit} places`);
  if (areaFilter) console.log(`Area:    ${areaFilter} only`);
  console.log('');

  // 1. Resolve market_id
  const { data: marketRows } = await supabaseFetch(
    '/rest/v1/markets?slug=eq.ocean-city-md&select=id',
  );
  const marketId: string =
    Array.isArray(marketRows) && marketRows[0]?.id ? marketRows[0].id : null;

  if (!marketId) {
    console.error('Market ocean-city-md not found in DB. Run migrations first.');
    process.exit(1);
  }
  console.log(`Market ID: ${marketId}\n`);

  // 2. Discover places
  const seenIds = new Set<string>();
  const discoveredPlaces: LegacyPlaceResult[] = [];

  const centers = areaFilter
    ? SEARCH_CENTERS.filter((c) => {
        const slug = c.name.toLowerCase().replace(/\s+/g, '');
        return slug.includes(areaFilter) || areaFilter.includes(slug.replace('oceancity', ''));
      })
    : SEARCH_CENTERS;

  if (centers.length === 0) {
    console.error(
      `No matching area for --area=${areaFilter}. Valid: boardwalk, midtown, uptown, west`,
    );
    process.exit(1);
  }

  for (const center of centers) {
    console.log(`Searching ${center.name}...`);

    for (const query of center.queries) {
      if (limit !== null && seenIds.size >= limit) break;
      process.stdout.write(`  "${query}" ... `);

      let results: LegacyPlaceResult[];
      try {
        results = await searchPlacesText(query, center.lat, center.lng, center.radiusMeters);
      } catch (err) {
        console.error(`  Error: ${err}`);
        continue;
      }

      let newCount = 0;
      for (const place of results) {
        if (!place.place_id) continue;
        if (seenIds.has(place.place_id)) continue;

        // Geo filter: keep only Ocean City / West OC area
        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;
        if (lat && lng) {
          if (lat < 38.29 || lat > 38.45 || lng < -75.20 || lng > -75.03) continue;
        }

        seenIds.add(place.place_id);
        discoveredPlaces.push(place);
        newCount++;
        if (limit !== null && seenIds.size >= limit) break;
      }

      console.log(`${newCount} new (total: ${seenIds.size})`);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`\nTotal discovered: ${discoveredPlaces.length} unique places`);

  // 3. Fetch details: address, phone, website, hours
  console.log('\nFetching place details (phone, website, address, hours)...');
  const DETAIL_BATCH = 5;
  for (let i = 0; i < discoveredPlaces.length; i += DETAIL_BATCH) {
    const batch = discoveredPlaces.slice(i, i + DETAIL_BATCH);
    await Promise.all(
      batch.map(async (place) => {
        try {
          const details = await fetchPlaceDetails(place.place_id);
          if (details.address_components) place.address_components = details.address_components;
          if (details.formatted_phone_number) place.formatted_phone_number = details.formatted_phone_number;
          if (details.website) place.website = details.website;
          if (details.opening_hours) place.opening_hours = details.opening_hours;
        } catch {
          // Non-fatal — proceed without details
        }
      }),
    );
    process.stdout.write(`\r  Details: ${Math.min(i + DETAIL_BATCH, discoveredPlaces.length)}/${discoveredPlaces.length}...`);
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log(' done\n');

  // 4. Build restaurant rows
  const stats = { total: 0, franchise: 0, noName: 0, built: 0 };
  stats.total = discoveredPlaces.length;

  interface RestaurantRow {
    name: string;
    slug: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    latitude: number | null;
    longitude: number | null;
    phone: string;
    website: string;
    google_place_id: string;
    google_rating: number | null;
    google_review_count: number | null;
    google_types: string[];
    categories: string[];
    cuisine: string;
    cover_image_url: string | null;
    is_active: boolean;
    is_verified: boolean;
    market_id: string;
  }

  const rows: RestaurantRow[] = [];
  const slugsSeen = new Set<string>();
  // Collect hours rows separately — inserted after restaurants are upserted
  const allHoursRows: HoursRow[] = [];

  for (const place of discoveredPlaces) {
    const name = place.name || '';
    if (!name) {
      stats.noName++;
      continue;
    }
    if (isFranchise(name)) {
      stats.franchise++;
      continue;
    }

    const parsed = place.address_components
      ? parseAddressComponents(place.address_components, place.formatted_address)
      : parseFromFormatted(place.formatted_address);

    const types = place.types || [];

    const googleData: GoogleData = {
      placeId: place.place_id,
      displayName: name,
      types,
      primaryType: types[0] || null,
      // Legacy API doesn't return meal service — use null (computeUpdates handles null gracefully)
      servesBreakfast: null,
      servesBrunch: null,
      servesLunch: null,
      servesDinner: null,
    };

    const computed = computeUpdates({ categories: [], cuisine: null }, googleData);

    // Default categories based on type if nothing computed
    if (computed.categories.length === 0) {
      if (types.includes('bar') || types.includes('night_club')) {
        computed.categories = ['bars'];
      } else if (types.includes('cafe') || types.includes('bakery')) {
        computed.categories = ['brunch'];
      } else {
        computed.categories = ['dinner'];
      }
    }

    if (!computed.cuisine) {
      computed.cuisine = 'american_contemporary';
    }

    // Unique slug
    const baseSlug = `${slugify(name)}-ocean-city`;
    let finalSlug = baseSlug;
    let suffix = 2;
    while (slugsSeen.has(finalSlug)) {
      finalSlug = `${baseSlug}-${suffix++}`;
    }
    slugsSeen.add(finalSlug);

    rows.push({
      name,
      slug: finalSlug,
      address: parsed.address,
      city: parsed.city,
      state: parsed.state,
      zip_code: parsed.zip_code,
      latitude: place.geometry?.location?.lat ?? null,
      longitude: place.geometry?.location?.lng ?? null,
      phone: place.formatted_phone_number || '',
      website: place.website || '',
      google_place_id: place.place_id,
      google_rating: place.rating ?? null,
      google_review_count: place.user_ratings_total ?? null,
      google_types: types,
      categories: computed.categories,
      cuisine: computed.cuisine,
      cover_image_url: place.photos?.[0]?.photo_reference
        ? buildPhotoUrl(place.photos[0].photo_reference)
        : null,
      is_active: true,
      is_verified: false,
      market_id: marketId,
    });

    // Collect hours — restaurant_id resolved after upsert; store by place_id for now
    if (place.opening_hours?.periods?.length) {
      // We'll map these to restaurant IDs after upsert
      (allHoursRows as any).__placeHoursMap = (allHoursRows as any).__placeHoursMap || {};
      (allHoursRows as any).__placeHoursMap[place.place_id] = place.opening_hours.periods;
    }

    stats.built++;
  }

  console.log('Filter summary:');
  console.log(`  Total discovered: ${stats.total}`);
  console.log(`  Franchises skipped: ${stats.franchise}`);
  console.log(`  No name skipped: ${stats.noName}`);
  console.log(`  Rows to upsert: ${stats.built}`);

  const placeHoursMap: Record<string, any[]> = (allHoursRows as any).__placeHoursMap || {};
  const hoursCount = Object.keys(placeHoursMap).length;

  if (dryRun) {
    console.log('\n=== DRY RUN — first 15 rows ===\n');
    for (const place of discoveredPlaces.slice(0, 15)) {
      const row = rows.find((r) => r.google_place_id === place.place_id);
      if (!row) continue;
      const hasHours = !!placeHoursMap[place.place_id];
      const hasPhoto = !!row.cover_image_url;
      console.log(
        `  ${row.name}\n    ${row.address}, ${row.city}, ${row.state} ${row.zip_code}\n    categories=${JSON.stringify(row.categories)} cuisine=${row.cuisine}\n    rating=${row.google_rating} (${row.google_review_count} reviews)\n    photo=${hasPhoto ? 'yes' : 'none'}  hours=${hasHours ? 'yes' : 'none'}\n`,
      );
    }
    if (rows.length > 15) console.log(`  ... and ${rows.length - 15} more`);
    console.log(`\nHours available for ${hoursCount}/${rows.length} restaurants`);
    console.log('\n--- DRY RUN — no changes made ---');
    return;
  }

  if (rows.length === 0) {
    console.log('\nNo rows to insert.');
    return;
  }

  // 5. Batch upsert restaurants (20 rows per batch), capture returned IDs
  const BATCH_SIZE = 20;
  let upserted = 0;
  let errors = 0;
  // Map google_place_id → restaurant UUID (for hours insertion)
  const placeIdToRestaurantId: Record<string, string> = {};

  console.log(`\nUpserting ${rows.length} restaurants into Supabase (${BATCH_SIZE} at a time)...`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

    const { status, data } = await supabaseFetch('/rest/v1/restaurants', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      on_conflict: 'slug',
      body: batch,
    });

    if (status === 200 || status === 201) {
      upserted += batch.length;
      if (Array.isArray(data)) {
        for (const row of data) {
          if (row.id && row.google_place_id) {
            placeIdToRestaurantId[row.google_place_id] = row.id;
          }
        }
      }
      console.log(`  Batch ${batchNum}/${totalBatches} ✓ — saved ${upserted}/${rows.length} restaurants`);
    } else {
      errors += batch.length;
      console.error(
        `  Batch ${batchNum}/${totalBatches} FAILED (status ${status}):`,
        JSON.stringify(data).slice(0, 300),
      );
    }

    if (i + BATCH_SIZE < rows.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  console.log('');

  // 6. Insert hours for restaurants where we have periods
  const hoursEntries = Object.entries(placeHoursMap);
  let hoursInserted = 0;
  let hoursErrors = 0;

  if (hoursEntries.length > 0) {
    console.log(`\nInserting hours for ${hoursEntries.length} restaurants...`);

    const hoursRows: HoursRow[] = [];
    for (const [placeId, periods] of hoursEntries) {
      const restaurantId = placeIdToRestaurantId[placeId];
      if (!restaurantId) continue;
      hoursRows.push(...parseHours(restaurantId, periods));
    }

    // Upsert in batches of 140 (7 days × 20 restaurants per batch)
    const HOURS_BATCH = 140;
    const totalHoursBatches = Math.ceil(hoursRows.length / HOURS_BATCH);
    for (let i = 0; i < hoursRows.length; i += HOURS_BATCH) {
      const batch = hoursRows.slice(i, i + HOURS_BATCH);
      const batchNum = Math.floor(i / HOURS_BATCH) + 1;
      const { status, data } = await supabaseFetch('/rest/v1/restaurant_hours', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        on_conflict: 'restaurant_id,day_of_week',
        body: batch,
      });

      if (status === 200 || status === 201 || status === 204) {
        hoursInserted += batch.length;
        console.log(`  Hours batch ${batchNum}/${totalHoursBatches} ✓ — ${hoursInserted} rows saved`);
      } else {
        hoursErrors += batch.length;
        console.error(`  Hours batch ${batchNum}/${totalHoursBatches} FAILED (status ${status}):`, JSON.stringify(data).slice(0, 200));
      }

      if (i + HOURS_BATCH < hoursRows.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }

  console.log('\n=== DONE ===');
  console.log(`  Restaurants upserted: ${upserted}`);
  console.log(`  Hours rows inserted:  ${hoursInserted}`);
  if (errors > 0) console.log(`  Restaurant errors:    ${errors}`);
  console.log(`\nVerify: SELECT COUNT(*) FROM restaurants WHERE market_id = '${marketId}';`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
