import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/restaurants/restaurant-week
 * Returns all restaurants participating in Restaurant Week (have rw_description)
 * Sorted alphabetically by name
 */
export async function GET() {
  try {
    const serviceClient = createServiceRoleClient();

    // Fetch all restaurants participating in Restaurant Week (have rw_description)
    const { data: restaurants, error } = await serviceClient
      .from('restaurants')
      .select('id, name')
      .not('rw_description', 'is', null)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('[restaurant-week] fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
    }

    return NextResponse.json({ restaurants: restaurants || [] });
  } catch (err) {
    console.error('[restaurant-week] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
