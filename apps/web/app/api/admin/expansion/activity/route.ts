import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    const cityId = request.nextUrl.searchParams.get('city_id');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

    let query = serviceClient
      .from('expansion_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cityId) {
      query = query.eq('city_id', cityId);
    }

    const { data: activities, error } = await query;

    if (error) {
      console.error('Error fetching expansion activity:', error);
      return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 });
    }

    return NextResponse.json({ activities: activities || [] });
  } catch (error) {
    console.error('Error fetching expansion activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
