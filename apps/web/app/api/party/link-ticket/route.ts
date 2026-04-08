import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/party/link-ticket — auto-link an RSVP to an app user by email match
// Called from the mobile app after login/signup to check if the user has a pending ticket
// Supports both cookie auth (web) and Bearer token auth (mobile)
export async function POST(request: Request) {
  try {
    let userEmail: string | undefined;
    let userId: string | undefined;

    // Try Bearer token auth first (mobile app)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await client.auth.getUser(token);
      userEmail = user?.email;
      userId = user?.id;
    }

    // Fallback to cookie auth (web)
    if (!userEmail) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email;
      userId = user?.id;
    }

    if (!userEmail || !userId) {
      return NextResponse.json({ linked: false });
    }

    const serviceClient = createServiceRoleClient();

    // Find unlinked "yes" RSVP matching this email
    const { data: rsvp, error } = await serviceClient
      .from('party_rsvps')
      .select('id, qr_token, name')
      .eq('email', userEmail.toLowerCase())
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
      .update({ user_id: userId })
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
