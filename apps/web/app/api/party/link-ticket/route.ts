import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/party/link-ticket — auto-link an RSVP to an app user by email match
// Called from the mobile app after login/signup to check if the user has a pending ticket
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ linked: false });
    }

    const serviceClient = createServiceRoleClient();

    // Find unlinked "yes" RSVP matching this email
    const { data: rsvp, error } = await serviceClient
      .from('party_rsvps')
      .select('id, qr_token, name')
      .eq('email', user.email.toLowerCase())
      .eq('response', 'yes')
      .is('user_id', null)
      .limit(1)
      .single();

    if (error || !rsvp) {
      return NextResponse.json({ linked: false });
    }

    // Link the RSVP to this user
    const { error: updateError } = await serviceClient
      .from('party_rsvps')
      .update({ user_id: user.id })
      .eq('id', rsvp.id);

    if (updateError) {
      console.error('[party/link-ticket] update error:', updateError);
      return NextResponse.json({ linked: false });
    }

    return NextResponse.json({
      linked: true,
      qr_token: rsvp.qr_token,
      name: rsvp.name,
    });
  } catch (err) {
    console.error('[party/link-ticket] error:', err);
    return NextResponse.json({ linked: false });
  }
}
