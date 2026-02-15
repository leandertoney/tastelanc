import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== 'admin@tastelanc.com') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, market_ids, is_active } = body;

    const serviceClient = createServiceRoleClient();

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (market_ids !== undefined) updateData.market_ids = market_ids;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: rep, error } = await serviceClient
      .from('sales_reps')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating sales rep:', error);
      return NextResponse.json({ error: 'Failed to update sales rep' }, { status: 500 });
    }

    return NextResponse.json({ rep });
  } catch (error) {
    console.error('Error in update sales rep API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
