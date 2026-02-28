import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

export async function GET() {
  try {
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    const { data: rep } = await serviceClient
      .from('sales_reps')
      .select('name, email, phone, payment_cashapp, payment_venmo, payment_zelle, payment_applepay, payment_cashapp_enabled, payment_venmo_enabled, payment_zelle_enabled, payment_applepay_enabled')
      .eq('id', access.userId)
      .single();

    return NextResponse.json({ settings: rep || null });
  } catch (error) {
    console.error('Error fetching sales settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    // Payment methods
    if (body.payment_cashapp !== undefined) updateData.payment_cashapp = body.payment_cashapp || null;
    if (body.payment_venmo !== undefined) updateData.payment_venmo = body.payment_venmo || null;
    if (body.payment_zelle !== undefined) updateData.payment_zelle = body.payment_zelle || null;
    if (body.payment_applepay !== undefined) updateData.payment_applepay = body.payment_applepay || null;
    if (body.payment_cashapp_enabled !== undefined) updateData.payment_cashapp_enabled = body.payment_cashapp_enabled;
    if (body.payment_venmo_enabled !== undefined) updateData.payment_venmo_enabled = body.payment_venmo_enabled;
    if (body.payment_zelle_enabled !== undefined) updateData.payment_zelle_enabled = body.payment_zelle_enabled;
    if (body.payment_applepay_enabled !== undefined) updateData.payment_applepay_enabled = body.payment_applepay_enabled;

    const { data: rep, error } = await serviceClient
      .from('sales_reps')
      .update(updateData)
      .eq('id', access.userId)
      .select('name, email, phone, payment_cashapp, payment_venmo, payment_zelle, payment_applepay, payment_cashapp_enabled, payment_venmo_enabled, payment_zelle_enabled, payment_applepay_enabled')
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ settings: rep });
  } catch (error) {
    console.error('Error in update settings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
