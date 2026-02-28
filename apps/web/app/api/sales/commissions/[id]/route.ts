import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    // Only admins can update commission status (mark as paid/void)
    if (!access.isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can modify commission records' },
        { status: 403 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const body = await request.json();
    const { status } = body;

    if (!status || !['pending', 'paid', 'void'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be one of: pending, paid, void' },
        { status: 400 }
      );
    }

    const { data: commission, error } = await serviceClient
      .from('sales_commissions')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating commission:', error);
      return NextResponse.json({ error: 'Failed to update commission' }, { status: 500 });
    }

    return NextResponse.json({ commission });
  } catch (error) {
    console.error('Error in update commission API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess || !access.isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can delete commission records' },
        { status: 403 }
      );
    }

    const serviceClient = createServiceRoleClient();

    const { error } = await serviceClient
      .from('sales_commissions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting commission:', error);
      return NextResponse.json({ error: 'Failed to delete commission' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete commission API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
