// Fetch all expansion reviews (for admin dashboard)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    await verifyAdminAccess(supabase);

    const serviceClient = createServiceRoleClient();
    const { data: reviews, error } = await serviceClient
      .from('expansion_reviews')
      .select('*')
      .order('voted_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reviews: reviews || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
