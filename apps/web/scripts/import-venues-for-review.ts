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

// Venues to add back for admin review
const VENUES_TO_ADD = [
  // Theaters
  'American Music Theatre',
  'Barshinger Center',
  'Gardner Theatre',
  'Prima Theatre',
  'Fulton Theatre',
  'Dutch Apple Dinner Theatre',
  'Green Room Theater',
  'Lancaster Marionette Theatre',
  // Candy (not Gertrude Hawk - that's a chain)
  'Vintage Candy Shop',
  'Sweetish Candy- A Swedish Candy Store',
  'Evans Candy',
  'Edwards Nuts & Candy Co',
  'Uncle Leroy\'s Candy Kitchen',
  // Hotels with dining/events
  'Cork Factory Hotel at Urban Place',
  'Lancaster Arts Hotel',
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function parseAddress(fullAddress: string): { address: string; city: string; state: string; zip: string } {
  const parts = fullAddress.split(',').map(s => s.trim());
  if (parts.length < 2) {
    return { address: fullAddress, city: 'Lancaster', state: 'PA', zip: '' };
  }
  const address = parts[0];
  const lastPart = parts[parts.length - 1] || '';
  const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})/);
  const state = stateZipMatch ? stateZipMatch[1] : 'PA';
  const zip = stateZipMatch ? stateZipMatch[2] : '';
  const city = parts.length >= 3 ? parts[1] : parts[1]?.replace(/\s*[A-Z]{2}\s*\d{5}/, '').trim() || 'Lancaster';
  return { address, city: city || 'Lancaster', state, zip };
}

async function getBasicTierId(): Promise<string> {
  const { data, error } = await supabase
    .from('tiers')
    .select('id')
    .eq('name', 'basic')
    .single();
  if (error || !data) throw new Error('Could not find basic tier');
  return data.id;
}

async function importVenuesForReview() {
  console.log('=== IMPORTING VENUES FOR ADMIN REVIEW ===\n');

  // Read CSV
  const csvPath = '/Users/leandertoney/Desktop/TasteLanc Assets/all_of_lanc.csv';
  const csvContent = readFileSync(csvPath, 'utf8');
  const rows = parse(csvContent, { columns: true, skip_empty_lines: true });

  const basicTierId = await getBasicTierId();

  // Check existing
  const { data: existing } = await supabase
    .from('restaurants')
    .select('name');
  const existingNames = new Set((existing || []).map(r => r.name.toLowerCase()));

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) continue;

    // Check if this is a venue we want to add
    const shouldAdd = VENUES_TO_ADD.some(v =>
      name.toLowerCase() === v.toLowerCase() ||
      name.toLowerCase().includes(v.toLowerCase())
    );

    if (!shouldAdd) continue;

    // Skip if already exists
    if (existingNames.has(name.toLowerCase())) {
      console.log(`SKIP (exists): ${name}`);
      skipped++;
      continue;
    }

    const { address, city, state, zip } = parseAddress(row.full_address || '');
    const slug = generateSlug(name) + '-venue';

    const venue = {
      name,
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
      description: row.description?.trim() || `${row.type} - Needs admin review and categorization`,
      categories: [], // Empty - admin will assign
      average_rating: row.rating ? parseFloat(row.rating) : null,
      reservation_links: row.reservation_links?.trim() || null,
      tier_id: basicTierId,
      is_active: false, // NOT ACTIVE - needs admin approval
      is_verified: false,
      primary_color: '#F59E0B',
      secondary_color: '#1F2937',
    };

    const { error } = await supabase
      .from('restaurants')
      .insert(venue);

    if (error) {
      console.log(`ERROR: ${name} - ${error.message}`);
    } else {
      console.log(`ADDED: ${name} (inactive, needs review)`);
      inserted++;
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Added for review: ${inserted}`);
  console.log(`Skipped (already exist): ${skipped}`);

  // Show count of inactive restaurants needing review
  const { count } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', false);

  console.log(`\nTotal inactive restaurants needing review: ${count}`);
}

importVenuesForReview();
