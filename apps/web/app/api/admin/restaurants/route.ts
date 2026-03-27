export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify user is admin
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    const serviceClient = createServiceRoleClient();

    // Fetch ALL restaurants using pagination to bypass Supabase's 1000-row hard cap
    const PAGE_SIZE = 1000;
    let allRestaurants: { id: string; name: string; city: string; state: string; owner_id: string }[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      let query = serviceClient
        .from('restaurants')
        .select('id, name, city, state, owner_id')
        .order('name', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (admin.scopedMarketIds) {
        query = query.in('market_id', admin.scopedMarketIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching restaurants:', error);
        return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
      }

      allRestaurants = allRestaurants.concat(data || []);
      hasMore = (data?.length ?? 0) === PAGE_SIZE;
      from += PAGE_SIZE;
    }

    return NextResponse.json({ restaurants: allRestaurants });
  } catch (error) {
    console.error('Error in restaurants API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
