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

interface CsvRow {
  name: string;
  full_address: string;
  rating: string;
}

// Parse address like "9 N Duke St, Lancaster, PA 17602"
function parseAddress(fullAddress: string): { city: string } {
  const parts = fullAddress.split(',').map(s => s.trim());

  if (parts.length < 2) {
    return { city: 'Lancaster' };
  }

  // City is the second part
  const cityPart = parts[1] || '';
  const city = parts.length >= 3 ? parts[1] : cityPart.replace(/\s*[A-Z]{2}\s*\d{5}/, '').trim();

  return { city: city || 'Lancaster' };
}

async function updateRatings(dryRun: boolean = false) {
  console.log('=== UPDATE RESTAURANT RATINGS FROM CSV ===\n');
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

  // Get all restaurants from database
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, city, average_rating');

  if (error) {
    console.error('Error fetching restaurants:', error.message);
    return;
  }

  console.log(`Restaurants in database: ${restaurants.length}\n`);

  // Build lookup map from DB: name+city -> restaurant
  const dbMap = new Map<string, { id: string; name: string; current_rating: number | null }>();
  for (const r of restaurants) {
    const key = `${r.name.toLowerCase()}|${r.city.toLowerCase()}`;
    dbMap.set(key, { id: r.id, name: r.name, current_rating: r.average_rating });
  }

  // Match CSV rows to DB and prepare updates
  const updates: { id: string; name: string; old_rating: number | null; new_rating: number }[] = [];
  const noMatch: string[] = [];
  const noRating: string[] = [];

  for (const row of rows) {
    if (!row.name?.trim()) continue;

    const { city } = parseAddress(row.full_address || '');
    const key = `${row.name.toLowerCase()}|${city.toLowerCase()}`;

    const dbRestaurant = dbMap.get(key);
    if (!dbRestaurant) {
      noMatch.push(row.name);
      continue;
    }

    if (!row.rating || row.rating.trim() === '') {
      noRating.push(row.name);
      continue;
    }

    const newRating = parseFloat(row.rating);
    if (isNaN(newRating)) {
      noRating.push(row.name);
      continue;
    }

    updates.push({
      id: dbRestaurant.id,
      name: dbRestaurant.name,
      old_rating: dbRestaurant.current_rating,
      new_rating: newRating,
    });
  }

  // Summary
  console.log('=== SUMMARY ===\n');
  console.log(`Matched and will update: ${updates.length}`);
  console.log(`No match in database: ${noMatch.length}`);
  console.log(`No rating in CSV: ${noRating.length}\n`);

  if (dryRun) {
    console.log('DRY RUN - No changes made.\n');
    console.log('Sample updates (first 20):');
    for (const u of updates.slice(0, 20)) {
      console.log(`  - ${u.name}: ${u.old_rating ?? 'null'} -> ${u.new_rating}`);
    }
    if (noMatch.length > 0) {
      console.log(`\nSample unmatched (first 10):`);
      for (const name of noMatch.slice(0, 10)) {
        console.log(`  - ${name}`);
      }
    }
    return;
  }

  // Perform updates in batches
  console.log('Updating ratings...\n');
  const batchSize = 50;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    for (const u of batch) {
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ average_rating: u.new_rating })
        .eq('id', u.id);

      if (updateError) {
        console.error(`Failed to update ${u.name}:`, updateError.message);
        failed++;
      } else {
        updated++;
      }
    }

    console.log(`Updated ${updated}/${updates.length}...`);
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
}

// Check for --dry-run flag
const dryRun = process.argv.includes('--dry-run');
updateRatings(dryRun);
