import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check admin auth
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    const { data: requests, error } = await supabase
      .from('feature_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feature requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feature requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests: requests || [] });
  } catch (error) {
    console.error('Error in feature requests API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
