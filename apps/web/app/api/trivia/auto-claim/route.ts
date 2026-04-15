import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Auto-claim TFK trivia prizes when user logs in/signs up
 * Called automatically when users authenticate
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = createServiceRoleClient();

    // Check if user's email matches any pending trivia winners
    const { data: winnerEntries, error: lookupError } = await svc
      .from('trivia_leaderboard_entries')
      .select('id, player_name, market_id')
      .eq('winner_email', user.email.toLowerCase())
      .eq('email_verified', false)
      .eq('is_active', true);

    if (lookupError) {
      console.error('[TFK Auto-Claim] Lookup error:', lookupError);
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }

    if (!winnerEntries || winnerEntries.length === 0) {
      // No pending prizes for this email
      return NextResponse.json({ claimed: false, message: 'No pending prizes' });
    }

    const results = [];

    for (const entry of winnerEntries) {
      // Find an available $25 TasteLanc Prize coupon for this market
      const { data: availableCoupons } = await svc
        .from('coupons')
        .select('id, restaurant:restaurants!inner(name, market_id)')
        .eq('title', '$25 TasteLanc Prize')
        .eq('is_active', true)
        .eq('restaurant.market_id', entry.market_id)
        .limit(1);

      if (!availableCoupons || availableCoupons.length === 0) {
        console.error(`[TFK Auto-Claim] No $25 coupons found for market ${entry.market_id}`);
        continue;
      }

      const coupon = availableCoupons[0];

      // Check if user already claimed this specific coupon
      const { data: existingClaim } = await svc
        .from('coupon_claims')
        .select('id')
        .eq('user_id', user.id)
        .eq('coupon_id', coupon.id)
        .maybeSingle();

      if (existingClaim) {
        console.log(`[TFK Auto-Claim] User ${user.email} already claimed coupon ${coupon.id}`);
        // Mark as verified even if already claimed
        await svc
          .from('trivia_leaderboard_entries')
          .update({ email_verified: true })
          .eq('id', entry.id);

        results.push({
          leaderboard_entry_id: entry.id,
          player_name: entry.player_name,
          status: 'already_claimed',
          coupon_id: coupon.id,
        });
        continue;
      }

      // Create coupon claim
      const { data: claim, error: claimError } = await svc
        .from('coupon_claims')
        .insert({
          user_id: user.id,
          coupon_id: coupon.id,
          user_email: user.email,
          status: 'claimed',
          claimed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (claimError) {
        console.error(`[TFK Auto-Claim] Failed to create claim:`, claimError);
        results.push({
          leaderboard_entry_id: entry.id,
          player_name: entry.player_name,
          status: 'error',
          error: claimError.message,
        });
        continue;
      }

      // Mark leaderboard entry as verified
      await svc
        .from('trivia_leaderboard_entries')
        .update({ email_verified: true })
        .eq('id', entry.id);

      console.log(`[TFK Auto-Claim] ✓ Claimed prize for ${user.email} (${entry.player_name})`);

      results.push({
        leaderboard_entry_id: entry.id,
        player_name: entry.player_name,
        status: 'claimed',
        coupon_id: coupon.id,
        restaurant_name: (coupon as any).restaurant.name,
        claim_id: claim.id,
      });
    }

    return NextResponse.json({
      claimed: results.length > 0,
      results,
    });
  } catch (err: any) {
    console.error('[TFK Auto-Claim] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
