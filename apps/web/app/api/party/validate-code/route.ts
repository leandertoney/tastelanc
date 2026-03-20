import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/party/validate-code — check if a code is valid and has uses remaining
export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    const { data: inviteCode, error } = await serviceClient
      .from('party_invite_codes')
      .select(`
        id,
        code,
        use_limit,
        use_count,
        party_event_id,
        party_events (
          id,
          name,
          date,
          venue,
          address,
          is_active
        )
      `)
      .eq('code', code.trim().toUpperCase())
      .single();

    if (error || !inviteCode) {
      return NextResponse.json({ valid: false, error: 'Invalid invite code' }, { status: 404 });
    }

    const event = Array.isArray(inviteCode.party_events)
      ? inviteCode.party_events[0]
      : inviteCode.party_events;

    if (!event?.is_active) {
      return NextResponse.json({ valid: false, error: 'This event is no longer active' }, { status: 400 });
    }

    if (inviteCode.use_count >= inviteCode.use_limit) {
      return NextResponse.json({
        valid: false,
        error: `All ${inviteCode.use_limit} spot${inviteCode.use_limit === 1 ? '' : 's'} for this code have been claimed`,
      }, { status: 400 });
    }

    const spotsRemaining = inviteCode.use_limit - inviteCode.use_count;

    return NextResponse.json({
      valid: true,
      invite_code_id: inviteCode.id,
      spots_remaining: spotsRemaining,
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        venue: event.venue,
        address: event.address,
      },
    });
  } catch (err) {
    console.error('[party/validate-code] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
