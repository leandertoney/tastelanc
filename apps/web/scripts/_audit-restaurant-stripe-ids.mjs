import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: new URL('../.env.local', import.meta.url) });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== AUDIT: restaurants.stripe_subscription_id corruption check ===\n');

const { data, error } = await supabase
  .from('restaurants')
  .select('id, name, stripe_subscription_id, owner_id, tier_id, tiers(name)')
  .not('stripe_subscription_id', 'is', null);

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Inspecting ${data.length} restaurants with a stripe_subscription_id\n`);

const corrupted = [];
const valid = [];
const unusual = [];

for (const r of data) {
  const id = r.stripe_subscription_id;
  if (id.startsWith('sub_')) {
    valid.push(r);
  } else if (id.startsWith('invoice_') || id.startsWith('in_')) {
    corrupted.push(r);
  } else {
    unusual.push(r);
  }
}

console.log(`✅ Valid (start with "sub_"):   ${valid.length}`);
console.log(`❌ Corrupted (invoice/in_):     ${corrupted.length}`);
console.log(`⚠️  Other prefix:                ${unusual.length}`);
console.log();

if (corrupted.length > 0) {
  console.log('CORRUPTED ROWS:');
  for (const r of corrupted) {
    console.log(`  ${r.name}`);
    console.log(`    restaurant_id:           ${r.id}`);
    console.log(`    stripe_subscription_id:  ${r.stripe_subscription_id}  ← WRONG`);
    console.log(`    tier:                     ${r.tiers?.name || '(none)'}`);
    console.log(`    owner_id:                 ${r.owner_id}`);
    console.log();
  }
}

if (unusual.length > 0) {
  console.log('UNUSUAL ROWS (manual review):');
  for (const r of unusual) {
    console.log(`  ${r.name} → ${r.stripe_subscription_id}`);
  }
}
