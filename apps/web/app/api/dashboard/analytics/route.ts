import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Service role client to bypass RLS for analytics queries
function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const adminMode = searchParams.get('admin_mode') === 'true';

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If not admin mode, verify user owns this restaurant
    if (!adminMode && restaurantId) {
      const { data: restaurant } = await supabaseAdmin
        .from('restaurants')
        .select('owner_id')
        .eq('id', restaurantId)
        .single();

      if (!restaurant || restaurant.owner_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }

    // Calculate date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayDateStr = now.toISOString().split('T')[0];

    // Get restaurant data for tier info
    const { data: restaurantData } = await supabaseAdmin
      .from('restaurants')
      .select('slug, name, tiers(name)')
      .eq('id', restaurantId)
      .single();

    if (!restaurantData) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Run all queries in parallel using admin client to bypass RLS
    // Use analytics_page_views table which has the actual view data
    const [
      totalViewsResult,
      previousViewsResult,
      uniqueVisitorsResult,
      weeklyViewsResult,
      clicksResult,
      favoritesResult,
      recentActivityResult,
      lifetimeViewsResult,
      todayViewsResult,
      upcomingEventsResult,
      happyHourViewsResult,
      menuViewsResult,
    ] = await Promise.all([
      // Total views (last 30 days)
      supabaseAdmin
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('viewed_at', thirtyDaysAgo.toISOString()),

      // Previous period views (30-60 days ago)
      supabaseAdmin
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('viewed_at', sixtyDaysAgo.toISOString())
        .lt('viewed_at', thirtyDaysAgo.toISOString()),

      // Unique visitors (last 30 days)
      supabaseAdmin
        .from('analytics_page_views')
        .select('visitor_id')
        .eq('restaurant_id', restaurantId)
        .gte('viewed_at', thirtyDaysAgo.toISOString()),

      // Weekly views (last 7 days)
      supabaseAdmin
        .from('analytics_page_views')
        .select('viewed_at')
        .eq('restaurant_id', restaurantId)
        .gte('viewed_at', sevenDaysAgo.toISOString()),

      // Clicks by type (last 30 days)
      supabaseAdmin
        .from('analytics_clicks')
        .select('click_type')
        .eq('restaurant_id', restaurantId)
        .gte('clicked_at', thirtyDaysAgo.toISOString()),

      // Favorites count
      supabaseAdmin
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId),

      // Recent activity (last 20)
      supabaseAdmin
        .from('analytics_page_views')
        .select('page_path, page_type, viewed_at')
        .eq('restaurant_id', restaurantId)
        .order('viewed_at', { ascending: false })
        .limit(20),

      // Lifetime views (all time)
      supabaseAdmin
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId),

      // Today's views
      supabaseAdmin
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('viewed_at', todayStart.toISOString()),

      // Upcoming events count
      supabaseAdmin
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .or(`event_date.gte.${todayDateStr},is_recurring.eq.true`),

      // Happy hour views (last 30 days)
      supabaseAdmin
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('page_type', 'happy_hour')
        .gte('viewed_at', thirtyDaysAgo.toISOString()),

      // Menu views (last 30 days)
      supabaseAdmin
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('page_type', 'menu')
        .gte('viewed_at', thirtyDaysAgo.toISOString()),
    ]);

    // Calculate stats
    const totalViews = totalViewsResult.count || 0;
    const previousViews = previousViewsResult.count || 0;
    const uniqueVisitors = new Set(uniqueVisitorsResult.data?.map(v => v.visitor_id) || []).size;
    const favorites = favoritesResult.count || 0;
    const lifetimeViews = lifetimeViewsResult.count || 0;
    const todayViews = todayViewsResult.count || 0;
    const upcomingEvents = upcomingEventsResult.count || 0;
    const happyHourViews = happyHourViewsResult.count || 0;
    const menuViews = menuViewsResult.count || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tierName = (restaurantData?.tiers as any)?.name || 'free';

    // Calculate trend percentage
    let viewsTrend = 0;
    if (previousViews > 0) {
      viewsTrend = Math.round(((totalViews - previousViews) / previousViews) * 100);
    } else if (totalViews > 0) {
      viewsTrend = 100; // If no previous data but current views, show 100% growth
    }

    // Process weekly views into day buckets
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap = new Map<string, number>();

    // Initialize all 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayName = dayNames[date.getDay()];
      weeklyMap.set(dayName, 0);
    }

    // Count views per day
    weeklyViewsResult.data?.forEach(view => {
      const date = new Date(view.viewed_at);
      const dayName = dayNames[date.getDay()];
      weeklyMap.set(dayName, (weeklyMap.get(dayName) || 0) + 1);
    });

    // Convert to array in order (Mon-Sun)
    const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyViews = orderedDays.map(day => ({
      day,
      views: weeklyMap.get(day) || 0,
    }));

    // Process clicks by type
    const clicksMap = new Map<string, number>();
    clicksResult.data?.forEach(click => {
      clicksMap.set(click.click_type, (clicksMap.get(click.click_type) || 0) + 1);
    });

    const clicksByType = {
      phone: clicksMap.get('phone') || 0,
      website: clicksMap.get('website') || 0,
      directions: clicksMap.get('directions') || 0,
      menu: clicksMap.get('menu') || 0,
      share: clicksMap.get('share') || 0,
      favorite: clicksMap.get('favorite') || 0,
      happy_hour: clicksMap.get('happy_hour') || 0,
      event: clicksMap.get('event') || 0,
    };

    const totalClicks = Array.from(clicksMap.values()).reduce((sum, c) => sum + c, 0);

    // Process recent activity - group consecutive same actions
    const recentActivity: Array<{ action: string; time: string; count: number }> = [];
    const activityData = recentActivityResult.data || [];

    const actionLabels: Record<string, string> = {
      restaurant: 'Profile viewed',
      events: 'Events viewed',
      menu: 'Menu viewed',
      happy_hour: 'Happy hour viewed',
      home: 'Appeared in feed',
      vote: 'Vote page viewed',
      other: 'Page viewed',
    };

    // Group consecutive same actions
    let currentAction = '';
    let currentCount = 0;
    let currentTime = '';

    activityData.forEach((item, index) => {
      // Use page_type directly from analytics_page_views
      const pageType = item.page_type || 'restaurant';
      const action = actionLabels[pageType] || 'Page viewed';
      const time = formatTimeAgo(new Date(item.viewed_at));

      if (action === currentAction && index < 5) {
        currentCount++;
      } else {
        if (currentAction && recentActivity.length < 5) {
          recentActivity.push({
            action: currentAction,
            time: currentTime,
            count: currentCount,
          });
        }
        currentAction = action;
        currentTime = time;
        currentCount = 1;
      }
    });

    // Add the last group
    if (currentAction && recentActivity.length < 5) {
      recentActivity.push({
        action: currentAction,
        time: currentTime,
        count: currentCount,
      });
    }

    // Calculate this week's total views from weeklyViews data
    const thisWeekViews = weeklyViewsResult.data?.length || 0;

    return NextResponse.json({
      stats: {
        totalViews,
        totalViewsPrevious: previousViews,
        viewsTrend,
        uniqueVisitors,
        favorites,
        totalClicks,
        lifetimeViews,
        todayViews,
        thisWeekViews,
        upcomingEvents,
        happyHourViews,
        menuViews,
        tierName,
      },
      weeklyViews,
      clicksByType,
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}
