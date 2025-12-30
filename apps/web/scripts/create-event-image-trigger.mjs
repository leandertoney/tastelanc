import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create function
const { error: funcError } = await supabase.rpc('exec', {
  sql: `
    CREATE OR REPLACE FUNCTION set_default_event_image()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.image_url IS NULL OR NEW.image_url = '' THEN
        NEW.image_url := CASE NEW.event_type
          WHEN 'trivia' THEN 'https://tastelanc.com/images/events/trivia.png'
          WHEN 'live_music' THEN 'https://tastelanc.com/images/events/live_music.png'
          WHEN 'karaoke' THEN 'https://tastelanc.com/images/events/karaoke.png'
          WHEN 'dj' THEN 'https://tastelanc.com/images/events/dj.png'
          WHEN 'comedy' THEN 'https://tastelanc.com/images/events/comedy.png'
          WHEN 'sports' THEN 'https://tastelanc.com/images/events/sports.png'
          ELSE 'https://tastelanc.com/images/events/other.png'
        END;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `
});

if (funcError) {
  console.log('RPC exec not available, this is expected.');
  console.log('The trigger needs to be created via Supabase Management API...');
}

// Use Management API to run SQL
const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
console.log('Project ref:', projectRef);

const sql = `
CREATE OR REPLACE FUNCTION set_default_event_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.image_url IS NULL OR NEW.image_url = '' THEN
    NEW.image_url := CASE NEW.event_type
      WHEN 'trivia' THEN 'https://tastelanc.com/images/events/trivia.png'
      WHEN 'live_music' THEN 'https://tastelanc.com/images/events/live_music.png'
      WHEN 'karaoke' THEN 'https://tastelanc.com/images/events/karaoke.png'
      WHEN 'dj' THEN 'https://tastelanc.com/images/events/dj.png'
      WHEN 'comedy' THEN 'https://tastelanc.com/images/events/comedy.png'
      WHEN 'sports' THEN 'https://tastelanc.com/images/events/sports.png'
      ELSE 'https://tastelanc.com/images/events/other.png'
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_event_image_trigger ON events;

CREATE TRIGGER set_event_image_trigger
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_default_event_image();
`;

// Try using the postgres connection directly via service role
const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Prefer': 'return=representation'
  },
});

console.log('Supabase REST API accessible.');

// The service role can't execute arbitrary SQL via REST API
// We need to use a workaround - create a database function that we can call

// First, let's check if we can query the pg_proc to see existing functions
const { data: funcs, error: queryError } = await supabase
  .from('pg_proc')
  .select('proname')
  .limit(1);

if (queryError) {
  console.log('Cannot query system tables directly (expected).');
}

// The solution: We'll need to use the database URL directly with psql
// OR create a migration file

console.log('\nThe Supabase JS client cannot execute DDL statements like CREATE FUNCTION.');
console.log('I need to use the database connection string with psql.\n');

// Get the database URL from environment
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (dbUrl) {
  console.log('Database URL found. Running SQL...');
} else {
  console.log('DATABASE_URL not found in .env.local');
  console.log('Checking for pooler URL...');
}

// Output the SQL for manual execution as fallback
console.log('\n=== SQL TO EXECUTE ===');
console.log(sql);
