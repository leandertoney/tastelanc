import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { generateJobListing } from '@/lib/ai/expansion-agent';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    const { data: jobs, error } = await serviceClient
      .from('expansion_job_listings')
      .select('*')
      .eq('city_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching job listings:', error);
      return NextResponse.json({ error: 'Failed to fetch job listings' }, { status: 500 });
    }

    return NextResponse.json({ jobs: jobs || [] });
  } catch (error) {
    console.error('Error fetching job listings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    // Parse body
    let role_type = 'sales_rep';
    try {
      const body = await request.json();
      if (body.role_type) {
        role_type = body.role_type;
      }
    } catch {
      // No body or invalid JSON — use default role_type
    }

    // Fetch city data
    const { data: city, error: cityError } = await serviceClient
      .from('expansion_cities')
      .select('*')
      .eq('id', id)
      .single();

    if (cityError || !city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    // Fetch selected brand for this city
    const { data: brand } = await serviceClient
      .from('expansion_brand_drafts')
      .select('*')
      .eq('city_id', id)
      .eq('is_selected', true)
      .single();

    // Generate job listing via AI
    const listing = await generateJobListing(city, brand, role_type);

    // Insert job listing
    const { data: job, error: insertError } = await serviceClient
      .from('expansion_job_listings')
      .insert({
        city_id: id,
        title: listing.title,
        role_type,
        description: listing.description,
        requirements: listing.requirements || [],
        compensation_summary: listing.compensation_summary || null,
        location: listing.location || `${city.city_name}, ${city.state}`,
        is_remote: false,
        status: 'draft',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting job listing:', insertError);
      return NextResponse.json({ error: 'Failed to save job listing' }, { status: 500 });
    }

    // Log activity
    await serviceClient
      .from('expansion_activity_log')
      .insert({
        city_id: id,
        user_id: admin.userId,
        action: 'job_listing_generated',
        description: `Generated ${role_type} job listing for ${city.city_name}`,
        metadata: { job_id: job.id, role_type },
      });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error('Error generating job listing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
