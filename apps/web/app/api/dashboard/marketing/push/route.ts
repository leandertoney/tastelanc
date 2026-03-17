import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import { sendNotification } from '@/lib/notifications/gateway';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const { data: campaigns, error } = await serviceClient
      .from('restaurant_push_campaigns')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching push campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch push campaigns' }, { status: 500 });
    }

    return NextResponse.json({ campaigns: campaigns || [] });
  } catch (error) {
    console.error('Error in push campaigns API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { title, body: pushBody, audience } = body;

    if (!title || !pushBody) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    if (!['favorites', 'checked_in'].includes(audience)) {
      return NextResponse.json({ error: 'Invalid audience type' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Get restaurant info with tier and market
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('name, market_id, tier_id, tiers(name)')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tiers = (restaurant as any).tiers;
    const tierName: string = Array.isArray(tiers) ? tiers[0]?.name || 'basic' : tiers?.name || 'basic';

    // Check tier access
    if (!TIER_PUSH_LIMITS[tierName]) {
      return NextResponse.json(
        { error: 'Push notifications require a Premium or Elite subscription' },
        { status: 403 }
      );
    }

    // Check monthly limit
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: monthlyUsage } = await serviceClient
      .from('restaurant_push_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', 'sent')
      .gte('sent_at', monthStart);

    const limit = TIER_PUSH_LIMITS[tierName];
    if ((monthlyUsage || 0) >= limit) {
      return NextResponse.json(
        { error: 'Monthly push notification limit reached', used: monthlyUsage, limit },
        { status: 429 }
      );
    }

    // Get market info
    const { data: market } = await serviceClient
      .from('markets')
      .select('slug, app_slug')
      .eq('id', restaurant.market_id)
      .single();

    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    // Get target tokens based on audience
    let tokens: string[] = [];

    if (audience === 'favorites') {
      const { data: favTokens } = await serviceClient
        .from('favorites')
        .select('user_id, push_tokens!inner(token)')
        .eq('restaurant_id', restaurantId);

      // Extract unique tokens filtered by app_slug
      if (favTokens) {
        const tokenSet = new Set<string>();
        for (const fav of favTokens) {
          const pushTokens = (fav as Record<string, unknown>).push_tokens as Array<{ token: string }> | null;
          if (Array.isArray(pushTokens)) {
            for (const pt of pushTokens) {
              tokenSet.add(pt.token);
            }
          }
        }
        tokens = Array.from(tokenSet);
      }

      // Alternative query if join doesn't work — fall back to two-step
      if (tokens.length === 0) {
        const { data: favUsers } = await serviceClient
          .from('favorites')
          .select('user_id')
          .eq('restaurant_id', restaurantId);

        if (favUsers && favUsers.length > 0) {
          const userIds = favUsers.map((f) => f.user_id);
          const { data: ptData } = await serviceClient
            .from('push_tokens')
            .select('token')
            .in('user_id', userIds)
            .eq('app_slug', market.app_slug);

          tokens = (ptData || []).map((pt) => pt.token);
        }
      }
    } else if (audience === 'checked_in') {
      // Get unique users who checked in at this restaurant
      const { data: checkinUsers } = await serviceClient
        .from('checkins')
        .select('user_id')
        .eq('restaurant_id', restaurantId);

      if (checkinUsers && checkinUsers.length > 0) {
        const uniqueUserIds = Array.from(new Set(checkinUsers.map((c) => c.user_id)));
        const { data: ptData } = await serviceClient
          .from('push_tokens')
          .select('token')
          .in('user_id', uniqueUserIds)
          .eq('app_slug', market.app_slug);

        tokens = (ptData || []).map((pt) => pt.token);
      }
    }

    // Deduplicate tokens
    tokens = Array.from(new Set(tokens));

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'No users found for the selected audience' },
        { status: 400 }
      );
    }

    // Create campaign record
    const { data: campaign, error: campaignError } = await serviceClient
      .from('restaurant_push_campaigns')
      .insert({
        restaurant_id: restaurantId,
        title,
        body: pushBody,
        audience,
        status: 'sent',
        recipient_count: tokens.length,
        sent_at: new Date().toISOString(),
        created_by: accessResult.userId,
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      console.error('Error creating push campaign:', campaignError);
      return NextResponse.json({ error: 'Failed to create push campaign' }, { status: 500 });
    }

    // Send via gateway — prefix title with restaurant name so users know who sent it
    const fullTitle = `${restaurant.name}: ${title}`;
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default' as const,
      title: fullTitle,
      body: pushBody,
      data: {
        screen: 'RestaurantDetail',
        restaurantId,
      },
    }));

    const result = await sendNotification({
      notificationType: 'restaurant_push',
      marketSlug: market.slug,
      messages,
      dedupKey: `restaurant_push:${restaurantId}:${campaign.id}`,
      skipThrottle: true,
      details: {
        restaurantId,
        restaurantName: restaurant.name,
        campaignId: campaign.id,
        audience,
      },
    });

    // Update sent count
    await serviceClient
      .from('restaurant_push_campaigns')
      .update({
        sent_count: result.sent,
        status: result.blocked ? 'failed' : 'sent',
      })
      .eq('id', campaign.id);

    return NextResponse.json({
      success: !result.blocked,
      sent: result.sent,
      total: tokens.length,
      blocked: result.blocked,
      blockReason: result.blockReason,
    });
  } catch (error) {
    console.error('Error in push notification API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
