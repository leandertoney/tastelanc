export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/voice/transcript
 *
 * List voice transcripts with filtering and pagination.
 * Requires admin or sales rep access.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated and has admin/sales role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'co_founder', 'admin', 'market_admin', 'sales_rep'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const marketId = url.searchParams.get('market_id');
    const outcome = url.searchParams.get('outcome');
    const sentiment = url.searchParams.get('sentiment');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Use service role to bypass RLS (we already verified auth above)
    const serviceClient = createServiceRoleClient();

    let query = serviceClient
      .from('voice_transcripts')
      .select(`
        id, market_id, direction, duration_seconds, summary, sentiment,
        intent, outcome, source_url, cost_cents, created_at,
        lead:business_leads(id, contact_name, business_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (marketId) query = query.eq('market_id', marketId);
    if (outcome) query = query.eq('outcome', outcome);
    if (sentiment) query = query.eq('sentiment', sentiment);

    const { data, error, count } = await query;

    if (error) {
      console.error('List transcripts error:', error);
      return NextResponse.json({ error: 'Failed to fetch transcripts' }, { status: 500 });
    }

    return NextResponse.json({
      transcripts: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
