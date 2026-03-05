import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const { id } = await params;
    const serviceClient = createServiceRoleClient();

    // Verify ownership before deleting
    const { data: existing } = await serviceClient
      .from('email_drafts')
      .select('id')
      .eq('id', id)
      .eq('user_id', access.userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const { error } = await serviceClient
      .from('email_drafts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting draft:', error);
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in draft delete API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
