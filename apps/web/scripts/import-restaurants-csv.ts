import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

// Read .env.local
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
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Valid Lancaster area zip codes
const VALID_ZIPS = ['17601', '17602', '17603', '17540', '17551', '17552', '17505'];

// Category mapping from Google types to our categories
type RestaurantCategory = 'bars' | 'nightlife' | 'rooftops' | 'brunch' | 'lunch' | 'dinner' | 'outdoor_dining';

const categoryMap: Record<string, RestaurantCategory[]> = {
  'bar': ['bars', 'nightlife'],
  'nightclub': ['bars', 'nightlife'],
  'cocktail bar': ['bars', 'nightlife'],
  'wine bar': ['bars', 'nightlife'],
  'sports bar': ['bars', 'nightlife'],
  'pub': ['bars', 'nightlife'],
  'lounge': ['bars', 'nightlife'],
  'rooftop bar': ['bars', 'nightlife', 'rooftops'],
  'restaurant': ['lunch', 'dinner'],
  'cafe': ['brunch', 'lunch'],
  'bakery': ['brunch'],
  'coffee shop': ['brunch'],
  'breakfast restaurant': ['brunch'],
  'brunch restaurant': ['brunch'],
  'american restaurant': ['lunch', 'dinner'],
  'italian restaurant': ['dinner'],
  'mexican restaurant': ['lunch', 'dinner'],
  'chinese restaurant': ['lunch', 'dinner'],
  'japanese restaurant': ['dinner'],
  'thai restaurant': ['lunch', 'dinner'],
  'indian restaurant': ['dinner'],
  'pizza restaurant': ['lunch', 'dinner'],
  'seafood restaurant': ['dinner'],
  'steak house': ['dinner'],
  'burger restaurant': ['lunch', 'dinner'],
  'sandwich shop': ['lunch'],
  'deli': ['lunch'],
  'food truck': ['lunch'],
  'fast food restaurant': ['lunch'],
  'ice cream shop': ['lunch'],
  'dessert shop': ['lunch'],
  'brewery': ['bars', 'nightlife', 'dinner'],
  'winery': ['bars', 'dinner'],
  'distillery': ['bars', 'nightlife'],
  'bistro': ['dinner'],
  'gastropub': ['bars', 'dinner'],
  'tapas bar': ['bars', 'dinner'],
  'sushi restaurant': ['dinner'],
  'ramen restaurant': ['lunch', 'dinner'],
  'korean restaurant': ['dinner'],
  'vietnamese restaurant': ['lunch', 'dinner'],
  'mediterranean restaurant': ['dinner'],
  'greek restaurant': ['dinner'],
  'french restaurant': ['dinner'],
  'spanish restaurant': ['dinner'],
  'latin american restaurant': ['dinner'],
  'caribbean restaurant': ['dinner'],
  'soul food restaurant': ['dinner'],
  'bbq restaurant': ['lunch', 'dinner'],
  'diner': ['brunch', 'lunch'],
  'buffet restaurant': ['lunch', 'dinner'],
  'food court': ['lunch'],
  'catering service': ['lunch', 'dinner'],
};

interface CsvRow {
  name: string;
  site: string;
  subtypes: string;
  type: string;
  phone: string;
  full_address: string;
  latitude: string;
  longitude: string;
  rating: string;
  reviews: string;
  photo: string;
  working_hours_old_format: string;
  logo: string;
  description: string;
  reservation_links: string;
  menu_link: string;
}

interface ParsedRestaurant {
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  categories: RestaurantCategory[];
  average_rating: number | null;
  reservation_links: string | null;
  tier_id: string;
  is_active: boolean;
  is_verified: boolean;
  primary_color: string;
  secondary_color: string;
}

// Generate URL-friendly slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Parse address like "9 N Duke St, Lancaster, PA 17602"
function parseAddress(fullAddress: string): { address: string; city: string; state: string; zip: string } {
  const parts = fullAddress.split(',').map(s => s.trim());

  if (parts.length < 2) {
    return { address: fullAddress, city: 'Lancaster', state: 'PA', zip: '' };
  }

  const address = parts[0];
  const cityPart = parts[1] || '';

  // Last part should be "PA 17602"
  const lastPart = parts[parts.length - 1] || '';
  const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})/);

  const state = stateZipMatch ? stateZipMatch[1] : 'PA';
  const zip = stateZipMatch ? stateZipMatch[2] : '';

  // City is after address, before state/zip
  const city = parts.length >= 3 ? parts[1] : cityPart.replace(/\s*[A-Z]{2}\s*\d{5}/, '').trim();

  return { address, city: city || 'Lancaster', state, zip };
}

// Map Google types to our categories
function mapCategories(type: string, subtypes: string): RestaurantCategory[] {
  const allTypes = [type, ...subtypes.split(',').map(s => s.trim().toLowerCase())].filter(Boolean);
  const categories = new Set<RestaurantCategory>();

  for (const t of allTypes) {
    const typeLower = t.toLowerCase();

    // Check for exact match first
    if (categoryMap[typeLower]) {
      categoryMap[typeLower].forEach(c => categories.add(c));
    } else {
      // Check for partial matches
      for (const [key, cats] of Object.entries(categoryMap)) {
        if (typeLower.includes(key) || key.includes(typeLower)) {
          cats.forEach(c => categories.add(c));
        }
      }
    }
  }

  // Default to lunch/dinner if nothing matched
  if (categories.size === 0) {
    categories.add('lunch');
    categories.add('dinner');
  }

  return Array.from(categories);
}

