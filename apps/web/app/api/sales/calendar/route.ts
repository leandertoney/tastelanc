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

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    const serviceClient = createServiceRoleClient();

    let query = serviceClient
      .from('sales_meetings')
      .select('*, business_leads(id, business_name, contact_name), restaurants(id, name), assigned_to')
      .order('meeting_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Filter by month if provided
    if (month) {
      const [year, mon] = month.split('-').map(Number);
      if (!year || !mon || mon < 1 || mon > 12 || isNaN(year) || isNaN(mon)) {
        return NextResponse.json(
          { error: 'Invalid month format. Use YYYY-MM (e.g. 2026-03)' },
          { status: 400 }
        );
      }
      const startDate = `${year}-${String(mon).padStart(2, '0')}-01`;
      const endDate = mon === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(mon + 1).padStart(2, '0')}-01`;
      query = query.gte('meeting_date', startDate).lt('meeting_date', endDate);
    }

    // Visibility scoping
    if (access.isSuperAdmin) {
      // Super admin / co_founder see all meetings
    } else if (access.isMarketAdmin && access.marketIds) {
      // Market admin sees meetings from their market
      if (access.marketIds.length === 1) {
        query = query.eq('market_id', access.marketIds[0]);
      } else {
        query = query.in('market_id', access.marketIds);
      }
    } else if (access.marketIds && access.marketIds.length > 0) {
      // Sales rep — all meetings in their market (so they can attend for support/practice)
      if (access.marketIds.length === 1) {
        query = query.eq('market_id', access.marketIds[0]);
      } else {
        query = query.in('market_id', access.marketIds);
      }
    } else {
      // Fallback: own meetings only if no market assigned
      query = query.or(`created_by.eq.${access.userId},assigned_to.eq.${access.userId}`);
    }

    const { data: meetings, error } = await query;

    if (error) {
      console.error('Error fetching meetings:', error);
      return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
    }

    // Resolve user names (creators + assignees) from sales_reps then profiles
    const allUserIds = Array.from(new Set(
      (meetings || []).flatMap((m: { created_by: string; assigned_to: string | null }) =>
        [m.created_by, m.assigned_to].filter(Boolean) as string[]
      )
    ));
    const nameMap: Record<string, string> = {};
    if (allUserIds.length > 0) {
      const { data: reps } = await serviceClient
        .from('sales_reps')
        .select('id, name')
        .in('id', allUserIds);
      if (reps) {
        for (const r of reps) nameMap[r.id] = r.name;
      }
      const missingIds = allUserIds.filter(id => !nameMap[id]);
      if (missingIds.length > 0) {
        const { data: profiles } = await serviceClient
          .from('profiles')
          .select('id, display_name, email')
          .in('id', missingIds);
        if (profiles) {
          for (const p of profiles) {
            nameMap[p.id] = p.display_name || p.email || 'Unknown';
          }
        }
      }
    }

    const enrichedMeetings = (meetings || []).map((m: { created_by: string; assigned_to: string | null; [key: string]: unknown }) => ({
      ...m,
      creator_name: nameMap[m.created_by] || null,
      assigned_to_name: m.assigned_to ? (nameMap[m.assigned_to] || null) : null,
    }));

    return NextResponse.json({ meetings: enrichedMeetings });
  } catch (error) {
    console.error('Error in calendar API:', error);
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

    const body = await request.json();
    const { title, description, meeting_date, start_time, end_time, lead_id, restaurant_id, assigned_to } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'title is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!meeting_date || isNaN(Date.parse(meeting_date))) {
      return NextResponse.json(
        { error: 'A valid meeting_date is required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Resolve market — use user's market if scoped, otherwise fallback to env
    let resolvedMarketId: string | null = null;
    if (access.marketIds && access.marketIds.length > 0) {
      resolvedMarketId = access.marketIds[0];
    } else {
      const marketSlug = process.env.NEXT_PUBLIC_MARKET_SLUG || 'lancaster-pa';
      const { data: market, error: marketError } = await serviceClient
        .from('markets')
        .select('id')
        .eq('slug', marketSlug)
        .single();
      if (marketError || !market) {
        console.warn(`Market lookup failed for slug "${marketSlug}":`, marketError?.message);
      }
      resolvedMarketId = market?.id || null;
    }

    // Auto-lead creation: when a meeting is assigned to a rep, ensure a lead exists
    let resolvedLeadId: string | null = lead_id || null;
    if (assigned_to) {
      if (lead_id) {
        // Lead already exists — make sure it's assigned to this rep
        await serviceClient
          .from('business_leads')
          .update({ assigned_to, updated_at: new Date().toISOString() })
          .eq('id', lead_id);
      } else if (restaurant_id) {
        // Check if a lead already exists for this restaurant
        const { data: existingLead } = await serviceClient
          .from('business_leads')
          .select('id')
          .eq('restaurant_id', restaurant_id)
          .maybeSingle();

        if (existingLead) {
          // Assign the existing lead to the rep
          resolvedLeadId = existingLead.id;
          await serviceClient
            .from('business_leads')
            .update({ assigned_to, updated_at: new Date().toISOString() })
            .eq('id', existingLead.id);
        } else {
          // Fetch the restaurant name for the lead
          const { data: restaurant } = await serviceClient
            .from('restaurants')
            .select('name')
            .eq('id', restaurant_id)
            .single();

          // Create a new lead for this restaurant, assigned to the rep
          const { data: newLead } = await serviceClient
            .from('business_leads')
            .insert({
              business_name: restaurant?.name || title.trim(),
              restaurant_id,
              assigned_to,
              source: 'meeting',
              status: 'new',
              market_id: resolvedMarketId,
            })
            .select('id')
            .single();

          if (newLead) resolvedLeadId = newLead.id;
        }
      }
    }

    const { data: meeting, error } = await serviceClient
      .from('sales_meetings')
      .insert({
        title: title.trim(),
        description: description || null,
        meeting_date,
        start_time: start_time || null,
        end_time: end_time || null,
        lead_id: resolvedLeadId,
        restaurant_id: restaurant_id || null,
        created_by: access.userId,
        assigned_to: assigned_to || null,
        market_id: resolvedMarketId,
      })
      .select('*, business_leads(id, business_name, contact_name), restaurants(id, name), assigned_to')
      .single();

    if (error) {
      console.error('Error creating meeting:', error);
      return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('Error in create meeting API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
