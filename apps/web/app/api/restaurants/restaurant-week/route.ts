import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/restaurants/restaurant-week
 * Returns all restaurants participating in Restaurant Week (have rw_description)
 * Sorted with TasteLanc first, then alphabetically, then "Other / Not Listed" last
 */
export async function GET() {
  try {
    const serviceClient = createServiceRoleClient();

    // Fetch all restaurants participating in Restaurant Week (have rw_description)
    // Custom ordering: TasteLanc first, then alphabetically, then "Other / Not Listed" last
    const { data: restaurants, error } = await serviceClient
      .from('restaurants')
      .select('id, name')
      .not('rw_description', 'is', null)
      .eq('is_active', true);

    if (error) {
      console.error('[restaurant-week] fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
    }

    const sorted = (restaurants || []).sort((a, b) => {
      if (a.name === 'TasteLanc User') return -1;
      if (b.name === 'TasteLanc User') return 1;
      if (a.name === 'The Lounge at Hempfield Apothetique') return -1;
      if (b.name === 'The Lounge at Hempfield Apothetique') return 1;
      if (a.name === 'TasteLanc') return -1;
      if (b.name === 'TasteLanc') return 1;
      if (a.name === 'Other / Not Listed') return 1;
      if (b.name === 'Other / Not Listed') return -1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ restaurants: sorted });
  } catch (err) {
    console.error('[restaurant-week] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
