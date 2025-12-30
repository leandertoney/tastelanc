import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

// Read .env.local
const envContent = readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

// All valid categories
const VALID_CATEGORIES = [
  // Existing
  'bars', 'nightlife', 'rooftops', 'brunch', 'lunch', 'dinner', 'outdoor_dining',
  // Cuisines
  'american', 'italian', 'mexican', 'chinese', 'japanese_sushi', 'thai',
  'indian', 'mediterranean', 'vietnamese', 'korean', 'caribbean', 'bbq',
  'seafood', 'steakhouse', 'pizza', 'deli_sandwiches', 'pa_dutch',
  // Dining Style
  'fine_dining', 'casual', 'fast_casual', 'food_truck', 'cafe_coffee', 'bakery', 'desserts',
  // Drinks
  'brewery', 'winery', 'distillery', 'cocktail_bar',
  // Features
  'live_music', 'sports_bar', 'pet_friendly', 'byob', 'late_night', 'family_friendly', 'date_night',
] as const;

type RestaurantCategory = typeof VALID_CATEGORIES[number];

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  categories: string[];
  address: string;
  city: string;
}

const SYSTEM_PROMPT = `You are a restaurant categorization expert for Lancaster, PA. Your job is to analyze restaurant information and assign appropriate categories.

Given a restaurant's name, description, and location, select ALL applicable categories from the list below. Be thorough but accurate.

VALID CATEGORIES:
Cuisines: american, italian, mexican, chinese, japanese_sushi, thai, indian, mediterranean, vietnamese, korean, caribbean, bbq, seafood, steakhouse, pizza, deli_sandwiches, pa_dutch
Meal Time: brunch, lunch, dinner, late_night
Dining Style: fine_dining, casual, fast_casual, food_truck, cafe_coffee, bakery, desserts
Drinks: bars, nightlife, brewery, winery, distillery, cocktail_bar
Features: outdoor_dining, rooftops, live_music, sports_bar, pet_friendly, byob, family_friendly, date_night

GUIDELINES:
- "Pizza" in name → pizza
- "Sushi", "Japanese" → japanese_sushi
- "Taqueria", "Mexican", "Cantina" → mexican
- "Brewing", "Brewery" → brewery, bars
- "Winery", "Vineyard" → winery
- "BBQ", "Smokehouse", "Grill" → bbq
- "Diner" → american, casual, brunch
- "Bistro", "Fine" → fine_dining, dinner, date_night
- "Cafe", "Coffee" → cafe_coffee, brunch
- "Bakery" → bakery, brunch
- "Ice Cream", "Creamery" → desserts
- "Dutch", "Amish" → pa_dutch
- "Pub", "Tavern", "Bar" → bars, casual
- Most restaurants serve lunch and dinner unless clearly breakfast/brunch only

Return ONLY a JSON array of category strings, no explanation. Example: ["italian", "dinner", "casual", "family_friendly"]`;

async function categorizeRestaurant(restaurant: Restaurant): Promise<string[]> {
  const userPrompt = `Restaurant: ${restaurant.name}
Location: ${restaurant.address}, ${restaurant.city}
Description: ${restaurant.description || 'No description available'}
Current categories: ${restaurant.categories?.join(', ') || 'None'}

Assign all applicable categories:`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      console.error(`Unexpected response type for ${restaurant.name}`);
      return restaurant.categories || [];
    }

    // Parse JSON array from response
    const text = content.text.trim();
    const jsonMatch = text.match(/\[.*\]/s);
    if (!jsonMatch) {
      console.error(`Could not parse JSON for ${restaurant.name}: ${text}`);
      return restaurant.categories || [];
    }

    const categories = JSON.parse(jsonMatch[0]) as string[];

    // Validate categories
    const validCategories = categories.filter((cat) =>
      VALID_CATEGORIES.includes(cat as RestaurantCategory)
    );

    return validCategories;
  } catch (error) {
    console.error(`Error categorizing ${restaurant.name}:`, error);
    return restaurant.categories || [];
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limit = process.argv.find((arg) => arg.startsWith('--limit='));
  const maxRestaurants = limit ? parseInt(limit.split('=')[1], 10) : undefined;

  console.log('=== RESTAURANT CATEGORIZATION ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  if (maxRestaurants) console.log(`Limit: ${maxRestaurants} restaurants`);
  console.log('');

  // Fetch restaurants
  let query = supabase
    .from('restaurants')
    .select('id, name, description, categories, address, city')
    .eq('is_active', true)
    .order('name');

  if (maxRestaurants) {
    query = query.limit(maxRestaurants);
  }

  const { data: restaurants, error } = await query;

  if (error) {
    console.error('Error fetching restaurants:', error);
    return;
  }

  console.log(`Found ${restaurants?.length || 0} restaurants to categorize\n`);

  if (!restaurants || restaurants.length === 0) {
    console.log('No restaurants found.');
    return;
  }

  const results: { name: string; before: string[]; after: string[] }[] = [];
  const batchSize = 5; // Process 5 at a time to avoid rate limits
  let processed = 0;

  for (let i = 0; i < restaurants.length; i += batchSize) {
    const batch = restaurants.slice(i, i + batchSize);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (restaurant) => {
        const newCategories = await categorizeRestaurant(restaurant);

        // Merge with existing categories (preserving existing, adding new)
        const existingCategories = restaurant.categories || [];
        const mergedCategories = [...new Set([...existingCategories, ...newCategories])];

        return {
          id: restaurant.id,
          name: restaurant.name,
          before: existingCategories,
          after: mergedCategories,
        };
      })
    );

    // Update database if not dry run
    if (!dryRun) {
      for (const result of batchResults) {
        if (result.after.length > 0) {
          const { error: updateError } = await supabase
            .from('restaurants')
            .update({ categories: result.after })
            .eq('id', result.id);

          if (updateError) {
            console.error(`Error updating ${result.name}:`, updateError);
          }
        }
      }
    }

    results.push(...batchResults.map((r) => ({ name: r.name, before: r.before, after: r.after })));
    processed += batch.length;
    console.log(`Processed ${processed}/${restaurants.length}...`);

    // Small delay between batches to avoid rate limits
    if (i + batchSize < restaurants.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n=== RESULTS ===\n');

  // Show sample of changes
  const changed = results.filter((r) =>
    JSON.stringify(r.before.sort()) !== JSON.stringify(r.after.sort())
  );

  console.log(`Total processed: ${results.length}`);
  console.log(`Changed: ${changed.length}`);
  console.log(`Unchanged: ${results.length - changed.length}\n`);

  // Show first 20 changes as sample
  console.log('Sample changes (first 20):');
  for (const result of changed.slice(0, 20)) {
    const added = result.after.filter((c) => !result.before.includes(c));
    console.log(`\n${result.name}`);
    console.log(`  Before: [${result.before.join(', ')}]`);
    console.log(`  After:  [${result.after.join(', ')}]`);
    if (added.length > 0) {
      console.log(`  Added:  [${added.join(', ')}]`);
    }
  }

  if (dryRun) {
    console.log('\n\nDRY RUN - No changes were made to the database.');
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('\n\nChanges have been applied to the database.');
  }
}

main();
