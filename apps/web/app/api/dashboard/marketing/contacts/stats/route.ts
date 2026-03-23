import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Contact list size caps per tier (protects shared Resend quota)
const TIER_CONTACT_LIMITS: Record<string, number> = {
  premium: 500,
  elite: 2000,
};

// Per-restaurant overrides (takes precedence over tier limit)
const RESTAURANT_CONTACT_OVERRIDES: Record<string, number> = {
  '9d64d846-931a-4e1c-8d35-296b008f728e': 5000, // Caddy Shack
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

    // Get total count
    const { count: total } = await serviceClient
      .from('restaurant_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);

    // Get active count (not unsubscribed)
    const { count: active } = await serviceClient
      .from('restaurant_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('is_unsubscribed', false);

    const unsubscribed = (total || 0) - (active || 0);

    // Get tier contact limit
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('tier_id, tiers(name)')
      .eq('id', restaurantId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tiersData = (restaurant as any)?.tiers;
    const tierName: string = Array.isArray(tiersData) ? tiersData[0]?.name || 'basic' : tiersData?.name || 'basic';
    const contactLimit = RESTAURANT_CONTACT_OVERRIDES[restaurantId] ?? TIER_CONTACT_LIMITS[tierName] ?? 0;

    return NextResponse.json({
      total: total || 0,
      active: active || 0,
      unsubscribed,
      contactLimit,
      tierName,
    });
  } catch (error) {
    console.error('Error in contact stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
