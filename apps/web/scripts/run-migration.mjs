import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Running consumer_subscriptions migration...');

  // Create consumer_subscriptions table
  const { error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS consumer_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        stripe_subscription_id TEXT,
        stripe_customer_id TEXT,
        stripe_price_id TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        billing_period TEXT NOT NULL DEFAULT 'monthly',
        is_founder BOOLEAN DEFAULT FALSE,
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        canceled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `
  });

  if (tableError) {
    // Try direct SQL if RPC doesn't exist
    console.log('RPC not available, trying direct approach...');

    // Check if table exists
    const { data: existing } = await supabase
      .from('consumer_subscriptions')
      .select('id')
      .limit(1);

    if (existing !== null) {
      console.log('Table consumer_subscriptions already exists or was just created');
    } else {
      console.error('Could not create table:', tableError);
      console.log('\nPlease run this SQL in the Supabase Dashboard SQL Editor:');
      console.log('https://supabase.com/dashboard/project/kufcxxynjvyharhtfptd/sql/new');
      console.log('\n--- Copy the SQL from: supabase/migrations/20241207_consumer_subscriptions.sql ---\n');
    }
  } else {
    console.log('Migration completed successfully!');
  }

  // Check table status
  const { data, error } = await supabase
    .from('consumer_subscriptions')
    .select('id')
    .limit(1);

  if (error) {
    console.log('\nTable does not exist yet. Error:', error.message);
    console.log('\nPlease run the migration manually in Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/kufcxxynjvyharhtfptd/sql/new');
  } else {
    console.log('\nTable consumer_subscriptions is ready!');
  }
}

runMigration().catch(console.error);
