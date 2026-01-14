import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const toRemove = [
  // Chains
  'Bonefish Grill',
  "Arooga's",
  "BJ's Restaurant & Brewhouse",
  'MISSION BBQ',
  'Noodles and Company',
  'Primanti Bros',

  // Non-restaurants
  'ABC Beverage',
  'American Legion',
  'American Music Theatre',
  'Fulton Theatre',
  'Gardner Theatre',
  'Prima Theatre',
  'Lancaster MusicFest',
  'Tanger Outlets Lancaster',
  'Vytal Options Medical Marijuana Dispensary',

  // Grocery stores
  'Costco Bakery',
  'Walmart Bakery',
  'Wegmans',
  'GIANT',
  'Lidl',

  // Diners
  "Alice's Diner",
  'Centerville Diner',
  'Columbia Diner',
  'Lyndon Diner',
  'Neptune Diner',
  'Park City Diner',
  'Rohrerstown Diner',
  'Route 30 Diner',

  // Edge case
  'Butter and Bean Cafe-Tanger Outlets',
];

async function cleanup() {
  console.log('\nRemoving chains, non-restaurants, and diners...\n');

  let deleted = 0;

  for (const name of toRemove) {
    const { data, error } = await supabase
      .from('restaurants')
      .delete()
      .ilike('name', '%' + name + '%')
      .select('name');

    if (data && data.length > 0) {
      data.forEach(r => {
        console.log('✓ Deleted:', r.name);
        deleted++;
      });
    }
  }

  const { count } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log('\n--- Summary ---');
  console.log('Deleted:', deleted);
  console.log('Remaining restaurants:', count);
}

cleanup();
