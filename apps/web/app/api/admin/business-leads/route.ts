import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is admin
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const marketFilter = searchParams.get('market');
    const repFilter = searchParams.get('rep');

    // Determine effective market scope
    // market_admin can only see their market; super_admin can filter or see all
    const effectiveMarketId = admin.scopedMarketId || (marketFilter && marketFilter !== 'all' ? marketFilter : null);

    // Build query — use range to avoid Supabase 1000-row default limit
    let query = supabase
      .from('business_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 4999);

    if (effectiveMarketId) {
      query = query.eq('market_id', effectiveMarketId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (repFilter && repFilter !== 'all') {
      if (repFilter === 'unassigned') {
        query = query.is('assigned_to', null);
      } else {
        query = query.eq('assigned_to', repFilter);
      }
    }

    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Enrich leads with assigned rep names
    const assignedIds = Array.from(new Set((leads || []).filter((l: any) => l.assigned_to).map((l: any) => l.assigned_to)));
    let repNameMap: Record<string, string> = {};
    if (assignedIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', assignedIds);
      if (profiles) {
        for (const p of profiles) {
          repNameMap[p.id] = p.full_name || 'Unknown';
        }
      }
    }
    const enrichedLeads = (leads || []).map((lead: any) => ({
      ...lead,
      assigned_rep: lead.assigned_to ? { id: lead.assigned_to, full_name: repNameMap[lead.assigned_to] || 'Unknown' } : null,
    }));

    // Get stats — use count queries to avoid Supabase 1000-row default limit
    const statuses = ['new', 'contacted', 'interested', 'not_interested', 'converted'] as const;
    const statusCounts: Record<string, number> = {};
    let totalLeads = 0;

    const countResults = await Promise.all(
      statuses.map(async (s) => {
        let q = supabase.from('business_leads').select('id', { count: 'exact', head: true }).eq('status', s);
        if (effectiveMarketId) q = q.eq('market_id', effectiveMarketId);
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

    // Fetch available markets for the filter dropdown (super_admin only)
    let markets: { id: string; slug: string; name: string }[] = [];
    if (!admin.scopedMarketId) {
      const { data: marketRows } = await supabase
        .from('markets')
        .select('id, slug, name')
        .eq('is_active', true)
        .order('name');
      markets = marketRows || [];
    }

    // Fetch reps for the filter dropdown (scoped to effective market if applicable)
    let repsQuery = supabase
      .from('sales_reps')
      .select('user_id, profiles(id, full_name)')
      .eq('is_active', true);

    const { data: repRows } = await repsQuery;
    const reps = (repRows || [])
      .map((r: any) => ({
        id: r.user_id,
        name: r.profiles?.full_name || 'Unknown',
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json({
      leads: enrichedLeads,
      stats,
      markets,
      reps,
      isScopedAdmin: !!admin.scopedMarketId,
    });
  } catch (error) {
    console.error('Error in business leads API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is admin
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

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
      source,
      notes,
      tags,
      market_id,
    } = body;

    // Validate required fields
    if (!business_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: business_name, email' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existing } = await supabase
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

    // Create lead
    const { data: lead, error } = await supabase
      .from('business_leads')
      .insert({
        business_name,
        contact_name: contact_name || null,
        email,
        phone: phone || null,
        website: website || null,
        address: address || null,
        city: city || 'Lancaster',
        state: state || 'PA',
        zip_code: zip_code || null,
        category: category || 'restaurant',
        source: source || 'manual',
        notes: notes || null,
        tags: tags || [],
        status: 'new',
        market_id: market_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error in create lead API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
