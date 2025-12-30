export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin by email (consistent with middleware)
    const isAdmin = user.email === 'admin@tastelanc.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all restaurants
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('id, name, city, state, owner_id')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching restaurants:', error);
      return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
    }

    return NextResponse.json({ restaurants: restaurants || [] });
  } catch (error) {
    console.error('Error in restaurants API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
