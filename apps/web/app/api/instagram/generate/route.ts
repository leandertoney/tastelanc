// POST /api/instagram/generate
// Generates an Instagram post for a market. Does NOT publish.
// Auth: CRON_SECRET or pg_cron source

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateInstagramPost } from '@/lib/instagram/generate';
import { ContentType, MarketConfig } from '@/lib/instagram/types';

export async function POST(request: Request) {
  // Auth
  const body = await request.json().catch(() => ({}));
  const isPgCron = body.source === 'pg_cron';
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isPgCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const marketSlug = body.market_slug || 'lancaster-pa';
  const forceType = body.force_type as ContentType | undefined;

  const supabase = createServiceRoleClient();

  // Resolve market
  const { data: market, error: marketError } = await supabase
    .from('markets')
    .select('id, slug, name, county, state')
    .eq('slug', marketSlug)
    .eq('is_active', true)
    .single();

  if (marketError || !market) {
    return NextResponse.json({ error: `Market not found: ${marketSlug}` }, { status: 404 });
  }

  // Load Instagram account (may be null if not yet connected)
  const { data: account } = await supabase
    .from('instagram_accounts')
    .select('*')
    .eq('market_id', market.id)
    .eq('is_active', true)
    .maybeSingle();

  const marketConfig: MarketConfig = {
    market_id: market.id,
    market_slug: market.slug,
    market_name: market.name,
    county: market.county,
    state: market.state,
    instagram_account: account,
  };

  const result = await generateInstagramPost({
    supabase,
    market: marketConfig,
    date: new Date(),
    forceType,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.error?.includes('Already published') ? 200 : 500 }
    );
  }

  return NextResponse.json({
    success: true,
    post_id: result.post_id,
    content_type: result.content_type,
    caption: result.caption,
    media_urls: result.media_urls,
  });
}
