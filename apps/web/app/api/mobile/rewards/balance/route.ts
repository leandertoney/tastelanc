import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkPremiumStatus, PREMIUM_MULTIPLIER } from '@/lib/rewards';

export async function GET() {
  try {
    const supabase = await createClient();

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
