import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: new URL('../.env.local', import.meta.url) });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TONY_RESTAURANT_IDS = [
  'cc6c7f2b-9eec-43f5-9565-5f76c7f06e2c', // Josie's
  'c1eb8e6f-9415-41cf-8fba-ef5a852a390e', // Queen Street
  '53deabc0-7d15-4a5e-80c2-2dac17b5a4bc', // Trio
  '2d62b56d-5119-438d-bc59-f75ea75d8b69', // Antonio's
  'f729df6a-2168-4b74-bfb3-c8bebf78f732', // Bunker
];

const { data, error } = await supabase
  .from('restaurants')
  .select('id, name, tier_id, stripe_subscription_id, owner_id, tiers(name)')
  .in('id', TONY_RESTAURANT_IDS);

if (error) {
  console.error(error);
  process.exit(1);
}

console.log("TONY'S RESTAURANTS — current tier state in Supabase\n");
for (const r of data) {
  console.log(`  ${r.name}`);
  console.log(`    id:            ${r.id}`);
  console.log(`    tier:          ${r.tiers?.name || '(no tier_id set)'}`);
  console.log(`    stripe_sub:    ${r.stripe_subscription_id || '(none)'}`);
  console.log(`    owner_id:      ${r.owner_id || '(none)'}`);
  console.log();
}
