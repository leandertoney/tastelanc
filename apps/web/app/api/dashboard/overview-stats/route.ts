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
    const restaurant = accessResult.restaurant!;

    // Date ranges
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      totalViewsResult,
      weeklyViewsResult,
      lastWeekViewsResult,
      favoritesResult,
      thisWeekFavoritesResult,
      lastWeekFavoritesResult,
      happyHourViewsResult,
      lastWeekHappyHourViewsResult,
      menuViewsResult,
      lastWeekMenuViewsResult,
      hoursCountResult,
    ] = await Promise.all([
      // Total profile views (all time)
      serviceClient
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId),

      // Profile views this week
      serviceClient
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('viewed_at', weekAgo.toISOString()),

      // Profile views last week
      serviceClient
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('viewed_at', twoWeeksAgo.toISOString())
        .lt('viewed_at', weekAgo.toISOString()),

      // Total favorites
      serviceClient
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId),

      // Favorites this week
      serviceClient
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('created_at', weekAgo.toISOString()),

      // Favorites last week
      serviceClient
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', weekAgo.toISOString()),

      // Happy hour views this week
      serviceClient
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('page_type', 'happy_hour')
        .gte('viewed_at', weekAgo.toISOString()),

      // Happy hour views last week
      serviceClient
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('page_type', 'happy_hour')
        .gte('viewed_at', twoWeeksAgo.toISOString())
        .lt('viewed_at', weekAgo.toISOString()),

      // Menu views this week
      serviceClient
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('page_type', 'menu')
        .gte('viewed_at', weekAgo.toISOString()),

      // Menu views last week
      serviceClient
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('page_type', 'menu')
        .gte('viewed_at', twoWeeksAgo.toISOString())
        .lt('viewed_at', weekAgo.toISOString()),

      // Hours count for profile completion
      serviceClient
        .from('restaurant_hours')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId),
    ]);

    // Calculate percentage changes
    const weeklyViews = weeklyViewsResult.count || 0;
    const lastWeekViews = lastWeekViewsResult.count || 0;
    const happyHourViews = happyHourViewsResult.count || 0;
    const lastWeekHappyHourViews = lastWeekHappyHourViewsResult.count || 0;
    const menuViews = menuViewsResult.count || 0;
    const lastWeekMenuViews = lastWeekMenuViewsResult.count || 0;
    const thisWeekFavorites = thisWeekFavoritesResult.count || 0;
    const lastWeekFavorites = lastWeekFavoritesResult.count || 0;

    const calcChange = (current: number, previous: number) => {
      const change = Math.round(((current - previous) / Math.max(previous, 1)) * 100);
      return change >= 0 ? `+${change}%` : `${change}%`;
    };

    // Profile completion
    const completionItems = [
      { label: 'Basic info added', completed: !!(restaurant.name && restaurant.address) },
      { label: 'Description written', completed: !!restaurant.description },
      { label: 'Phone number added', completed: !!restaurant.phone },
      { label: 'Website linked', completed: !!restaurant.website },
      { label: 'Categories selected', completed: restaurant.categories && restaurant.categories.length > 0 },
      { label: 'Hours set up', completed: (hoursCountResult.count || 0) > 0 },
      { label: 'Photos uploaded', completed: !!(restaurant.cover_image_url || restaurant.logo_url) },
    ];
    const completedCount = completionItems.filter(item => item.completed).length;
    const completionPercentage = Math.round((completedCount / completionItems.length) * 100);

    return NextResponse.json({
      stats: {
        profileViews: totalViewsResult.count || 0,
        viewsChange: calcChange(weeklyViews, lastWeekViews),
        favorites: favoritesResult.count || 0,
        favoritesChange: calcChange(thisWeekFavorites, lastWeekFavorites),
        weeklyViews,
        weeklyChange: calcChange(weeklyViews, lastWeekViews),
        happyHourViews,
        happyHourChange: calcChange(happyHourViews, lastWeekHappyHourViews),
        menuViews,
        menuChange: calcChange(menuViews, lastWeekMenuViews),
        upcomingEvents: 0,
      },
      profileCompletion: {
        percentage: completionPercentage,
        items: completionItems,
      },
    });
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overview stats' },
      { status: 500 }
    );
  }
}
