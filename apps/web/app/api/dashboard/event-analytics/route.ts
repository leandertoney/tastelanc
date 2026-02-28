import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      eventViewsResult,
      eventViewsPrevResult,
      eventClicksResult,
      eventClicksPrevResult,
      eventImpressionsResult,
      eventImpressionsPrevResult,
      weeklyViewsResult,
      activeEventsResult,
      eventsByTypeResult,
    ] = await Promise.all([
      // Event page views (30d)
      serviceClient
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('page_type', 'events')
        .gte('viewed_at', thirtyDaysAgo.toISOString()),

      // Event page views (previous 30d)
      serviceClient
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('page_type', 'events')
        .gte('viewed_at', sixtyDaysAgo.toISOString())
        .lt('viewed_at', thirtyDaysAgo.toISOString()),

      // Event clicks (30d)
      serviceClient
        .from('analytics_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('click_type', 'event')
        .gte('clicked_at', thirtyDaysAgo.toISOString()),

      // Event clicks (previous 30d)
      serviceClient
        .from('analytics_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('click_type', 'event')
        .gte('clicked_at', sixtyDaysAgo.toISOString())
        .lt('clicked_at', thirtyDaysAgo.toISOString()),

      // Events section impressions (30d)
      serviceClient
        .from('section_impressions')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .in('section_name', ['events', 'entertainment'])
        .gte('impressed_at', thirtyDaysAgo.toISOString()),

      // Events section impressions (previous 30d)
      serviceClient
        .from('section_impressions')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .in('section_name', ['events', 'entertainment'])
        .gte('impressed_at', sixtyDaysAgo.toISOString())
        .lt('impressed_at', thirtyDaysAgo.toISOString()),

      // Daily event views (last 7 days) for mini chart
      serviceClient
        .from('analytics_page_views')
        .select('viewed_at')
        .eq('restaurant_id', restaurantId)
        .eq('page_type', 'events')
        .gte('viewed_at', sevenDaysAgo.toISOString()),

      // Active events count
      serviceClient
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true),

      // Events by type (all active)
      serviceClient
        .from('events')
        .select('event_type')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true),
    ]);

    // Calculate stats
    const eventViews = eventViewsResult.count || 0;
    const eventViewsPrev = eventViewsPrevResult.count || 0;
    const eventClicks = eventClicksResult.count || 0;
    const eventClicksPrev = eventClicksPrevResult.count || 0;
    const eventImpressions = eventImpressionsResult.count || 0;
    const eventImpressionsPrev = eventImpressionsPrevResult.count || 0;
    const activeEvents = activeEventsResult.count || 0;

    // Calculate trends
    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const viewsTrend = calcTrend(eventViews, eventViewsPrev);
    const clicksTrend = calcTrend(eventClicks, eventClicksPrev);
    const impressionsTrend = calcTrend(eventImpressions, eventImpressionsPrev);

    // Process weekly chart data
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyMap = new Map<string, number>();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      weeklyMap.set(dayNames[date.getDay()], 0);
    }

    weeklyViewsResult.data?.forEach((view: { viewed_at: string }) => {
      const date = new Date(view.viewed_at);
      const dayName = dayNames[date.getDay()];
      weeklyMap.set(dayName, (weeklyMap.get(dayName) || 0) + 1);
    });

    const weeklyViews = orderedDays.map((day) => ({
      day,
      views: weeklyMap.get(day) || 0,
    }));

    // Count by event type
    const typeCountMap = new Map<string, number>();
    eventsByTypeResult.data?.forEach((e: { event_type: string }) => {
      typeCountMap.set(e.event_type, (typeCountMap.get(e.event_type) || 0) + 1);
    });
    const eventsByType = Array.from(typeCountMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Engagement rate (clicks / views)
    const engagementRate = eventViews > 0
      ? Math.round((eventClicks / eventViews) * 1000) / 10
      : 0;

    return NextResponse.json({
      stats: {
        eventViews,
        viewsTrend,
        eventClicks,
        clicksTrend,
        eventImpressions,
        impressionsTrend,
        activeEvents,
        engagementRate,
      },
      weeklyViews,
      eventsByType,
    });
  } catch (error) {
    console.error('Error fetching event analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event analytics' },
      { status: 500 }
    );
  }
}
