import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = getSupabaseAdmin();

    // Compute yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get all active markets
    const { data: markets } = await supabase
      .from('markets')
      .select('id, slug')
      .eq('is_active', true);

    const results: { market: string; status: string }[] = [];

    for (const market of markets || []) {
      try {
        const { error } = await supabase.rpc('rollup_analytics_daily', {
          target_date: yesterdayStr,
          target_market: market.id,
        });

        if (error) {
          console.error(`[Analytics Rollup] Error for ${market.slug}:`, error);
          results.push({ market: market.slug, status: `error: ${error.message}` });
        } else {
          results.push({ market: market.slug, status: 'ok' });
        }
      } catch (err) {
        console.error(`[Analytics Rollup] Exception for ${market.slug}:`, err);
        results.push({ market: market.slug, status: `exception: ${String(err)}` });
      }
    }

    // Also run rollup with NULL market for any unscoped page views
    await supabase.rpc('rollup_analytics_daily', {
      target_date: yesterdayStr,
      target_market: null,
    });

    console.log('[Analytics Rollup] Completed:', JSON.stringify(results));

    return NextResponse.json({
      success: true,
      date: yesterdayStr,
      results,
    });
  } catch (error) {
    console.error('[Analytics Rollup] Fatal error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
