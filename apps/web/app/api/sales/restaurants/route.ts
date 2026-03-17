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
    const hasContact = searchParams.get('has_contact');
    const skipClaimed = searchParams.get('skip_claimed') === '1';
    const marketFilterParam = searchParams.get('market');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const sortBy = searchParams.get('sort_by') || 'name';
    const sortDir = searchParams.get('sort_dir') === 'desc' ? 'desc' : 'asc';

    const ALLOWED_SORT_COLUMNS = ['name', 'city', 'is_active', 'created_at'];
    const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'name';

    // Fetch markets list for super_admin dropdown
    const { data: marketsData } = await serviceClient
      .from('markets')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name', { ascending: true });
    const marketsList = marketsData || [];

    // Market scoping helper — combines role-based + UI filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyMarketScope = (q: any) => {
      // UI market filter takes priority (if user has access)
      if (marketFilterParam && marketFilterParam !== 'all') {
        if (access.marketIds === null || access.marketIds.includes(marketFilterParam)) {
          return q.eq('market_id', marketFilterParam);
        }
      }
      // Default role-based scoping
      if (access.marketIds !== null && access.marketIds.length > 0) {
        if (access.marketIds.length === 1) return q.eq('market_id', access.marketIds[0]);
        return q.in('market_id', access.marketIds);
      }
      return q; // super_admin/co_founder — no filter
    };

    // For non-admin reps: get restaurant IDs claimed by OTHER reps (hide from search)
    // Skip this filter when skip_claimed=1 (e.g. meeting creation — linking ≠ claiming)
    let claimedRestaurantIds: string[] = [];
    if (!access.isAdmin && !skipClaimed && access.userId) {
      const { data: claimedLeads } = await serviceClient
        .from('business_leads')
        .select('restaurant_id')
        .not('assigned_to', 'is', null)
        .neq('assigned_to', access.userId)
        .not('status', 'in', '("not_interested","converted")')
        .not('restaurant_id', 'is', null);

      if (claimedLeads) {
        claimedRestaurantIds = Array.from(new Set(
          claimedLeads.map((l: any) => l.restaurant_id).filter(Boolean) as string[]
        ));
      }
    }

    // Helper to exclude claimed restaurants from a query
    const applyClaimedFilter = (q: any) => {
      if (claimedRestaurantIds.length > 0) {
        return q.not('id', 'in', `(${claimedRestaurantIds.join(',')})`);
      }
      return q;
    };

    // Normalize search for apostrophe/hyphen-tolerant matching
    const normalizedSearch = search ? search.toLowerCase().replace(/['''\-]/g, '') : null;

    // Build count query with same filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let countQ: any = serviceClient.from('restaurants').select('id', { count: 'exact', head: true });
    countQ = applyMarketScope(countQ);
    countQ = applyClaimedFilter(countQ);
    if (search) countQ = countQ.or(`name.ilike.%${search}%,city.ilike.%${search}%,name_normalized.ilike.%${normalizedSearch}%`);
    if (active === 'true') countQ = countQ.eq('is_active', true);
    if (active === 'false') countQ = countQ.eq('is_active', false);
    if (hasContact === 'true') countQ = countQ.not('contact_name', 'is', null);
    const { count: totalCount } = await countQ;

    // Build paginated data query
    let query = serviceClient
      .from('restaurants')
      .select('id, name, city, state, phone, website, is_active, tier_id, tiers(name), contact_name, contact_phone, contact_email, contact_title, address, zip_code, categories, market_id, business_email, instagram_handle')
      .order(safeSortBy, { ascending: sortDir === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    query = applyMarketScope(query);
    query = applyClaimedFilter(query);

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,name_normalized.ilike.%${normalizedSearch}%`);
    }

    if (active === 'true') {
      query = query.eq('is_active', true);
    } else if (active === 'false') {
      query = query.eq('is_active', false);
    }

    if (hasContact === 'true') {
      query = query.not('contact_name', 'is', null);
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

    // Get stats — use count queries to avoid Supabase 1000-row default limit
    const [totalRes, activeRes, contactRes] = await Promise.all([
      (async () => {
        let q = serviceClient.from('restaurants').select('id', { count: 'exact', head: true });
        q = applyMarketScope(q);
        const { count } = await q;
        return count ?? 0;
      })(),
      (async () => {
        let q = serviceClient.from('restaurants').select('id', { count: 'exact', head: true }).eq('is_active', true);
        q = applyMarketScope(q);
        const { count } = await q;
        return count ?? 0;
      })(),
      (async () => {
        let q = serviceClient.from('restaurants').select('id', { count: 'exact', head: true }).not('contact_name', 'is', null);
        q = applyMarketScope(q);
        const { count } = await q;
        return count ?? 0;
      })(),
    ]);

    const stats = {
      total: totalRes,
      active: activeRes,
      direct_contacts: contactRes,
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
      isSuperAdmin: access.marketIds === null,
      pagination: { page, limit, total, totalPages },
      markets: marketsList,
    });
  } catch (error) {
    console.error('Error in restaurants API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
