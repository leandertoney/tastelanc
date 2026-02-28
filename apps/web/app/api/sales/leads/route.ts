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
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build query — sales reps can access all leads across all markets
    let query = serviceClient
      .from('business_leads')
      .select('*')
      .order('created_at', { ascending: false });

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

    // Get stats (all leads globally)
    const { data: allLeads } = await serviceClient
      .from('business_leads')
      .select('status');

    const stats = {
      total: allLeads?.length || 0,
      new: allLeads?.filter((l) => l.status === 'new').length || 0,
      contacted: allLeads?.filter((l) => l.status === 'contacted').length || 0,
      interested: allLeads?.filter((l) => l.status === 'interested').length || 0,
      notInterested: allLeads?.filter((l) => l.status === 'not_interested').length || 0,
      converted: allLeads?.filter((l) => l.status === 'converted').length || 0,
    };

    return NextResponse.json({ leads: leads || [], stats });
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

    if (!business_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: business_name, email' },
        { status: 400 }
      );
    }

    // Check if email already exists
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
        email,
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
