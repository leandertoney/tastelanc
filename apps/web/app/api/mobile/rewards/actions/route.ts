import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAvailableActions, checkPremiumStatus, PREMIUM_MULTIPLIER } from '@/lib/rewards';

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

    // Check premium status
    const isPremium = await checkPremiumStatus(supabase, user.id);

    // Get available actions with point values
    const actions = getAvailableActions(isPremium);

    return NextResponse.json({
      actions,
      is_premium: isPremium,
      premium_multiplier: PREMIUM_MULTIPLIER,
    });
  } catch (error) {
    console.error('Error fetching reward actions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
