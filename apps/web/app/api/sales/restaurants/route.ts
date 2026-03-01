import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tier = searchParams.get('tier');
    const active = searchParams.get('active');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const sortBy = searchParams.get('sort_by') || 'name';
    const sortDir = searchParams.get('sort_dir') === 'desc' ? 'desc' : 'asc';

    const ALLOWED_SORT_COLUMNS = ['name', 'city', 'is_active', 'created_at'];
    const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'name';

    // Market scoping helper
    const applyMarketScope = (q: any) => {
      if (access.marketIds !== null && access.marketIds.length > 0) {
        if (access.marketIds.length === 1) return q.eq('market_id', access.marketIds[0]);
        return q.in('market_id', access.marketIds);
      }
      return q; // super_admin/co_founder — no filter
    };

    // Build count query with same filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let countQ: any = serviceClient.from('restaurants').select('id', { count: 'exact', head: true });
    countQ = applyMarketScope(countQ);
    if (search) countQ = countQ.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
    if (active === 'true') countQ = countQ.eq('is_active', true);
    if (active === 'false') countQ = countQ.eq('is_active', false);
    const { count: totalCount } = await countQ;

    // Build paginated data query
    let query = serviceClient
      .from('restaurants')
      .select('id, name, city, state, phone, website, is_active, tier_id, tiers(name)')
      .order(safeSortBy, { ascending: sortDir === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    query = applyMarketScope(query);

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
    }

    if (active === 'true') {
      query = query.eq('is_active', true);
    } else if (active === 'false') {
      query = query.eq('is_active', false);
    }

    const { data: restaurants, error } = await query;

    if (error) {
      console.error('Error fetching restaurants:', error);
      return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
    }

    // Filter by tier name client-side (tier is a joined field)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filtered: any[] = restaurants || [];
    if (tier && tier !== 'all') {
      filtered = filtered.filter((r: any) => r.tiers?.name === tier);
    }

    // Get stats — scoped same as main query
    let statsQuery = serviceClient
      .from('restaurants')
      .select('is_active, tiers(name)');
    statsQuery = applyMarketScope(statsQuery);
    const { data: allRestaurants } = await statsQuery;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allR: any[] = allRestaurants || [];
    const stats = {
      total: allR.length,
      active: allR.filter((r) => r.is_active).length,
      inactive: allR.filter((r) => !r.is_active).length,
      elite: allR.filter((r) => r.tiers?.name === 'elite').length,
      premium: allR.filter((r) => r.tiers?.name === 'premium').length,
      standard: allR.filter((r) => r.tiers?.name === 'standard').length,
    };

    // Check which restaurants already have leads
    const restaurantIds = filtered.map((r: any) => r.id);
    let leadMap: Record<string, boolean> = {};
    if (restaurantIds.length > 0) {
      const { data: existingLeads } = await serviceClient
        .from('business_leads')
        .select('restaurant_id')
        .in('restaurant_id', restaurantIds);
      if (existingLeads) {
        for (const l of existingLeads) {
          if (l.restaurant_id) leadMap[l.restaurant_id] = true;
        }
      }
    }

    const restaurantsWithLeadStatus = filtered.map((r: any) => ({
      ...r,
      has_lead: !!leadMap[r.id],
    }));

    const total = totalCount ?? 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      restaurants: restaurantsWithLeadStatus,
      stats,
      isAdmin: access.isAdmin,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error('Error in restaurants API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
