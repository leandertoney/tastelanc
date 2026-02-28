import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { STALE_DAYS } from '@/lib/utils/lead-aging';

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortDir = searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc';

    const ALLOWED_SORT_COLUMNS = ['business_name', 'contact_name', 'status', 'category', 'city', 'created_at', 'last_contacted_at'];
    const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'created_at';

    // Stale cutoff for sales rep visibility scoping
    const staleCutoff = new Date();
    staleCutoff.setDate(staleCutoff.getDate() - STALE_DAYS);
    const staleCutoffStr = staleCutoff.toISOString();

    // Get total count for pagination (with same filters + visibility scope)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let countQ: any = serviceClient.from('business_leads').select('id', { count: 'exact', head: true });
    if (access.isSalesRep && !access.isAdmin) {
      countQ = countQ.or(`assigned_to.eq.${access.userId},assigned_to.is.null,updated_at.lt.${staleCutoffStr}`);
    }
    if (status && status !== 'all') countQ = countQ.eq('status', status);
    if (category && category !== 'all') countQ = countQ.eq('category', category);
    if (search) countQ = countQ.or(`business_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
    const { count: totalCount } = await countQ;

    // Build paginated query
    let query = serviceClient
      .from('business_leads')
      .select('*')
      .order(safeSortBy, { ascending: sortDir === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    // Scope visibility for sales reps (not admins)
    if (access.isSalesRep && !access.isAdmin) {
      // Show: assigned to me, unassigned, or stale (updated > 14 days ago)
      query = query.or(
        `assigned_to.eq.${access.userId},assigned_to.is.null,updated_at.lt.${staleCutoffStr}`
      );
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
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

    // Get stats — scoped to visible leads for sales reps, global for admins
    let statsQuery = serviceClient
      .from('business_leads')
      .select('status');
    if (access.isSalesRep && !access.isAdmin) {
      statsQuery = statsQuery.or(`assigned_to.eq.${access.userId},assigned_to.is.null,updated_at.lt.${staleCutoffStr}`);
    }
    const { data: allLeads } = await statsQuery;

    const stats = {
      total: allLeads?.length || 0,
      new: allLeads?.filter((l) => l.status === 'new').length || 0,
      contacted: allLeads?.filter((l) => l.status === 'contacted').length || 0,
      interested: allLeads?.filter((l) => l.status === 'interested').length || 0,
      notInterested: allLeads?.filter((l) => l.status === 'not_interested').length || 0,
      converted: allLeads?.filter((l) => l.status === 'converted').length || 0,
    };

    // Fetch sales rep names for assigned_to lookup
    const { data: reps } = await serviceClient
      .from('sales_reps')
      .select('id, name');
    const repNameMap: Record<string, string> = {};
    if (reps) {
      for (const rep of reps) {
        repNameMap[rep.id] = rep.name;
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

    return NextResponse.json({
      leads: leadsWithActivities,
      stats,
      currentUserId: access.userId,
      isAdmin: access.isAdmin,
      pagination: { page, limit, total, totalPages },
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

    // If restaurant_id provided, verify it exists
    if (restaurant_id) {
      const { data: restaurant } = await serviceClient
        .from('restaurants')
        .select('id')
        .eq('id', restaurant_id)
        .single();

      if (!restaurant) {
        return NextResponse.json(
          { error: 'Linked restaurant not found' },
          { status: 400 }
        );
      }
    }

    // Determine source based on linking
    const source = restaurant_id ? 'directory' : google_place_id ? 'google_places' : 'manual';

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
        market_id: market_id || null,
        assigned_to: access.isSalesRep ? access.userId : null,
        restaurant_id: restaurant_id || null,
        google_place_id: google_place_id || null,
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
