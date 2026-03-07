import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export async function GET() {
  try {
    const supabase = await createClient();
    try { await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    const { data: markets, error } = await supabase
      .from('markets')
      .select('id, name, slug')
      .order('name');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 });
    }

    return NextResponse.json({ markets: markets || [] });
  } catch (error) {
    console.error('Error in admin markets API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
