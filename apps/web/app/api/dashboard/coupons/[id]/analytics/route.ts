import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceRoleClient();

    // Get coupon and verify access
    const { data: coupon, error: couponError } = await serviceClient
      .from('coupons')
      .select('restaurant_id, title, claims_count')
      .eq('id', id)
      .single();

    if (couponError || !coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, coupon.restaurant_id);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    // Get anonymized aggregate analytics — NO PII returned
    const { data: claims, error: claimsError } = await serviceClient
      .from('coupon_claims')
      .select('status, claimed_at, redeemed_at')
      .eq('coupon_id', id);

    if (claimsError) {
      console.error('Error fetching claims:', claimsError);
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }

    const allClaims = claims || [];
    const totalClaimed = allClaims.length;
    const totalRedeemed = allClaims.filter(c => c.status === 'redeemed').length;
    const totalExpired = allClaims.filter(c => c.status === 'expired').length;
    const totalCancelled = allClaims.filter(c => c.status === 'cancelled').length;
    const conversionRate = totalClaimed > 0 ? Math.round((totalRedeemed / totalClaimed) * 100) : 0;

    // Average time from claim to redemption (in minutes)
    const redeemedClaims = allClaims.filter(c => c.status === 'redeemed' && c.redeemed_at && c.claimed_at);
    let avgRedemptionMinutes = 0;
    if (redeemedClaims.length > 0) {
      const totalMinutes = redeemedClaims.reduce((sum, c) => {
        const diff = new Date(c.redeemed_at!).getTime() - new Date(c.claimed_at).getTime();
        return sum + diff / (1000 * 60);
      }, 0);
      avgRedemptionMinutes = Math.round(totalMinutes / redeemedClaims.length);
    }

    // Daily breakdown (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyBreakdown: Record<string, { claimed: number; redeemed: number }> = {};
    for (const claim of allClaims) {
      const date = new Date(claim.claimed_at).toISOString().split('T')[0];
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = { claimed: 0, redeemed: 0 };
      }
      dailyBreakdown[date].claimed++;
      if (claim.status === 'redeemed') {
        dailyBreakdown[date].redeemed++;
      }
    }

    // Hourly distribution of redemptions
    const hourlyRedemptions: Record<number, number> = {};
    for (const claim of redeemedClaims) {
      const hour = new Date(claim.redeemed_at!).getHours();
      hourlyRedemptions[hour] = (hourlyRedemptions[hour] || 0) + 1;
    }

    return NextResponse.json({
      analytics: {
        total_claimed: totalClaimed,
        total_redeemed: totalRedeemed,
        total_expired: totalExpired,
        total_cancelled: totalCancelled,
        conversion_rate: conversionRate,
        avg_redemption_minutes: avgRedemptionMinutes,
        daily_breakdown: dailyBreakdown,
        hourly_redemptions: hourlyRedemptions,
      },
    });
  } catch (error) {
    console.error('Error in coupon analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
