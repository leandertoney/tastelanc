import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { generateBrandProposals } from '@/lib/ai/expansion-agent';

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

    const { data: brands, error } = await serviceClient
      .from('expansion_brand_drafts')
      .select('*')
      .eq('city_id', id)
      .order('variant_number', { ascending: true });

    if (error) {
      console.error('Error fetching brand drafts:', error);
      return NextResponse.json({ error: 'Failed to fetch brand drafts' }, { status: 500 });
    }

    return NextResponse.json({ brands: brands || [] });
  } catch (error) {
    console.error('Error fetching brand drafts:', error);
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

    // Parse optional count from body
    let count = 3;
    try {
      const body = await request.json();
      if (body.count && typeof body.count === 'number' && body.count > 0) {
        count = body.count;
      }
    } catch {
      // No body or invalid JSON — use default count of 3
    }

    // Fetch city data for brand generation
    const { data: city, error: fetchError } = await serviceClient
      .from('expansion_cities')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    // Get max variant_number for this city
    const { data: existingBrands } = await serviceClient
      .from('expansion_brand_drafts')
      .select('variant_number')
      .eq('city_id', id)
      .order('variant_number', { ascending: false })
      .limit(1);

    const startVariant = (existingBrands?.[0]?.variant_number || 0) + 1;

    // Generate brand proposals via AI
    const proposals = await generateBrandProposals(city, count);

    // Insert each proposal
    const brandsToInsert = proposals.map((proposal: any, index: number) => ({
      city_id: id,
      app_name: proposal.app_name,
      tagline: proposal.tagline,
      ai_assistant_name: proposal.ai_assistant_name,
      premium_name: proposal.premium_name,
      colors: proposal.colors || {},
      market_config_json: proposal.market_config_json || {},
      seo_title: proposal.seo_title || null,
      seo_description: proposal.seo_description || null,
      seo_keywords: proposal.seo_keywords || [],
      variant_number: startVariant + index,
      is_selected: false,
    }));

    const { data: brands, error: insertError } = await serviceClient
      .from('expansion_brand_drafts')
      .insert(brandsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting brand drafts:', insertError);
      return NextResponse.json({ error: 'Failed to save brand proposals' }, { status: 500 });
    }

    // Update city status to brand_ready if not already past that stage
    const preStatusStages = ['researching', 'researched'];
    if (preStatusStages.includes(city.status)) {
      await serviceClient
        .from('expansion_cities')
        .update({ status: 'brand_ready' })
        .eq('id', id);
    }

    // Log activity
    await serviceClient
      .from('expansion_activity_log')
      .insert({
        city_id: id,
        user_id: admin.userId,
        action: 'brand_generated',
        description: `Generated ${count} brand proposal(s) for ${city.city_name}`,
        metadata: { count, variant_start: startVariant },
      });

    return NextResponse.json({ brands: brands || [] }, { status: 201 });
  } catch (error) {
    console.error('Error generating brand proposals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
