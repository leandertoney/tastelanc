import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lfwkcitwjftgkpjxnttv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmd2tjaXR3amZ0Z2twanhudHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwNTg0MCwiZXhwIjoyMDc5NjgxODQwfQ.xmViSKYcgCMLS-h2YcQ2C8lMC2Uct53_tjGvQs1Os1o'
);

async function addMissedSubscription() {
  // Get the email from command line or use default
  const email = process.argv[2];
  const stripeSubId = process.argv[3] || null;
  const stripeCusId = process.argv[4] || null;

  if (!email) {
    console.log('Usage: node scripts/add-subscription.mjs <email> [stripe_sub_id] [stripe_cus_id]');
    console.log('Example: node scripts/add-subscription.mjs user@example.com sub_123 cus_456');
    process.exit(1);
  }

  console.log(`Looking up user: ${email}`);

  // Find user by email
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error('Error fetching users:', userError);
    process.exit(1);
  }

  const user = users.users.find(u => u.email === email);

  if (!user) {
    console.error(`User not found with email: ${email}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.id}`);

  // Check if subscription already exists
  const { data: existing } = await supabase
    .from('consumer_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    console.log('Subscription already exists:', existing);
    process.exit(0);
  }

  // Calculate period dates (1 year from now)
  const now = new Date();
  const oneYearFromNow = new Date(now);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  // Insert subscription
  const { data: subscription, error: subError } = await supabase
    .from('consumer_subscriptions')
    .insert({
      user_id: user.id,
      stripe_subscription_id: stripeSubId,
      stripe_customer_id: stripeCusId,
      stripe_price_id: 'price_1Sa4b0LikRpMKEPPgGcJT2gr', // Early access yearly
      status: 'active',
      billing_period: 'yearly',
      is_founder: true,
      current_period_start: now.toISOString(),
      current_period_end: oneYearFromNow.toISOString(),
    })
    .select()
    .single();

  if (subError) {
    console.error('Error creating subscription:', subError);
    process.exit(1);
  }

  console.log('Created subscription:', subscription);

  // Update profile to premium
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_premium: true })
    .eq('id', user.id);

  if (profileError) {
    console.error('Error updating profile:', profileError);
  } else {
    console.log('Updated profile to premium');
  }

  console.log('\n✓ Subscription added successfully!');
}

addMissedSubscription().catch(console.error);
