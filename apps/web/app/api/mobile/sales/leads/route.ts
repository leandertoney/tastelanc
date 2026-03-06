import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { verifySalesAccess } from '@/lib/auth/sales-access';

export async function GET(request: Request) {
  try {
    const supabase = createMobileClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const rawSearch = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Sanitize search input — strip characters that could break PostgREST .or() filter syntax
    const search = rawSearch ? rawSearch.replace(/[%,().;'"\\]/g, '') : null;

    // Count query with market scoping
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let countQ: any = serviceClient.from('business_leads').select('id', { count: 'exact', head: true });
    if (access.marketIds !== null && access.marketIds.length > 0) {
      countQ = access.marketIds.length === 1
        ? countQ.eq('market_id', access.marketIds[0])
        : countQ.in('market_id', access.marketIds);
    }
    if (status && status !== 'all') countQ = countQ.eq('status', status);
    if (search) countQ = countQ.or(`business_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
    const { count: totalCount } = await countQ;

    // Main query
    let query = serviceClient
      .from('business_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (access.marketIds !== null && access.marketIds.length > 0) {
      query = access.marketIds.length === 1
        ? query.eq('market_id', access.marketIds[0])
        : query.in('market_id', access.marketIds);
    }
    if (status && status !== 'all') query = query.eq('status', status);
    if (search) query = query.or(`business_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data: leads, error } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    // Stats
    let statsQuery = serviceClient.from('business_leads').select('status');
    if (access.marketIds !== null && access.marketIds.length > 0) {
      statsQuery = access.marketIds.length === 1
        ? statsQuery.eq('market_id', access.marketIds[0])
        : statsQuery.in('market_id', access.marketIds);
    }
    const { data: allLeads } = await statsQuery;

    const stats = {
      total: allLeads?.length || 0,
      new: allLeads?.filter(l => l.status === 'new').length || 0,
      contacted: allLeads?.filter(l => l.status === 'contacted').length || 0,
      interested: allLeads?.filter(l => l.status === 'interested').length || 0,
      notInterested: allLeads?.filter(l => l.status === 'not_interested').length || 0,
      converted: allLeads?.filter(l => l.status === 'converted').length || 0,
    };

    // Rep names
    const { data: reps } = await serviceClient.from('sales_reps').select('id, name');
    const repNameMap: Record<string, string> = {};
    if (reps) for (const rep of reps) repNameMap[rep.id] = rep.name;

    // Activity types per lead
    const leadIds = (leads || []).map((l: { id: string }) => l.id);
    const activityMap: Record<string, string[]> = {};
    if (leadIds.length > 0) {
      const { data: activities } = await serviceClient
        .from('lead_activities')
        .select('lead_id, activity_type')
        .in('lead_id', leadIds)
        .neq('activity_type', 'status_change');
      if (activities) {
        for (const a of activities) {
          if (!activityMap[a.lead_id]) activityMap[a.lead_id] = [];
          if (!activityMap[a.lead_id].includes(a.activity_type)) activityMap[a.lead_id].push(a.activity_type);
        }
      }
    }

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
    console.error('Error in mobile sales leads API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
