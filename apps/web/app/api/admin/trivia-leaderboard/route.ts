import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const svc = createServiceRoleClient();
  const { data: profile } = await svc
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const adminRoles = ['admin', 'super_admin', 'co_founder'];
  if (!profile || !adminRoles.includes(profile.role)) return null;
  return user;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('market_id');

    const svc = createServiceRoleClient();
    let query = svc
      .from('trivia_leaderboard_entries')
      .select('*')
      .order('week_start', { ascending: false })
      .order('position', { ascending: true });

    if (marketId) query = query.eq('market_id', marketId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ entries: data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { week_start, nightly_date, player_name, score, venue_name, position, is_winner, prize_description, market_id } = body;

    if (!week_start || !player_name || !venue_name) {
      return NextResponse.json({ error: 'week_start, player_name, and venue_name are required' }, { status: 400 });
    }

    const svc = createServiceRoleClient();
    const { data, error } = await svc
      .from('trivia_leaderboard_entries')
      .insert({
        week_start,
        nightly_date: nightly_date || null,
        player_name,
        score: score ?? 0,
        venue_name,
        position: position ?? 1,
        is_winner: is_winner ?? false,
        prize_description: prize_description || null,
        market_id: market_id || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const svc = createServiceRoleClient();
    const { data, error } = await svc
      .from('trivia_leaderboard_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const svc = createServiceRoleClient();
    const { error } = await svc.from('trivia_leaderboard_entries').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
