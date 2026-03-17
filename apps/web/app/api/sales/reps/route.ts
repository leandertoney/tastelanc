import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const { data: allReps, error } = await serviceClient
      .from('sales_reps')
      .select('id, name, email, market_ids')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching sales reps:', error);
      return NextResponse.json({ error: 'Failed to fetch reps' }, { status: 500 });
    }

    // Filter by market overlap for non-super-admins
    const reps = (allReps || []).filter((rep) => {
      if (!access.marketIds) return true; // super admin sees all
      if (!rep.market_ids || rep.market_ids.length === 0) return false;
      return rep.market_ids.some((mid: string) => access.marketIds!.includes(mid));
    });

    return NextResponse.json({
      reps: reps.map((r) => ({ id: r.id, name: r.name, email: r.email })),
      currentUserId: access.userId,
    });
  } catch (error) {
    console.error('Error in reps API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
