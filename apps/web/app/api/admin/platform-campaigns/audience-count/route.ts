import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    try { await verifyAdminAccess(supabase); }
    catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      return NextResponse.json({ error: e.message }, { status: e.status || 500 });
    }

    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('market_id');
    const source = searchParams.get('source');

    const serviceClient = createServiceRoleClient();

    let query = serviceClient
      .from('platform_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('is_unsubscribed', false);

    if (marketId) query = query.eq('market_id', marketId);
    if (source) query = query.eq('source_label', source);

    const { count, error } = await query;

    if (error) {
      console.error('Error counting audience:', error);
      return NextResponse.json({ error: 'Failed to count audience' }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Error in audience-count GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
