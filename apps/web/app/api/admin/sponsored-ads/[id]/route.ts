import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'admin@tastelanc.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { is_active, priority } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (is_active !== undefined) updates.is_active = is_active;
    if (priority !== undefined) updates.priority = priority;

    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from('featured_ads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ad:', error);
      return NextResponse.json({ error: 'Failed to update ad' }, { status: 500 });
    }

    return NextResponse.json({ ad: data });
  } catch (error) {
    console.error('Error in sponsored ads API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
