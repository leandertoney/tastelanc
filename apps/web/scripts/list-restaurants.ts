import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function listRestaurants() {
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, categories, city, is_active')
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== All Restaurants in Database ===\n');
  console.log(`Total: ${restaurants.length}\n`);

  restaurants.forEach((r, i) => {
    const status = r.is_active ? '✓' : '✗';
    const cats = (r.categories || []).join(', ');
    console.log(`${i + 1}. [${status}] ${r.name} (${r.city})`);
    console.log(`   Categories: ${cats || 'none'}`);
    console.log(`   ID: ${r.id}\n`);
  });
}

listRestaurants();
