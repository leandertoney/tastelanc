import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { MARKET_SLUG } from '@/config/market';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function verifyAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const svc = createServiceRoleClient();
  const { data: profile } = await svc
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const adminRoles = ['admin', 'super_admin', 'co_founder'];
  if (!profile || !adminRoles.includes(profile.role)) return null;
  return user;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sectionName = searchParams.get('section_name') || 'st_patricks_day';

    const svc = createServiceRoleClient();

    // Resolve market
    const { data: marketRow } = await svc
      .from('markets')
      .select('id')
      .eq('slug', MARKET_SLUG)
      .eq('is_active', true)
      .single();
    const marketId = marketRow?.id || null;

    // 1. Section impressions — total + unique visitors
    const { data: impressionRows } = await svc
      .from('section_impressions')
      .select('id, restaurant_id, visitor_id, impressed_at, position_index')
      .eq('section_name', sectionName);

    const allImpressions = impressionRows || [];
    const totalImpressions = allImpressions.length;
    const uniqueVisitors = new Set(allImpressions.map((r) => r.visitor_id)).size;

    // 2. Per-restaurant breakdown
    const byRestaurant: Record<string, { impressions: number; visitors: Set<string>; positions: number[] }> = {};
    allImpressions.forEach((row) => {
      const rid = row.restaurant_id;
      if (!rid) return;
      if (!byRestaurant[rid]) byRestaurant[rid] = { impressions: 0, visitors: new Set(), positions: [] };
      byRestaurant[rid].impressions++;
      byRestaurant[rid].visitors.add(row.visitor_id);
      if (row.position_index != null) byRestaurant[rid].positions.push(row.position_index);
    });

    // Get restaurant names (market scoped)
    const restaurantIds = Object.keys(byRestaurant);
    let restaurantMap: Record<string, string> = {};
    if (restaurantIds.length > 0) {
      let q = svc.from('restaurants').select('id, name');
      if (marketId) q = q.eq('market_id', marketId);
      const { data: restaurants } = await q.in('id', restaurantIds);
      (restaurants || []).forEach((r: any) => {
        restaurantMap[r.id] = r.name;
      });
    }

    // Filter to market-scoped restaurants only
    const perRestaurant = restaurantIds
      .filter((rid) => restaurantMap[rid])
      .map((rid) => ({
        restaurantId: rid,
        restaurantName: restaurantMap[rid],
        impressions: byRestaurant[rid].impressions,
        uniqueViewers: byRestaurant[rid].visitors.size,
        avgPosition: byRestaurant[rid].positions.length > 0
          ? Math.round((byRestaurant[rid].positions.reduce((a, b) => a + b, 0) / byRestaurant[rid].positions.length) * 10) / 10
          : null,
      }))
      .sort((a, b) => b.impressions - a.impressions);

    // 3. Daily trend (last 30 days)
    const dailyCounts: Record<string, number> = {};
    allImpressions.forEach((row) => {
      // Filter to market restaurants
      if (!restaurantMap[row.restaurant_id]) return;
      const day = new Date(row.impressed_at).toISOString().split('T')[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });
    const dailyTrend = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Screen views from analytics_page_views
    const { count: screenViews } = await svc
      .from('analytics_page_views')
      .select('*', { count: 'exact', head: true })
      .or('page_type.eq.holiday_specials,page_path.ilike.%stpatricksday%');

    // Unique screen visitors
    const { data: screenViewRows } = await svc
      .from('analytics_page_views')
      .select('visitor_id')
      .or('page_type.eq.holiday_specials,page_path.ilike.%stpatricksday%');
    const uniqueScreenVisitors = new Set((screenViewRows || []).map((r: any) => r.visitor_id)).size;

    // 5. Clicks (holiday_teaser from Move tab)
    const { count: teaserClicks } = await svc
      .from('analytics_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('click_type', 'holiday_teaser');

    // Market-scoped impression totals (recompute from filtered data)
    const marketImpressions = perRestaurant.reduce((sum, r) => sum + r.impressions, 0);
    const marketUniqueVisitors = new Set(
      allImpressions
        .filter((row) => restaurantMap[row.restaurant_id])
        .map((row) => row.visitor_id)
    ).size;

    return NextResponse.json({
      summary: {
        totalImpressions: marketImpressions,
        uniqueVisitors: marketUniqueVisitors,
        screenViews: screenViews || 0,
        uniqueScreenVisitors,
        teaserClicks: teaserClicks || 0,
      },
      perRestaurant,
      dailyTrend,
    });
  } catch (error: any) {
    console.error('Holiday analytics error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
