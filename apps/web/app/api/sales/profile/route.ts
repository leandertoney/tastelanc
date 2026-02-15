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

    const { data: profile, error } = await serviceClient
      .from('sales_reps')
      .select('*')
      .eq('id', access.userId!)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Sales rep profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in sales profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
