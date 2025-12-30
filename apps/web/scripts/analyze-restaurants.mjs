import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local
const envContent = readFileSync('.env.local', 'utf8');
const env = {};
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

// Valid zip codes
const VALID_ZIPS = ['17601', '17602', '17603'];

// Chain restaurants to remove (even if local-looking name)
const CHAINS = [
  /cold.*stone/i, /dairy.*queen/i, /dunkin/i, /starbucks/i, /mcdonald/i,
  /burger.*king/i, /wendy/i, /taco.*bell/i, /chick-fil-a/i, /chipotle/i,
  /panera/i, /subway/i, /domino/i, /papa.*john/i, /pizza.*hut/i,
  /olive.*garden/i, /applebee/i, /chili.*grill/i, /outback/i, /red.*lobster/i,
  /buffalo.*wild/i, /cracker.*barrel/i, /ihop/i, /denny/i, /waffle.*house/i,
  /bob.*evans/i, /golden.*corral/i, /friendly.*$/i, /bj.*restaurant/i,
  /carrabba/i, /bonefish/i, /cinnabon/i, /auntie.*anne/i, /great.*american.*cookie/i,
  /gertrude.*hawk/i
];

// Categories to remove by name pattern
const removalPatterns = {
  'Grocery/Markets': [
    /grocery/i, /supermarket/i, /food.*max/i, /\bmarket\b/i
  ],
  'Liquor/Beverage stores': [
    /beverage.*llc/i, /wine.*spirits/i, /brewers.*outlet/i, /\bcarryout\b/i
  ],
  'Theaters/Venues (non-restaurant)': [
    /\btheatre\b/i, /\btheater\b/i, /barshinger/i
  ],
  'Hotels': [
    /holiday.*inn/i, /\bhotel\b/i
  ],
  'Candy/Chocolate': [
    /\bcandy\b/i, /chocolate/i
  ],
  'Record stores': [
    /\brecords\b/i
  ],
  'Social clubs (non-bar)': [
    /american.*legion/i, /celtic.*center/i
  ],
  'Chain restaurants': CHAINS
};

// Dining-related categories
const diningCategories = ['bars', 'nightlife', 'rooftops', 'brunch', 'lunch', 'dinner', 'outdoor_dining'];

async function analyzeRestaurants() {
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, categories, city, zip_code, is_active')
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== ZIP CODE ANALYSIS ===\n');

  // Count by zip
  const zipCounts = {};
  let noZip = 0;
  restaurants.forEach(r => {
    if (!r.zip_code) {
      noZip++;
    } else {
      zipCounts[r.zip_code] = (zipCounts[r.zip_code] || 0) + 1;
    }
  });

  console.log('Restaurants by zip code:');
  Object.entries(zipCounts).sort((a, b) => b[1] - a[1]).forEach(([zip, count]) => {
    const valid = VALID_ZIPS.includes(zip) ? '✓' : '✗';
    console.log(`  ${valid} ${zip}: ${count}`);
  });
  console.log(`  ? No zip: ${noZip}`);

  // Filter to valid zips only
  const inValidZips = restaurants.filter(r => VALID_ZIPS.includes(r.zip_code));
  const outsideZips = restaurants.filter(r => r.zip_code && !VALID_ZIPS.includes(r.zip_code));
  const missingZips = restaurants.filter(r => !r.zip_code);

  console.log(`\nIn valid zips (17601, 17602, 17603): ${inValidZips.length}`);
  console.log(`Outside valid zips: ${outsideZips.length}`);
  console.log(`Missing zip code: ${missingZips.length}`);

  // Now analyze what to remove from valid zips
  console.log('\n=== REMOVAL ANALYSIS (within valid zips) ===\n');

  const toRemove = new Map();
  const toKeep = [];

  for (const r of inValidZips) {
    const reasons = [];
    const name = r.name || '';
    const cats = r.categories || [];
    const hasDiningCategory = cats.some(c => diningCategories.includes(c));

    // Check name-based patterns
    for (const [category, patterns] of Object.entries(removalPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(name)) {
          reasons.push(category);
          break;
        }
      }
    }

    // Check no categories (but not if it's a brewery/distillery/winery)
    if (cats.length === 0 && !/brew|distill|winery|vineyard/i.test(name)) {
      reasons.push('No categories');
    }

    if (reasons.length > 0) {
      toRemove.set(r.id, { ...r, reasons: [...new Set(reasons)] });
    } else {
      toKeep.push(r);
    }
  }

  // Group removals by category
  const byCategory = {};
  for (const [id, data] of toRemove) {
    for (const reason of data.reasons) {
      if (!byCategory[reason]) byCategory[reason] = [];
      byCategory[reason].push(data);
    }
  }

  console.log(`Starting with (in valid zips): ${inValidZips.length}`);
  console.log(`To remove: ${toRemove.size}`);
  console.log(`Would remain: ${toKeep.length}`);

  console.log('\n--- Removals by Category ---\n');
  for (const [category, items] of Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${category}: ${items.length}`);
    items.forEach(r => {
      console.log(`  - ${r.name}`);
    });
  }

  console.log('\n--- What Would REMAIN (sample) ---\n');
  toKeep.slice(0, 50).forEach(r => {
    const cats = (r.categories || []).join(', ') || 'none';
    console.log(`  ✓ ${r.name} [${cats}]`);
  });
  if (toKeep.length > 50) {
    console.log(`  ... and ${toKeep.length - 50} more`);
  }

  // Show outside zips that would be removed
  console.log('\n--- OUTSIDE VALID ZIPS (will be removed) ---\n');
  outsideZips.slice(0, 30).forEach(r => {
    console.log(`  ✗ ${r.name} (${r.city}) - ${r.zip_code}`);
  });
  if (outsideZips.length > 30) {
    console.log(`  ... and ${outsideZips.length - 30} more`);
  }

  // Show missing zips
  console.log('\n--- MISSING ZIP CODES (need review) ---\n');
  missingZips.forEach(r => {
    console.log(`  ? ${r.name} (${r.city})`);
  });
}

analyzeRestaurants();
