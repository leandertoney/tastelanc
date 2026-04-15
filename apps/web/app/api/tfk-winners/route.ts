import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public API endpoint for TFK trivia winners
 * Shows all active winners with their prize claim status
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('market_id');

    const svc = createServiceRoleClient();
    let query = svc
      .from('trivia_leaderboard_entries')
      .select('player_name, venue_name, nightly_date, prize_description, email_verified, week_start')
      .eq('is_active', true)
      .eq('is_winner', true)
      .order('nightly_date', { ascending: false })
      .order('week_start', { ascending: false });

    if (marketId) query = query.eq('market_id', marketId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ winners: data || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
