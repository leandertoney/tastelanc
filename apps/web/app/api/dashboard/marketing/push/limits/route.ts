import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

const TIER_PUSH_LIMITS: Record<string, number> = {
  premium: 4,
  elite: 8,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
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

    // Get tier
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('tier_id, market_id, tiers(name)')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tiersData = (restaurant as any).tiers;
    const tierName: string = Array.isArray(tiersData) ? tiersData[0]?.name || 'basic' : tiersData?.name || 'basic';
    const limit = TIER_PUSH_LIMITS[tierName] || 0;

    // Count this month's usage
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: used } = await serviceClient
      .from('restaurant_push_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', 'sent')
      .gte('sent_at', monthStart);

    // Get audience counts for UI
    const { data: market } = await serviceClient
      .from('markets')
      .select('app_slug, slug')
      .eq('id', restaurant.market_id)
      .single();

    let favoritesCount = 0;
    let checkedInCount = 0;


    if (market) {
      // Favorites count
      const { data: favUsers } = await serviceClient
        .from('favorites')
        .select('user_id')
        .eq('restaurant_id', restaurantId);

      if (favUsers && favUsers.length > 0) {
        const uniqueUserIds = Array.from(new Set(favUsers.map((f) => f.user_id)));
        const { count: favTokenCount } = await serviceClient
          .from('push_tokens')
          .select('id', { count: 'exact', head: true })
          .in('user_id', uniqueUserIds)
          .eq('app_slug', market.app_slug);
        favoritesCount = favTokenCount || 0;
      }

      // Checked-in count
      const { data: checkinUsers } = await serviceClient
        .from('checkins')
        .select('user_id')
        .eq('restaurant_id', restaurantId);

      if (checkinUsers && checkinUsers.length > 0) {
        const uniqueCheckinIds = Array.from(new Set(checkinUsers.map((c) => c.user_id)));
        const { count: checkinTokenCount } = await serviceClient
          .from('push_tokens')
          .select('id', { count: 'exact', head: true })
          .in('user_id', uniqueCheckinIds)
          .eq('app_slug', market.app_slug);
        checkedInCount = checkinTokenCount || 0;
      }

    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    return NextResponse.json({
      used: used || 0,
      limit,
      remaining: Math.max(0, limit - (used || 0)),
      period: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
      marketSlug: market?.slug || 'lancaster-pa',
      audienceCounts: {
        favorites: favoritesCount,
        checked_in: checkedInCount,
      },
    });
  } catch (error) {
    console.error('Error in push limits API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
