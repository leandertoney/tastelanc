import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const holidayTag = searchParams.get('holiday_tag') || 'st-patricks-2026';
    const marketSlug = searchParams.get('market_slug');

    const svc = createServiceRoleClient();

    // If market_slug provided, resolve to market_id
    let marketId: string | null = null;
    if (marketSlug) {
      const { data: market } = await svc
        .from('markets')
        .select('id')
        .eq('slug', marketSlug)
        .single();
      marketId = market?.id || null;
    }

    let query = svc
      .from('holiday_specials')
      .select(`
        id, name, description, category, event_date,
        start_time, end_time, original_price, special_price,
        discount_description, image_url,
        restaurant:restaurants!inner(id, name, cover_image_url, market_id)
      `)
      .eq('holiday_tag', holidayTag)
      .eq('is_active', true)
      .order('category')
      .order('name');

    if (marketId) {
      query = query.eq('restaurant.market_id', marketId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Holiday specials public GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json({ specials: data || [] });
  } catch (error) {
    console.error('Holiday specials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
