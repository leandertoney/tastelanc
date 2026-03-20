import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/party/admin/rsvps — admin view of all RSVPs + codes + headcount by restaurant
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
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
      return NextResponse.json({ event: null, codes: [], rsvps: [] });
    }

    // Get all invite codes with restaurant info
    const { data: codes } = await serviceClient
      .from('party_invite_codes')
      .select(`
        *,
        restaurants (
          id,
          name,
          tier_id,
          tiers ( name, display_name )
        )
      `)
      .eq('party_event_id', event.id)
      .order('created_at', { ascending: false });

    // Get all RSVPs
    const { data: rsvps } = await serviceClient
      .from('party_rsvps')
      .select(`
        id,
        name,
        qr_token,
        checked_in,
        checked_in_at,
        created_at,
        invite_code_id,
        party_invite_codes (
          code,
          restaurant_id,
          restaurants ( name )
        )
      `)
      .eq('party_event_id', event.id)
      .order('created_at', { ascending: false });

    const totalRsvps = rsvps?.length ?? 0;
    const checkedIn = rsvps?.filter(r => r.checked_in).length ?? 0;

    return NextResponse.json({
      event: {
        ...event,
        rsvp_count: totalRsvps,
        checked_in_count: checkedIn,
        spots_remaining: event.capacity ? event.capacity - totalRsvps : null,
      },
      codes: codes ?? [],
      rsvps: rsvps ?? [],
    });
  } catch (err) {
    console.error('[party/admin/rsvps] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
