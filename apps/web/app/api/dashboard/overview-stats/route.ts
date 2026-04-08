import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

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
      impressionsThisWeekResult,
      impressionsLastWeekResult,
      impressions30dResult,
      profileViews30dResult,
      profileViewsPrev30dResult,
      activeCouponsResult,
      videoRecsResult,
      menuItemsResult,
      activeHappyHoursResult,
      activeSpecialsResult,
      upcomingEventsResult,
      photosResult,
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

      // Impressions this week
      serviceClient
        .from('section_impressions')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('impressed_at', weekAgo.toISOString()),

      // Impressions last week
      serviceClient
        .from('section_impressions')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('impressed_at', twoWeeksAgo.toISOString())
        .lt('impressed_at', weekAgo.toISOString()),

      // Impressions last 30 days
      serviceClient
        .from('section_impressions')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('impressed_at', thirtyDaysAgo.toISOString()),

      // Profile views last 30 days
      serviceClient
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('viewed_at', thirtyDaysAgo.toISOString()),

      // Profile views previous 30 days (days 31-60)
      serviceClient
        .from('analytics_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('viewed_at', sixtyDaysAgo.toISOString())
        .lt('viewed_at', thirtyDaysAgo.toISOString()),

      // Active coupons
      serviceClient
        .from('coupons')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .or(`end_date.is.null,end_date.gte.${now.toISOString().split('T')[0]}`),

      // Visible video recommendations
      serviceClient
        .from('restaurant_recommendations')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_visible', true)
        .eq('is_flagged', false),

      // Menu items (through menus → menu_sections → menu_items)
      serviceClient
        .from('menus')
        .select('menu_sections(menu_items(id))')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true),

      // Active happy hours
      serviceClient
        .from('happy_hours')
        .select('*, happy_hour_items(id)')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true),

      // Active specials
      serviceClient
        .from('specials')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true),

      // Upcoming events
      serviceClient
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .or(`is_recurring.eq.true,event_date.gte.${now.toISOString().split('T')[0]}`),

      // Photos
      serviceClient
        .from('restaurant_photos')
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

    const impressionsThisWeek = impressionsThisWeekResult.count || 0;
    const impressionsLastWeek = impressionsLastWeekResult.count || 0;
    const impressions30d = impressions30dResult.count || 0;

    const calcChange = (current: number, previous: number) => {
      const change = Math.round(((current - previous) / Math.max(previous, 1)) * 100);
      return change >= 0 ? `+${change}%` : `${change}%`;
    };

    // Profile completeness score breakdown
    const activeCoupons = activeCouponsResult.count || 0;
    const videoRecs = videoRecsResult.count || 0;
    const hasCustomDesc = !!(restaurant.custom_description && restaurant.custom_description.length >= 50);

    // Count menu items from nested response
    let menuItemCount = 0;
    if (menuItemsResult.data) {
      for (const menu of menuItemsResult.data) {
        for (const section of (menu as any).menu_sections || []) {
          menuItemCount += (section.menu_items || []).length;
        }
      }
    }

    const activeHappyHours = activeHappyHoursResult.data || [];
    const hasHappyHourItems = activeHappyHours.some((hh: any) => (hh.happy_hour_items || []).length > 0);
    const activeSpecials = activeSpecialsResult.count || 0;
    const upcomingEvents = upcomingEventsResult.count || 0;
    const photoCount = photosResult.count || 0;
    const hoursCount = hoursCountResult.count || 0;

    // Actionable breakdown — shows what's earning points and what's missing
    const completionItems = [
      { label: 'Active deals', completed: activeCoupons >= 1, action: activeCoupons < 1 ? 'Add a deal to earn the biggest boost' : undefined, maxPoints: 20 },
      { label: 'Video recommendations', completed: videoRecs >= 1, action: videoRecs < 1 ? 'Encourage customers to post video recs' : undefined, maxPoints: 15 },
      { label: 'Custom description', completed: hasCustomDesc, action: !hasCustomDesc ? 'Write a custom description (50+ chars)' : undefined, maxPoints: 10 },
      { label: 'Menu items', completed: menuItemCount >= 5, action: menuItemCount < 5 ? 'Add at least 5 menu items' : undefined, maxPoints: 15 },
      { label: 'Happy hours', completed: activeHappyHours.length >= 1 && hasHappyHourItems, action: activeHappyHours.length < 1 ? 'Add your happy hour details' : !hasHappyHourItems ? 'Add items to your happy hour' : undefined, maxPoints: 10 },
      { label: 'Events', completed: upcomingEvents >= 1, action: upcomingEvents < 1 ? 'Add an upcoming event' : undefined, maxPoints: 8 },
      { label: 'Specials', completed: activeSpecials >= 1, action: activeSpecials < 1 ? 'Create a special offer' : undefined, maxPoints: 6 },
      { label: 'Photos', completed: !!(restaurant.cover_image_url) && photoCount >= 3, action: !restaurant.cover_image_url ? 'Upload a cover photo' : photoCount < 3 ? 'Add more photos (3+ recommended)' : undefined, maxPoints: 8 },
      { label: 'Hours set up', completed: hoursCount >= 7, action: hoursCount < 7 ? 'Set hours for all 7 days' : undefined, maxPoints: 5 },
      { label: 'Basic info', completed: !!(restaurant.phone && restaurant.website && restaurant.price_range), action: !restaurant.phone ? 'Add phone number' : !restaurant.website ? 'Add website' : !restaurant.price_range ? 'Set price range' : undefined, maxPoints: 3 },
    ];
    const completionPercentage = restaurant.profile_score || 0;

    // 30-day profile views
    const profileViews30d = profileViews30dResult.count || 0;
    const profileViewsPrev30d = profileViewsPrev30dResult.count || 0;

    // Conversion rate: 30d profile views / 30d impressions
    const conversionRate = impressions30d > 0
      ? Math.round((profileViews30d / impressions30d) * 1000) / 10
      : 0;

    return NextResponse.json({
      stats: {
        impressions30d,
        impressionsChange: calcChange(impressionsThisWeek, impressionsLastWeek),
        profileViews: totalViewsResult.count || 0,
        profileViews30d,
        profileViewsChange: calcChange(profileViews30d, profileViewsPrev30d),
        viewsChange: calcChange(weeklyViews, lastWeekViews),
        conversionRate,
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
        band: completionPercentage >= 90 ? 'Optimized' : completionPercentage >= 75 ? 'Great' : completionPercentage >= 55 ? 'Good' : completionPercentage >= 30 ? 'Getting Started' : 'Incomplete',
        updatedAt: restaurant.profile_score_updated_at || null,
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
