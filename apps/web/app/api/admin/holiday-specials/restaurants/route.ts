import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = createServiceRoleClient();

    // Fetch ALL active restaurants with no row limit.
    // Supabase caps individual queries at 1000 rows by default,
    // so we paginate until every restaurant is loaded.
    const PAGE_SIZE = 1000;
    let allRestaurants: { id: string; name: string; market_id: string }[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await svc
        .from('restaurants')
        .select('id, name, market_id')
        .eq('is_active', true)
        .order('name')
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
      }

      allRestaurants = allRestaurants.concat(data || []);

      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return NextResponse.json({ restaurants: allRestaurants });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
