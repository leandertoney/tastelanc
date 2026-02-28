import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    const status = request.nextUrl.searchParams.get('status');
    const search = request.nextUrl.searchParams.get('search');

    let query = serviceClient
      .from('expansion_cities')
      .select('*')
      .order('priority', { ascending: false })
      .order('market_potential_score', { ascending: false, nullsFirst: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('city_name', `%${search}%`);
    }

    const { data: cities, error } = await query;

    if (error) {
      console.error('Error fetching expansion cities:', error);
      return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 });
    }

    return NextResponse.json({ cities: cities || [] });
  } catch (error) {
    console.error('Error fetching expansion cities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    const body = await request.json();
    const { city_name, county, state } = body;

    if (!city_name || !county) {
      return NextResponse.json(
        { error: 'city_name and county are required' },
        { status: 400 }
      );
    }

    // Auto-generate slug from city_name + state (lowercase, hyphenated)
    const stateValue = state || 'PA';
    const slug = `${city_name}-${stateValue}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check for duplicate slug
    const { data: existing } = await serviceClient
      .from('expansion_cities')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `A city with slug "${slug}" already exists` },
        { status: 409 }
      );
    }

    // Insert city
    const { data: city, error: insertError } = await serviceClient
      .from('expansion_cities')
      .insert({
        city_name,
        county,
        state: stateValue,
        slug,
        status: 'researching',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting expansion city:', insertError);
      return NextResponse.json({ error: 'Failed to add city' }, { status: 500 });
    }

    // Log activity
    await serviceClient
      .from('expansion_activity_log')
      .insert({
        city_id: city.id,
        user_id: admin.userId,
        action: 'city_added',
        description: `Added ${city_name}, ${county}, ${stateValue} to the expansion pipeline`,
      });

    return NextResponse.json({ city }, { status: 201 });
  } catch (error) {
    console.error('Error adding expansion city:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
