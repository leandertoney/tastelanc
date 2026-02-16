import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { MARKET_SLUG } from '@/config/market';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Resolve market
    const { data: marketRow } = await serviceClient
      .from('markets').select('id').eq('slug', MARKET_SLUG).eq('is_active', true).single();
    if (!marketRow) {
      return NextResponse.json({ error: 'Market not found' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = serviceClient
      .from('restaurants')
      .select('id, name, city, state, phone, website, is_active, tier_id, tiers(name)')
      .eq('market_id', marketRow.id)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
    }

    const { data: restaurants, error } = await query;

    if (error) {
      console.error('Error fetching restaurants:', error);
      return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
    }

    return NextResponse.json({ restaurants: restaurants || [] });
  } catch (error) {
    console.error('Error in restaurants API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
