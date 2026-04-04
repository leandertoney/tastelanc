import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { MARKET_SLUG } from '@/config/market';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServiceRoleClient();

  // Resolve market
  const { data: marketRow } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', MARKET_SLUG)
    .eq('is_active', true)
    .single();
  if (!marketRow) return NextResponse.json({ error: 'Market not found' }, { status: 500 });
  const marketId = marketRow.id;

  const now = new Date();
  const launchDate = '2026-04-04'; // TFK went live

  // Get all TFK restaurant IDs (via events with partner_slug)
  const { data: tfkEvents } = await supabase
    .from('events')
    .select('restaurant_id, name, performer_name, event_type, days_of_week')
    .eq('partner_slug', 'thirsty-for-knowledge')
    .eq('market_id', marketId)
    .eq('is_active', true);

  const tfkRestaurantIds = [...new Set(
    (tfkEvents || []).map(e => e.restaurant_id).filter(Boolean)
  )] as string[];

  // Get restaurant names for those IDs
  const { data: tfkRestaurants } = tfkRestaurantIds.length > 0
    ? await supabase
        .from('restaurants')
        .select('id, name, slug')
        .in('id', tfkRestaurantIds)
    : { data: [] };

  const restaurantMap: Record<string, { name: string; slug: string }> = {};
  (tfkRestaurants || []).forEach(r => { restaurantMap[r.id] = { name: r.name, slug: r.slug }; });

  if (tfkRestaurantIds.length === 0) {
    return NextResponse.json({
      summary: { totalImpressions: 0, totalClicks: 0, uniqueViewers: 0, ctr: 0 },
      venueBreakdown: [],
      weeklyTrend: [],
      dayOfWeekBreakdown: [],
      launchDate,
    });
  }

  // Run all queries in parallel
  const [
    impressionsResult,
    clicksResult,
    weeklyImpressionsResult,
    weeklyClicksResult,
    dayOfWeekResult,
  ] = await Promise.all([
    // Total impressions per restaurant since launch
    supabase
      .from('section_impressions')
      .select('restaurant_id, visitor_id, impressed_at')
      .in('restaurant_id', tfkRestaurantIds)
      .eq('section_name', 'entertainment')
      .gte('impressed_at', launchDate),

    // Total clicks per restaurant since launch
    supabase
      .from('analytics_clicks')
      .select('restaurant_id, clicked_at')
      .in('restaurant_id', tfkRestaurantIds)
      .gte('clicked_at', launchDate),

    // Weekly impressions trend (group by ISO week)
    supabase
      .from('section_impressions')
      .select('impressed_at')
      .in('restaurant_id', tfkRestaurantIds)
      .eq('section_name', 'entertainment')
      .gte('impressed_at', launchDate)
      .order('impressed_at', { ascending: true }),

    // Weekly clicks trend
    supabase
      .from('analytics_clicks')
      .select('clicked_at')
      .in('restaurant_id', tfkRestaurantIds)
      .gte('clicked_at', launchDate)
      .order('clicked_at', { ascending: true }),

    // Impressions by day of week
    supabase
      .from('section_impressions')
      .select('impressed_at')
      .in('restaurant_id', tfkRestaurantIds)
      .eq('section_name', 'entertainment')
      .gte('impressed_at', launchDate),
  ]);

  const impressions = impressionsResult.data || [];
  const clicks = clicksResult.data || [];

  // Summary stats
  const totalImpressions = impressions.length;
  const totalClicks = clicks.length;
  const uniqueViewers = new Set(impressions.map(i => i.visitor_id)).size;
  const ctr = totalImpressions > 0
    ? Math.round((totalClicks / totalImpressions) * 1000) / 10
    : 0;

  // Per-venue breakdown
  const venueImpressions: Record<string, number> = {};
  const venueUniqueViewers: Record<string, Set<string>> = {};
  impressions.forEach(i => {
    if (!i.restaurant_id) return;
    venueImpressions[i.restaurant_id] = (venueImpressions[i.restaurant_id] || 0) + 1;
    if (!venueUniqueViewers[i.restaurant_id]) venueUniqueViewers[i.restaurant_id] = new Set();
    venueUniqueViewers[i.restaurant_id].add(i.visitor_id);
  });

  const venueClicks: Record<string, number> = {};
  clicks.forEach(c => {
    if (!c.restaurant_id) return;
    venueClicks[c.restaurant_id] = (venueClicks[c.restaurant_id] || 0) + 1;
  });

  const venueBreakdown = tfkRestaurantIds.map(id => {
    const imps = venueImpressions[id] || 0;
    const clks = venueClicks[id] || 0;
    const uniq = venueUniqueViewers[id]?.size || 0;
    const venueCtr = imps > 0 ? Math.round((clks / imps) * 1000) / 10 : 0;
    // Find events for this venue
    const venueEvents = (tfkEvents || []).filter(e => e.restaurant_id === id);
    const days = [...new Set(venueEvents.flatMap(e => e.days_of_week || []))];
    return {
      restaurantId: id,
      name: restaurantMap[id]?.name || 'TFK Franchise Venue',
      slug: restaurantMap[id]?.slug || '',
      impressions: imps,
      clicks: clks,
      uniqueViewers: uniq,
      ctr: venueCtr,
      days,
    };
  }).sort((a, b) => b.impressions - a.impressions);

  // Weekly trend — bucket by Mon-Sun week
  const getWeekStart = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0=Sun
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const weeklyImps: Record<string, number> = {};
  (weeklyImpressionsResult.data || []).forEach(row => {
    const week = getWeekStart(row.impressed_at);
    weeklyImps[week] = (weeklyImps[week] || 0) + 1;
  });

  const weeklyClks: Record<string, number> = {};
  (weeklyClicksResult.data || []).forEach(row => {
    const week = getWeekStart(row.clicked_at);
    weeklyClks[week] = (weeklyClks[week] || 0) + 1;
  });

  const allWeeks = [...new Set([...Object.keys(weeklyImps), ...Object.keys(weeklyClks)])].sort();
  const weeklyTrend = allWeeks.map(week => ({
    week,
    impressions: weeklyImps[week] || 0,
    clicks: weeklyClks[week] || 0,
  }));

  // Day of week breakdown
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dowImps: Record<number, number> = {};
  (dayOfWeekResult.data || []).forEach(row => {
    const dow = new Date(row.impressed_at).getDay();
    dowImps[dow] = (dowImps[dow] || 0) + 1;
  });
  const dayOfWeekBreakdown = DAYS.map((name, i) => ({
    day: name,
    impressions: dowImps[i] || 0,
  }));

  return NextResponse.json({
    summary: { totalImpressions, totalClicks, uniqueViewers, ctr },
    venueBreakdown,
    weeklyTrend,
    dayOfWeekBreakdown,
    launchDate,
    lastUpdated: now.toISOString(),
  });
}
