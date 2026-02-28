export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    let admin;
    try {
      admin = await verifyAdminAccess(supabase);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status || 500 }
      );
    }

    const body = await request.json();

    // Whitelist allowed fields
    const ALLOWED_FIELDS = ['is_active', 'is_verified', 'tier_id', 'admin_notes'];
    const updates: Record<string, any> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Verify restaurant exists (and is within admin's market scope)
    let checkQuery = serviceClient
      .from('restaurants')
      .select('id')
      .eq('id', id);

    if (admin.scopedMarketId) {
      checkQuery = checkQuery.eq('market_id', admin.scopedMarketId);
    }

    const { data: existing } = await checkQuery.single();
    if (!existing) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // If tier_id is being updated, verify it's a valid tier
    if (updates.tier_id) {
      const { data: tier } = await serviceClient
        .from('tiers')
        .select('id')
        .eq('id', updates.tier_id)
        .single();
      if (!tier) {
        return NextResponse.json(
          { error: 'Invalid tier' },
          { status: 400 }
        );
      }
    }

    const { data: updated, error } = await serviceClient
      .from('restaurants')
      .update(updates)
      .eq('id', id)
      .select('id, name, is_active, is_verified, tier_id, admin_notes, tiers(name, display_name)')
      .single();

    if (error) {
      console.error('Error updating restaurant:', error);
      return NextResponse.json(
        { error: 'Failed to update restaurant' },
        { status: 500 }
      );
    }

    return NextResponse.json({ restaurant: updated });
  } catch (error) {
    console.error('Error in admin restaurant PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
