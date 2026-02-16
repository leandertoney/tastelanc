/**
 * Cumberland County Restaurant CSV Import
 *
 * Imports OutScraper CSV data into the restaurants table for market cumberland-pa.
 * Uses a 4-layer filtering pipeline: non-food → geography → chain → dedup.
 *
 * Usage:
 *   cd apps/web
 *   npx tsx scripts/import-cumberland-csv.ts          # dry-run (default)
 *   npx tsx scripts/import-cumberland-csv.ts --live    # actually insert
 *
 * To adapt for City #3, change only the 4 constants below.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { parse } from 'csv-parse/sync';

// ─────────────────────────────────────────────────────────
// CITY CONFIG — Change these 4 values for a new market
// ─────────────────────────────────────────────────────────

const CSV_PATH = '/Users/leandertoney/Desktop/TasteCumberland Assets/cumberland_county.csv';
const MARKET_SLUG = 'cumberland-pa';

const VALID_ZIPS = new Set([
  '17007', // Boiling Springs
  '17011', // Camp Hill
  '17013', // Carlisle
  '17015', // Carlisle area
  '17019', // Dillsburg (partially Cumberland)
  '17025', // Enola / East Pennsboro
  '17027', // Grantham
  '17043', // Lemoyne / New Cumberland / Wormleysburg
  '17050', // Mechanicsburg
  '17053', // Marysville (edge)
  '17055', // Mechanicsburg
  '17065', // Mount Holly Springs
  '17070', // New Cumberland
  '17081', // Summerdale
  '17093', // West Fairview
  '17240', // Newburg
  '17241', // Newville
  '17257', // Shippensburg (partially Cumberland)
  '17266', // Walnut Bottom
]);

const BOUNDING_BOX = {
  minLat: 39.95,
  maxLat: 40.35,
  minLng: -77.55,
  maxLng: -76.85,
};

const ARTIFACT_DIR = '/tmp/cumberland-import';

// ─────────────────────────────────────────────────────────
// ENV + SUPABASE
// ─────────────────────────────────────────────────────────

const envContent = readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

// ─────────────────────────────────────────────────────────
// LAYER 1: NON-FOOD CATEGORY FILTER
// ─────────────────────────────────────────────────────────

// Whitelist of CSV `category` values that represent food/drink businesses
const FOOD_CATEGORIES = new Set([
  'restaurants',
  'bars',
  'cafes',
  'coffee shops',
  // Capitalized OutScraper categories
  'Bakery',
  'Brewery',
  'Distillery',
  'Deli',
  'Winery',
  'Ice cream shop',
  'Donut shop',
  'Chocolate shop',
  'Chocolate cafe',
  'Candy store',
  'Cookie shop',
  'Cake shop',
  'Dessert shop',
  'Frozen yogurt shop',
  'Bagel shop',
  'Juice shop',
  'Bubble tea store',
  'Tea house',
  'Coffee roasters',
  'Coffee stand',
  'Poke bar',
  'Hookah bar',
  'Night club',
  'Gay bar',
  'Gay night club',
  'Dance club',
  'Comedy club',
  'Live music venue',
  'Karaoke',
  'Cat cafe',
  'Charcuterie',
  'Fish and chips takeaway',
  'Sushi restaurant',
  'Sushi takeaway',
  'Pizza delivery',
  'Hamburger restaurant',
  'Cheesesteak restaurant',
  'Asian fusion restaurant',
  'Modern Indian restaurant',
  'South Indian restaurant',
  'Southern restaurant (US)',
  'Soul food restaurant',
  'Shawarma restaurant',
  'Kyoto style Japanese restaurant',
  'Pretzel store',
  'Pastelería',
  'Food and drink',
  'Meal delivery',
  // NOTE: Caterer, Mobile caterer, Catering food and drink supplier excluded
  // (no walk-in storefronts)
]);

function isFoodBusiness(row: CsvRow): boolean {
  // Strict whitelist only — category must exactly match.
  // No keyword fallback on type/subtypes (causes false positives).
  return FOOD_CATEGORIES.has(row.category?.trim());
}

// ─────────────────────────────────────────────────────────
// LAYER 3: CHAIN DETECTION
// ─────────────────────────────────────────────────────────

const CHAIN_PATTERNS: string[] = [
  // Fast Food
  "mcdonald's", 'mcdonalds', 'taco bell', 'burger king',
  "wendy's", 'wendys', 'chick-fil-a', 'chickfila', 'chick fil a',
  'kfc', 'kentucky fried chicken', 'popeyes', "arby's", 'arbys',
  'sonic drive-in', "carl's jr", "hardee's", 'jack in the box',
  'whataburger', "zaxby's", "raising cane's", 'wingstop',
  'white castle', 'krystal', 'del taco', 'el pollo loco',
  "checkers", "rally's",

  // Coffee & Donuts
  'starbucks', "dunkin'", 'dunkin donuts', 'dunkin ',
  'krispy kreme', 'tim hortons',

  // Fast Casual
  'panera bread', 'panera', 'chipotle', 'qdoba',
  "moe's southwest", 'five guys', 'shake shack', "culver's",
  'in-n-out', 'panda express', "noodles & company", 'noodles and company',
  'waba grill', 'baja fresh', "rubio's", 'cafe rio', 'costa vida',
  'pei wei', 'pick up stix', 'yoshinoya', 'teriyaki madness', 'sarku japan',
  'playa bowls', 'clean eatz',

  // Subs & Sandwiches
  'subway', "jimmy john's", 'jimmy johns', "jersey mike's", 'jersey mikes',
  'firehouse subs', "penn station", 'potbelly', 'which wich',
  "jason's deli", "mcalister's deli", 'mcalisters deli',

  // Pizza Chains
  "domino's", 'dominos', 'pizza hut', 'little caesars',
  "papa john's", 'papa johns', "papa murphy's", "marco's pizza",

  // Casual Dining
  "applebee's", 'applebees', "chili's", 'chilis',
  "tgi friday's", 'tgi fridays', 'olive garden', 'red lobster',
  'outback steakhouse', 'longhorn steakhouse', 'texas roadhouse',
  "carrabba's", 'red robin', 'buffalo wild wings', 'bdubs',
  'hooters', 'twin peaks', 'ruby tuesday', 'bonefish grill',
  "cheesecake factory", "bj's restaurant",
  'first watch', 'metro diner',

  // Breakfast/Diners chains
  'cracker barrel', 'ihop', "denny's", 'dennys',
  'bob evans', 'waffle house', 'perkins',
  'golden corral', "hometown buffet", "old country buffet",

  // Ice Cream & Sweets chains
  'dairy queen', 'baskin-robbins', 'baskin robbins',
  'cold stone', 'carvel', 'haagen-dazs',

  // Other chains
  "friendly's", 'friendlys', "auntie anne's", 'auntie annes',
  'cinnabon', 'great american cookies', "wetzel's pretzels",
  'jamba juice', 'tropical smoothie', 'smoothie king',
  'orange julius', 'charleys philly steaks', 'charleys cheesesteaks',
  'sbarro', 'pret a manger', 'au bon pain', 'corner bakery',
  'einstein bros', 'atlanta bread', 'la madeleine',
  "bob's big boy", "steak 'n shake", 'steak n shake',
  "hot dog on a stick",

  // Gas stations / convenience (NOT restaurants)
  'wawa', 'sheetz', "rutter's", 'rutters', 'turkey hill',
  'royal farms', '7-eleven', '7 eleven', 'cumberland farms',
  'pilot travel center', 'love\'s travel', 'ta travel center',
  'quiktrip', 'speedway', 'circle k',

  // Big box / non-restaurant brands that appear in CSV
  'target', 'walmart', 'costco', 'sam\'s club',
];

// Franchise indicator patterns
const FRANCHISE_PATTERNS = [
  /\s#\d{2,}/,               // Store numbers like #1234
  /\bllc\b/i,                // LLC
  /\binc\.?\b/i,             // Inc or Inc.
  /\bcorp\.?\b/i,            // Corp or Corp.
  /\bfranchise\b/i,          // Franchise
  /\bstore\s*#?\d+/i,        // Store 123, Store #123
  /\blocation\s*#?\d+/i,     // Location 123
  /\bunit\s*#?\d+/i,         // Unit 123
];

function isChain(name: string): { isChain: boolean; matchedPattern: string } {
  const normalized = name.toLowerCase().trim();

  // Check against known chain list
  for (const pattern of CHAIN_PATTERNS) {
    if (normalized.includes(pattern)) {
      return { isChain: true, matchedPattern: pattern };
    }
  }

  // Check franchise patterns
  for (const regex of FRANCHISE_PATTERNS) {
    if (regex.test(name)) {
      return { isChain: true, matchedPattern: `franchise pattern: ${regex.source}` };
    }
  }

  return { isChain: false, matchedPattern: '' };
}

// ─────────────────────────────────────────────────────────
// CATEGORY MAPPING (Google types → internal categories)
// ─────────────────────────────────────────────────────────

type RestaurantCategory =
  | 'american' | 'italian' | 'mexican' | 'chinese' | 'japanese_sushi'
  | 'thai' | 'indian' | 'mediterranean' | 'vietnamese' | 'korean'
  | 'caribbean' | 'bbq' | 'seafood' | 'steakhouse' | 'pizza'
  | 'deli_sandwiches' | 'pa_dutch' | 'breakfast' | 'brunch' | 'desserts'
  | 'lunch' | 'dinner' | 'late_night'
  | 'fine_dining' | 'casual' | 'fast_casual' | 'food_truck' | 'cafe_coffee' | 'bakery'
  | 'bars' | 'nightlife' | 'brewery' | 'winery' | 'distillery' | 'cocktail_bar'
  | 'outdoor_dining' | 'rooftops' | 'live_music' | 'sports_bar'
  | 'pet_friendly' | 'byob' | 'family_friendly' | 'date_night';

const CATEGORY_MAP: Record<string, RestaurantCategory[]> = {
  // Cuisine types
  'american restaurant': ['american', 'casual', 'lunch', 'dinner'],
  'italian restaurant': ['italian', 'dinner'],
  'mexican restaurant': ['mexican', 'lunch', 'dinner'],
  'chinese restaurant': ['chinese', 'lunch', 'dinner'],
  'japanese restaurant': ['japanese_sushi', 'dinner'],
  'sushi restaurant': ['japanese_sushi', 'dinner'],
  'thai restaurant': ['thai', 'lunch', 'dinner'],
  'indian restaurant': ['indian', 'dinner'],
  'modern indian restaurant': ['indian', 'dinner'],
  'south indian restaurant': ['indian', 'dinner'],
  'vietnamese restaurant': ['vietnamese', 'lunch', 'dinner'],
  'pho restaurant': ['vietnamese', 'lunch', 'dinner'],
  'korean restaurant': ['korean', 'dinner'],
  'caribbean restaurant': ['caribbean', 'lunch', 'dinner'],
  'mediterranean restaurant': ['mediterranean', 'dinner'],
  'greek restaurant': ['mediterranean', 'dinner'],
  'middle eastern restaurant': ['mediterranean', 'dinner'],
  'bbq restaurant': ['bbq', 'lunch', 'dinner'],
  'barbecue restaurant': ['bbq', 'lunch', 'dinner'],
  'seafood restaurant': ['seafood', 'dinner'],
  'steak house': ['steakhouse', 'dinner', 'date_night'],
  'steakhouse': ['steakhouse', 'dinner', 'date_night'],
  'pizza restaurant': ['pizza', 'lunch', 'dinner'],
  'pizza delivery': ['pizza', 'lunch', 'dinner'],
  'pizzeria': ['pizza', 'lunch', 'dinner'],
  'sandwich shop': ['deli_sandwiches', 'lunch'],
  'deli': ['deli_sandwiches', 'lunch'],
  'cheesesteak restaurant': ['deli_sandwiches', 'american', 'lunch'],
  'hamburger restaurant': ['american', 'fast_casual', 'lunch'],
  'breakfast restaurant': ['breakfast', 'brunch'],
  'brunch restaurant': ['brunch', 'breakfast', 'lunch'],
  'soul food restaurant': ['american', 'dinner'],
  'southern restaurant': ['american', 'casual', 'dinner'],
  'asian fusion restaurant': ['japanese_sushi', 'dinner'],
  'french restaurant': ['fine_dining', 'dinner', 'date_night'],
  'spanish restaurant': ['mediterranean', 'dinner'],
  'latin american restaurant': ['mexican', 'dinner'],
  'shawarma restaurant': ['mediterranean', 'lunch'],
  'ramen restaurant': ['japanese_sushi', 'lunch', 'dinner'],
  'poke bar': ['japanese_sushi', 'lunch'],

  // Dining style
  'family restaurant': ['american', 'casual', 'family_friendly', 'lunch', 'dinner'],
  'fast food restaurant': ['fast_casual', 'lunch'],
  'fine dining restaurant': ['fine_dining', 'dinner', 'date_night'],
  'food truck': ['food_truck', 'lunch'],
  'buffet restaurant': ['casual', 'lunch', 'dinner'],
  'diner': ['american', 'casual', 'breakfast', 'brunch', 'lunch'],
  'bistro': ['casual', 'dinner'],
  'gastropub': ['bars', 'casual', 'dinner'],
  'fish and chips takeaway': ['seafood', 'lunch'],

  // Cafes & bakeries
  'cafe': ['cafe_coffee', 'breakfast', 'brunch', 'lunch'],
  'coffee shop': ['cafe_coffee', 'breakfast'],
  'coffee roasters': ['cafe_coffee'],
  'coffee stand': ['cafe_coffee'],
  'tea house': ['cafe_coffee'],
  'bubble tea store': ['cafe_coffee', 'desserts'],
  'bakery': ['bakery', 'breakfast', 'brunch'],
  'cat cafe': ['cafe_coffee', 'pet_friendly'],
  'chocolate cafe': ['cafe_coffee', 'desserts'],

  // Desserts
  'ice cream shop': ['desserts'],
  'frozen yogurt shop': ['desserts'],
  'dessert shop': ['desserts'],
  'cake shop': ['bakery', 'desserts'],
  'cookie shop': ['bakery', 'desserts'],
  'donut shop': ['bakery', 'breakfast', 'desserts'],
  'chocolate shop': ['desserts'],
  'candy store': ['desserts'],
  'pretzel store': ['bakery'],
  'charcuterie': ['deli_sandwiches'],
  'bagel shop': ['bakery', 'breakfast'],

  // Bars & nightlife
  'bar': ['bars', 'nightlife'],
  'bar & grill': ['bars', 'american', 'casual', 'lunch', 'dinner'],
  'sports bar': ['bars', 'sports_bar', 'nightlife'],
  'cocktail bar': ['cocktail_bar', 'bars', 'nightlife'],
  'wine bar': ['bars', 'winery', 'nightlife'],
  'pub': ['bars', 'casual'],
  'night club': ['nightlife', 'bars', 'late_night'],
  'gay bar': ['bars', 'nightlife'],
  'gay night club': ['nightlife', 'bars', 'late_night'],
  'dance club': ['nightlife', 'bars', 'late_night'],
  'hookah bar': ['bars', 'nightlife', 'late_night'],
  'live music bar': ['bars', 'live_music', 'nightlife'],
  'live music venue': ['live_music', 'nightlife'],
  'comedy club': ['nightlife'],
  'karaoke': ['nightlife', 'bars'],
  'lounge': ['bars', 'nightlife'],
  'tapas bar': ['bars', 'mediterranean', 'dinner'],

  // Drink producers
  'brewery': ['brewery', 'bars'],
  'brewpub': ['brewery', 'bars', 'casual', 'dinner'],
  'winery': ['winery'],
  'distillery': ['distillery', 'bars'],

  // Generic
  'restaurant': ['casual', 'lunch', 'dinner'],

  // Non-walk-in (map but categories may be sparse)
  'caterer': ['lunch', 'dinner'],
  'mobile caterer': ['food_truck', 'lunch'],
  'catering food and drink supplier': ['lunch', 'dinner'],
  'meal delivery': ['lunch', 'dinner'],
  'food and drink': ['casual', 'lunch', 'dinner'],
};

function mapCategories(type: string, subtypes: string): RestaurantCategory[] {
  const allTypes = [
    type?.trim(),
    ...subtypes.split(',').map(s => s.trim()),
  ].filter(Boolean);

  const categories = new Set<RestaurantCategory>();

  for (const t of allTypes) {
    const tLower = t.toLowerCase();

    // Exact match
    if (CATEGORY_MAP[tLower]) {
      CATEGORY_MAP[tLower].forEach(c => categories.add(c));
      continue;
    }

    // Partial match
    for (const [key, cats] of Object.entries(CATEGORY_MAP)) {
      if (tLower.includes(key) || key.includes(tLower)) {
        cats.forEach(c => categories.add(c));
      }
    }
  }

  // Default
  if (categories.size === 0) {
    categories.add('casual');
    categories.add('lunch');
    categories.add('dinner');
  }

  return Array.from(categories);
}

// ─────────────────────────────────────────────────────────
// ADDRESS PARSING
// ─────────────────────────────────────────────────────────

interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  streetNumber: string; // for dedup
}

function parseAddress(fullAddress: string): ParsedAddress {
  const parts = fullAddress.split(',').map(s => s.trim());

  if (parts.length < 2) {
    return { street: fullAddress, city: '', state: 'PA', zip: '', streetNumber: '' };
  }

  const street = parts[0];
  const lastPart = parts[parts.length - 1] || '';
  const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})/);

  const state = stateZipMatch ? stateZipMatch[1] : 'PA';
  const zip = stateZipMatch ? stateZipMatch[2] : '';

  // City is always the second-to-last meaningful part
  let city = '';
  if (parts.length >= 3) {
    city = parts[parts.length - 2];
  } else {
    city = parts[1].replace(/\s*[A-Z]{2}\s*\d{5}/, '').trim();
  }

  // Extract street number for dedup
  const numMatch = street.match(/^(\d+)/);
  const streetNumber = numMatch ? numMatch[1] : '';

  return { street, city, state, zip, streetNumber };
}

// ─────────────────────────────────────────────────────────
// SLUG GENERATION
// ─────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─────────────────────────────────────────────────────────
// CSV ROW INTERFACE
// ─────────────────────────────────────────────────────────

interface CsvRow {
  name: string;
  subtypes: string;
  category: string;
  type: string;
  phone: string;
  website: string;
  address: string;
  full_name: string;
  title: string;
  email: string;
  contact_phone: string;
  contact_phones: string;
  latitude: string;
  longitude: string;
  rating: string;
  reviews: string;
  photo: string;
  logo: string;
  description: string;
}

// ─────────────────────────────────────────────────────────
// CSV ARTIFACT WRITER
// ─────────────────────────────────────────────────────────

function writeCsvArtifact(filename: string, rows: Record<string, string>[]) {
  if (rows.length === 0) {
    writeFileSync(`${ARTIFACT_DIR}/${filename}`, '(empty)\n');
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${(r[h] || '').replace(/"/g, '""')}"`).join(',')),
  ];
  writeFileSync(`${ARTIFACT_DIR}/${filename}`, lines.join('\n') + '\n');
}

// ─────────────────────────────────────────────────────────
// MAIN IMPORT FUNCTION
// ─────────────────────────────────────────────────────────

async function importRestaurants() {
  const isLive = process.argv.includes('--live');

  console.log('═══════════════════════════════════════════════');
  console.log('  CUMBERLAND COUNTY RESTAURANT IMPORT');
  console.log('═══════════════════════════════════════════════');
  console.log(`Mode:   ${isLive ? '🔴 LIVE (will write to DB)' : '🟢 DRY RUN (read-only)'}`);
  console.log(`CSV:    ${CSV_PATH}`);
  console.log(`Market: ${MARKET_SLUG}`);
  console.log('');

  // Create artifact directory
  mkdirSync(ARTIFACT_DIR, { recursive: true });

  // ── Read CSV ──
  const csvContent = readFileSync(CSV_PATH, 'utf8');
  const rows: CsvRow[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  console.log(`Total CSV rows: ${rows.length}`);

  // ── Fetch market UUID ──
  const { data: marketData, error: marketError } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', MARKET_SLUG)
    .single();

  if (marketError || !marketData) {
    console.error(`❌ Market "${MARKET_SLUG}" not found. Run multi-market migration first.`);
    process.exit(1);
  }
  const marketId = marketData.id;
  console.log(`Market UUID: ${marketId}`);

  // ── Fetch basic tier ID ──
  const { data: tierData, error: tierError } = await supabase
    .from('tiers')
    .select('id')
    .eq('name', 'basic')
    .single();

  if (tierError || !tierData) {
    console.error('❌ Could not find basic tier.');
    process.exit(1);
  }
  const basicTierId = tierData.id;

  // ── Fetch existing restaurants for dedup ──
  const { data: existingData } = await supabase
    .from('restaurants')
    .select('name, address, market_id')
    .eq('market_id', marketId);

  const existingKeys = new Set(
    (existingData || []).map(r => {
      const numMatch = (r.address || '').match(/^(\d+)/);
      const streetNum = numMatch ? numMatch[1] : '';
      return `${r.name.toLowerCase().trim()}|${streetNum}`;
    })
  );

  // ── Fetch existing slugs across ALL markets ──
  const { data: slugData } = await supabase
    .from('restaurants')
    .select('slug');
  const existingSlugs = new Set((slugData || []).map(r => r.slug));

  console.log(`Existing restaurants in ${MARKET_SLUG}: ${existingData?.length || 0}`);
  console.log(`Existing slugs (all markets): ${existingSlugs.size}`);
  console.log('');

  // ── Filtering pipeline ──
  const rejectedNonFood: Record<string, string>[] = [];
  const rejectedOutside: Record<string, string>[] = [];
  const rejectedChains: Record<string, string>[] = [];
  const rejectedDupes: { name: string; reason: string }[] = [];
  const rejectedNoName: number[] = [];
  const insertReady: Record<string, any>[] = [];

  const slugCounts: Record<string, number> = {};

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) {
      rejectedNoName.push(1);
      continue;
    }

    // ── Layer 1: Non-food filter ──
    if (!isFoodBusiness(row)) {
      rejectedNonFood.push({
        name,
        category: row.category || '',
        type: row.type || '',
        address: row.address || '',
      });
      continue;
    }

    // ── Layer 2: Geographic filter ──
    const parsed = parseAddress(row.address || '');

    // ZIP check
    const zipOk = parsed.zip && VALID_ZIPS.has(parsed.zip);
    // Bounding box check
    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);
    const coordsOk = !isNaN(lat) && !isNaN(lng)
      && lat >= BOUNDING_BOX.minLat && lat <= BOUNDING_BOX.maxLat
      && lng >= BOUNDING_BOX.minLng && lng <= BOUNDING_BOX.maxLng;

    if (!zipOk && !coordsOk) {
      rejectedOutside.push({
        name,
        address: row.address || '',
        zip: parsed.zip,
        lat: row.latitude || '',
        lng: row.longitude || '',
        reason: !parsed.zip ? 'no zip, coords outside bbox' : `zip ${parsed.zip} not in county`,
      });
      continue;
    }

    // If ZIP fails but coords are inside bbox, still allow (handles missing/wrong zips)
    // If coords fail but ZIP is good, still allow (handles missing coords)

    // ── Layer 3: Chain detection ──
    const chainCheck = isChain(name);
    if (chainCheck.isChain) {
      rejectedChains.push({
        name,
        matched: chainCheck.matchedPattern,
        address: row.address || '',
      });
      continue;
    }

    // ── Layer 4: Dedup ──
    const dedupKey = `${name.toLowerCase().trim()}|${parsed.streetNumber}`;
    if (existingKeys.has(dedupKey)) {
      rejectedDupes.push({ name, reason: 'already in DB' });
      continue;
    }
    // Also dedup within this CSV run
    if (insertReady.some(r => `${r.name.toLowerCase().trim()}|${r._streetNumber}` === dedupKey)) {
      rejectedDupes.push({ name, reason: 'duplicate in CSV' });
      continue;
    }

    // ── Map fields ──
    const categories = mapCategories(row.type || '', row.subtypes || '');
    const googleTypes = row.subtypes
      ? row.subtypes.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const rating = row.rating ? parseFloat(row.rating) : null;

    // Generate unique slug
    let baseSlug = generateSlug(name);
    if (!baseSlug) baseSlug = 'restaurant';
    slugCounts[baseSlug] = (slugCounts[baseSlug] || 0) + 1;

    let slug = slugCounts[baseSlug] > 1
      ? `${baseSlug}-${parsed.city.toLowerCase().replace(/\s+/g, '-') || slugCounts[baseSlug]}`
      : baseSlug;

    // If still collides with existing DB slugs, append number
    let slugAttempt = 0;
    let candidateSlug = slug;
    while (existingSlugs.has(candidateSlug)) {
      slugAttempt++;
      candidateSlug = `${slug}-${slugAttempt}`;
    }
    slug = candidateSlug;
    existingSlugs.add(slug);

    const record = {
      name,
      slug,
      address: parsed.street,
      city: parsed.city || 'Unknown',
      state: parsed.state,
      zip_code: parsed.zip || null,
      phone: row.phone?.trim() || row.contact_phone?.trim() || null,
      website: row.website?.trim() || null,
      latitude: !isNaN(lat) ? lat : null,
      longitude: !isNaN(lng) ? lng : null,
      logo_url: row.logo?.trim() || null,
      cover_image_url: row.photo?.trim() || null,
      description: row.description?.trim() || null,
      categories,
      google_types: googleTypes,
      average_rating: rating && rating >= 1 && rating <= 5 ? rating : null,
      market_id: marketId,
      tier_id: basicTierId,
      is_active: true,
      is_verified: false,
      primary_color: '#E63946',
      secondary_color: '#1D3557',
      _streetNumber: parsed.streetNumber, // transient, removed before insert
    };

    insertReady.push(record);
  }

  // ── Write CSV artifacts ──
  writeCsvArtifact('rejected_non_food.csv', rejectedNonFood);
  writeCsvArtifact('rejected_outside_county.csv', rejectedOutside);
  writeCsvArtifact('rejected_chains.csv', rejectedChains);
  writeCsvArtifact('insert_ready.csv', insertReady.map(r => ({
    name: r.name,
    slug: r.slug,
    address: r.address,
    city: r.city,
    state: r.state,
    zip_code: r.zip_code || '',
    phone: r.phone || '',
    website: r.website || '',
    categories: r.categories.join('; '),
    rating: r.average_rating?.toString() || '',
    lat: r.latitude?.toString() || '',
    lng: r.longitude?.toString() || '',
  })));

  // ── Summary report ──
  console.log('═══════════════════════════════════════════════');
  console.log('  FILTERING RESULTS');
  console.log('═══════════════════════════════════════════════');
  console.log(`Total CSV rows:                  ${rows.length}`);
  console.log(`Rejected (no name):              ${rejectedNoName.length}`);
  console.log(`Rejected (non-food category):    ${rejectedNonFood.length}`);
  console.log(`Rejected (outside county):       ${rejectedOutside.length}`);
  console.log(`Rejected (chain/franchise):      ${rejectedChains.length}`);
  console.log(`Rejected (duplicate):            ${rejectedDupes.length}`);
  console.log(`Ready to insert:                 ${insertReady.length}`);
  console.log('');

  // Chain breakdown
  if (rejectedChains.length > 0) {
    console.log('── CHAINS FILTERED ──');
    const chainCounts: Record<string, number> = {};
    for (const c of rejectedChains) {
      chainCounts[c.matched] = (chainCounts[c.matched] || 0) + 1;
    }
    for (const [pattern, count] of Object.entries(chainCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${pattern}: ${count}`);
    }
    console.log('');
  }

  // Dupe breakdown
  if (rejectedDupes.length > 0) {
    console.log('── DUPLICATES ──');
    for (const d of rejectedDupes.slice(0, 20)) {
      console.log(`  ${d.name} (${d.reason})`);
    }
    if (rejectedDupes.length > 20) console.log(`  ... and ${rejectedDupes.length - 20} more`);
    console.log('');
  }

  // Sample of what would be inserted
  console.log('── SAMPLE INSERTS (first 15) ──');
  for (const r of insertReady.slice(0, 15)) {
    console.log(`  ${r.name} | ${r.city}, ${r.zip_code || '?'} | [${r.categories.join(', ')}] | ★${r.average_rating || '?'}`);
  }
  console.log('');

  console.log(`📁 Artifacts written to: ${ARTIFACT_DIR}/`);
  console.log(`   insert_ready.csv (${insertReady.length} rows)`);
  console.log(`   rejected_non_food.csv (${rejectedNonFood.length} rows)`);
  console.log(`   rejected_outside_county.csv (${rejectedOutside.length} rows)`);
  console.log(`   rejected_chains.csv (${rejectedChains.length} rows)`);
  console.log('');

  // ── Insert (only if --live) ──
  if (!isLive) {
    console.log('🟢 DRY RUN complete. No changes made to the database.');
    console.log('   Run with --live flag to insert.');
    return;
  }

  console.log('🔴 LIVE MODE — Inserting into database...');
  console.log('');

  // Count Lancaster restaurants before (safety check)
  const { count: lancasterBefore } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
    .neq('market_id', marketId);

  const batchSize = 50;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < insertReady.length; i += batchSize) {
    const batch = insertReady.slice(i, i + batchSize).map(r => {
      const { _streetNumber, ...record } = r;
      return record;
    });

    const { error } = await supabase.from('restaurants').insert(batch);

    if (error) {
      console.error(`  ❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`);
      // Try one-by-one to identify the problem row
      for (const record of batch) {
        const { error: singleError } = await supabase.from('restaurants').insert(record);
        if (singleError) {
          console.error(`    ❌ ${record.name}: ${singleError.message}`);
          failed++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
      console.log(`  Inserted ${inserted}/${insertReady.length}...`);
    }
  }

  // Safety check: Lancaster count unchanged
  const { count: lancasterAfter } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
    .neq('market_id', marketId);

  const { count: cumberlandCount } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
    .eq('market_id', marketId);

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  INSERTION COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`Inserted:                    ${inserted}`);
  console.log(`Failed:                      ${failed}`);
  console.log(`Cumberland restaurants now:   ${cumberlandCount}`);
  console.log(`Lancaster restaurants:        ${lancasterAfter} (was ${lancasterBefore})`);

  if (lancasterBefore !== lancasterAfter) {
    console.error('⚠️  WARNING: Lancaster restaurant count changed! Investigate immediately.');
  } else {
    console.log('✅ Lancaster data untouched.');
  }
}

importRestaurants().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
