import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: new URL('../.env.local', import.meta.url) });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TRIO = '53deabc0-7d15-4a5e-80c2-2dac17b5a4bc';
const WRONG = 'invoice_in_1TTSMhLikRpMKEPPa0I9J0fM';
const RIGHT = 'sub_1SxBscLikRpMKEPPVzR2jBfu';

const { data: before } = await supabase
  .from('restaurants').select('id, name, stripe_subscription_id')
  .eq('id', TRIO).single();
console.log('BEFORE:', before);

const { error } = await supabase
  .from('restaurants')
  .update({ stripe_subscription_id: RIGHT })
  .eq('id', TRIO)
  .eq('stripe_subscription_id', WRONG);

if (error) { console.error(error); process.exit(1); }

const { data: after } = await supabase
  .from('restaurants').select('id, name, stripe_subscription_id')
  .eq('id', TRIO).single();
console.log('AFTER:', after);

console.log(after.stripe_subscription_id === RIGHT ? '✅ Fixed' : '❌ No-op (was something else)');
