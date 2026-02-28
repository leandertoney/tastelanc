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
      .select('*, business_leads(id, business_name, contact_name), restaurants(id, name)')
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

    // Non-admin sales reps only see their own meetings
    if (!access.isAdmin) {
      query = query.eq('created_by', access.userId);
    }

    const { data: meetings, error } = await query;

    if (error) {
      console.error('Error fetching meetings:', error);
      return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
    }

    return NextResponse.json({ meetings: meetings || [] });
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
    const { title, description, meeting_date, start_time, end_time, lead_id, restaurant_id } = body;

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

    // Resolve market
    const marketSlug = process.env.NEXT_PUBLIC_MARKET_SLUG || 'lancaster-pa';
    const { data: market, error: marketError } = await serviceClient
      .from('markets')
      .select('id')
      .eq('slug', marketSlug)
      .single();

    if (marketError || !market) {
      console.warn(`Market lookup failed for slug "${marketSlug}":`, marketError?.message);
    }

    const { data: meeting, error } = await serviceClient
      .from('sales_meetings')
      .insert({
        title: title.trim(),
        description: description || null,
        meeting_date,
        start_time: start_time || null,
        end_time: end_time || null,
        lead_id: lead_id || null,
        restaurant_id: restaurant_id || null,
        created_by: access.userId,
        market_id: market?.id || null,
      })
      .select('*, business_leads(id, business_name, contact_name), restaurants(id, name)')
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
