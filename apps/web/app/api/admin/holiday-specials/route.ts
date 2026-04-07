import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function verifyAdmin(supabase: ReturnType<typeof createServiceRoleClient>) {
  const { data: { user } } = await (supabase as any).auth.getUser();
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
    const { searchParams } = new URL(request.url);
    const holidayTag = searchParams.get('holiday_tag') || 'st-patricks-2026';
    const marketId = searchParams.get('market_id');

    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = createServiceRoleClient();

    // If market_id is a slug (not a UUID), look up the actual UUID
    let marketUuid = marketId;
    if (marketId && !marketId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: market } = await svc
        .from('markets')
        .select('id')
        .eq('slug', marketId)
        .single();
      marketUuid = market?.id || null;
    }

    let query = svc
      .from('holiday_specials')
      .select(`
        *,
        restaurant:restaurants!inner(id, name, cover_image_url, market_id, rw_description)
      `)
      .eq('holiday_tag', holidayTag)
      .order('created_at', { ascending: false });

    if (marketUuid) {
      query = query.eq('restaurant.market_id', marketUuid);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching holiday specials:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json({ specials: data || [] });
  } catch (error) {
    console.error('Holiday specials GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      restaurant_id,
      holiday_tag,
      name,
      description,
      category,
      event_date,
      start_time,
      end_time,
      original_price,
      special_price,
      discount_description,
      image_url,
    } = body;

    if (!restaurant_id || !name || !holiday_tag || !event_date) {
      return NextResponse.json(
        { error: 'restaurant_id, name, holiday_tag, and event_date are required' },
        { status: 400 }
      );
    }

    const svc = createServiceRoleClient();
    const { data, error } = await svc
      .from('holiday_specials')
      .insert({
        restaurant_id,
        holiday_tag,
        name,
        description: description || null,
        category: category || 'drink',
        event_date,
        start_time: start_time || null,
        end_time: end_time || null,
        original_price: original_price || null,
        special_price: special_price || null,
        discount_description: discount_description || null,
        image_url: image_url || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating holiday special:', error);
      return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }

    return NextResponse.json({ special: data }, { status: 201 });
  } catch (error) {
    console.error('Holiday specials POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = createServiceRoleClient();
    const { error } = await svc
      .from('holiday_specials')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting holiday special:', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Holiday specials DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const svc = createServiceRoleClient();
    const { data, error } = await svc
      .from('holiday_specials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating holiday special:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ special: data });
  } catch (error) {
    console.error('Holiday specials PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
