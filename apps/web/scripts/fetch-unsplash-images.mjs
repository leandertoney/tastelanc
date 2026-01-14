import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Unsplash Access Key - free tier (50 req/hour for demo)
const UNSPLASH_ACCESS_KEY = 'your-unsplash-access-key';

// Map categories/cuisines to search terms
const cuisineToSearch = {
  'mexican': 'mexican food restaurant',
  'italian': 'italian food pasta',
  'american': 'american restaurant burger',
  'chinese': 'chinese food restaurant',
  'japanese': 'japanese food sushi',
  'thai': 'thai food restaurant',
  'indian': 'indian food curry',
  'mediterranean': 'mediterranean food',
  'korean': 'korean food bbq',
  'vietnamese': 'vietnamese food pho',
  'french': 'french cuisine restaurant',
  'greek': 'greek food restaurant',
  'spanish': 'spanish tapas',
  'caribbean': 'caribbean food',
  'soul_food': 'soul food restaurant',
  'seafood': 'seafood restaurant',
  'steakhouse': 'steakhouse steak',
  'pizza': 'pizza restaurant',
  'burger': 'burger restaurant',
  'cafe': 'coffee cafe',
  'bakery': 'bakery pastry',
  'bar': 'bar cocktails',
  'pub': 'pub beer',
  'brewery': 'brewery craft beer',
  'winery': 'winery wine',
  'default': 'restaurant food dining'
};

async function getUnsplashImage(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}` }
    });

    if (!res.ok) {
      console.log(`   Unsplash API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data.results && data.results.length > 0) {
      // Use regular size (1080px wide)
      return data.results[0].urls.regular;
    }
  } catch (err) {
    console.log(`   Fetch error: ${err.message}`);
  }
  return null;
}

async function main() {
  console.log('\n========== FETCH UNSPLASH IMAGES ==========\n');

  if (UNSPLASH_ACCESS_KEY === 'your-unsplash-access-key') {
    console.log('To use this script:');
    console.log('1. Go to https://unsplash.com/developers');
    console.log('2. Create a free account and app');
    console.log('3. Copy your Access Key');
    console.log('4. Replace "your-unsplash-access-key" in this script');
    console.log('\nUnsplash is FREE - 50 requests/hour on demo apps.\n');
    process.exit(1);
  }

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, cuisine, categories, cover_image_url')
    .eq('is_active', true);

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${restaurants.length} restaurants\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const r of restaurants) {
    // Skip if already has working Supabase URL
    if (r.cover_image_url?.includes('supabase.co')) {
      skipped++;
      continue;
    }

    // Determine search term from cuisine or categories
    let searchTerm = cuisineToSearch.default;

    if (r.cuisine) {
      const cuisineLower = r.cuisine.toLowerCase();
      if (cuisineToSearch[cuisineLower]) {
        searchTerm = cuisineToSearch[cuisineLower];
      }
    } else if (r.categories && r.categories.length > 0) {
      const cat = r.categories[0].toLowerCase();
      if (cuisineToSearch[cat]) {
        searchTerm = cuisineToSearch[cat];
      }
    }

    console.log(`${r.name} -> searching "${searchTerm}"...`);

    const imageUrl = await getUnsplashImage(searchTerm);

    if (!imageUrl) {
      console.log(`   ❌ No image found`);
      failed++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ cover_image_url: imageUrl })
      .eq('id', r.id);

    if (updateError) {
      console.log(`   ❌ Update failed: ${updateError.message}`);
      failed++;
    } else {
      console.log(`   ✓ Updated`);
      updated++;
    }

    // Rate limit (Unsplash free: 50/hour = ~1.2 sec between requests)
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n========== SUMMARY ==========');
  console.log(`Updated: ${updated}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log('==============================\n');
}

main();
