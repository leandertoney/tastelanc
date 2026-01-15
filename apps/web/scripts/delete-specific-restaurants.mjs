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
  'Bridgeport Family Restaurant',
  'Lancaster Barbecue Supply'
];

async function deleteRestaurants() {
  console.log('\nDeleting specific restaurants...\n');

  let deleted = 0;

  for (const name of toRemove) {
    // First find the restaurant to confirm
    const { data: found } = await supabase
      .from('restaurants')
      .select('id, name')
      .ilike('name', '%' + name + '%');

    if (found && found.length > 0) {
      console.log(`Found ${found.length} match(es) for "${name}":`);
      found.forEach(r => console.log(`  - ${r.name} (${r.id})`));

      // Delete
      const { data, error } = await supabase
        .from('restaurants')
        .delete()
        .ilike('name', '%' + name + '%')
        .select('name');

      if (error) {
        console.log(`Error deleting ${name}:`, error.message);
      } else if (data && data.length > 0) {
        data.forEach(r => {
          console.log(`✓ Deleted: ${r.name}`);
          deleted++;
        });
      }
    } else {
      console.log(`No match found for "${name}"`);
    }
    console.log('');
  }

  const { count } = await supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true);

  console.log('--- Summary ---');
  console.log('Deleted:', deleted);
  console.log('Remaining active restaurants:', count);
}

deleteRestaurants();
