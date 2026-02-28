import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { suggestCities } from '@/lib/ai/expansion-agent';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // Parse criteria from body
    let criteria: {
      state?: string;
      min_population?: number;
      max_population?: number;
      count?: number;
    } = {};

    try {
      const body = await request.json();
      criteria = {
        state: body.state,
        min_population: body.min_population,
        max_population: body.max_population,
        count: body.count,
      };
    } catch {
      // No body or invalid JSON — use empty criteria
    }

    // Call AI to suggest cities
    const suggestions = await suggestCities(criteria);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error suggesting cities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
