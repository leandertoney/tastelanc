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

    // Fetch all expansion cities
    const { data: cities, error } = await serviceClient
      .from('expansion_cities')
      .select('status');

    if (error) {
      console.error('Error fetching expansion stats:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Count by status
    const stats = {
      total: cities?.length || 0,
      researching: 0,
      researched: 0,
      brand_ready: 0,
      approved: 0,
      setup_in_progress: 0,
      live: 0,
      on_hold: 0,
      rejected: 0,
    };

    (cities || []).forEach((city: { status: string }) => {
      const key = city.status as keyof typeof stats;
      if (key in stats && key !== 'total') {
        stats[key]++;
      }
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching expansion stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
