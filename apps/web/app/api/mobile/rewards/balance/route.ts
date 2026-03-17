import { NextResponse } from 'next/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { checkPremiumStatus, PREMIUM_MULTIPLIER } from '@/lib/rewards';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const supabase = createMobileClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's points balance
    const { data: points, error: pointsError } = await supabase
      .from('user_points')
      .select('total_points, lifetime_points')
      .eq('user_id', user.id)
      .single();

    // If no points record exists, return zeros
    const totalPoints = points?.total_points ?? 0;
    const lifetimePoints = points?.lifetime_points ?? 0;

    // Check premium status
    const isPremium = await checkPremiumStatus(supabase, user.id);

    return NextResponse.json({
      total_points: totalPoints,
      lifetime_points: lifetimePoints,
      is_premium: isPremium,
      multiplier: isPremium ? PREMIUM_MULTIPLIER : 1.0,
    });
  } catch (error) {
    console.error('Error fetching rewards balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
