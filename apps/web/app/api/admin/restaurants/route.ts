export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify user is admin
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    // Fetch restaurants — super_admin sees all, market_admin sees only their market
    let query = supabase
      .from('restaurants')
      .select('id, name, city, state, owner_id')
      .order('name', { ascending: true });

    if (admin.scopedMarketId) {
      query = query.eq('market_id', admin.scopedMarketId);
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
