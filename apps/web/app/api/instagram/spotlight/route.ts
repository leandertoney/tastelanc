// POST /api/instagram/spotlight
// Generates an "Inside [Restaurant Name]" spotlight carousel post for a paid partner.
// Auth: CRON_SECRET header (same as other instagram routes) — also accepts admin session
//       for manual triggers from the admin restaurant detail page.
//
// Body: { market_slug?: string, restaurant_id?: string }
//   - market_slug: defaults to 'lancaster-pa'
//   - restaurant_id: if provided, generates for that specific restaurant (must be premium/elite)
//                    if omitted, auto-selects the highest-scoring eligible restaurant

import { NextResponse } from 'next/server';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';
import { generateRestaurantSpotlight } from '@/lib/instagram/generate';
import { MarketConfig } from '@/lib/instagram/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Increase timeout — slide generation takes 15-30s depending on image count
export const maxDuration = 120;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  // If not using the cron secret, verify the user is an admin
  if (!isCronAuth) {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Check admin role
    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }
  }

  const marketSlug: string = body.market_slug ?? 'lancaster-pa';
  const restaurantId: string | undefined = body.restaurant_id;

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

  // Load Instagram account (may be null — generation still works, publishing will fail later)
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

  const result = await generateRestaurantSpotlight({
    supabase,
    market: marketConfig,
    date: new Date(),
    restaurantId,
  });

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    post_id: result.post_id,
    content_type: result.content_type,
    caption: result.caption,
    media_urls: result.media_urls,
  });
}
