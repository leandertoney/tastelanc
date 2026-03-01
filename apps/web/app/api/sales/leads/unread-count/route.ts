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

    let query = serviceClient
      .from('business_leads')
      .select('id', { count: 'exact', head: true })
      .eq('has_unread_replies', true);

    // Apply market scope
    if (access.marketIds !== null && access.marketIds.length > 0) {
      if (access.marketIds.length === 1) {
        query = query.eq('market_id', access.marketIds[0]);
      } else {
        query = query.in('market_id', access.marketIds);
      }
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error fetching unread count:', error);
      return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Error in unread count API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
