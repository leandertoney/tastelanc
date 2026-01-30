const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kufcxxynjvyharhtfptd.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1MTk4OSwiZXhwIjoyMDgyNDI3OTg5fQ.9wZNnGz5nSxK-RDj41GRXu3s1IG0DZ-Iv5tozPZC6GY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigration() {
  // Test connection first
  const { data: testData, error: testError } = await supabase.from('restaurants').select('id').limit(1);

  if (testError) {
    console.log('Connection test failed:', testError.message);
    return;
  }

  console.log('Connection successful!');

  // Check if self_promoters table exists
  const { error: checkError } = await supabase.from('self_promoters').select('id').limit(1);

  if (!checkError) {
    console.log('self_promoters table already exists!');
    return;
  }

  if (checkError.code === 'PGRST205' || checkError.message.includes('Could not find')) {
    console.log('Table does not exist. Need to run migration via Supabase Dashboard SQL editor.');
    console.log('');
    console.log('Steps:');
    console.log('1. Go to: https://supabase.com/dashboard/project/kufcxxynjvyharhtfptd/sql/new');
    console.log('2. Copy and paste the SQL from: supabase/migrations/20260130000000_self_promoters.sql');
    console.log('3. Click Run');
  } else {
    console.log('Unexpected error:', checkError);
  }
}

runMigration();
