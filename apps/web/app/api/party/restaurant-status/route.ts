import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/party/restaurant-status?restaurant_id=X
// Returns the restaurant's eligibility + code status for the active party event.
// Eligible = paid tier (premium/elite/coffee_shop) OR has a restaurant-week special.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurant_id = searchParams.get('restaurant_id');

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurant_id);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Get active party event
    const { data: event } = await serviceClient
      .from('party_events')
      .select('id, name, date, venue, address, is_active')
      .eq('is_active', true)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (!event) {
      return NextResponse.json({ eligible: false, event: null, code: null });
    }

    // Check eligibility: paid tier OR restaurant week participant
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('id, tiers ( name )')
      .eq('id', restaurant_id)
      .single();

    const tiersRaw = restaurant?.tiers;
    const tiersObj = Array.isArray(tiersRaw) ? tiersRaw[0] : tiersRaw;
    const tierName = (tiersObj as { name?: string } | null)?.name ?? null;
    const isPaidTier = tierName && ['premium', 'elite', 'coffee_shop'].includes(tierName);

    let isRestaurantWeek = false;
    if (!isPaidTier) {
      const { count } = await serviceClient
        .from('holiday_specials')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant_id)
        .eq('holiday_tag', 'restaurant-week-2026');
      isRestaurantWeek = (count ?? 0) > 0;
    }

    const eligible = !!(isPaidTier || isRestaurantWeek);

    if (!eligible) {
      return NextResponse.json({ eligible: false, event: null, code: null });
    }

    // Check if a code has been assigned
    const { data: inviteCode } = await serviceClient
      .from('party_invite_codes')
      .select('id, code, use_limit, use_count, requested_headcount, channel, status, decline_reason')
      .eq('party_event_id', event.id)
      .eq('restaurant_id', restaurant_id)
      .single();

    const codeAssigned = inviteCode?.status === 'approved';
    const requestPending = inviteCode?.status === 'pending';
    const requestDeclined = inviteCode?.status === 'declined';

    return NextResponse.json({
      eligible: true,
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        venue: event.venue,
        address: event.address,
      },
      code: codeAssigned ? {
        code: inviteCode.code,
        use_limit: inviteCode.use_limit,
        use_count: inviteCode.use_count,
      } : null,
      request_pending: requestPending,
      request_declined: requestDeclined,
      decline_reason: requestDeclined ? (inviteCode.decline_reason ?? null) : null,
      requested_headcount: inviteCode?.requested_headcount ?? null,
    });
  } catch (err) {
    console.error('[party/restaurant-status] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
