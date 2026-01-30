import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin-only migration endpoint - run self_promoters migration
export async function POST(request: Request) {
  // Verify admin secret
  const authHeader = request.headers.get('authorization');
  const expectedSecret = 'run-migration-2024';

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Create admin client
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const results: string[] = [];

  try {
    // Step 1: Create self_promoters table using raw SQL via postgres function
    // Since we can't run raw SQL via REST API, we'll create the table structure
    // by inserting and deleting, or we check if it exists

    // Check if table exists by trying to query it
    const { error: checkError } = await supabaseAdmin.from('self_promoters').select('id').limit(1);

    if (checkError && checkError.code === 'PGRST205') {
      results.push('self_promoters table does not exist - needs manual creation via SQL');
      results.push('Run the SQL from: supabase/migrations/20260130000000_self_promoters.sql');
      results.push('Dashboard: https://supabase.com/dashboard/project/kufcxxynjvyharhtfptd/sql/new');
    } else if (checkError) {
      results.push(`Check error: ${checkError.message}`);
    } else {
      results.push('self_promoters table exists!');
    }

    // Check events table for self_promoter_id column
    const { data: eventsData, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('self_promoter_id')
      .limit(1);

    if (eventsError && eventsError.message.includes('self_promoter_id')) {
      results.push('events.self_promoter_id column does not exist - needs migration');
    } else if (eventsError) {
      results.push(`Events check error: ${eventsError.message}`);
    } else {
      results.push('events.self_promoter_id column exists!');
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Migration check complete'
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
}
