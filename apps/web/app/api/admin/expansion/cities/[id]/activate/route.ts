import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';

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

    // Fetch city
    const { data: city, error: fetchError } = await serviceClient
      .from('expansion_cities')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    // Verify city is approved
    if (city.status !== 'approved') {
      return NextResponse.json(
        { error: `City must be in "approved" status to activate. Current status: "${city.status}"` },
        { status: 400 }
      );
    }

    // Fetch selected brand
    const { data: brand } = await serviceClient
      .from('expansion_brand_drafts')
      .select('*')
      .eq('city_id', id)
      .eq('is_selected', true)
      .single();

    if (!brand) {
      return NextResponse.json(
        { error: 'No selected brand found for this city' },
        { status: 400 }
      );
    }

    // Create market entry
    const { data: market, error: marketError } = await serviceClient
      .from('markets')
      .insert({
        name: brand.app_name,
        slug: city.slug,
        county: city.county,
        state: city.state,
        center_latitude: city.center_latitude,
        center_longitude: city.center_longitude,
        radius_miles: city.radius_miles || 25,
        is_active: true,
      })
      .select()
      .single();

    if (marketError) {
      console.error('Error creating market:', marketError);
      return NextResponse.json({ error: 'Failed to create market entry' }, { status: 500 });
    }

    // Update city: set market_id and status to live
    const { data: updatedCity, error: updateError } = await serviceClient
      .from('expansion_cities')
      .update({
        market_id: market.id,
        status: 'live',
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating city to live:', updateError);
      return NextResponse.json({ error: 'Market created but failed to update city status' }, { status: 500 });
    }

    // Log activity
    await serviceClient
      .from('expansion_activity_log')
      .insert({
        city_id: id,
        user_id: admin.userId,
        action: 'market_created',
        description: `Market "${brand.app_name}" created and city is now live`,
        metadata: { market_id: market.id, market_slug: city.slug },
      });

    return NextResponse.json({ city: updatedCity, market });
  } catch (error) {
    console.error('Error activating city:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
