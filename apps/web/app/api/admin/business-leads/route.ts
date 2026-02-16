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

    // Build query
    let query = supabase
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
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Get stats
    const { data: allLeads } = await supabase
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
