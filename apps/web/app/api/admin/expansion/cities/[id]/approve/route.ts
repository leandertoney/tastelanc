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
    const { data: currentCity, error: fetchError } = await serviceClient
      .from('expansion_cities')
      .select('id, city_name, state, status')
      .eq('id', id)
      .single();

    if (fetchError || !currentCity) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    // Verify a brand is selected
    const { data: selectedBrand } = await serviceClient
      .from('expansion_brand_drafts')
      .select('id, app_name')
      .eq('city_id', id)
      .eq('is_selected', true)
      .single();

    if (!selectedBrand) {
      return NextResponse.json(
        { error: 'A brand must be selected before approving the city' },
        { status: 400 }
      );
    }

    // Update city to approved
    const { data: city, error: updateError } = await serviceClient
      .from('expansion_cities')
      .update({
        status: 'approved',
        approved_by: admin.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error approving city:', updateError);
      return NextResponse.json({ error: 'Failed to approve city' }, { status: 500 });
    }

    // Log activity
    await serviceClient
      .from('expansion_activity_log')
      .insert({
        city_id: id,
        user_id: admin.userId,
        action: 'city_approved',
        description: `Approved ${currentCity.city_name}, ${currentCity.state} for launch with brand "${selectedBrand.app_name}"`,
        metadata: { brand_id: selectedBrand.id, brand_name: selectedBrand.app_name },
      });

    return NextResponse.json({ city });
  } catch (error) {
    console.error('Error approving city:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
