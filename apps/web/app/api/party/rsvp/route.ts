import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/party/rsvp — simplified: name + email + yes/no response (no invite codes)
export async function POST(request: Request) {
  try {
    const { name, email, event_id, response, restaurant_id, source } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'name is required (minimum 2 characters)' }, { status: 400 });
    }

    const rsvpResponse = response ?? 'yes';
    if (!['yes', 'no'].includes(rsvpResponse)) {
      return NextResponse.json({ error: 'response must be "yes" or "no"' }, { status: 400 });
    }

    // Email required for "yes" RSVPs (needed for ticket auto-linking)
    if (rsvpResponse === 'yes' && (!email || typeof email !== 'string' || !email.includes('@'))) {
      return NextResponse.json({ error: 'email is required to receive your ticket' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Resolve event_id — use provided or find active event
    let partyEventId = event_id;
    if (!partyEventId) {
      const { data: activeEvent } = await serviceClient
        .from('party_events')
        .select('id, capacity')
        .eq('is_active', true)
        .order('date', { ascending: true })
        .limit(1)
        .single();

      if (!activeEvent) {
        return NextResponse.json({ error: 'No active event found' }, { status: 404 });
      }
      partyEventId = activeEvent.id;

      // Check capacity for "yes" responses
      if (rsvpResponse === 'yes' && activeEvent.capacity) {
        const { count } = await serviceClient
          .from('party_rsvps')
          .select('id', { count: 'exact', head: true })
          .eq('party_event_id', partyEventId)
          .eq('response', 'yes');

        if ((count ?? 0) >= activeEvent.capacity) {
          return NextResponse.json({ error: 'This event is at capacity' }, { status: 409 });
        }
      }
    }

    // Check for duplicate email on this event
    if (email) {
      const { data: existing } = await serviceClient
        .from('party_rsvps')
        .select('id, qr_token, response')
        .eq('party_event_id', partyEventId)
        .eq('email', email.trim().toLowerCase())
        .limit(1)
        .single();

      if (existing) {
        // Already RSVPed — return their existing ticket instead of creating a duplicate
        return NextResponse.json({
          success: true,
          already_registered: true,
          rsvp_id: existing.id,
          response: existing.response,
          qr_token: existing.response === 'yes' ? existing.qr_token : undefined,
        });
      }
    }

    // Get the current user (optional — web RSVPs won't have a session)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Create the RSVP row
    const { data: rsvp, error: rsvpError } = await serviceClient
      .from('party_rsvps')
      .insert({
        party_event_id: partyEventId,
        invite_code_id: null,
        user_id: user?.id ?? null,
        name: name.trim(),
        email: email?.trim().toLowerCase() ?? null,
        response: rsvpResponse,
        restaurant_id: restaurant_id ?? null,
        source: source ?? 'link',
      })
      .select('id, name, qr_token, response')
      .single();

    if (rsvpError || !rsvp) {
      console.error('[party/rsvp] insert error:', rsvpError);
      return NextResponse.json({ error: 'Failed to create RSVP' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rsvp_id: rsvp.id,
      name: rsvp.name,
      response: rsvp.response,
      // Only return qr_token for "yes" responses (they get a ticket)
      qr_token: rsvp.response === 'yes' ? rsvp.qr_token : undefined,
    });
  } catch (err) {
    console.error('[party/rsvp] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
