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
  'Amaranth Bakery',
  'Culturas Tapas',
  "Hess's Barbecue Catering",
  'Little Mykonos',
  'Alert Club',
  'Commissary Lancaster',
  'Safe And Sweet',
  'CRS',
  'House of Alchemy',
  'Real Time Cafe',
  'Sweet Legacy Gourmet',
  'Dough Belly Donuts',
  'Finch & Flour Bakeshoppe',
  'Manor Buffet'
];

async function remove() {
  console.log('\nRemoving restaurants without Google Places images...\n');

  let deleted = 0;

  for (const name of toRemove) {
    const { data, error } = await supabase
      .from('restaurants')
      .delete()
      .ilike('name', '%' + name + '%')
      .select('name');

    if (error) {
      console.log(`Error deleting ${name}:`, error.message);
    } else if (data && data.length > 0) {
      data.forEach(r => {
        console.log('✓ Deleted:', r.name);
        deleted++;
      });
    }
  }

  const { count } = await supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true);

  console.log('\n--- Summary ---');
  console.log('Deleted:', deleted);
  console.log('Remaining restaurants:', count);
}

remove();
