import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/party/rsvp — consume one use from a code and create a party_rsvp row
export async function POST(request: Request) {
  try {
    const { code, name } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'name is required (minimum 2 characters)' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Re-validate the code atomically using a select-for-update pattern
    const { data: inviteCode, error: codeError } = await serviceClient
      .from('party_invite_codes')
      .select('id, use_limit, use_count, party_event_id')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (codeError || !inviteCode) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    if (inviteCode.use_count >= inviteCode.use_limit) {
      return NextResponse.json({
        error: `All spots for this code have been claimed`,
      }, { status: 409 });
    }

    // Get the current user (optional — staff may not have an account)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Increment use_count
    const { error: updateError } = await serviceClient
      .from('party_invite_codes')
      .update({ use_count: inviteCode.use_count + 1 })
      .eq('id', inviteCode.id)
      .eq('use_count', inviteCode.use_count); // optimistic lock: only update if unchanged

    if (updateError) {
      // Another request got there first — retry message
      return NextResponse.json({ error: 'Could not claim spot, please try again' }, { status: 409 });
    }

    // Create the RSVP row
    const { data: rsvp, error: rsvpError } = await serviceClient
      .from('party_rsvps')
      .insert({
        party_event_id: inviteCode.party_event_id,
        invite_code_id: inviteCode.id,
        user_id: user?.id ?? null,
        name: name.trim(),
      })
      .select('id, name, qr_token, party_event_id')
      .single();

    if (rsvpError || !rsvp) {
      console.error('[party/rsvp] rsvp insert error:', rsvpError);
      return NextResponse.json({ error: 'Failed to create RSVP' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rsvp_id: rsvp.id,
      name: rsvp.name,
      qr_token: rsvp.qr_token,
    });
  } catch (err) {
    console.error('[party/rsvp] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
