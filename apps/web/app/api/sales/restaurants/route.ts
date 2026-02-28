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

    // Resolve market — admins can optionally see all markets
    const { data: marketRow } = await serviceClient
      .from('markets').select('id').eq('slug', MARKET_SLUG).eq('is_active', true).single();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tier = searchParams.get('tier');
    const active = searchParams.get('active');
    const marketFilter = searchParams.get('market'); // 'all' for admins to see everything
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const sortBy = searchParams.get('sort_by') || 'name';
    const sortDir = searchParams.get('sort_dir') === 'desc' ? 'desc' : 'asc';

    const ALLOWED_SORT_COLUMNS = ['name', 'city', 'is_active', 'created_at'];
    const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'name';

    // Admins see all restaurants; sales reps see only their market
    const scopeToMarket = !access.isAdmin || (marketFilter && marketFilter !== 'all');

    // Build count query with same filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let countQ: any = serviceClient.from('restaurants').select('id', { count: 'exact', head: true });
    if (scopeToMarket && marketRow) countQ = countQ.eq('market_id', marketRow.id);
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

    if (scopeToMarket && marketRow) {
      query = query.eq('market_id', marketRow.id);
    }

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
    if (scopeToMarket && marketRow) {
      statsQuery = statsQuery.eq('market_id', marketRow.id);
    }
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
