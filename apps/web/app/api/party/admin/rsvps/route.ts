import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/party/admin/rsvps — admin view of all RSVPs (simplified, no codes)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile?.role || !['super_admin','co_founder','market_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    // Get active event
    const { data: event } = await serviceClient
      .from('party_events')
      .select('*')
      .eq('is_active', true)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (!event) {
      return NextResponse.json({ event: null, rsvps: [] });
    }

    // Get all RSVPs with direct restaurant + fallback invite_code restaurant
    const { data: rsvps } = await serviceClient
      .from('party_rsvps')
      .select(`
        id,
        name,
        email,
        qr_token,
        response,
        source,
        checked_in,
        checked_in_at,
        created_at,
        restaurant_id,
        restaurants (name),
        invite_code_id,
        party_invite_codes (
          code,
          restaurant_id,
          restaurants (name)
        )
      `)
      .eq('party_event_id', event.id)
      .order('created_at', { ascending: false });

    const allRsvps = rsvps ?? [];
    const yesRsvps = allRsvps.filter(r => r.response === 'yes');
    const checkedIn = allRsvps.filter(r => r.checked_in).length;

    return NextResponse.json({
      event: {
        ...event,
        rsvp_count: allRsvps.length,
        attending_count: yesRsvps.length,
        declined_count: allRsvps.length - yesRsvps.length,
        checked_in_count: checkedIn,
        spots_remaining: event.capacity ? event.capacity - yesRsvps.length : null,
      },
      rsvps: allRsvps,
    });
  } catch (err) {
    console.error('[party/admin/rsvps] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