// Parse hours string like "Friday:7AM-4PM" into structured format
function parseHours(hoursString: string): { day: string; open: string; close: string }[] {
  if (!hoursString) return [];

  const dayMap: Record<string, string> = {
    'monday': 'monday',
    'tuesday': 'tuesday',
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'friday': 'friday',
    'saturday': 'saturday',
    'sunday': 'sunday',
  };

  const results: { day: string; open: string; close: string }[] = [];

  // Format: "Friday:7AM-4PM" or "Monday:9AM-9PM,Tuesday:9AM-9PM"
  const entries = hoursString.split(',');

  for (const entry of entries) {
    const match = entry.match(/(\w+):(\d+(?::\d+)?(?:AM|PM)?)-(\d+(?::\d+)?(?:AM|PM)?)/i);
    if (match) {
      const dayLower = match[1].toLowerCase();
      const day = dayMap[dayLower];
      if (day) {
        results.push({
          day,
          open: convertTo24Hour(match[2]),
          close: convertTo24Hour(match[3]),
        });
      }
    }
  }

  return results;
}

// Convert "7AM" or "4PM" to "07:00" or "16:00"
function convertTo24Hour(time: string): string {
  const match = time.match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
  if (!match) return '00:00';

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

async function getBasicTierId(): Promise<string> {
  const { data, error } = await supabase
    .from('tiers')
    .select('id')
    .eq('name', 'basic')
    .single();

  if (error || !data) {
    throw new Error('Could not find basic tier');
  }
  return data.id;
}

async function getExistingRestaurants(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('name, city');

  if (error) throw error;

  return new Set(
    (data || []).map(r => `${r.name.toLowerCase()}|${r.city.toLowerCase()}`)
  );
}

async function importRestaurants(dryRun: boolean = false) {
  console.log('=== RESTAURANT CSV IMPORT ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}\n`);

  // Read CSV
  const csvPath = '/Users/leandertoney/Desktop/TasteLanc Assets/all_of_lanc.csv';
  console.log(`Reading CSV from: ${csvPath}`);

  const csvContent = readFileSync(csvPath, 'utf8');
  const rows: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Total rows in CSV: ${rows.length}\n`);

  // Get basic tier ID
  const basicTierId = await getBasicTierId();
  console.log(`Basic tier ID: ${basicTierId}\n`);

  // Get existing restaurants to avoid duplicates
  const existing = await getExistingRestaurants();
  console.log(`Existing restaurants in DB: ${existing.size}\n`);

  // Process rows
  const toInsert: ParsedRestaurant[] = [];
  const skipped: { name: string; reason: string }[] = [];
  const slugCounts: Record<string, number> = {};

  for (const row of rows) {
    // Skip if no name
    if (!row.name?.trim()) {
      skipped.push({ name: '(empty)', reason: 'No name' });
      continue;
    }

    // Parse address
    const { address, city, state, zip } = parseAddress(row.full_address || '');

    // Skip if outside Lancaster area
    if (zip && !VALID_ZIPS.includes(zip)) {
      skipped.push({ name: row.name, reason: `Outside Lancaster area (${zip})` });
      continue;
    }

    // Skip if duplicate
    const key = `${row.name.toLowerCase()}|${city.toLowerCase()}`;
    if (existing.has(key)) {
      skipped.push({ name: row.name, reason: 'Already exists in DB' });
      continue;
    }

    // Generate unique slug
    let baseSlug = generateSlug(row.name);
    slugCounts[baseSlug] = (slugCounts[baseSlug] || 0) + 1;
    const slug = slugCounts[baseSlug] > 1 ? `${baseSlug}-${slugCounts[baseSlug]}` : baseSlug;

    // Map categories
    const categories = mapCategories(row.type || '', row.subtypes || '');

    // Parse rating
    const rating = row.rating ? parseFloat(row.rating) : null;

    const restaurant: ParsedRestaurant = {
      name: row.name.trim(),
      slug,
      address,
      city,
      state,
      zip_code: zip || null,
      phone: row.phone?.trim() || null,
      website: row.site?.trim() || null,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      logo_url: row.logo?.trim() || null,
      cover_image_url: row.photo?.trim() || null,
      description: row.description?.trim() || null,
      categories,
      average_rating: rating,
      reservation_links: row.reservation_links?.trim() || null,
      tier_id: basicTierId,
      is_active: true,
      is_verified: false,
      primary_color: '#F59E0B',
      secondary_color: '#1F2937',
    };

    toInsert.push(restaurant);
    existing.add(key); // Mark as seen for this run
  }

  // Summary
  console.log('=== SUMMARY ===\n');
  console.log(`To insert: ${toInsert.length}`);
  console.log(`Skipped: ${skipped.length}\n`);

  // Group skipped by reason
  const skipReasons: Record<string, number> = {};
  for (const s of skipped) {
    skipReasons[s.reason] = (skipReasons[s.reason] || 0) + 1;
  }
  console.log('Skip reasons:');
  for (const [reason, count] of Object.entries(skipReasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count}`);
  }
  console.log('');

  if (dryRun) {
    console.log('DRY RUN - No changes made.');
    console.log('\nFirst 10 restaurants that would be inserted:');
    for (const r of toInsert.slice(0, 10)) {
      console.log(`  - ${r.name} (${r.city}, ${r.zip_code || 'no zip'}) [${r.categories.join(', ')}]`);
    }
    return;
  }

  // Insert in batches
  console.log('Inserting restaurants...\n');
  const batchSize = 50;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);

    const { error } = await supabase
      .from('restaurants')
      .insert(batch);

    if (error) {
      console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${toInsert.length}...`);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Failed: ${failed}`);

  // Final count
  const { count } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true });

  console.log(`Total restaurants in DB: ${count}`);
}

// Check for --dry-run flag
const dryRun = process.argv.includes('--dry-run');
importRestaurants(dryRun);
