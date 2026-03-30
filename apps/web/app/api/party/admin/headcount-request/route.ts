import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/party/admin/headcount-request — restaurant owner submits headcount from dashboard
export async function POST(request: Request) {
  try {
    const { restaurant_id, headcount } = await request.json();

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }
    if (!headcount || typeof headcount !== 'number' || headcount < 1 || headcount > 50) {
      return NextResponse.json({ error: 'headcount must be between 1 and 50' }, { status: 400 });
    }

    // Verify restaurant access
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
      .select('id')
      .eq('is_active', true)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'No active party event' }, { status: 404 });
    }

    // Check if a code already exists for this restaurant + event
    const { data: existing } = await serviceClient
      .from('party_invite_codes')
      .select('id, code, use_limit, requested_headcount')
      .eq('party_event_id', event.id)
      .eq('restaurant_id', restaurant_id)
      .single();

    if (existing) {
      // If declined, allow resubmission — reset to pending with new headcount
      // If already approved, do not allow changes
      if (existing.use_limit > 0) {
        return NextResponse.json({
          success: true,
          status: 'already_approved',
          message: 'Your invite code has already been approved.',
          code: existing.code,
        });
      }

      await serviceClient
        .from('party_invite_codes')
        .update({
          requested_headcount: headcount,
          status: 'pending',
          decline_reason: null,
          notes: `Resubmitted headcount request: ${headcount}`,
        })
        .eq('id', existing.id);

      return NextResponse.json({
        success: true,
        status: 'resubmitted',
        message: `Your updated request for ${headcount} spots has been submitted for review.`,
      });
    }

    // No code yet — store request as a pending code with use_limit=0 (signals "pending admin approval")
    const { data: inviteCode, error } = await serviceClient
      .from('party_invite_codes')
      .insert({
        party_event_id: event.id,
        restaurant_id,
        code: `PENDING-${restaurant_id.slice(0, 8).toUpperCase()}`,
        use_limit: 0,
        channel: 'dashboard',
        requested_headcount: headcount,
        notes: `Dashboard headcount request: ${headcount} staff`,
      })
      .select('id, requested_headcount')
      .single();

    if (error) {
      console.error('[party/headcount-request] insert error:', error);
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: 'pending',
      message: `Your request for ${headcount} spots has been submitted. We'll update your dashboard with the invite code shortly.`,
    });
  } catch (err) {
    console.error('[party/headcount-request] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
