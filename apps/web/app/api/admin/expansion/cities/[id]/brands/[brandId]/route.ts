import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; brandId: string }> }
) {
  try {
    const { id, brandId } = await params;

    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    const body = await request.json();
    const { is_selected } = body;

    // Verify brand belongs to this city
    const { data: existingBrand, error: fetchError } = await serviceClient
      .from('expansion_brand_drafts')
      .select('id, city_id, app_name')
      .eq('id', brandId)
      .eq('city_id', id)
      .single();

    if (fetchError || !existingBrand) {
      return NextResponse.json({ error: 'Brand draft not found for this city' }, { status: 404 });
    }

    // If selecting this brand, deselect all others for this city first
    if (is_selected === true) {
      await serviceClient
        .from('expansion_brand_drafts')
        .update({ is_selected: false })
        .eq('city_id', id);
    }

    // Update this brand
    const updatePayload: Record<string, any> = {};
    if (is_selected !== undefined) updatePayload.is_selected = is_selected;

    const { data: brand, error: updateError } = await serviceClient
      .from('expansion_brand_drafts')
      .update(updatePayload)
      .eq('id', brandId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating brand draft:', updateError);
      return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
    }

    // Log activity if brand was selected
    if (is_selected === true) {
      await serviceClient
        .from('expansion_activity_log')
        .insert({
          city_id: id,
          user_id: admin.userId,
          action: 'brand_selected',
          description: `Selected brand "${existingBrand.app_name}" for this city`,
          metadata: { brand_id: brandId, app_name: existingBrand.app_name },
        });
    }

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('Error updating brand draft:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
