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

    // Fetch ALL restaurants — service role bypasses 1000-row default limit
    // super_admin sees all markets, market_admin sees only their market(s)
    let query = serviceClient
      .from('restaurants')
      .select('id, name, city, state, owner_id')
      .order('name', { ascending: true })
      .limit(10000);

    if (admin.scopedMarketIds) {
      query = query.in('market_id', admin.scopedMarketIds);
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
