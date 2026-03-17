import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


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
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const assignedTo = searchParams.get('assigned_to');
    const marketFilter = searchParams.get('market');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortDir = searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc';

    const ALLOWED_SORT_COLUMNS = ['business_name', 'contact_name', 'status', 'category', 'city', 'created_at', 'last_contacted_at'];
    const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'created_at';

    // Fetch markets list for super_admin dropdown
    const { data: marketsData } = await serviceClient
      .from('markets')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name', { ascending: true });
    const marketsList = marketsData || [];

    // Helper: apply market scoping to a query
    // Combines role-based scoping (access.marketIds) with optional UI filter (marketFilter)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyMarketScope = (q: any) => {
      // If a specific market is selected in the UI filter, use that (if allowed)
      if (marketFilter && marketFilter !== 'all') {
        // For scoped users, verify they have access to this market
        if (access.marketIds === null || access.marketIds.includes(marketFilter)) {
          return q.eq('market_id', marketFilter);
        }
        // If they don't have access, fall through to role-based scoping
      }
      // Default role-based scoping
      if (access.marketIds !== null && access.marketIds.length > 0) {
        if (access.marketIds.length === 1) {
          return q.eq('market_id', access.marketIds[0]);
        }
        return q.in('market_id', access.marketIds);
      }
      return q;
    };

    // Get total count for pagination (with same filters + market scope)
    // Sales reps can see ALL leads in their market (for transparency / incentivization)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let countQ: any = serviceClient.from('business_leads').select('id', { count: 'exact', head: true });
    countQ = applyMarketScope(countQ);
    if (status && status !== 'all') countQ = countQ.eq('status', status);
    if (category && category !== 'all') countQ = countQ.eq('category', category);
    if (assignedTo === 'unassigned') countQ = countQ.is('assigned_to', null);
    else if (assignedTo) countQ = countQ.eq('assigned_to', assignedTo);
    if (search) countQ = countQ.or(`business_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
    const { count: totalCount } = await countQ;

    // Build paginated query — always join restaurants so callers can use restaurant name
    let query = serviceClient
      .from('business_leads')
      .select('*, restaurants(id, name)')
      .order(safeSortBy, { ascending: sortDir === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    // Market scoping (role-based + UI filter)
    query = applyMarketScope(query);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (assignedTo === 'unassigned') {
      query = query.is('assigned_to', null);
    } else if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    // Get stats — use count queries to avoid Supabase 1000-row default limit
    const statuses = ['new', 'contacted', 'interested', 'not_interested', 'converted'] as const;
    const statusCounts: Record<string, number> = {};
    let totalLeads = 0;

    // Run all count queries in parallel
    const countResults = await Promise.all(
      statuses.map(async (s) => {
        let q = serviceClient.from('business_leads').select('id', { count: 'exact', head: true }).eq('status', s);
        q = applyMarketScope(q);
        const { count } = await q;
        return { status: s, count: count ?? 0 };
      })
    );
    for (const r of countResults) {
      statusCounts[r.status] = r.count;
      totalLeads += r.count;
    }

    const stats = {
      total: totalLeads,
      new: statusCounts['new'] || 0,
      contacted: statusCounts['contacted'] || 0,
      interested: statusCounts['interested'] || 0,
      notInterested: statusCounts['not_interested'] || 0,
      converted: statusCounts['converted'] || 0,
    };

    // Fetch sales rep names for assigned_to lookup
    // Market-scoped: only show reps in the user's market(s)
    const { data: allReps } = await serviceClient
      .from('sales_reps')
      .select('id, name, market_ids');
    // Filter reps by market: if a market is selected in UI, show only reps in that market
    // Otherwise fall back to role-based scoping
    const reps = allReps?.filter((rep) => {
      if (!rep.market_ids || rep.market_ids.length === 0) return false;
      // If specific market selected in UI, filter reps to that market
      if (marketFilter && marketFilter !== 'all') {
        return rep.market_ids.includes(marketFilter);
      }
      // Role-based: super admins see all, scoped users see their market's reps
      if (!access.marketIds) return true;
      return rep.market_ids.some((mid: string) => access.marketIds!.includes(mid));
    }) || [];
    const repNameMap: Record<string, string> = {};
    for (const rep of reps) {
      repNameMap[rep.id] = rep.name;
    }

    // Also resolve names for admins assigned to leads (not in sales_reps)
    const assignedIds = Array.from(new Set(
      (leads || []).map((l: { assigned_to: string | null }) => l.assigned_to).filter(Boolean) as string[]
    ));
    const missingIds = assignedIds.filter((id) => !repNameMap[id]);
    if (missingIds.length > 0) {
      const { data: profiles } = await serviceClient
        .from('profiles')
        .select('id, display_name, email')
        .in('id', missingIds);
      if (profiles) {
        for (const p of profiles) {
          repNameMap[p.id] = p.display_name || p.email || 'Unknown';
        }
      }
    }

    // Fetch activity types per lead for contact indicators
    const leadIds = (leads || []).map((l: { id: string }) => l.id);
    let activityMap: Record<string, string[]> = {};

    if (leadIds.length > 0) {
      const { data: activities } = await serviceClient
        .from('lead_activities')
        .select('lead_id, activity_type')
        .in('lead_id', leadIds)
        .neq('activity_type', 'status_change');

      if (activities) {
        for (const a of activities) {
          if (!activityMap[a.lead_id]) activityMap[a.lead_id] = [];
          if (!activityMap[a.lead_id].includes(a.activity_type)) {
            activityMap[a.lead_id].push(a.activity_type);
          }
        }
      }
    }

    // Attach activity_types and assigned_to_name to each lead
    const leadsWithActivities = (leads || []).map((lead: { id: string; assigned_to: string | null }) => ({
      ...lead,
      activity_types: activityMap[lead.id] || [],
      assigned_to_name: lead.assigned_to ? repNameMap[lead.assigned_to] || null : null,
    }));

    const total = totalCount ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Build reps list for filter dropdown
    const repsList = reps ? reps.map((r) => ({ id: r.id, name: r.name })) : [];

    return NextResponse.json({
      leads: leadsWithActivities,
      stats,
      currentUserId: access.userId,
      isAdmin: access.isAdmin,
      isSuperAdmin: access.marketIds === null,
      pagination: { page, limit, total, totalPages },
      reps: repsList,
      markets: marketsList,
    });
  } catch (error) {
    console.error('Error in sales leads API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const body = await request.json();
    const {
      business_name,
      contact_name,
      email,
      phone,
      website,
      address,
      city,
      state,
      zip_code,
      category,
      notes,
      tags,
      market_id,
      restaurant_id,
      google_place_id,
      contact_phone,
      contact_email,
      contact_title,
    } = body;

    if (!business_name) {
      return NextResponse.json(
        { error: 'Missing required field: business_name' },
        { status: 400 }
      );
    }

    // Check if email already exists (only if email provided)
    if (email) {
      const { data: existing } = await serviceClient
        .from('business_leads')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'A lead with this email already exists' },
          { status: 409 }
        );
      }
    }

    // If restaurant_id provided, verify it exists and capture contact_name for direct contact check
    let linkedRestaurantContactName: string | null = null;
    if (restaurant_id) {
      const { data: restaurant } = await serviceClient
        .from('restaurants')
        .select('id, contact_name')
        .eq('id', restaurant_id)
        .single();

      if (!restaurant) {
        return NextResponse.json(
          { error: 'Linked restaurant not found' },
          { status: 400 }
        );
      }
      linkedRestaurantContactName = restaurant.contact_name || null;
    }

    // Determine source based on linking
    const source = restaurant_id ? 'directory' : google_place_id ? 'google_places' : 'manual';

    // Enforce per-rep limit on direct contact leads only — restaurants with a named contact from the enriched scrape
    const MAX_DIRECT_CONTACT_LEADS_PER_REP = 10;
    if (source === 'directory' && linkedRestaurantContactName && access.isSalesRep && !access.isAdmin && access.userId) {
      // Get active directory leads for this rep
      const { data: existingLeads } = await serviceClient
        .from('business_leads')
        .select('restaurant_id')
        .eq('assigned_to', access.userId)
        .eq('source', 'directory')
        .in('status', ['new', 'contacted', 'interested'])
        .not('restaurant_id', 'is', null);

      if (existingLeads && existingLeads.length > 0) {
        const rIds = existingLeads.map((l: { restaurant_id: string }) => l.restaurant_id);
        const { count: directCount } = await serviceClient
          .from('restaurants')
          .select('id', { count: 'exact', head: true })
          .in('id', rIds)
          .not('contact_name', 'is', null);

        if (directCount !== null && directCount >= MAX_DIRECT_CONTACT_LEADS_PER_REP) {
          return NextResponse.json(
            { error: `You can work up to ${MAX_DIRECT_CONTACT_LEADS_PER_REP} direct contact leads at a time. Close or convert existing ones to claim more.` },
            { status: 429 }
          );
        }
      }
    }

    // Auto-assign market_id: explicit > restaurant's market > rep's market
    let resolvedMarketId = market_id || null;
    if (!resolvedMarketId && restaurant_id) {
      const { data: restaurant } = await serviceClient
        .from('restaurants')
        .select('market_id')
        .eq('id', restaurant_id)
        .single();
      if (restaurant?.market_id) resolvedMarketId = restaurant.market_id;
    }
    if (!resolvedMarketId && access.marketIds && access.marketIds.length === 1) {
      resolvedMarketId = access.marketIds[0];
    }

    // Create lead, auto-assign to the creating sales rep
    const { data: lead, error } = await serviceClient
      .from('business_leads')
      .insert({
        business_name,
        contact_name: contact_name || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        address: address || null,
        city: city || 'Lancaster',
        state: state || 'PA',
        zip_code: zip_code || null,
        category: category || 'restaurant',
        source,
        notes: notes || null,
        tags: tags || [],
        status: 'new',
        market_id: resolvedMarketId,
        assigned_to: access.userId || null,
        restaurant_id: restaurant_id || null,
        google_place_id: google_place_id || null,
        contact_phone: contact_phone || null,
        contact_email: contact_email || null,
        contact_title: contact_title || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error in create lead API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
