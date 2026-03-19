/**
 * Seed Restaurant Week 2026 deals into holiday_specials table.
 * Run from apps/web: npx tsx scripts/seed-restaurant-week-2026.ts
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kufcxxynjvyharhtfptd.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const HOLIDAY_TAG = 'restaurant-week-2026';

// Restaurant Week runs April 13–19. Most deals apply all week.
// We'll tag them with the first day (Apr 13) unless restaurant-specific.
const ALL_WEEK = '2026-04-13';

const deals: {
  restaurantName: string;
  specials: {
    name: string;
    description: string | null;
    category: string;
    event_date: string;
    special_price: number | null;
  }[];
}[] = [
  {
    restaurantName: 'Cabbage Hill Schnitzel Haus',
    specials: [
      {
        name: '$30 Schnitzel Haus Sampler',
        description: 'Choose 2 Würste OR Pork Schnitzel + 3 sides, plus Pierogi or Pretzel, plus Apple Strudel or Salted Caramel Pretzel Pudding',
        category: 'food',
        event_date: ALL_WEEK,
        special_price: 30.00,
      },
    ],
  },
  {
    restaurantName: 'Decades',
    specials: [
      {
        name: 'Free Ice Cream Scoop',
        description: 'Buy any food item and receive a voucher for a free scoop of ice cream (valid Apr 15–May 24, one per customer)',
        category: 'combo',
        event_date: ALL_WEEK,
        special_price: null,
      },
    ],
  },
  {
    restaurantName: 'Denim Coffee',
    specials: [
      {
        name: '$5.50 Spring Latte',
        description: 'Cardamom latte with lavender whipped cream',
        category: 'drink',
        event_date: ALL_WEEK,
        special_price: 5.50,
      },
    ],
  },
  {
    restaurantName: 'Layali El Sham',
    specials: [
      {
        name: 'Fresh-Rolled Wraps',
        description: 'Choice of seasoned protein and crisp vegetables',
        category: 'food',
        event_date: ALL_WEEK,
        special_price: 12.95,
      },
    ],
  },
  {
    restaurantName: 'Mekatos Eatery',
    specials: [
      {
        name: '$15 Almuerzo Latin Lunch',
        description: 'Colombian-inspired lunch with a drink included',
        category: 'combo',
        event_date: ALL_WEEK,
        special_price: 15.00,
      },
    ],
  },
  {
    restaurantName: "Rachel's Cafe and Creperie",
    specials: [
      {
        name: '$13.80 Cylo Crepe',
        description: 'Garlic, cheddar, feta, braised pork, spinach, curry aioli',
        category: 'food',
        event_date: ALL_WEEK,
        special_price: 13.80,
      },
      {
        name: '$13.60 Pico Breakfast Crepe',
        description: 'Garlic, eggs, cheddar, black beans, rice, pico',
        category: 'food',
        event_date: ALL_WEEK,
        special_price: 13.60,
      },
      {
        name: '$13.80 Pico Lunch Crepe',
        description: 'Garlic, cheddar, chicken, black beans, rice, pico — available vegan',
        category: 'food',
        event_date: ALL_WEEK,
        special_price: 13.80,
      },
      {
        name: '$9.75 Piña Colada Cheesecake Crepe',
        description: 'Pineapple cream cheese, graham crackers, toasted coconut, whipped cream, vanilla glaze',
        category: 'food',
        event_date: ALL_WEEK,
        special_price: 9.75,
      },
    ],
  },
  {
    restaurantName: 'Raggamuffin Kitchen',
    specials: [
      {
        name: '$16 Jerk Chicken and Festival',
        description: 'Authentic jerk chicken with Jamaican festival corn side',
        category: 'food',
        event_date: ALL_WEEK,
        special_price: 16.00,
      },
    ],
  },
  {
    restaurantName: 'Savoy Truffle',
    specials: [
      {
        name: '$15 Hot Diggity Dogs',
        description: 'Four signature hot dogs on Liscio\'s long rolls: Brekkie Dog, Hawaiian, Reuben, or Oinker',
        category: 'food',
        event_date: ALL_WEEK,
        special_price: 15.00,
      },
    ],
  },
  {
    restaurantName: 'The Gloomy Rooster',
    specials: [
      {
        name: '$16 The Spring Fling',
        description: 'Fried chicken sandwich with lettuce, cucumber, jalapeño, and green goddess. Add fries for $3.',
        category: 'food',
        event_date: ALL_WEEK,
        special_price: 16.00,
      },
    ],
  },
];

async function main() {
  // 1. Get lancaster-pa market ID
  const { data: market, error: marketErr } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', 'lancaster-pa')
    .single();

  if (marketErr || !market) {
    console.error('Could not find lancaster-pa market:', marketErr?.message);
    process.exit(1);
  }
  const marketId = market.id;
  console.log(`Market ID: ${marketId}`);

  // 2. Delete any existing restaurant-week-2026 records (idempotent)
  const { error: deleteErr } = await supabase
    .from('holiday_specials')
    .delete()
    .eq('holiday_tag', HOLIDAY_TAG);
  if (deleteErr) {
    console.warn('Delete warning:', deleteErr.message);
  } else {
    console.log('Cleared existing restaurant-week-2026 records.');
  }

  let inserted = 0;
  let skipped = 0;

  for (const entry of deals) {
    // 3. Look up restaurant by name in this market
    const { data: restaurants, error: restErr } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('market_id', marketId)
      .ilike('name', `%${entry.restaurantName.split(' ')[0]}%`)
      .limit(10);

    if (restErr || !restaurants || restaurants.length === 0) {
      console.warn(`  ⚠ Could not find restaurant: "${entry.restaurantName}"`);
      skipped++;
      continue;
    }

    // Pick best match
    const exact = restaurants.find(r =>
      r.name.toLowerCase().includes(entry.restaurantName.toLowerCase().split(' ')[0].toLowerCase())
    );
    const restaurant = exact || restaurants[0];
    console.log(`  ✓ Matched "${entry.restaurantName}" → "${restaurant.name}" (${restaurant.id})`);

    // 4. Insert specials
    for (const special of entry.specials) {
      const { error: insertErr } = await supabase
        .from('holiday_specials')
        .insert({
          restaurant_id: restaurant.id,
          holiday_tag: HOLIDAY_TAG,
          name: special.name,
          description: special.description,
          category: special.category,
          event_date: special.event_date,
          start_time: null,
          end_time: null,
          original_price: null,
          special_price: special.special_price,
          discount_description: null,
          image_url: null,
          is_active: true,
        });

      if (insertErr) {
        console.error(`    ✗ Failed to insert "${special.name}":`, insertErr.message);
      } else {
        console.log(`    + "${special.name}"`);
        inserted++;
      }
    }
  }

  console.log(`\nDone! Inserted ${inserted} deals, skipped ${skipped} restaurants.`);
}

main().catch(console.error);
