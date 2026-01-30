// Run SQL migration using direct Postgres connection
import { config } from 'dotenv';
import { resolve } from 'path';
import pg from 'pg';

config({ path: resolve(__dirname, '../apps/web/.env.local') });

const { Pool } = pg;

async function runMigration() {
  // Try direct database connection
  // The database password should be set as SUPABASE_DB_PASSWORD env var
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!dbPassword) {
    console.log('SUPABASE_DB_PASSWORD not set.');
    console.log('\nTo get your database password:');
    console.log('1. Go to https://supabase.com/dashboard/project/kufcxxynjvyharhtfptd/settings/database');
    console.log('2. Copy the password');
    console.log('3. Run: SUPABASE_DB_PASSWORD=your_password npx tsx scripts/run-sql-migration.ts');
    console.log('\nOr run this SQL directly in Supabase SQL Editor:\n');
    printSQL();
    process.exit(1);
  }

  // Use session mode pooler with URL-encoded password (! becomes %21)
  const encodedPassword = encodeURIComponent(dbPassword);
  const connectionString = `postgresql://postgres.kufcxxynjvyharhtfptd:${encodedPassword}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`;

  console.log('Connecting to database...');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('Connected!');

    // Create the password_setup_tokens table
    console.log('\nCreating password_setup_tokens table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.password_setup_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        email text NOT NULL,
        token text NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
      );
    `);
    console.log('✓ Table created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_token
      ON public.password_setup_tokens(token);
    `);
    console.log('✓ Index created');

    await client.query(`
      ALTER TABLE public.password_setup_tokens ENABLE ROW LEVEL SECURITY;
    `);
    console.log('✓ RLS enabled');

    // Drop existing policy if it exists, then create new one
    await client.query(`
      DROP POLICY IF EXISTS "Service role only" ON public.password_setup_tokens;
    `);
    await client.query(`
      CREATE POLICY "Service role only" ON public.password_setup_tokens
      FOR ALL USING (false);
    `);
    console.log('✓ RLS policy created');

    client.release();
    console.log('\n✅ Migration complete!');

  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    if (err.code === '28P01' || err.message?.includes('password authentication failed')) {
      console.error('\n❌ Authentication failed.');
      console.log('\nThe service role key cannot be used as database password.');
      console.log('Please enter your database password from Supabase Dashboard:');
      console.log('  Dashboard → Settings → Database → Connection string → Password');
      console.log('\nOr run this SQL directly in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/kufcxxynjvyharhtfptd/sql/new\n');
      printSQL();
    } else {
      console.error('Migration error:', err.message || err);
    }
  } finally {
    await pool.end();
  }
}

function printSQL() {
  console.log(`
CREATE TABLE IF NOT EXISTS public.password_setup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_token ON public.password_setup_tokens(token);
ALTER TABLE public.password_setup_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only" ON public.password_setup_tokens;
CREATE POLICY "Service role only" ON public.password_setup_tokens FOR ALL USING (false);
  `);
}

runMigration();
