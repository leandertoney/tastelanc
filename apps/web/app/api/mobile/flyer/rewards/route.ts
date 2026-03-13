import { NextResponse } from 'next/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const supabase = createMobileClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Get all scanner rewards for this user
    const { data: rewards, error } = await serviceClient
      .from('scanner_rewards')
      .select(`
        id,
        amount_credits,
        status,
        created_at,
        draft:event_drafts(id, flyer_image_url, extracted_json, status, published_event_id)
      `)
      .eq('scanner_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scanner rewards:', error);
      return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 });
    }

    // Calculate totals
    const earnedCredits = (rewards || [])
      .filter(r => r.status === 'earned')
      .reduce((sum, r) => sum + r.amount_credits, 0);

    const pendingCredits = (rewards || [])
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount_credits, 0);

    const redeemedCredits = (rewards || [])
      .filter(r => r.status === 'redeemed')
      .reduce((sum, r) => sum + r.amount_credits, 0);

    return NextResponse.json({
      earned_credits: earnedCredits,
      pending_credits: pendingCredits,
      redeemed_credits: redeemedCredits,
      available_credits: earnedCredits - redeemedCredits,
      rewards: rewards || [],
    });
  } catch (error) {
    console.error('Error in scanner rewards:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
