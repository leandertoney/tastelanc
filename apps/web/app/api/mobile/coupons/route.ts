import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('market_id');
    const restaurantId = searchParams.get('restaurant_id');

    const serviceClient = createServiceRoleClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];

    let query = serviceClient
      .from('coupons')
      .select('*, restaurant:restaurants!inner(id, name, cover_image_url, slug, market_id)')
      .eq('is_active', true)
      .lte('start_date', today);

    // Market scoping (mandatory for mobile)
    if (marketId) {
      query = query.eq('restaurant.market_id', marketId);
    }

    // Optional: filter by specific restaurant
    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    const { data: coupons, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coupons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch coupons' },
        { status: 500 }
      );
    }

    // Filter: only coupons that haven't expired and are valid for today
    const activeCoupons = (coupons || []).filter(coupon => {
      // Check end_date
      if (coupon.end_date && coupon.end_date < today) return false;

      // Check days_of_week (empty = every day)
      if (coupon.days_of_week && coupon.days_of_week.length > 0) {
        if (!coupon.days_of_week.includes(currentDay)) return false;
      }

      // Check max_claims_total
      if (coupon.max_claims_total && coupon.claims_count >= coupon.max_claims_total) return false;

      return true;
    });

    return NextResponse.json({ coupons: activeCoupons });
  } catch (error) {
    console.error('Error in mobile coupons API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
