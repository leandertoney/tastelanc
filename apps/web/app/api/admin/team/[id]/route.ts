import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const admin = await verifyAdminAccess(supabase);

    // Only super_admin and co_founder can manage team
    if (admin.role !== 'super_admin' && admin.role !== 'co_founder') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();
    const body = await request.json();

    // Guard rail: cannot modify super_admin or co_founder accounts
    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single();

    if (targetProfile?.role === 'super_admin' || targetProfile?.role === 'co_founder') {
      return NextResponse.json(
        { error: 'Cannot modify owner or co-founder accounts' },
        { status: 403 }
      );
    }

    const { profile_role, admin_market_id, market_ids, is_active, name, phone } = body;

    // Guard rail: cannot promote to super_admin or co_founder
    if (profile_role === 'super_admin' || profile_role === 'co_founder') {
      return NextResponse.json(
        { error: 'Cannot assign super_admin or co_founder roles' },
        { status: 400 }
      );
    }

    // Validate: market_admin requires admin_market_id
    if (profile_role === 'market_admin' && !admin_market_id) {
      return NextResponse.json(
        { error: 'Market admin requires a market assignment' },
        { status: 400 }
      );
    }

    // Update profile role if provided
    if (profile_role !== undefined) {
      const profileUpdate: Record<string, unknown> = {
        role: profile_role || null,
        admin_market_id: profile_role === 'market_admin' ? admin_market_id : null,
      };

      const { error: profileErr } = await serviceClient
        .from('profiles')
        .upsert({ id, ...profileUpdate }, { onConflict: 'id' });

      if (profileErr) {
        console.error('Error updating profile:', profileErr);
        return NextResponse.json({ error: 'Failed to update profile role' }, { status: 500 });
      }
    }

    // Update sales_reps entry if it exists
    const { data: existingRep } = await serviceClient
      .from('sales_reps')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (existingRep) {
      const repUpdate: Record<string, unknown> = {};
      if (market_ids !== undefined) repUpdate.market_ids = market_ids;
      if (is_active !== undefined) repUpdate.is_active = is_active;
      if (name !== undefined) repUpdate.name = name;
      if (phone !== undefined) repUpdate.phone = phone;

      if (Object.keys(repUpdate).length > 0) {
        const { error: repErr } = await serviceClient
          .from('sales_reps')
          .update(repUpdate)
          .eq('id', id);

        if (repErr) {
          console.error('Error updating sales rep:', repErr);
          return NextResponse.json({ error: 'Failed to update sales rep' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Error in team update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
